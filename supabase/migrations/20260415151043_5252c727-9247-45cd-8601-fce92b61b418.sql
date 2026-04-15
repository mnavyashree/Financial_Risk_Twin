
-- Fix analysis_comments: add foreign key to profiles for join queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'analysis_comments_user_id_fkey'
  ) THEN
    ALTER TABLE public.analysis_comments
      ADD CONSTRAINT analysis_comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix team_members: add foreign key to profiles for join queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;
