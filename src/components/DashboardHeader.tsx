import { motion } from 'framer-motion';
import { Activity, Zap } from 'lucide-react';

export function DashboardHeader() {
  return (
    <motion.header
      className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">RiskTwin</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Financial Risk Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">AI-Powered</span>
        </div>
      </div>
    </motion.header>
  );
}
