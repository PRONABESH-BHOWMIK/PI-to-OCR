-- Usage log for the admin dashboard and the per-IP daily rate limit.
-- Run once against the linked Neon / Vercel Postgres database.
-- On Vercel: Database → run SQL in the Neon console, or use the Neon
-- "SQL Editor" against the project database.

CREATE TABLE IF NOT EXISTS usage_logs (
  id          BIGSERIAL PRIMARY KEY,
  tool        TEXT        NOT NULL,           -- e.g. 'pi-ocr', 'exchange-rate'
  status      TEXT        NOT NULL,           -- 'success' | 'error' | 'rate_limited'
  pages       INTEGER     NOT NULL DEFAULT 0, -- page images sent to the AI (0 = text only / non-AI tools)
  model       TEXT,                           -- AI model used, null for non-AI tools
  ip          TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily rate-limit check: count rows for one tool + IP on one day.
CREATE INDEX IF NOT EXISTS usage_logs_tool_ip_created_idx
  ON usage_logs (tool, ip, created_at DESC);

-- Dashboard: range queries and per-tool grouping.
CREATE INDEX IF NOT EXISTS usage_logs_tool_created_idx
  ON usage_logs (tool, created_at DESC);

CREATE INDEX IF NOT EXISTS usage_logs_created_idx
  ON usage_logs (created_at DESC);
