-- ============================================================
-- RLS Policies for uni-tracker
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Enable Row Level Security on both tables
-- ────────────────────────────────────────────────────────────
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 2. Drop existing policies (safe to run if they don't exist)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;

DROP POLICY IF EXISTS "Users can view their own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can insert their own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can update their own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Users can delete their own evaluations" ON evaluations;

-- ────────────────────────────────────────────────────────────
-- 3. Subjects policies — each user can only CRUD their own
-- ────────────────────────────────────────────────────────────

-- SELECT: only see your own subjects
CREATE POLICY "Users can view their own subjects"
  ON subjects FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: can only create subjects for yourself
CREATE POLICY "Users can insert their own subjects"
  ON subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: can only update your own subjects
CREATE POLICY "Users can update their own subjects"
  ON subjects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: can only delete your own subjects
CREATE POLICY "Users can delete their own subjects"
  ON subjects FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. Evaluations policies — each user can only CRUD their own
-- ────────────────────────────────────────────────────────────

-- SELECT: only see your own evaluations
CREATE POLICY "Users can view their own evaluations"
  ON evaluations FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: can only create evaluations for yourself
CREATE POLICY "Users can insert their own evaluations"
  ON evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: can only update your own evaluations
CREATE POLICY "Users can update their own evaluations"
  ON evaluations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: can only delete your own evaluations
CREATE POLICY "Users can delete their own evaluations"
  ON evaluations FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. Verify: list all policies (optional check)
-- ────────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('subjects', 'evaluations');
