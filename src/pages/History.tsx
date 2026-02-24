import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardHeader } from '@/components/DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Download, RefreshCw, Trash2, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RiskScore, StartupInputs, Suggestion, Scenario } from '@/types/risk';

interface AnalysisRecord {
  id: string;
  company_name: string;
  industry: string;
  inputs: StartupInputs;
  risk_score: RiskScore;
  suggestions: Suggestion[];
  scenarios: Scenario[];
  created_at: string;
}

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: analyses, isLoading, refetch } = useQuery({
    queryKey: ['risk-analyses', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('risk_analyses') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as AnalysisRecord[];
    },
    enabled: !!user,
  });

  const handleDownload = async (analysisId: string, companyName: string) => {
    setDownloadingId(analysisId);
    try {
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: { analysisId },
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
      toast({ title: 'Download failed', description: 'Could not generate report.', variant: 'destructive' });
    }
    setDownloadingId(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from('risk_analyses') as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } else {
      toast({ title: 'Report deleted' });
      refetch();
    }
  };

  const riskColors: Record<string, string> = {
    Low: 'text-success bg-success/10 border-success/30',
    Medium: 'text-warning bg-warning/10 border-warning/30',
    High: 'text-destructive bg-destructive/10 border-destructive/30',
    Critical: 'text-destructive bg-destructive/10 border-destructive/30',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'var(--gradient-glow)' }} />
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 relative">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Analysis History</h2>
            <p className="text-sm text-muted-foreground">View, download, or recalculate past reports</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (!analyses || analyses.length === 0) && (
          <motion.div
            className="glass-card p-12 text-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-foreground font-semibold">No Reports Yet</h3>
            <p className="text-sm text-muted-foreground">
              Go to the dashboard and run your first analysis to see it here.
            </p>
            <Button onClick={() => navigate('/')} className="mt-4">Go to Dashboard</Button>
          </motion.div>
        )}

        <div className="space-y-3">
          {analyses?.map((a, i) => {
            const isExpanded = expandedId === a.id;
            return (
              <motion.div
                key={a.id}
                className="glass-card overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground truncate">{a.company_name}</h3>
                      <p className="text-xs text-muted-foreground">{a.industry} • {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColors[a.risk_score.label]}`}>
                      {a.risk_score.overall}/100
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <MetricItem label="Revenue" value={`₹${Number(a.inputs.monthlyRevenue).toLocaleString('en-IN')}`} />
                          <MetricItem label="Burn Rate" value={`₹${Number(a.inputs.monthlyBurnRate).toLocaleString('en-IN')}`} />
                          <MetricItem label="Cash" value={`₹${Number(a.inputs.cashOnHand).toLocaleString('en-IN')}`} />
                          <MetricItem label="Growth" value={`${a.inputs.revenueGrowthRate}%`} />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <ScoreBar label="Financial" value={a.risk_score.financial} />
                          <ScoreBar label="Operational" value={a.risk_score.operational} />
                          <ScoreBar label="Market" value={a.risk_score.market} />
                          <ScoreBar label="Growth" value={a.risk_score.growth} />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleDownload(a.id, a.company_name); }}
                            disabled={downloadingId === a.id}
                          >
                            {downloadingId === a.id ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); navigate('/', { state: { recalculate: a.inputs } }); }}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recalculate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border/20">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-mono font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value > 70 ? 'bg-destructive' : value > 50 ? 'bg-warning' : value > 30 ? 'bg-warning' : 'bg-success';
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-foreground">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default History;
