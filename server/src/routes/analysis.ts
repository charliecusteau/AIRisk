import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { run, get, all } from '../db/helpers';
import { analyzeCompany } from '../services/claude';
import { recalculateAssessment } from '../services/scoring';
import { DomainScore } from '../types';
import { DOMAINS } from '../utils/constants';
import { logger } from '../utils/logger';

const router = Router();

const analyzeSchema = z.object({
  assessment_id: z.number(),
});

// POST /api/analysis - trigger analysis and stream progress via SSE
router.post('/', async (req: Request, res: Response) => {
  const { assessment_id } = analyzeSchema.parse(req.body);
  const userId = req.session.userId;

  const assessment = get<any>(`
    SELECT a.*, c.name as company_name, c.sector as company_sector, c.description as company_description
    FROM assessments a
    JOIN companies c ON a.company_id = c.id
    WHERE a.id = ? AND a.user_id = ?
  `, assessment_id, userId);

  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found' });
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

  try {
    // Check if another completed assessment exists for this company (any user)
    const existing = get<any>(`
      SELECT a.* FROM assessments a
      WHERE a.company_id = ? AND a.status = 'completed' AND a.id != ?
      ORDER BY a.updated_at DESC LIMIT 1
    `, assessment.company_id, assessment_id);

    if (existing) {
      sendEvent('progress', { message: 'Found existing analysis — cloning...', step: 1, totalSteps: 3 });

      // Clone domain scores
      const existingScores = all<DomainScore>(
        'SELECT * FROM domain_scores WHERE assessment_id = ? ORDER BY domain_number, question_key',
        existing.id,
      );
      run('DELETE FROM domain_scores WHERE assessment_id = ?', assessment_id);
      for (const s of existingScores) {
        run(
          `INSERT INTO domain_scores (assessment_id, domain_number, question_key, question_text, ai_rating, ai_reasoning, ai_confidence, effective_rating)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          assessment_id, s.domain_number, s.question_key, s.question_text,
          s.ai_rating, s.ai_reasoning, s.ai_confidence, s.ai_rating,
        );
      }

      sendEvent('progress', { message: 'Saving results...', step: 2, totalSteps: 3 });

      run(
        `UPDATE assessments
         SET status = 'completed', narrative = ?,
             domain1_rating = ?, domain2_rating = ?, domain3_rating = ?, domain4_rating = ?, domain5_rating = ?,
             composite_score = ?, composite_rating = ?, ai_model = ?,
             domain_summaries = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
        existing.narrative,
        existing.domain1_rating, existing.domain2_rating, existing.domain3_rating,
        existing.domain4_rating, existing.domain5_rating,
        existing.composite_score, existing.composite_rating, existing.ai_model,
        existing.domain_summaries,
        assessment_id,
      );

      run(
        "INSERT INTO assessment_history (assessment_id, action, new_value) VALUES (?, 'analysis_cloned', ?)",
        assessment_id, `Cloned from assessment #${existing.id}`,
      );

      sendEvent('progress', { message: 'Complete!', step: 3, totalSteps: 3 });
      sendEvent('complete', {
        assessment_id,
        composite_score: existing.composite_score,
        composite_rating: existing.composite_rating,
      });
      res.end();
      return;
    }

    // No existing analysis — run AI
    // Update status to analyzing
    run("UPDATE assessments SET status = 'analyzing', updated_at = datetime('now') WHERE id = ?", assessment_id);
    sendEvent('progress', { message: 'Starting analysis...', step: 1, totalSteps: 5 });

    const result = await analyzeCompany(
      assessment.company_name,
      assessment.company_sector,
      assessment.company_description,
      (message) => sendEvent('progress', { message }),
    );

    sendEvent('progress', { message: 'Saving results...', step: 3, totalSteps: 5 });

    // Update company sector if identified
    if (result.sector) {
      run("UPDATE companies SET sector = ?, updated_at = datetime('now') WHERE id = ?",
        result.sector, assessment.company_id);
    }

    // Clear any existing scores for re-analysis
    run('DELETE FROM domain_scores WHERE assessment_id = ?', assessment_id);

    // Insert domain scores
    for (const domain of result.domains) {
      for (const q of domain.questions) {
        const questionDef = DOMAINS.find(d => d.number === domain.domain_number)
          ?.questions.find(qd => qd.key === q.question_key);

        run(
          `INSERT INTO domain_scores (assessment_id, domain_number, question_key, question_text, ai_rating, ai_reasoning, ai_confidence, effective_rating)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          assessment_id, domain.domain_number, q.question_key,
          questionDef?.text || q.question_key, q.rating, q.reasoning, q.confidence, q.rating,
        );
      }
    }

    sendEvent('progress', { message: 'Calculating scores...', step: 4, totalSteps: 5 });

    // Recalculate composite from saved scores
    const allScores = all<DomainScore>('SELECT * FROM domain_scores WHERE assessment_id = ?', assessment_id);
    const { domainRatings, compositeScore, compositeRating } = recalculateAssessment(allScores);

    // Build domain summaries JSON
    const domainSummaries: Record<number, string> = {};
    for (const domain of result.domains) {
      domainSummaries[domain.domain_number] = domain.summary;
    }

    // Update assessment
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
      assessment_id,
    );

    // Log to history
    run(
      "INSERT INTO assessment_history (assessment_id, action, new_value) VALUES (?, 'analysis_completed', ?)",
      assessment_id, `Score: ${compositeScore}, Rating: ${compositeRating}`,
    );

    sendEvent('progress', { message: 'Complete!', step: 5, totalSteps: 5 });
    sendEvent('complete', {
      assessment_id,
      composite_score: compositeScore,
      composite_rating: compositeRating,
    });
  } catch (error: any) {
    logger.error('Analysis failed', error);
    run("UPDATE assessments SET status = 'error', updated_at = datetime('now') WHERE id = ?", assessment_id);

    run(
      "INSERT INTO assessment_history (assessment_id, action, new_value) VALUES (?, 'analysis_failed', ?)",
      assessment_id, error.message,
    );

    sendEvent('error', { message: error.message });
  } finally {
    res.end();
  }
});

export default router;
