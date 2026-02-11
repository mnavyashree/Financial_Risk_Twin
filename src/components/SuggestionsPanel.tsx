import { motion } from 'framer-motion';
import { Lightbulb, ArrowUpRight, ArrowRight, ArrowDownRight } from 'lucide-react';
import { Suggestion } from '@/types/risk';

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
}

const impactIcons = {
  high: ArrowUpRight,
  medium: ArrowRight,
  low: ArrowDownRight,
};

const impactColors = {
  high: 'text-success bg-success/10 border-success/20',
  medium: 'text-warning bg-warning/10 border-warning/20',
  low: 'text-muted-foreground bg-muted/50 border-border/50',
};

export function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">AI-Driven Suggestions</h2>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, i) => {
          const Icon = impactIcons[suggestion.impact];
          return (
            <motion.div
              key={suggestion.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-2 hover:border-primary/20 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{suggestion.title}</h3>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shrink-0 ${impactColors[suggestion.impact]}`}>
                  <Icon className="h-3 w-3" />
                  {suggestion.impact}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.description}</p>
              <span className="inline-block text-[10px] uppercase tracking-wider text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded">
                {suggestion.category}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
