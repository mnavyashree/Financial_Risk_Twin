
-- Drop the recursive policies
DROP POLICY IF EXISTS "Team admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;

-- Create a security definer function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
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

CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id uuid, _team_id uuid)
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

-- Recreate policies using the security definer functions
CREATE POLICY "Team members can view members"
ON public.team_members FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team admins can add members"
ON public.team_members FOR INSERT
WITH CHECK (public.is_team_admin(auth.uid(), team_id) OR (auth.uid() = user_id));

CREATE POLICY "Team admins can remove members"
ON public.team_members FOR DELETE
USING (public.is_team_admin(auth.uid(), team_id) OR (auth.uid() = user_id));
