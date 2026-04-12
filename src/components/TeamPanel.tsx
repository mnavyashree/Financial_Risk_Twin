import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, UserPlus, Crown, Shield, Eye, User, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const roleIcons: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  owner: 'text-warning bg-warning/10',
  admin: 'text-primary bg-primary/10',
  member: 'text-secondary-foreground bg-secondary',
  viewer: 'text-muted-foreground bg-muted',
};

export function TeamPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from('team_members') as any)
        .select('team_id, role, teams:team_id(id, name, created_by, created_at)')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', selectedTeamId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('team_members') as any)
        .select('*, profiles:user_id(display_name, email)')
        .eq('team_id', selectedTeamId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedTeamId,
  });

  const createTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    setIsCreating(true);
    try {
      const { data: team, error } = await (supabase.from('teams') as any)
        .insert({ name: newTeamName.trim(), created_by: user.id })
        .select('id')
        .single();
      if (error) throw error;

      // Add creator as owner
      await (supabase.from('team_members') as any)
        .insert({ team_id: team.id, user_id: user.id, role: 'owner' });

      setNewTeamName('');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team created successfully!' });
    } catch (e) {
      toast({ title: 'Failed to create team', variant: 'destructive' });
    }
    setIsCreating(false);
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeamId) return;
    try {
      // Look up user by email in profiles
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('user_id')
        .eq('email', inviteEmail.trim())
        .single();

      if (!profile) {
        toast({ title: 'User not found', description: 'That email is not registered.', variant: 'destructive' });
        return;
      }

      const { error } = await (supabase.from('team_members') as any)
        .insert({ team_id: selectedTeamId, user_id: profile.user_id, role: inviteRole });

      if (error) throw error;

      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({ title: 'Member added!' });
    } catch (e: any) {
      toast({ title: 'Failed to add member', description: e?.message, variant: 'destructive' });
    }
  };

  const removeMember = async (memberId: string) => {
    await (supabase.from('team_members') as any).delete().eq('id', memberId);
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
    toast({ title: 'Member removed' });
  };

  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Teams</h2>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" /> New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
              <Button onClick={createTeam} disabled={isCreating || !newTeamName.trim()} className="w-full">
                {isCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!teams || teams.length === 0) && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No teams yet. Create one to start collaborating!</p>
        </div>
      )}

      <div className="space-y-2">
        {teams?.map((membership: any) => {
          const team = membership.teams;
          const isSelected = selectedTeamId === team.id;
          const RoleIcon = roleIcons[membership.role] || User;

          return (
            <div key={team.id}>
              <button
                onClick={() => setSelectedTeamId(isSelected ? null : team.id)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-muted/20 hover:border-border/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground text-sm">{team.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[membership.role]}`}>
                    <RoleIcon className="h-3 w-3 inline mr-1" />
                    {membership.role}
                  </span>
                </div>
              </button>

              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-2 ml-4 space-y-3"
                >
                  {/* Members list */}
                  <div className="space-y-1">
                    {teamMembers?.map((m: any) => {
                      const MRoleIcon = roleIcons[m.role] || User;
                      return (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <MRoleIcon className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{m.profiles?.display_name || 'Unknown'}</p>
                              <p className="text-[10px] text-muted-foreground">{m.profiles?.email}</p>
                            </div>
                          </div>
                          {membership.role === 'owner' && m.user_id !== user?.id && (
                            <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Invite form */}
                  {['owner', 'admin'].includes(membership.role) && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="text-sm h-8"
                      />
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={inviteMember} className="h-8">
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
