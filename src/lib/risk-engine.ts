import { StartupInputs, RiskScore, Suggestion, Scenario } from '@/types/risk';

export function calculateRiskScore(inputs: StartupInputs): RiskScore {
  const runway = inputs.monthlyBurnRate > 0 ? inputs.cashOnHand / inputs.monthlyBurnRate : 24;
  
  // Financial risk (0-100, higher = more risk)
  let financial = 0;
  if (runway < 3) financial += 40;
  else if (runway < 6) financial += 25;
  else if (runway < 12) financial += 15;
  else financial += 5;
  
  if (inputs.debtToEquityRatio > 2) financial += 30;
  else if (inputs.debtToEquityRatio > 1) financial += 20;
  else financial += 5;
  
  if (inputs.operatingMargin < -50) financial += 30;
  else if (inputs.operatingMargin < -20) financial += 20;
  else if (inputs.operatingMargin < 0) financial += 10;

  financial = Math.min(100, financial);

  // Operational risk
  let operational = 0;
  const revenuePerEmployee = inputs.headcount > 0 ? inputs.monthlyRevenue / inputs.headcount : 0;
  if (revenuePerEmployee < 5000) operational += 35;
  else if (revenuePerEmployee < 10000) operational += 20;
  else operational += 5;
  
  if (inputs.churnRate > 10) operational += 35;
  else if (inputs.churnRate > 5) operational += 20;
  else operational += 5;

  const burnMultiple = inputs.monthlyRevenue > 0 ? inputs.monthlyBurnRate / inputs.monthlyRevenue : 5;
  if (burnMultiple > 3) operational += 30;
  else if (burnMultiple > 1.5) operational += 15;
  else operational += 5;

  operational = Math.min(100, operational);

  // Market risk
  let market = 30; // base market risk
  if (inputs.customerCount < 10) market += 30;
  else if (inputs.customerCount < 100) market += 15;
  else market += 0;

  if (inputs.churnRate > 8) market += 20;
  else if (inputs.churnRate > 3) market += 10;

  market = Math.min(100, market);

  // Growth risk
  let growth = 0;
  if (inputs.revenueGrowthRate < 0) growth += 50;
  else if (inputs.revenueGrowthRate < 10) growth += 35;
  else if (inputs.revenueGrowthRate < 20) growth += 20;
  else growth += 5;

  if (inputs.monthlyRevenue === 0) growth += 30;
  growth = Math.min(100, growth);

  const overall = Math.round(financial * 0.35 + operational * 0.25 + market * 0.2 + growth * 0.2);

  let label: RiskScore['label'] = 'Low';
  if (overall > 70) label = 'Critical';
  else if (overall > 50) label = 'High';
  else if (overall > 30) label = 'Medium';

  return { overall, financial, operational, market, growth, label };
}

export function generateSuggestions(inputs: StartupInputs, risk: RiskScore): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const runway = inputs.monthlyBurnRate > 0 ? inputs.cashOnHand / inputs.monthlyBurnRate : 24;

  if (runway < 6) {
    suggestions.push({
      id: '1', title: 'Extend Cash Runway',
      description: `Current runway is ${runway.toFixed(1)} months. Reduce monthly burn by 20-30% through cost optimization, renegotiating contracts, or deferring non-critical hires.`,
      impact: 'high', category: 'Financial'
    });
  }

  if (inputs.churnRate > 5) {
    suggestions.push({
      id: '2', title: 'Reduce Customer Churn',
      description: `${inputs.churnRate}% monthly churn is above healthy thresholds. Implement customer success programs, improve onboarding, and conduct exit interviews.`,
      impact: 'high', category: 'Operational'
    });
  }

  if (inputs.revenueGrowthRate < 15) {
    suggestions.push({
      id: '3', title: 'Accelerate Revenue Growth',
      description: 'Focus on expansion revenue from existing customers, optimize pricing strategy, and invest in high-ROI acquisition channels.',
      impact: 'high', category: 'Growth'
    });
  }

  if (inputs.operatingMargin < -30) {
    suggestions.push({
      id: '4', title: 'Improve Unit Economics',
      description: 'Analyze CAC/LTV ratios, optimize cost of goods sold, and identify paths to contribution margin positivity.',
      impact: 'medium', category: 'Financial'
    });
  }

  if (inputs.debtToEquityRatio > 1) {
    suggestions.push({
      id: '5', title: 'Rebalance Capital Structure',
      description: 'High debt-to-equity ratio increases financial vulnerability. Consider converting debt to equity or negotiating better terms.',
      impact: 'medium', category: 'Financial'
    });
  }

  suggestions.push({
    id: '6', title: 'Diversify Revenue Streams',
    description: 'Reduce concentration risk by expanding into adjacent markets, launching complementary products, or adding service tiers.',
    impact: 'low', category: 'Market'
  });

  return suggestions.slice(0, 5);
}

export function generateScenarios(inputs: StartupInputs): Scenario[] {
  const months = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
  const baseRevenue = inputs.monthlyRevenue || 10000;
  const baseCash = inputs.cashOnHand || 100000;
  const burn = inputs.monthlyBurnRate || 20000;
  const growthRate = (inputs.revenueGrowthRate || 5) / 100;

  const optimistic: Scenario = {
    id: 'optimistic', name: 'Optimistic',
    description: 'Strong growth with improved margins and successful fundraise.',
    projectedRevenue: [], projectedCash: [], riskChange: -15, months
  };

  const baseline: Scenario = {
    id: 'baseline', name: 'Baseline',
    description: 'Current trajectory maintained with steady growth.',
    projectedRevenue: [], projectedCash: [], riskChange: 0, months
  };

  const pessimistic: Scenario = {
    id: 'pessimistic', name: 'Pessimistic',
    description: 'Slower growth, increased churn, and market headwinds.',
    projectedRevenue: [], projectedCash: [], riskChange: 20, months
  };

  let optRev = baseRevenue, optCash = baseCash;
  let baseRev = baseRevenue, baseCash2 = baseCash;
  let pessRev = baseRevenue, pessCash = baseCash;

  for (let i = 0; i < 12; i++) {
    optRev *= (1 + growthRate * 1.5);
    optCash += optRev - burn * 0.8;
    optimistic.projectedRevenue.push(Math.round(optRev));
    optimistic.projectedCash.push(Math.round(optCash));

    baseRev *= (1 + growthRate);
    baseCash2 += baseRev - burn;
    baseline.projectedRevenue.push(Math.round(baseRev));
    baseline.projectedCash.push(Math.round(baseCash2));

    pessRev *= (1 + growthRate * 0.3);
    pessCash += pessRev - burn * 1.2;
    pessimistic.projectedRevenue.push(Math.round(pessRev));
    pessimistic.projectedCash.push(Math.round(pessCash));
  }

  return [optimistic, baseline, pessimistic];
}
