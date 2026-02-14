export type RiskRating = 'high' | 'medium' | 'low';
export type CompositeRating = 'High Risk' | 'Medium-High Risk' | 'Medium Risk' | 'Medium-Low Risk' | 'Low Risk';
export type AssessmentStatus = 'pending' | 'analyzing' | 'completed' | 'error';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Company {
  id: number;
  name: string;
  sector: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: number;
  company_id: number;
  status: AssessmentStatus;
  narrative: string | null;
  domain1_rating: RiskRating | null;
  domain2_rating: RiskRating | null;
  domain3_rating: RiskRating | null;
  domain4_rating: RiskRating | null;
  domain5_rating: RiskRating | null;
  composite_score: number | null;
  composite_rating: CompositeRating | null;
  ai_model: string | null;
  user_modified: number;
  notes: string | null;
  domain_summaries: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentWithCompany extends Assessment {
  company_name: string;
  company_sector: string | null;
}

export interface DomainScore {
  id: number;
  assessment_id: number;
  domain_number: number;
  question_key: string;
  question_text: string;
  ai_rating: RiskRating;
  ai_reasoning: string;
  ai_confidence: ConfidenceLevel;
  user_rating: RiskRating | null;
  user_reasoning: string | null;
  effective_rating: RiskRating;
}

export interface AssessmentHistory {
  id: number;
  assessment_id: number;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

export interface DomainDefinition {
  number: number;
  name: string;
  description: string;
  questions: QuestionDefinition[];
}

export interface QuestionDefinition {
  key: string;
  text: string;
  guidance: string;
}

export interface ClaudeQuestionResult {
  question_key: string;
  rating: RiskRating;
  reasoning: string;
  confidence: ConfidenceLevel;
}

export interface ClaudeDomainResult {
  domain_number: number;
  domain_name: string;
  overall_rating: RiskRating;
  summary: string;
  questions: ClaudeQuestionResult[];
}

export interface ClaudeAnalysisResult {
  company_name: string;
  sector: string;
  domains: ClaudeDomainResult[];
  narrative: string;
  composite_score: number;
  composite_rating: CompositeRating;
}

export interface DashboardStats {
  total_companies: number;
  total_assessments: number;
  avg_composite_score: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
}

export interface RiskDistribution {
  rating: string;
  count: number;
}

export interface DomainBreakdown {
  domain: string;
  high: number;
  medium: number;
  low: number;
}

export interface SectorBreakdown {
  sector: string;
  avg_score: number;
  count: number;
}
