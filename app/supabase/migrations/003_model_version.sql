-- Cookable — model version bump
-- Knowledge doc references claude-sonnet-4-5, but the current available
-- Sonnet release is claude-sonnet-4-6 (same capability tier, current model).
-- Update the default so new scan rows record the actual model in use.
-- Existing rows keep whatever value they already have.

alter table public.scans
  alter column model_used set default 'claude-sonnet-4-6';
