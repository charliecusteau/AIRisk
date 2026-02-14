import { RiskRating, CompositeRating, DomainScore } from '../types';
import { DOMAINS, RATING_TO_SCORE, COMPOSITE_RATING_THRESHOLDS } from '../utils/constants';

const DOMAIN_WEIGHTS: Record<number, number> = {
  1: 0.30,  // Customer Demand
  2: 0.30,  // Moats
  3: 0.15,  // Tech Stack
  4: 0.25,  // AI Competition
};

export function ratingToScore(rating: RiskRating): number {
  return RATING_TO_SCORE[rating];
}

export function computeDomainRating(domainScores: DomainScore[]): RiskRating {
  if (domainScores.length === 0) return 'medium';

  const avg = domainScores.reduce((sum, s) => sum + ratingToScore(s.effective_rating), 0) / domainScores.length;

  if (avg >= 2.5) return 'high';
  if (avg >= 1.5) return 'medium';
  return 'low';
}

export function computeCompositeScore(domainRatings: Record<number, RiskRating>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const domain of DOMAINS) {
    const rating = domainRatings[domain.number];
    if (rating) {
      const weight = DOMAIN_WEIGHTS[domain.number];
      weightedSum += ratingToScore(rating) * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 5;

  const normalizedScore = weightedSum / totalWeight;
  // Scale from 1-3 range to 1-10 range
  return Math.round(((normalizedScore - 1) / 2) * 9 + 1);
}

export function scoreToCompositeRating(score: number): CompositeRating {
  for (const threshold of COMPOSITE_RATING_THRESHOLDS) {
    if (score <= threshold.max) {
      return threshold.rating as CompositeRating;
    }
  }
  return 'High Risk';
}

export function recalculateAssessment(domainScores: DomainScore[]): {
  domainRatings: Record<number, RiskRating>;
  compositeScore: number;
  compositeRating: CompositeRating;
} {
  const byDomain: Record<number, DomainScore[]> = {};

  for (const score of domainScores) {
    if (!byDomain[score.domain_number]) {
      byDomain[score.domain_number] = [];
    }
    byDomain[score.domain_number].push(score);
  }

  const domainRatings: Record<number, RiskRating> = {};
  for (const [domainNum, scores] of Object.entries(byDomain)) {
    domainRatings[Number(domainNum)] = computeDomainRating(scores);
  }

  const compositeScore = computeCompositeScore(domainRatings);
  const compositeRating = scoreToCompositeRating(compositeScore);

  return { domainRatings, compositeScore, compositeRating };
}
