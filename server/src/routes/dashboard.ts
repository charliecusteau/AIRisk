import { Router, Request, Response } from 'express';
import { get, all } from '../db/helpers';
import { DOMAINS } from '../utils/constants';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', (_req: Request, res: Response) => {
  const totalCompanies = get<any>("SELECT COUNT(DISTINCT company_id) as count FROM assessments WHERE status = 'completed'")?.count || 0;
  const totalAssessments = get<any>("SELECT COUNT(*) as count FROM assessments WHERE status = 'completed'")?.count || 0;
  const avgScore = get<any>("SELECT AVG(composite_score) as avg FROM assessments WHERE status = 'completed'")?.avg || 0;
  const highRisk = get<any>("SELECT COUNT(*) as count FROM assessments WHERE status = 'completed' AND composite_rating IN ('High Risk', 'Medium-High Risk')")?.count || 0;
  const mediumRisk = get<any>("SELECT COUNT(*) as count FROM assessments WHERE status = 'completed' AND composite_rating = 'Medium Risk'")?.count || 0;
  const lowRisk = get<any>("SELECT COUNT(*) as count FROM assessments WHERE status = 'completed' AND composite_rating IN ('Low Risk', 'Medium-Low Risk')")?.count || 0;

  res.json({
    total_companies: totalCompanies,
    total_assessments: totalAssessments,
    avg_composite_score: Math.round(avgScore * 10) / 10,
    high_risk_count: highRisk,
    medium_risk_count: mediumRisk,
    low_risk_count: lowRisk,
  });
});

// GET /api/dashboard/risk-distribution
router.get('/risk-distribution', (_req: Request, res: Response) => {
  const data = all(`
    SELECT composite_rating as rating, COUNT(*) as count
    FROM assessments
    WHERE status = 'completed' AND composite_rating IS NOT NULL
    GROUP BY composite_rating
    ORDER BY
      CASE composite_rating
        WHEN 'High Risk' THEN 1
        WHEN 'Medium-High Risk' THEN 2
        WHEN 'Medium Risk' THEN 3
        WHEN 'Medium-Low Risk' THEN 4
        WHEN 'Low Risk' THEN 5
      END
  `);

  res.json(data);
});

// GET /api/dashboard/domain-breakdown
router.get('/domain-breakdown', (_req: Request, res: Response) => {
  const breakdown = DOMAINS.map(domain => {
    const high = get<any>(`
      SELECT COUNT(DISTINCT assessment_id) as count FROM domain_scores
      WHERE domain_number = ? AND effective_rating = 'high'
      AND assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
    `, domain.number)?.count || 0;

    const medium = get<any>(`
      SELECT COUNT(DISTINCT assessment_id) as count FROM domain_scores
      WHERE domain_number = ? AND effective_rating = 'medium'
      AND assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
    `, domain.number)?.count || 0;

    const low = get<any>(`
      SELECT COUNT(DISTINCT assessment_id) as count FROM domain_scores
      WHERE domain_number = ? AND effective_rating = 'low'
      AND assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
    `, domain.number)?.count || 0;

    return { domain: domain.name, high, medium, low };
  });

  res.json(breakdown);
});

// GET /api/dashboard/sector-breakdown
router.get('/sector-breakdown', (_req: Request, res: Response) => {
  const data = all(`
    SELECT c.sector, AVG(a.composite_score) as avg_score, COUNT(*) as count
    FROM assessments a
    JOIN companies c ON a.company_id = c.id
    WHERE a.status = 'completed' AND c.sector IS NOT NULL AND c.sector != ''
    GROUP BY c.sector
    ORDER BY avg_score DESC
  `);

  res.json(data);
});

export default router;
