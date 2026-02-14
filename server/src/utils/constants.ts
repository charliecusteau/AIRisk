import { DomainDefinition } from '../types';

export const DOMAINS: DomainDefinition[] = [
  {
    number: 1,
    name: 'Customer Demand',
    description: 'Assesses whether the software\'s core use case will persist and remain valuable in an AI-enabled world.',
    questions: [
      {
        key: 'durability_of_use_case',
        text: 'Durability of use case: Will the software\'s use case persist in an AI-enabled world?',
        guidance: 'Consider whether AI could fully automate or eliminate the need for this software. E.g., call center software may be at high risk if AI agents handle calls directly.',
      },
      {
        key: 'cost_of_failure_switching',
        text: 'High cost of failure / switching costs: Will customers tolerate unreliability of AI or risk moving solutions?',
        guidance: 'Consider mission-criticality, regulatory requirements, and how painful it would be to switch. Higher switching costs = lower risk.',
      },
      {
        key: 'customer_sophistication',
        text: 'Customer sophistication: Will customers rely on the software vendor to provide AI functionality or vibe code their own in-house?',
        guidance: 'Less sophisticated customers (e.g., SMBs) are more likely to stay with vendors. Highly technical customers may build their own AI solutions.',
      },
    ],
  },
  {
    number: 2,
    name: 'Moats',
    description: 'Evaluates the structural characteristics, competitive moats, and pricing resilience of the software product.',
    questions: [
      {
        key: 'data_control_system_of_record',
        text: 'Control over data / system of record vs. workflow: Does the business manage critical customer data or is it purely workflow based?',
        guidance: 'Systems of record (managing complex, real-time data) are harder to displace than pure workflow tools. Data gravity creates moats.',
      },
      {
        key: 'platform_vs_point',
        text: 'Platform vs point solution: Is the product the backbone of where work gets done, or simply an add-on tool?',
        guidance: 'Platforms that are the "choke point" for customer workflows are more defensible than point solutions that can be easily replaced.',
      },
      {
        key: 'pricing_model',
        text: 'Pricing model: Is pricing based on consumption, seats, or outcomes? Is the pricing model moving in that direction?',
        guidance: 'Seat-based pricing is at risk as AI reduces headcount. Consumption and outcome-based models are more resilient to AI-driven seat compression.',
      },
      {
        key: 'structural_moats',
        text: 'Does the business have network effects, proprietary data, a self-improving product, a captured market, or regulatory lock-in?',
        guidance: 'Evaluate each moat type: network effects (value grows with users), proprietary data (unique training data), self-improving loops, captive customers, regulatory barriers.',
      },
    ],
  },
  {
    number: 3,
    name: 'Tech Stack',
    description: 'Evaluates the company\'s technical foundation and readiness to incorporate AI.',
    questions: [
      {
        key: 'cloud_native_modern',
        text: 'Is the tech cloud-native, modular, and modern?',
        guidance: 'Legacy on-premise architectures are harder to integrate with AI. Cloud-native, microservices-based architectures can more easily adopt AI capabilities.',
      },
      {
        key: 'tech_debt',
        text: 'Is there tech debt?',
        guidance: 'Significant tech debt slows AI adoption and makes the company more vulnerable to nimble AI-native competitors.',
      },
      {
        key: 'integration_capability',
        text: 'Does the software easily integrate with other software?',
        guidance: 'Strong API ecosystem and integration capabilities allow the product to participate in AI-enhanced workflows rather than being bypassed.',
      },
      {
        key: 'ai_strategy',
        text: 'Does the company have a clear AI strategy?',
        guidance: 'Evaluate whether the company has articulated and is executing on a coherent AI strategy, including product roadmap, partnerships, and investment.',
      },
    ],
  },
  {
    number: 4,
    name: 'AI Competition',
    description: 'Evaluates the competitive threat from both incumbent AI offerings and AI-native startups.',
    questions: [
      {
        key: 'incumbent_ai_comparison',
        text: 'How does the company\'s products compare with other incumbent AI offerings?',
        guidance: 'Assess whether competitors in the same space have stronger AI capabilities, better AI integration, or more advanced AI features.',
      },
      {
        key: 'ai_native_startups',
        text: 'Are there AI-native startups attacking the same use case? Are they well funded?',
        guidance: 'Well-funded AI-native startups pose a significant threat as they can build from scratch without legacy constraints. Consider funding levels and traction.',
      },
    ],
  },
];

export const SUB_SECTOR_CLASSIFICATIONS = {
  'Expected Tailwinds': [
    'Cybersecurity',
    'Data Management',
    'Hardware / Infrastructure',
  ],
  'Low Risk / Insulated': [
    'Office of the CFO / ERP',
    'Tech Services',
    'Classifieds / Marketplaces',
    'Vertical Software',
  ],
  'Medium Risk': [
    'Application Software',
    'Human Capital Management',
    'DevOps / Infrastructure Software',
  ],
  'High Risk': [
    'CRM / Customer Engagement',
    'EdTech',
    'AdTech',
    'Data Analytics',
  ],
};

export const ALL_SECTORS = Object.values(SUB_SECTOR_CLASSIFICATIONS).flat();

export const RATING_TO_SCORE: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export const COMPOSITE_RATING_THRESHOLDS: { max: number; rating: string }[] = [
  { max: 2.5, rating: 'Low Risk' },
  { max: 4.0, rating: 'Medium-Low Risk' },
  { max: 5.5, rating: 'Medium Risk' },
  { max: 7.5, rating: 'Medium-High Risk' },
  { max: 10, rating: 'High Risk' },
];
