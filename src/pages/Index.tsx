import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';
import { RiskInputForm } from '@/components/RiskInputForm';
import { RiskScoreDisplay } from '@/components/RiskScoreDisplay';
import { SuggestionsPanel } from '@/components/SuggestionsPanel';
import { ScenarioPredictions } from '@/components/ScenarioPredictions';
import { FileUpload } from '@/components/FileUpload';
import { ScenarioMatchDisplay } from '@/components/ScenarioMatchDisplay';
import { calculateRiskScore, generateSuggestions, generateScenarios } from '@/lib/risk-engine';
import { StartupInputs, RiskScore, Suggestion, Scenario } from '@/types/risk';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatchedScenario {
  id: string;
  name: string;
  description: string;
  risk_classification: string;
  recommendation: string;
  matchScore: number;
}

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [matchedScenarios, setMatchedScenarios] = useState<MatchedScenario[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [currentInputs, setCurrentInputs] = useState<StartupInputs | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [csvOverrides, setCsvOverrides] = useState<Partial<StartupInputs> | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  // Handle recalculate from history
  const recalculateInputs = (location.state as { recalculate?: StartupInputs } | null)?.recalculate;

  useEffect(() => {
    if (recalculateInputs) {
      setCsvOverrides(recalculateInputs);
      // Clear the state so it doesn't persist
      window.history.replaceState({}, document.title);
    }
  }, [recalculateInputs]);

  const handleAnalyze = async (inputs: StartupInputs) => {
    setIsAnalyzing(true);
    setCompanyName(inputs.companyName);
    setCurrentInputs(inputs);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const score = calculateRiskScore(inputs);
    const sugg = generateSuggestions(inputs, score);
    const scen = generateScenarios(inputs);

    setRiskScore(score);
    setSuggestions(sugg);
    setScenarios(scen);

    // Save to database
    if (user) {
      try {
        const { data, error } = await (supabase
          .from('risk_analyses') as any)
          .insert({
            user_id: user.id,
            company_name: inputs.companyName,
            industry: inputs.industry,
            inputs: inputs,
            risk_score: score,
            suggestions: sugg,
            scenarios: scen,
          })
          .select('id')
          .single();

        if (!error && data) {
          setCurrentAnalysisId(data.id);
        }
      } catch {
        // Non-blocking - analysis still works without save
      }
    }

    // Match against predefined scenarios
    try {
      const { data: matchData } = await supabase.functions.invoke('match-scenario', {
        body: { inputs },
      });
      if (matchData?.matchedScenarios) {
        setMatchedScenarios(matchData.matchedScenarios);
      }
    } catch {
      // Non-blocking
    }

    setIsAnalyzing(false);
  };

  const handleExport = async () => {
    if (!currentAnalysisId) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: { analysisId: currentAnalysisId },
      });
      if (error) throw error;

      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RiskTwin_Report_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
    setDownloading(false);
  };

  const handleCSVParsed = (data: Partial<StartupInputs>) => {
    setCsvOverrides(data);
    toast({ title: 'CSV data loaded', description: 'Fields have been auto-populated.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'var(--gradient-glow)' }} />
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 relative">
        {!riskScore && !isAnalyzing && (
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Analyze Your Startup's <span className="gradient-text">Financial Risk</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Input your startup's financial metrics to get AI-driven risk analysis,
              actionable suggestions, and scenario-based predictions.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <FileUpload onCSVParsed={handleCSVParsed} />
            <RiskInputForm onSubmit={handleAnalyze} isAnalyzing={isAnalyzing} csvOverrides={csvOverrides} />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {isAnalyzing && (
                <motion.div
                  key="loading"
                  className="glass-card p-12 flex flex-col items-center justify-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-2 border-primary/10 border-b-primary/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.7s' }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-medium">Analyzing risk profile...</p>
                    <p className="text-xs text-muted-foreground mt-1">Running financial models and generating predictions</p>
                  </div>
                </motion.div>
              )}

              {riskScore && !isAnalyzing && (
                <motion.div key="results" className="space-y-6">
                  {companyName && (
                    <motion.div
                      className="glass-card p-4 glow-border flex items-center justify-between"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div>
                        <p className="text-sm text-muted-foreground">Analysis for</p>
                        <h3 className="text-xl font-bold text-foreground">{companyName}</h3>
                      </div>
                      {currentAnalysisId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleExport}
                          disabled={downloading}
                        >
                          {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                          Export Report
                        </Button>
                      )}
                    </motion.div>
                  )}
                  <RiskScoreDisplay score={riskScore} />
                  <ScenarioMatchDisplay scenarios={matchedScenarios} />
                  <SuggestionsPanel suggestions={suggestions} />
                  <ScenarioPredictions scenarios={scenarios} />
                </motion.div>
              )}

              {!riskScore && !isAnalyzing && (
                <motion.div
                  key="empty"
                  className="glass-card p-12 flex flex-col items-center justify-center text-center gap-3 min-h-[400px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-primary/50 animate-pulse-glow" />
                    </div>
                  </div>
                  <h3 className="text-foreground font-semibold">Ready to Analyze</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Fill in your startup's financial data on the left to generate a comprehensive risk assessment with AI-powered insights.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
