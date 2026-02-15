import { Router, Request, Response } from 'express';
import { get, all, run, transaction } from '../db/helpers';
import { analyzeCompany } from '../services/claude';
import { recalculateAssessment } from '../services/scoring';
import { DomainScore } from '../types';
import { DOMAINS } from '../utils/constants';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/portfolio - List all portfolio entries with assessment + company data
router.get('/', (req: Request, res: Response) => {
  const userId = req.session.userId;

  const entries = all(`
    SELECT
      p.id, p.assessment_id, p.weight, p.added_at,
      c.name as company_name, c.sector as company_sector,
      a.composite_score, a.composite_rating,
      a.domain1_rating, a.domain2_rating, a.domain3_rating, a.domain4_rating,
      a.updated_at
    FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    JOIN companies c ON a.company_id = c.id
    WHERE a.status = 'completed' AND p.user_id = ?
    ORDER BY p.added_at DESC
  `, userId);
  res.json(entries);
});

// POST /api/portfolio - Add existing assessment(s) to portfolio (instant, no analysis)
router.post('/', (req: Request, res: Response) => {
  const userId = req.session.userId;
  const { assessment_ids } = req.body;
  if (!Array.isArray(assessment_ids) || assessment_ids.length === 0) {
    res.status(400).json({ error: 'assessment_ids must be a non-empty array' });
    return;
  }

  transaction(() => {
    for (const aid of assessment_ids) {
      // Verify user owns the assessment
      const owns = get('SELECT id FROM assessments WHERE id = ? AND user_id = ?', aid, userId);
      if (!owns) continue;
      const existing = get('SELECT id FROM portfolio WHERE assessment_id = ? AND user_id = ?', aid, userId);
      if (!existing) {
        run('INSERT INTO portfolio (assessment_id, weight, user_id) VALUES (?, 0, ?)', aid, userId);
      }
    }
    redistributeWeights(userId!);
  });

  const entries = all(`
    SELECT
      p.id, p.assessment_id, p.weight, p.added_at,
      c.name as company_name, c.sector as company_sector,
      a.composite_score, a.composite_rating,
      a.domain1_rating, a.domain2_rating, a.domain3_rating, a.domain4_rating,
      a.updated_at
    FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    JOIN companies c ON a.company_id = c.id
    WHERE a.status = 'completed' AND p.user_id = ?
    ORDER BY p.added_at DESC
  `, userId);
  res.json(entries);
});

// POST /api/portfolio/batch-add — Add existing assessments + analyze new companies via SSE
router.post('/batch-add', async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const { assessment_ids = [], new_companies = [], sector } = req.body;

  const existingIds: number[] = Array.isArray(assessment_ids) ? assessment_ids : [];
  const companies: string[] = Array.isArray(new_companies)
    ? [...new Set(new_companies.map((c: string) => c.trim()).filter(Boolean))].slice(0, 75)
    : [];

  if (existingIds.length === 0 && companies.length === 0) {
    res.status(400).json({ error: 'Provide assessment_ids or new_companies' });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Step 1: Add existing assessments immediately
  if (existingIds.length > 0) {
    transaction(() => {
      for (const aid of existingIds) {
        const owns = get('SELECT id FROM assessments WHERE id = ? AND user_id = ?', aid, userId);
        if (!owns) continue;
        const existing = get('SELECT id FROM portfolio WHERE assessment_id = ? AND user_id = ?', aid, userId);
        if (!existing) {
          run('INSERT INTO portfolio (assessment_id, weight, user_id) VALUES (?, 0, ?)', aid, userId);
        }
      }
    });
    sendEvent('existing_added', { count: existingIds.length });
  }

  // Step 2: Analyze new companies one by one
  const total = companies.length;
  if (total > 0) {
    sendEvent('batch_start', { total });
  }

  for (let i = 0; i < total; i++) {
    const companyName = companies[i];
    sendEvent('company_start', { index: i, company_name: companyName });

    try {
      // Create or find company
      let company = get<{ id: number }>('SELECT id FROM companies WHERE name = ?', companyName);
      if (!company) {
        const insertResult = run(
          'INSERT INTO companies (name, sector, description) VALUES (?, ?, ?)',
          companyName, sector || null, null,
        );
        company = { id: insertResult.lastInsertRowid };
      } else if (sector) {
        run("UPDATE companies SET sector = ?, updated_at = datetime('now') WHERE id = ?", sector, company.id);
      }

      // Check if this user already has a completed assessment for this company
      const ownAssessment = get<{ id: number }>(
        "SELECT id FROM assessments WHERE company_id = ? AND user_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1",
        company.id, userId,
      );

      let assessmentId: number;

      if (ownAssessment) {
        assessmentId = ownAssessment.id;
        sendEvent('progress', { index: i, company_name: companyName, message: 'Already analyzed — adding to portfolio' });
      } else {
        // Create assessment for this user
        const assessmentResult = run(
          "INSERT INTO assessments (company_id, status, user_id) VALUES (?, 'analyzing', ?)",
          company.id, userId,
        );
        assessmentId = assessmentResult.lastInsertRowid;
        run("INSERT INTO assessment_history (assessment_id, action) VALUES (?, 'created')", assessmentId);

        // Check if ANY user has a completed assessment for this company (clone it)
        const donorAssessment = get<any>(`
          SELECT a.* FROM assessments a
          WHERE a.company_id = ? AND a.status = 'completed' AND a.id != ?
          ORDER BY a.updated_at DESC LIMIT 1
        `, company.id, assessmentId);

        if (donorAssessment) {
          // Clone existing analysis — no AI call needed
          sendEvent('progress', { index: i, company_name: companyName, message: 'Found existing analysis — cloning...' });

          const donorScores = all<DomainScore>(
            'SELECT * FROM domain_scores WHERE assessment_id = ? ORDER BY domain_number, question_key',
            donorAssessment.id,
          );
          for (const s of donorScores) {
            run(
              `INSERT INTO domain_scores (assessment_id, domain_number, question_key, question_text, ai_rating, ai_reasoning, ai_confidence, effective_rating)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              assessmentId, s.domain_number, s.question_key, s.question_text,
              s.ai_rating, s.ai_reasoning, s.ai_confidence, s.ai_rating,
            );
          }

          run(
            `UPDATE assessments
             SET status = 'completed', narrative = ?,
                 domain1_rating = ?, domain2_rating = ?, domain3_rating = ?, domain4_rating = ?, domain5_rating = ?,
                 composite_score = ?, composite_rating = ?, ai_model = ?,
                 domain_summaries = ?,
                 updated_at = datetime('now')
             WHERE id = ?`,
            donorAssessment.narrative,
            donorAssessment.domain1_rating, donorAssessment.domain2_rating, donorAssessment.domain3_rating,
            donorAssessment.domain4_rating, donorAssessment.domain5_rating,
            donorAssessment.composite_score, donorAssessment.composite_rating, donorAssessment.ai_model,
            donorAssessment.domain_summaries,
            assessmentId,
          );

          run(
            "INSERT INTO assessment_history (assessment_id, action, new_value) VALUES (?, 'analysis_cloned', ?)",
            assessmentId, `Cloned from assessment #${donorAssessment.id}`,
          );
        } else {
          // No existing analysis anywhere — run AI
          sendEvent('progress', { index: i, company_name: companyName, message: 'Calling Claude API...' });

          const result = await analyzeCompany(
            companyName,
            sector || undefined,
            undefined,
            (message) => sendEvent('progress', { index: i, company_name: companyName, message }),
          );

          if (result.sector || result.company_description) {
            run("UPDATE companies SET sector = COALESCE(?, sector), description = COALESCE(?, description), updated_at = datetime('now') WHERE id = ?",
              result.sector || null, result.company_description || null, company.id);
          }

          run('DELETE FROM domain_scores WHERE assessment_id = ?', assessmentId);

          for (const domain of result.domains) {
            for (const q of domain.questions) {
              const questionDef = DOMAINS.find(d => d.number === domain.domain_number)
                ?.questions.find(qd => qd.key === q.question_key);
              run(
                `INSERT INTO domain_scores (assessment_id, domain_number, question_key, question_text, ai_rating, ai_reasoning, ai_confidence, effective_rating)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                assessmentId, domain.domain_number, q.question_key,
                questionDef?.text || q.question_key, q.rating, q.reasoning, q.confidence, q.rating,
              );
            }
          }

          const allScores = all<DomainScore>('SELECT * FROM domain_scores WHERE assessment_id = ?', assessmentId);
          const { domainRatings, compositeScore, compositeRating } = recalculateAssessment(allScores);

          const domainSummaries: Record<number, string> = {};
          for (const domain of result.domains) {
            domainSummaries[domain.domain_number] = domain.summary;
          }

          run(
            `UPDATE assessments
             SET status = 'completed', narrative = ?,
                 domain1_rating = ?, domain2_rating = ?, domain3_rating = ?, domain4_rating = ?, domain5_rating = ?,
                 composite_score = ?, composite_rating = ?, ai_model = ?,
                 domain_summaries = ?,
                 updated_at = datetime('now')
             WHERE id = ?`,
            result.narrative,
            domainRatings[1] || null, domainRatings[2] || null, domainRatings[3] || null,
            domainRatings[4] || null, null,
            compositeScore, compositeRating, 'claude-sonnet-4-5-20250929',
            JSON.stringify(domainSummaries),
            assessmentId,
          );

          run(
            "INSERT INTO assessment_history (assessment_id, action, new_value) VALUES (?, 'analysis_completed', ?)",
            assessmentId, `Score: ${compositeScore}, Rating: ${compositeRating}`,
          );
        }
      }

      // Add to portfolio
      const alreadyInPortfolio = get('SELECT id FROM portfolio WHERE assessment_id = ? AND user_id = ?', assessmentId, userId);
      if (!alreadyInPortfolio) {
        run('INSERT INTO portfolio (assessment_id, weight, user_id) VALUES (?, 0, ?)', assessmentId, userId);
      }

      sendEvent('company_complete', { index: i, company_name: companyName, assessment_id: assessmentId });

    } catch (error: any) {
      logger.error(`Portfolio batch-add failed for ${companyName}`, error);
      sendEvent('company_error', { index: i, company_name: companyName, error: error.message || 'Analysis failed' });
    }
  }

  // Redistribute weights across entire portfolio
  transaction(() => {
    redistributeWeights(userId);
  });

  sendEvent('complete', { success: true });
  res.end();
});

// DELETE /api/portfolio/:id - Remove entry from portfolio
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.session.userId!;

  // Verify ownership
  const entry = get('SELECT id FROM portfolio WHERE id = ? AND user_id = ?', Number(id), userId);
  if (!entry) {
    res.status(404).json({ error: 'Portfolio entry not found' });
    return;
  }

  transaction(() => {
    run('DELETE FROM portfolio WHERE id = ?', Number(id));
    redistributeWeights(userId);
  });

  res.json({ success: true });
});

// PUT /api/portfolio/weights - Update all weights
router.put('/weights', (req: Request, res: Response) => {
  const userId = req.session.userId;
  const { weights } = req.body;
  if (!Array.isArray(weights)) {
    res.status(400).json({ error: 'weights must be an array of { id, weight }' });
    return;
  }

  const total = weights.reduce((sum: number, w: { weight: number }) => sum + w.weight, 0);
  if (Math.abs(total - 100) > 0.1) {
    res.status(400).json({ error: `Weights must sum to 100 (got ${total.toFixed(1)})` });
    return;
  }

  transaction(() => {
    for (const { id, weight } of weights) {
      run('UPDATE portfolio SET weight = ? WHERE id = ? AND user_id = ?', weight, id, userId);
    }
  });

  res.json({ success: true });
});

function redistributeWeights(userId: number) {
  const count = get<any>('SELECT COUNT(*) as count FROM portfolio WHERE user_id = ?', userId)?.count || 0;
  if (count === 0) return;
  const equalWeight = Math.round((100 / count) * 100) / 100;
  run('UPDATE portfolio SET weight = ? WHERE user_id = ?', equalWeight, userId);
  const remainder = 100 - equalWeight * count;
  if (Math.abs(remainder) > 0.001) {
    const first = get<any>('SELECT id FROM portfolio WHERE user_id = ? ORDER BY id LIMIT 1', userId);
    if (first) {
      run('UPDATE portfolio SET weight = ? WHERE id = ?', equalWeight + remainder, first.id);
    }
  }
}

export default router;
