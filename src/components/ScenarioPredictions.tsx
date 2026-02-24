import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GitBranch, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Scenario } from '@/types/risk';

interface ScenarioPredictionsProps {
  scenarios: Scenario[];
}

export function ScenarioPredictions({ scenarios }: ScenarioPredictionsProps) {
  const [activeView, setActiveView] = useState<'revenue' | 'cash'>('revenue');
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const chartData = scenarios[0]?.months.map((month, i) => {
    const point: Record<string, string | number> = { month };
    scenarios.forEach(s => {
      point[`${s.id}_revenue`] = s.projectedRevenue[i];
      point[`${s.id}_cash`] = s.projectedCash[i];
    });
    return point;
  }) || [];

  const scenarioMeta = {
    optimistic: { color: 'hsl(160, 60%, 45%)', icon: TrendingUp, label: 'Optimistic' },
    baseline: { color: 'hsl(200, 70%, 50%)', icon: Minus, label: 'Baseline' },
    pessimistic: { color: 'hsl(0, 72%, 51%)', icon: TrendingDown, label: 'Pessimistic' },
  } as const;

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  return (
    <motion.div
      className="glass-card p-6 space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Scenario Predictions</h2>
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {(['revenue', 'cash'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeView === view
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {view === 'revenue' ? 'Revenue' : 'Cash Position'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis dataKey="month" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} stroke="hsl(220, 14%, 18%)" />
            <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} stroke="hsl(220, 14%, 18%)" tickFormatter={formatCurrency} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220, 18%, 10%)',
                border: '1px solid hsl(220, 14%, 18%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [formatCurrency(value), '']}
              labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
            />
            <Legend />
            {scenarios.map(s => {
              const meta = scenarioMeta[s.id as keyof typeof scenarioMeta];
              const key = `${s.id}_${activeView}`;
              const isActive = !activeScenario || activeScenario === s.id;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={meta?.color}
                  name={meta?.label}
                  strokeWidth={isActive ? 2.5 : 1}
                  opacity={isActive ? 1 : 0.2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scenarios.map(s => {
          const meta = scenarioMeta[s.id as keyof typeof scenarioMeta];
          const Icon = meta?.icon || Minus;
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveScenario(isActive ? null : s.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isActive
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/30 bg-muted/20 hover:border-border/60'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5" style={{ color: meta?.color }} />
                <span className="text-xs font-semibold text-foreground">{meta?.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{s.description}</p>
              <div className="mt-2 font-mono text-xs" style={{ color: meta?.color }}>
                {s.riskChange > 0 ? '+' : ''}{s.riskChange}% risk
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
