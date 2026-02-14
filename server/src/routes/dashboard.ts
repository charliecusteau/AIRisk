import { Router, Request, Response } from 'express';
import { get, all } from '../db/helpers';
import { DOMAINS } from '../utils/constants';

const router = Router();

// GET /api/dashboard/stats — portfolio-weighted
router.get('/stats', (_req: Request, res: Response) => {
  const totalCompanies = get<any>(`
    SELECT COUNT(*) as count FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    WHERE a.status = 'completed'
  `)?.count || 0;

  const totalWeight = get<any>('SELECT SUM(weight) as total FROM portfolio')?.total || 0;

  const avgScore = get<any>(`
    SELECT CASE WHEN SUM(p.weight) > 0
      THEN SUM(a.composite_score * p.weight) / SUM(p.weight)
      ELSE 0 END as avg
    FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    WHERE a.status = 'completed'
  `)?.avg || 0;

  const highRisk = get<any>(`
    SELECT COALESCE(SUM(p.weight), 0) as total_weight FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    WHERE a.status = 'completed' AND a.composite_rating IN ('High Risk', 'Medium-High Risk')
  `)?.total_weight || 0;

  const mediumRisk = get<any>(`
    SELECT COALESCE(SUM(p.weight), 0) as total_weight FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    WHERE a.status = 'completed' AND a.composite_rating = 'Medium Risk'
  `)?.total_weight || 0;

  const lowRisk = get<any>(`
    SELECT COALESCE(SUM(p.weight), 0) as total_weight FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    WHERE a.status = 'completed' AND a.composite_rating IN ('Low Risk', 'Medium-Low Risk')
  `)?.total_weight || 0;

  res.json({
    total_companies: totalCompanies,
    total_assessments: Math.round(totalWeight * 10) / 10,
    avg_composite_score: Math.round(avgScore * 10) / 10,
    high_risk_count: Math.round(highRisk * 10) / 10,
    medium_risk_count: Math.round(mediumRisk * 10) / 10,
    low_risk_count: Math.round(lowRisk * 10) / 10,
  });
});

// GET /api/dashboard/risk-distribution — portfolio only
router.get('/risk-distribution', (_req: Request, res: Response) => {
  const data = all(`
    SELECT a.composite_rating as rating, COUNT(*) as count
    FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    WHERE a.status = 'completed' AND a.composite_rating IS NOT NULL
    GROUP BY a.composite_rating
    ORDER BY
      CASE a.composite_rating
        WHEN 'High Risk' THEN 1
        WHEN 'Medium-High Risk' THEN 2
        WHEN 'Medium Risk' THEN 3
        WHEN 'Medium-Low Risk' THEN 4
        WHEN 'Low Risk' THEN 5
      END
  `);

  res.json(data);
});

// GET /api/dashboard/domain-breakdown — portfolio only
router.get('/domain-breakdown', (_req: Request, res: Response) => {
  const breakdown = DOMAINS.map(domain => {
    const high = get<any>(`
      SELECT COUNT(DISTINCT ds.assessment_id) as count FROM domain_scores ds
      JOIN portfolio p ON ds.assessment_id = p.assessment_id
      WHERE ds.domain_number = ? AND ds.effective_rating = 'high'
      AND ds.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
    `, domain.number)?.count || 0;

    const medium = get<any>(`
      SELECT COUNT(DISTINCT ds.assessment_id) as count FROM domain_scores ds
      JOIN portfolio p ON ds.assessment_id = p.assessment_id
      WHERE ds.domain_number = ? AND ds.effective_rating = 'medium'
      AND ds.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
    `, domain.number)?.count || 0;

    const low = get<any>(`
      SELECT COUNT(DISTINCT ds.assessment_id) as count FROM domain_scores ds
      JOIN portfolio p ON ds.assessment_id = p.assessment_id
      WHERE ds.domain_number = ? AND ds.effective_rating = 'low'
      AND ds.assessment_id IN (SELECT id FROM assessments WHERE status = 'completed')
    `, domain.number)?.count || 0;

    return { domain: domain.name, high, medium, low };
  });

  res.json(breakdown);
});

// GET /api/dashboard/sector-breakdown — portfolio only
router.get('/sector-breakdown', (_req: Request, res: Response) => {
  const data = all(`
    SELECT c.sector, AVG(a.composite_score) as avg_score, COUNT(*) as count
    FROM portfolio p
    JOIN assessments a ON p.assessment_id = a.id
    JOIN companies c ON a.company_id = c.id
    WHERE a.status = 'completed' AND c.sector IS NOT NULL AND c.sector != ''
    GROUP BY c.sector
    ORDER BY avg_score DESC
  `);

  res.json(data);
});

export default router;
