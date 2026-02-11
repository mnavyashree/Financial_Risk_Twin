import { motion } from 'framer-motion';
import { Activity, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { RiskScore } from '@/types/risk';

interface RiskScoreDisplayProps {
  score: RiskScore;
}

const riskColors: Record<RiskScore['label'], string> = {
  Low: 'text-success',
  Medium: 'text-warning',
  High: 'text-destructive',
  Critical: 'text-risk-critical',
};

const riskBgColors: Record<RiskScore['label'], string> = {
  Low: 'bg-success/10 border-success/30',
  Medium: 'bg-warning/10 border-warning/30',
  High: 'bg-destructive/10 border-destructive/30',
  Critical: 'bg-risk-critical/10 border-risk-critical/30',
};

function ScoreRing({ value, size = 160, label }: { value: number; size?: number; label: string }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const color = value > 70 ? 'var(--destructive)' : value > 50 ? 'var(--warning)' : value > 30 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={`hsl(${color})`} strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="font-mono text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {value}
          </motion.span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function MetricBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color = value > 70 ? 'bg-destructive' : value > 50 ? 'bg-warning' : value > 30 ? 'bg-warning' : 'bg-success';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-secondary-foreground">{label}</span>
        </div>
        <span className="font-mono text-sm font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  );
}

export function RiskScoreDisplay({ score }: RiskScoreDisplayProps) {
  return (
    <motion.div
      className="glass-card p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Risk Assessment</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${riskBgColors[score.label]} ${riskColors[score.label]}`}>
          {score.label} Risk
        </div>
      </div>

      <div className="flex justify-center">
        <ScoreRing value={score.overall} label="Overall Risk Score" />
      </div>

      <div className="space-y-4">
        <MetricBar label="Financial Risk" value={score.financial} icon={Activity} />
        <MetricBar label="Operational Risk" value={score.operational} icon={Shield} />
        <MetricBar label="Market Risk" value={score.market} icon={AlertTriangle} />
        <MetricBar label="Growth Risk" value={score.growth} icon={TrendingUp} />
      </div>
    </motion.div>
  );
}
