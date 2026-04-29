DROP POLICY IF EXISTS "Team owners can delete team" ON public.teams;

CREATE POLICY "Team creators or owners can delete team"
ON public.teams
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'owner'
  )
);

DROP POLICY IF EXISTS "Team owners can update team" ON public.teams;

CREATE POLICY "Team creators or owners can update team"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'owner'
  )
);

-- Cascade deletes so removing a team cleans up children automatically
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.analysis_shares
  DROP CONSTRAINT IF EXISTS analysis_shares_team_id_fkey;
ALTER TABLE public.analysis_shares
  ADD CONSTRAINT analysis_shares_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;