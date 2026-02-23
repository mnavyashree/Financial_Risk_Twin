import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Target } from 'lucide-react';

interface MatchedScenario {
  id: string;
  name: string;
  description: string;
  risk_classification: string;
  recommendation: string;
  matchScore: number;
}

interface ScenarioMatchDisplayProps {
  scenarios: MatchedScenario[];
}

const classColors: Record<string, string> = {
  Critical: 'text-destructive bg-destructive/10 border-destructive/20',
  High: 'text-warning bg-warning/10 border-warning/20',
  Medium: 'text-warning bg-warning/10 border-warning/20',
  Low: 'text-success bg-success/10 border-success/20',
};

const classIcons: Record<string, React.ElementType> = {
  Critical: AlertTriangle,
  High: AlertTriangle,
  Medium: Info,
  Low: CheckCircle,
};

export function ScenarioMatchDisplay({ scenarios }: ScenarioMatchDisplayProps) {
  if (scenarios.length === 0) return null;

  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Scenario Match</h2>
      </div>

      <div className="space-y-3">
        {scenarios.map((s, i) => {
          const Icon = classIcons[s.risk_classification] || Info;
          return (
            <motion.div
              key={s.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shrink-0 ${classColors[s.risk_classification] || ''}`}>
                  <Icon className="h-3 w-3" />
                  {s.risk_classification}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{s.description}</p>
              <div className="p-2 rounded bg-primary/5 border border-primary/10">
                <p className="text-xs text-foreground">
                  <span className="font-semibold text-primary">Recommendation:</span>{' '}
                  {s.recommendation}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${s.matchScore * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.7 + i * 0.1 }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {Math.round(s.matchScore * 100)}% match
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
