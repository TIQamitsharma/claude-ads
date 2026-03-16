/*
  # Add error_message column to audit_runs

  1. Changes
    - `audit_runs` table: add `error_message` (text, nullable) to store failure reasons
    - This allows the frontend to surface specific error details when an audit fails

  2. Notes
    - Column is nullable — only populated when status = 'failed'
    - No data loss; existing rows unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_runs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE audit_runs ADD COLUMN error_message text;
  END IF;
END $$;
