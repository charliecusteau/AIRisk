import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { run, get, all, transaction } from '../db/helpers';
import { recalculateAssessment } from '../services/scoring';
import { DomainScore, RiskRating } from '../types';
import { logger } from '../utils/logger';

const router = Router();

const createAssessmentSchema = z.object({
  company_name: z.string().min(1).max(200),
  sector: z.string().optional(),
  description: z.string().optional(),
});

const updateScoreSchema = z.object({
  user_rating: z.enum(['high', 'medium', 'low']).nullable(),
  user_reasoning: z.string().nullable(),
});

const updateNotesSchema = z.object({
  notes: z.string().nullable(),
});

// List assessments with optional filters
router.get('/', (req: Request, res: Response) => {
  const { status, sector, sort, order, search } = req.query;
  const userId = req.session.userId;

  let query = `
    SELECT a.*, c.name as company_name, c.sector as company_sector
    FROM assessments a
    JOIN companies c ON a.company_id = c.id
    WHERE a.user_id = ?
  `;
  const params: unknown[] = [userId];

  if (status && status !== 'all') {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (sector && sector !== 'all') {
    query += ' AND c.sector = ?';
    params.push(sector);
  }
  if (search) {
    query += ' AND c.name LIKE ?';
    params.push(`%${search}%`);
  }

  const sortCol = sort === 'name' ? 'c.name' :
    sort === 'score' ? 'a.composite_score' :
    sort === 'sector' ? 'c.sector' :
    'a.updated_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortCol} ${sortOrder}`;

  const assessments = all(query, ...params);
  res.json(assessments);
});

// Get single assessment with domain scores
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const assessment = get(`
    SELECT a.*, c.name as company_name, c.sector as company_sector, c.description as company_description
    FROM assessments a
    JOIN companies c ON a.company_id = c.id
    WHERE a.id = ? AND a.user_id = ?
  `, id, userId);

  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found' });
    return;
  }

  const domainScores = all(
    'SELECT * FROM domain_scores WHERE assessment_id = ? ORDER BY domain_number, question_key',
    id,
  );

  const history = all(
    'SELECT * FROM assessment_history WHERE assessment_id = ? ORDER BY timestamp DESC',
    id,
  );

  res.json({ ...assessment, domain_scores: domainScores, history });
});

// Create assessment (company + pending assessment)
router.post('/', (req: Request, res: Response) => {
  const data = createAssessmentSchema.parse(req.body);
  const userId = req.session.userId;

  const result = transaction(() => {
    let company = get<{ id: number }>('SELECT id FROM companies WHERE name = ?', data.company_name);

    if (!company) {
      const insertResult = run(
        'INSERT INTO companies (name, sector, description) VALUES (?, ?, ?)',
        data.company_name, data.sector || null, data.description || null,
      );
      company = { id: insertResult.lastInsertRowid };
    } else if (data.sector) {
      run('UPDATE companies SET sector = ?, updated_at = datetime(\'now\') WHERE id = ?', data.sector, company.id);
    }

    const assessmentResult = run(
      "INSERT INTO assessments (company_id, status, user_id) VALUES (?, 'pending', ?)",
      company.id, userId,
    );
    const assessmentId = assessmentResult.lastInsertRowid;

    run('INSERT INTO assessment_history (assessment_id, action) VALUES (?, \'created\')', assessmentId);

    return { company_id: company.id, assessment_id: assessmentId };
  });

  logger.info('Assessment created', result);
  res.status(201).json(result);
});

// Update a domain score (user override)
router.patch('/:id/scores/:scoreId', (req: Request, res: Response) => {
  const { id, scoreId } = req.params;
  const userId = req.session.userId;
  const data = updateScoreSchema.parse(req.body);

  // Verify ownership
  const assessment = get('SELECT id FROM assessments WHERE id = ? AND user_id = ?', id, userId);
  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found' });
    return;
  }

  const score = get<DomainScore>('SELECT * FROM domain_scores WHERE id = ? AND assessment_id = ?', scoreId, id);
  if (!score) {
    res.status(404).json({ error: 'Score not found' });
    return;
  }

  const effectiveRating = data.user_rating || score.ai_rating;
  const oldEffective = score.effective_rating;

  run(
    'UPDATE domain_scores SET user_rating = ?, user_reasoning = ?, effective_rating = ? WHERE id = ?',
    data.user_rating, data.user_reasoning, effectiveRating, scoreId,
  );

  if (oldEffective !== effectiveRating) {
    run(
      'INSERT INTO assessment_history (assessment_id, action, field_changed, old_value, new_value) VALUES (?, \'score_override\', ?, ?, ?)',
      id, score.question_key, oldEffective, effectiveRating,
    );
  }

  const allScores = all<DomainScore>('SELECT * FROM domain_scores WHERE assessment_id = ?', id);
  const { domainRatings, compositeScore, compositeRating } = recalculateAssessment(allScores);

  run(
    `UPDATE assessments
     SET domain1_rating = ?, domain2_rating = ?, domain3_rating = ?, domain4_rating = ?, domain5_rating = ?,
         composite_score = ?, composite_rating = ?, user_modified = 1, updated_at = datetime('now')
     WHERE id = ?`,
    domainRatings[1] || null, domainRatings[2] || null, domainRatings[3] || null,
    domainRatings[4] || null, null,
    compositeScore, compositeRating, id,
  );

  const updated = get('SELECT * FROM domain_scores WHERE id = ?', scoreId);
  res.json({ score: updated, composite_score: compositeScore, composite_rating: compositeRating, domain_ratings: domainRatings });
});

// Update assessment notes
router.patch('/:id/notes', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.session.userId;
  const data = updateNotesSchema.parse(req.body);

  const assessment = get('SELECT id FROM assessments WHERE id = ? AND user_id = ?', id, userId);
  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found' });
    return;
  }

  run('UPDATE assessments SET notes = ?, updated_at = datetime(\'now\') WHERE id = ?', data.notes, id);
  run(
    'INSERT INTO assessment_history (assessment_id, action, field_changed, new_value) VALUES (?, \'notes_updated\', \'notes\', ?)',
    id, data.notes,
  );

  res.json({ success: true });
});

// Delete assessment
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const assessment = get('SELECT id FROM assessments WHERE id = ? AND user_id = ?', id, userId);
  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found' });
    return;
  }

  run('DELETE FROM domain_scores WHERE assessment_id = ?', id);
  run('DELETE FROM assessment_history WHERE assessment_id = ?', id);
  run('DELETE FROM assessments WHERE id = ?', id);
  logger.info('Assessment deleted', { id });
  res.json({ success: true });
});

export default router;
