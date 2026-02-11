export interface StartupInputs {
  companyName: string;
  industry: string;
  monthlyRevenue: number;
  monthlyBurnRate: number;
  totalFunding: number;
  cashOnHand: number;
  headcount: number;
  customerCount: number;
  churnRate: number;
  revenueGrowthRate: number;
  debtToEquityRatio: number;
  operatingMargin: number;
}

export interface RiskScore {
  overall: number; // 0-100
  financial: number;
  operational: number;
  market: number;
  growth: number;
  label: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  projectedRevenue: number[];
  projectedCash: number[];
  riskChange: number;
  months: string[];
}

export const defaultInputs: StartupInputs = {
  companyName: '',
  industry: 'SaaS',
  monthlyRevenue: 0,
  monthlyBurnRate: 0,
  totalFunding: 0,
  cashOnHand: 0,
  headcount: 0,
  customerCount: 0,
  churnRate: 0,
  revenueGrowthRate: 0,
  debtToEquityRatio: 0,
  operatingMargin: 0,
};

export const industries = [
  'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'AI/ML',
  'Edtech', 'Cleantech', 'Biotech', 'Logistics', 'Other'
];
