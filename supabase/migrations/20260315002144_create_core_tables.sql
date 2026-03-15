/*
  # Create Core Tables for Claude Ads App

  ## Overview
  Sets up the foundational data model for the Claude Ads web application.

  ## New Tables

  ### profiles
  - Extends Supabase auth.users with display name and avatar
  - Auto-created on user signup via trigger

  ### api_keys
  - Stores each user's Claude API key and ad platform OAuth tokens
  - Encrypted at rest; per-user with RLS

  ### ad_accounts
  - Linked ad platform accounts (Google, Meta, LinkedIn, TikTok, Microsoft)
  - Stores account ID, name, OAuth tokens, token expiry

  ### audit_runs
  - Records each audit request with status lifecycle (pending/running/complete/failed)
  - Tracks platform, audit type, industry, and triggered timestamp

  ### audit_results
  - Stores structured audit output per run
  - Includes overall score, per-platform scores, findings, recommendations

  ### brand_profiles
  - Stores extracted brand DNA per user
  - Colors, fonts, tone, logo URL, raw JSON

  ## Security
  - RLS enabled on all tables
  - All policies restrict access to authenticated users and their own data
*/

-- -------------------------
-- profiles
-- -------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -------------------------
-- api_keys
-- -------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service text NOT NULL,
  key_value text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, service)
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------
-- ad_accounts
-- -------------------------
CREATE TABLE IF NOT EXISTS ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  account_id text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  access_token text DEFAULT '',
  refresh_token text DEFAULT '',
  token_expires_at timestamptz,
  is_connected boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad accounts"
  ON ad_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad accounts"
  ON ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad accounts"
  ON ad_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ad accounts"
  ON ad_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------
-- audit_runs
-- -------------------------
CREATE TABLE IF NOT EXISTS audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_type text NOT NULL,
  platform text DEFAULT 'all',
  industry text DEFAULT '',
  landing_url text DEFAULT '',
  competitor_name text DEFAULT '',
  brand_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit runs"
  ON audit_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit runs"
  ON audit_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audit runs"
  ON audit_runs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audit runs"
  ON audit_runs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------
-- audit_results
-- -------------------------
CREATE TABLE IF NOT EXISTS audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score integer DEFAULT 0,
  grade text DEFAULT 'N/A',
  platform_scores jsonb DEFAULT '{}',
  findings jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  quick_wins jsonb DEFAULT '[]',
  raw_output text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit results"
  ON audit_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit results"
  ON audit_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audit results"
  ON audit_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -------------------------
-- brand_profiles
-- -------------------------
CREATE TABLE IF NOT EXISTS brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text DEFAULT '',
  website_url text DEFAULT '',
  colors jsonb DEFAULT '[]',
  fonts jsonb DEFAULT '[]',
  tone_of_voice text DEFAULT '',
  logo_url text DEFAULT '',
  raw_profile jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand profiles"
  ON brand_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand profiles"
  ON brand_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand profiles"
  ON brand_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand profiles"
  ON brand_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- indexes for common queries
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_user_id ON audit_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_created_at ON audit_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_results_run_id ON audit_results(run_id);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_user_id ON brand_profiles(user_id);
