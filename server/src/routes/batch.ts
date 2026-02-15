import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { run, get, all } from '../db/helpers';
import { analyzeCompany } from '../services/claude';
import { recalculateAssessment } from '../services/scoring';
import { DomainScore } from '../types';
import { DOMAINS } from '../utils/constants';
import { logger } from '../utils/logger';

const router = Router();

const batchSchema = z.object({
  companies: z.array(z.string().min(1).max(200)).min(1).max(20),
  sector: z.string().optional(),
});

interface BatchCompanyResult {
  company_name: string;
  status: 'completed' | 'error';
  assessment_id?: number;
  composite_score?: number;
  composite_rating?: string;
  error?: string;
}

// POST /api/batch-analysis — analyze multiple companies via SSE
router.post('/', async (req: Request, res: Response) => {
  const { companies, sector } = batchSchema.parse(req.body);
  const userId = req.session.userId!;

  // Deduplicate and trim
  const uniqueCompanies = [...new Set(companies.map(c => c.trim()).filter(Boolean))];

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const results: BatchCompanyResult[] = [];

  sendEvent('batch_start', { total: uniqueCompanies.length });

  for (let i = 0; i < uniqueCompanies.length; i++) {
    const companyName = uniqueCompanies[i];

    sendEvent('company_start', { index: i, company_name: companyName });

    try {
      // Create company + assessment (same logic as assessments.ts POST)
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

      const assessmentResult = run(
        "INSERT INTO assessments (company_id, status, user_id) VALUES (?, 'analyzing', ?)",
        company.id, userId,
      );
      const assessmentId = assessmentResult.lastInsertRowid;
      run("INSERT INTO assessment_history (assessment_id, action) VALUES (?, 'created')", assessmentId);

      // Run analysis (same logic as analysis.ts)
      sendEvent('progress', { index: i, company_name: companyName, message: 'Calling Claude API...' });

      const result = await analyzeCompany(
        companyName,
        sector || undefined,
        undefined,
        (message) => sendEvent('progress', { index: i, company_name: companyName, message }),
      );

      // Update company sector if identified
      if (result.sector) {
        run("UPDATE companies SET sector = ?, updated_at = datetime('now') WHERE id = ?",
          result.sector, company.id);
      }

      // Clear any existing scores and insert new ones
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

      // Recalculate composite
      const allScores = all<DomainScore>('SELECT * FROM domain_scores WHERE assessment_id = ?', assessmentId);
      const { domainRatings, compositeScore, compositeRating } = recalculateAssessment(allScores);

      // Build domain summaries JSON
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

      const companyResult: BatchCompanyResult = {
        company_name: companyName,
        status: 'completed',
        assessment_id: assessmentId as number,
        composite_score: compositeScore,
        composite_rating: compositeRating,
      };

      results.push(companyResult);
      sendEvent('company_complete', { index: i, ...companyResult });

    } catch (error: any) {
      logger.error(`Batch analysis failed for ${companyName}`, error);

      const companyResult: BatchCompanyResult = {
        company_name: companyName,
        status: 'error',
        error: error.message || 'Analysis failed',
      };

      results.push(companyResult);
      sendEvent('company_error', { index: i, ...companyResult });
    }
  }

  sendEvent('batch_complete', { results });
  res.end();
});

export default router;
