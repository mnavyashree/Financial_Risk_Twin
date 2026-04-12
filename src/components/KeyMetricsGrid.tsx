import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, IndianRupee, Percent, Building2 } from 'lucide-react';
import { StartupInputs } from '@/types/risk';

interface KeyMetricsGridProps {
  inputs: StartupInputs;
}

export function KeyMetricsGrid({ inputs }: KeyMetricsGridProps) {
  const runway = inputs.monthlyBurnRate > 0 ? inputs.cashOnHand / inputs.monthlyBurnRate : 0;
  const burnMultiple = inputs.monthlyRevenue > 0 ? inputs.monthlyBurnRate / inputs.monthlyRevenue : 0;
  const revenuePerEmployee = inputs.headcount > 0 ? inputs.monthlyRevenue / inputs.headcount : 0;

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const metrics = [
    {
      label: 'Monthly Revenue',
      value: formatINR(inputs.monthlyRevenue),
      icon: IndianRupee,
      color: 'text-success',
      bgColor: 'bg-success/10 border-success/20',
    },
    {
      label: 'Burn Multiple',
      value: burnMultiple.toFixed(1) + 'x',
      icon: burnMultiple > 2 ? TrendingDown : TrendingUp,
      color: burnMultiple > 2 ? 'text-destructive' : 'text-success',
      bgColor: burnMultiple > 2 ? 'bg-destructive/10 border-destructive/20' : 'bg-success/10 border-success/20',
    },
    {
      label: 'Team Size',
      value: inputs.headcount.toString(),
      icon: Users,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10 border-chart-2/20',
    },
    {
      label: 'Rev/Employee',
      value: formatINR(revenuePerEmployee),
      icon: Building2,
      color: revenuePerEmployee > 10000 ? 'text-success' : 'text-warning',
      bgColor: revenuePerEmployee > 10000 ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20',
    },
    {
      label: 'Churn Rate',
      value: inputs.churnRate + '%',
      icon: Percent,
      color: inputs.churnRate > 5 ? 'text-destructive' : 'text-success',
      bgColor: inputs.churnRate > 5 ? 'bg-destructive/10 border-destructive/20' : 'bg-success/10 border-success/20',
    },
    {
      label: 'Growth Rate',
      value: inputs.revenueGrowthRate + '%',
      icon: inputs.revenueGrowthRate > 0 ? TrendingUp : TrendingDown,
      color: inputs.revenueGrowthRate > 10 ? 'text-success' : 'text-warning',
      bgColor: inputs.revenueGrowthRate > 10 ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20',
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          className={`glass-card p-4 flex flex-col gap-2 border ${metric.bgColor}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="flex items-center gap-2">
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{metric.label}</span>
          </div>
          <span className={`font-mono text-lg font-bold ${metric.color}`}>{metric.value}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
