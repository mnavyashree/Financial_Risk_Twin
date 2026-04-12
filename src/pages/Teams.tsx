import { DashboardHeader } from '@/components/DashboardHeader';
import { TeamPanel } from '@/components/TeamPanel';

const Teams = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'var(--gradient-glow)' }} />
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 relative max-w-2xl">
        <h2 className="text-2xl font-bold text-foreground mb-2">Team Collaboration</h2>
        <p className="text-sm text-muted-foreground mb-6">Create teams, invite members, and share analyses.</p>
        <TeamPanel />
      </main>
    </div>
  );
};

export default Teams;
