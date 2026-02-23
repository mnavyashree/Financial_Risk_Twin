import { motion } from 'framer-motion';
import { Activity, Zap, LogOut, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <motion.header
      className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">RiskTwin</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Financial Risk Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI-Powered</span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Button
                variant={location.pathname === '/history' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('/history')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Clock className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">History</span>
              </Button>
              <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
