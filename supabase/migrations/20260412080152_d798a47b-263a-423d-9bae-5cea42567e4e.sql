-- Teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Analysis comments table
CREATE TABLE public.analysis_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.risk_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_comments ENABLE ROW LEVEL SECURITY;

-- Analysis shares table
CREATE TABLE public.analysis_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.risk_analyses(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(analysis_id, team_id)
);

ALTER TABLE public.analysis_shares ENABLE ROW LEVEL SECURITY;

-- Profiles table for user display names
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teams: members can view their team
CREATE POLICY "Team members can view their team"
ON public.teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team owners can update team"
ON public.teams FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'owner'
  )
);

CREATE POLICY "Team owners can delete team"
ON public.teams FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'owner'
  )
);

-- Team members policies
CREATE POLICY "Team members can view members"
ON public.team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team admins can add members"
ON public.team_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
  OR
  -- Allow the team creator to add themselves as owner
  (auth.uid() = user_id)
);

CREATE POLICY "Team admins can remove members"
ON public.team_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
  OR auth.uid() = user_id
);

-- Analysis comments policies
CREATE POLICY "Users can view comments on their analyses"
ON public.analysis_comments FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.risk_analyses
    WHERE risk_analyses.id = analysis_comments.analysis_id
    AND risk_analyses.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.analysis_shares
    JOIN public.team_members ON team_members.team_id = analysis_shares.team_id
    WHERE analysis_shares.analysis_id = analysis_comments.analysis_id
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create comments on accessible analyses"
ON public.analysis_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.risk_analyses
      WHERE risk_analyses.id = analysis_comments.analysis_id
      AND risk_analyses.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.analysis_shares
      JOIN public.team_members ON team_members.team_id = analysis_shares.team_id
      WHERE analysis_shares.analysis_id = analysis_comments.analysis_id
      AND team_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete own comments"
ON public.analysis_comments FOR DELETE
USING (auth.uid() = user_id);

-- Analysis shares policies
CREATE POLICY "Users can view shares for their analyses"
ON public.analysis_shares FOR SELECT
USING (
  auth.uid() = shared_by
  OR EXISTS (
    SELECT 1 FROM public.risk_analyses
    WHERE risk_analyses.id = analysis_shares.analysis_id
    AND risk_analyses.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = analysis_shares.team_id
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Analysis owners can share"
ON public.analysis_shares FOR INSERT
WITH CHECK (
  auth.uid() = shared_by
  AND EXISTS (
    SELECT 1 FROM public.risk_analyses
    WHERE risk_analyses.id = analysis_shares.analysis_id
    AND risk_analyses.user_id = auth.uid()
  )
);

CREATE POLICY "Analysis owners can unshare"
ON public.analysis_shares FOR DELETE
USING (
  auth.uid() = shared_by
  OR EXISTS (
    SELECT 1 FROM public.risk_analyses
    WHERE risk_analyses.id = analysis_shares.analysis_id
    AND risk_analyses.user_id = auth.uid()
  )
);

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_analysis_comments_analysis_id ON public.analysis_comments(analysis_id);
CREATE INDEX idx_analysis_shares_analysis_id ON public.analysis_shares(analysis_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);