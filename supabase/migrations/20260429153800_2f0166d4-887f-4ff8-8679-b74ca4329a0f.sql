CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

CREATE OR REPLACE FUNCTION private.is_team_admin(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id AND role IN ('owner', 'admin')
  )
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_team_admin(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Team members can view their team" ON public.teams;
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can remove members" ON public.team_members;

CREATE POLICY "Team members can view their team"
ON public.teams
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR private.is_team_member(auth.uid(), id)
);

CREATE POLICY "Team members can view members"
ON public.team_members
FOR SELECT
TO authenticated
USING (private.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team admins can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (private.is_team_admin(auth.uid(), team_id) OR auth.uid() = user_id);

CREATE POLICY "Team admins can remove members"
ON public.team_members
FOR DELETE
TO authenticated
USING (private.is_team_admin(auth.uid(), team_id) OR auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;