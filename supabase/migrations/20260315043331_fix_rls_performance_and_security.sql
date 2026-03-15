/*
  # Fix RLS Performance, Security, and Index Issues

  ## Changes

  1. RLS Policy Optimization (all tables)
     - Replace `auth.uid()` with `(select auth.uid())` in all USING/WITH CHECK clauses
     - This prevents per-row re-evaluation of the auth function, significantly improving
       query performance at scale by evaluating the value once per statement

  2. Missing Index
     - Add covering index on `audit_results(user_id)` for the unindexed foreign key

  3. Function Security Fix
     - Set `search_path = ''` on `handle_new_user()` to prevent search path injection attacks
     - Use fully-qualified `public.profiles` reference inside the function body

  ## Tables Affected
  - profiles (3 policies)
  - api_keys (4 policies)
  - ad_accounts (4 policies)
  - audit_runs (4 policies)
  - audit_results (3 policies)
  - brand_profiles (4 policies)
*/

-- -------------------------
-- profiles
-- -------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- -------------------------
-- api_keys
-- -------------------------
DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON api_keys;

CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own api keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own api keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- -------------------------
-- ad_accounts
-- -------------------------
DROP POLICY IF EXISTS "Users can view own ad accounts" ON ad_accounts;
DROP POLICY IF EXISTS "Users can insert own ad accounts" ON ad_accounts;
DROP POLICY IF EXISTS "Users can update own ad accounts" ON ad_accounts;
DROP POLICY IF EXISTS "Users can delete own ad accounts" ON ad_accounts;

CREATE POLICY "Users can view own ad accounts"
  ON ad_accounts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own ad accounts"
  ON ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own ad accounts"
  ON ad_accounts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own ad accounts"
  ON ad_accounts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- -------------------------
-- audit_runs
-- -------------------------
DROP POLICY IF EXISTS "Users can view own audit runs" ON audit_runs;
DROP POLICY IF EXISTS "Users can insert own audit runs" ON audit_runs;
DROP POLICY IF EXISTS "Users can update own audit runs" ON audit_runs;
DROP POLICY IF EXISTS "Users can delete own audit runs" ON audit_runs;

CREATE POLICY "Users can view own audit runs"
  ON audit_runs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own audit runs"
  ON audit_runs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own audit runs"
  ON audit_runs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own audit runs"
  ON audit_runs FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- -------------------------
-- audit_results
-- -------------------------
DROP POLICY IF EXISTS "Users can view own audit results" ON audit_results;
DROP POLICY IF EXISTS "Users can insert own audit results" ON audit_results;
DROP POLICY IF EXISTS "Users can delete own audit results" ON audit_results;

CREATE POLICY "Users can view own audit results"
  ON audit_results FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own audit results"
  ON audit_results FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own audit results"
  ON audit_results FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Add missing index for unindexed foreign key on audit_results
CREATE INDEX IF NOT EXISTS idx_audit_results_user_id ON audit_results(user_id);

-- -------------------------
-- brand_profiles
-- -------------------------
DROP POLICY IF EXISTS "Users can view own brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Users can insert own brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Users can update own brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Users can delete own brand profiles" ON brand_profiles;

CREATE POLICY "Users can view own brand profiles"
  ON brand_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own brand profiles"
  ON brand_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own brand profiles"
  ON brand_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own brand profiles"
  ON brand_profiles FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- -------------------------
-- Fix handle_new_user search_path
-- -------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''));
  RETURN new;
END;
$$;
