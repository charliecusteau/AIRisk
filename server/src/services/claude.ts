import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { DOMAINS, SUB_SECTOR_CLASSIFICATIONS } from '../utils/constants';
import { ClaudeAnalysisResult } from '../types';
import { logger } from '../utils/logger';

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

const questionResultSchema = z.object({
  question_key: z.string(),
  rating: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
});

const domainResultSchema = z.object({
  domain_number: z.number(),
  domain_name: z.string(),
  overall_rating: z.enum(['high', 'medium', 'low']),
  summary: z.string(),
  questions: z.array(questionResultSchema),
});

const analysisResultSchema = z.object({
  company_name: z.string(),
  sector: z.string(),
  domains: z.array(domainResultSchema).length(4),
  narrative: z.string(),
  composite_score: z.number().min(1).max(10),
  composite_rating: z.enum(['High Risk', 'Medium-High Risk', 'Medium Risk', 'Medium-Low Risk', 'Low Risk']),
});

const SYSTEM_PROMPT = `You are a senior private credit analyst at a major fund specializing in software and technology investments. You have deep expertise in evaluating AI disruption risk for software companies.

Your task is to perform a structured AI disruption risk assessment for a given software company. You must evaluate the company across 4 risk domains with specific sub-questions.

IMPORTANT CONTEXT - Sources of AI Disruption Risk for Software:
1. AI can make software production massively cheaper - IT departments may insource vs outsource, cheaper alternatives emerge from new vendors
2. AI natives can disrupt systems of record - AI-native tools bypass legacy systems with faster, simpler workflows; incumbents risk disruption from vertically focused agents
3. AI can reduce seat count - Productivity gains lead to lower seat counts; pricing pressure as customers rationalize licenses and seats

RISK RATING DEFINITIONS:
- "high" = High disruption risk (the company is highly vulnerable to AI disruption in this area)
- "medium" = Moderate disruption risk (some vulnerability, but with mitigating factors)
- "low" = Low disruption risk (the company is well-positioned or insulated from AI disruption in this area)

SUB-SECTOR REFERENCE CLASSIFICATIONS (for context only - do NOT substitute for company-level analysis):
${JSON.stringify(SUB_SECTOR_CLASSIFICATIONS, null, 2)}

You must respond with ONLY valid JSON matching the exact schema specified. No markdown, no explanations outside the JSON.`;

function buildUserPrompt(companyName: string, sector?: string, description?: string): string {
  const domainPrompt = DOMAINS.map(d => {
    const questions = d.questions.map(q =>
      `    - question_key: "${q.key}"\n      question: "${q.text}"\n      guidance: "${q.guidance}"`
    ).join('\n');
    return `  Domain ${d.number}: ${d.name}\n${questions}`;
  }).join('\n\n');

  return `Perform a comprehensive AI disruption risk assessment for: ${companyName}
${sector ? `Sector: ${sector}` : ''}
${description ? `Description: ${description}` : ''}

Evaluate across these 4 domains and their sub-questions:

${domainPrompt}

For each domain, provide a "summary" field: a single paragraph that synthesizes your analysis across all sub-questions in that domain.

Respond with this exact JSON structure:
{
  "company_name": "${companyName}",
  "sector": "<identified or provided sector>",
  "domains": [
    {
      "domain_number": 1,
      "domain_name": "Customer Demand",
      "overall_rating": "high|medium|low",
      "summary": "<single paragraph synthesizing all sub-question findings for this domain>",
      "questions": [
        {
          "question_key": "<from above>",
          "rating": "high|medium|low",
          "reasoning": "<2-4 sentence analysis>",
          "confidence": "high|medium|low"
        }
      ]
    }
    // ... all 4 domains with all their questions
  ],
  "narrative": "<2-3 paragraph narrative analysis covering key findings and overall risk posture. Do NOT include investment recommendations.>",
  "composite_score": <1-10 where 1=lowest risk, 10=highest risk>,
  "composite_rating": "High Risk|Medium-High Risk|Medium Risk|Medium-Low Risk|Low Risk"
}`;
}

export async function analyzeCompany(
  companyName: string,
  sector?: string,
  description?: string,
  onProgress?: (message: string) => void,
): Promise<ClaudeAnalysisResult> {
  onProgress?.('Starting AI analysis...');

  const userPrompt = buildUserPrompt(companyName, sector, description);

  onProgress?.('Sending request to Claude...');
  logger.info('Starting Claude analysis', { companyName, sector });

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  onProgress?.('Parsing AI response...');

  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let rawJson = textBlock.text.trim();
  // Strip markdown code fences if present
  if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    logger.error('Failed to parse Claude JSON response', rawJson);
    throw new Error('Failed to parse AI response as JSON');
  }

  const result = analysisResultSchema.parse(parsed);
  onProgress?.('Analysis complete');

  logger.info('Claude analysis complete', { companyName, compositeScore: result.composite_score });
  return result;
}
