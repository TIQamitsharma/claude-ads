/*
  # Add Google OAuth and live data fields to ad_accounts

  1. Changes to `ad_accounts`
    - `access_token` already exists but was stored as empty string — now used for OAuth access tokens
    - `refresh_token` already exists — now used for OAuth refresh tokens
    - `token_expires_at` already exists — now used for token expiry
    - Add `google_customer_id` (text, nullable) — the numeric customer ID without dashes (e.g. 1234567890)
    - Add `live_data` (jsonb, nullable) — cached live campaign/metrics data from the Google Ads API
    - Add `live_data_fetched_at` (timestamptz, nullable) — when live data was last fetched
    - Add `oauth_state` (text, nullable) — CSRF state token during OAuth flow

  2. Notes
    - All new columns are nullable to avoid breaking existing rows
    - live_data stores serialized campaign stats pulled from the Google Ads API
    - oauth_state is short-lived; cleared after OAuth completes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'google_customer_id'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN google_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'live_data'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN live_data jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'live_data_fetched_at'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN live_data_fetched_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'oauth_state'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN oauth_state text;
  END IF;
END $$;
