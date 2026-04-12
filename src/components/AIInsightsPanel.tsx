import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { StartupInputs, RiskScore } from '@/types/risk';

interface AIInsightsPanelProps {
  inputs: StartupInputs;
  riskScore: RiskScore;
}

export function AIInsightsPanel({ inputs, riskScore }: AIInsightsPanelProps) {
  const [insight, setInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchInsight = async () => {
    setIsLoading(true);
    setInsight('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-risk-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ inputs, riskScore }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to get AI insights');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setInsight(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      setHasLoaded(true);
    } catch (e) {
      console.error('AI insights error:', e);
      setInsight('Unable to generate AI insights at this time. Please try again later.');
      setHasLoaded(true);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI Risk Commentary</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Powered by Lovable AI
            </p>
          </div>
        </div>
        {hasLoaded && (
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchInsight}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      <div className="min-h-[120px]">
        {isLoading && !insight && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing your financial data...</span>
          </div>
        )}
        {insight && (
          <motion.div
            className="prose prose-sm prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-wrap">
              {insight}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
