import { Router, Request, Response } from 'express';
import { get, all, run, transaction } from '../db/helpers';

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

// POST /api/portfolio - Add assessment(s) to portfolio
router.post('/', (req: Request, res: Response) => {
  const { assessment_ids } = req.body;
  if (!Array.isArray(assessment_ids) || assessment_ids.length === 0) {
    res.status(400).json({ error: 'assessment_ids must be a non-empty array' });
    return;
  }

  transaction(() => {
    for (const aid of assessment_ids) {
      // Skip if already in portfolio
      const existing = get('SELECT id FROM portfolio WHERE assessment_id = ?', aid);
      if (!existing) {
        run('INSERT INTO portfolio (assessment_id, weight) VALUES (?, 0)', aid);
      }
    }
    // Redistribute weights equally
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
  // Fix rounding: adjust first entry so total is exactly 100
  const remainder = 100 - equalWeight * count;
  if (Math.abs(remainder) > 0.001) {
    const first = get<any>('SELECT id FROM portfolio ORDER BY id LIMIT 1');
    if (first) {
      run('UPDATE portfolio SET weight = ? WHERE id = ?', equalWeight + remainder, first.id);
    }
  }
}

export default router;
