import { Router, Request, Response } from 'express';
import { get, all, run, transaction } from '../db/helpers';
import { analyzeCompany } from '../services/claude';
import { recalculateAssessment } from '../services/scoring';
import { DomainScore } from '../types';
import { DOMAINS } from '../utils/constants';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/portfolio - List all portfolio entries with assessment + company data
router.get('/', (_req: Request, res: Response) => {
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
    WHERE a.status = 'completed'
    ORDER BY p.added_at DESC
  `);
  res.json(entries);
});

// POST /api/portfolio - Add existing assessment(s) to portfolio (instant, no analysis)
router.post('/', (req: Request, res: Response) => {
  const { assessment_ids } = req.body;
  if (!Array.isArray(assessment_ids) || assessment_ids.length === 0) {
    res.status(400).json({ error: 'assessment_ids must be a non-empty array' });
    return;
  }

  transaction(() => {
    for (const aid of assessment_ids) {
      const existing = get('SELECT id FROM portfolio WHERE assessment_id = ?', aid);
      if (!existing) {
        run('INSERT INTO portfolio (assessment_id, weight) VALUES (?, 0)', aid);
      }
    }
    redistributeWeights();
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
    WHERE a.status = 'completed'
    ORDER BY p.added_at DESC
  `);
  res.json(entries);
});

// POST /api/portfolio/batch-add — Add existing assessments + analyze new companies via SSE
router.post('/batch-add', async (req: Request, res: Response) => {
  const { assessment_ids = [], new_companies = [], sector } = req.body;

  const existingIds: number[] = Array.isArray(assessment_ids) ? assessment_ids : [];
  const companies: string[] = Array.isArray(new_companies)
    ? [...new Set(new_companies.map((c: string) => c.trim()).filter(Boolean))].slice(0, 50)
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
        const existing = get('SELECT id FROM portfolio WHERE assessment_id = ?', aid);
        if (!existing) {
          run('INSERT INTO portfolio (assessment_id, weight) VALUES (?, 0)', aid);
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

      // Check if there's already a completed assessment for this company
      const existingAssessment = get<{ id: number }>(
        "SELECT id FROM assessments WHERE company_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1",
        company.id,
      );

      let assessmentId: number;

      if (existingAssessment) {
        assessmentId = existingAssessment.id;
        sendEvent('progress', { index: i, company_name: companyName, message: 'Already analyzed — adding to portfolio' });
      } else {
        // Create assessment and run analysis
        const assessmentResult = run(
          "INSERT INTO assessments (company_id, status) VALUES (?, 'analyzing')",
          company.id,
        );
        assessmentId = assessmentResult.lastInsertRowid;
        run("INSERT INTO assessment_history (assessment_id, action) VALUES (?, 'created')", assessmentId);

        sendEvent('progress', { index: i, company_name: companyName, message: 'Calling Claude API...' });

        const result = await analyzeCompany(
          companyName,
          sector || undefined,
          undefined,
          (message) => sendEvent('progress', { index: i, company_name: companyName, message }),
        );

        if (result.sector) {
          run("UPDATE companies SET sector = ?, updated_at = datetime('now') WHERE id = ?",
            result.sector, company.id);
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

      // Add to portfolio
      const alreadyInPortfolio = get('SELECT id FROM portfolio WHERE assessment_id = ?', assessmentId);
      if (!alreadyInPortfolio) {
        run('INSERT INTO portfolio (assessment_id, weight) VALUES (?, 0)', assessmentId);
      }

      sendEvent('company_complete', { index: i, company_name: companyName, assessment_id: assessmentId });

    } catch (error: any) {
      logger.error(`Portfolio batch-add failed for ${companyName}`, error);
      sendEvent('company_error', { index: i, company_name: companyName, error: error.message || 'Analysis failed' });
    }
  }

  // Redistribute weights across entire portfolio
  transaction(() => {
    redistributeWeights();
  });

  sendEvent('complete', { success: true });
  res.end();
});

// DELETE /api/portfolio/:id - Remove entry from portfolio
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  transaction(() => {
    run('DELETE FROM portfolio WHERE id = ?', Number(id));
    redistributeWeights();
  });

  res.json({ success: true });
});

// PUT /api/portfolio/weights - Update all weights
router.put('/weights', (req: Request, res: Response) => {
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
      run('UPDATE portfolio SET weight = ? WHERE id = ?', weight, id);
    }
  });

  res.json({ success: true });
});

function redistributeWeights() {
  const count = get<any>('SELECT COUNT(*) as count FROM portfolio')?.count || 0;
  if (count === 0) return;
  const equalWeight = Math.round((100 / count) * 100) / 100;
  run('UPDATE portfolio SET weight = ?', equalWeight);
  const remainder = 100 - equalWeight * count;
  if (Math.abs(remainder) > 0.001) {
    const first = get<any>('SELECT id FROM portfolio ORDER BY id LIMIT 1');
    if (first) {
      run('UPDATE portfolio SET weight = ? WHERE id = ?', equalWeight + remainder, first.id);
    }
  }
}

export default router;
