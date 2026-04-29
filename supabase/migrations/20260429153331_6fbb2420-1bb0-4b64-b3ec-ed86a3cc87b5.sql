DROP POLICY IF EXISTS "Team members can view their team" ON public.teams;

CREATE POLICY "Team members can view their team"
ON public.teams
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_team_member(auth.uid(), id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_team_id_fkey'
      AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members
    ADD CONSTRAINT team_members_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);