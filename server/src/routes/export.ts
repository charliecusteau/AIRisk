import { Router, Request, Response } from 'express';
import { get, all } from '../db/helpers';
import { generateHtmlReport } from '../services/pdf';
import { DomainScore, Assessment } from '../types';
import { DOMAINS } from '../utils/constants';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/export/:id/pdf - returns HTML report (printable to PDF via browser)
router.get('/:id/pdf', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const assessment = get<Assessment & { company_name: string; company_sector: string; company_description: string | null }>(`
    SELECT a.*, c.name as company_name, c.sector as company_sector, c.description as company_description
    FROM assessments a
    JOIN companies c ON a.company_id = c.id
    WHERE a.id = ? AND a.status = 'completed' AND a.user_id = ?
  `, id, userId);

  if (!assessment) {
    res.status(404).json({ error: 'Completed assessment not found' });
    return;
  }

  const domainScores = all<DomainScore>(
    'SELECT * FROM domain_scores WHERE assessment_id = ? ORDER BY domain_number, question_key',
    id,
  );

  try {
    const html = generateHtmlReport(assessment, domainScores, DOMAINS);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    logger.error('Report generation failed', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
