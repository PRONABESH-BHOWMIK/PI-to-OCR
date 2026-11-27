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

-- ============================================================================
-- Import Client Document Checklist tool
-- ============================================================================

-- Group accounts for the checklist tool. One row per bank's trade-finance
-- group (10-15 officials share one user id). status: 'active' | 'paused' |
-- 'deactivated'. The admin panel creates, pauses, deactivates, deletes and
-- resets passwords here; admins never read client data.
CREATE TABLE IF NOT EXISTS tool_users (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,           -- scrypt$<saltHex>$<hashHex>
  status        TEXT        NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- An import client. UCIC is the unique id per client (globally unique).
-- reminder_paused_until pauses reminder emails for this client until that
-- date. irc_number is a client-level field; IRC is also its own checklist row.
CREATE TABLE IF NOT EXISTS clients (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT      NOT NULL REFERENCES tool_users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  ucic                 TEXT        NOT NULL UNIQUE,
  irc_number           TEXT        NOT NULL DEFAULT '',
  reminder_paused_until DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clients_user_idx ON clients (user_id);

-- One financial-year record per client per year. fy_label e.g. '2026-27';
-- fy_end_date is the last valid day (30.06 of the closing year). Old years are
-- archived, never deleted.
CREATE TABLE IF NOT EXISTS fy_records (
  id          BIGSERIAL PRIMARY KEY,
  client_id   BIGINT      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fy_label    TEXT        NOT NULL,
  fy_end_date DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, fy_label)
);
CREATE INDEX IF NOT EXISTS fy_records_client_idx ON fy_records (client_id);

-- Document types in the checklist. Admin-manageable (add/remove).
-- kind: 'fy_based' (expire with the FY end date) | 'dated' (manual expiry).
CREATE TABLE IF NOT EXISTS document_types (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  kind        TEXT        NOT NULL DEFAULT 'dated',
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist rows for one financial year. For 'fy_based' types expiry_date is
-- NULL (status derives from fy_end_date). For 'dated' types the user enters
-- the expiry / next-review date.
CREATE TABLE IF NOT EXISTS checklist_items (
  id                BIGSERIAL PRIMARY KEY,
  fy_record_id      BIGINT      NOT NULL REFERENCES fy_records(id) ON DELETE CASCADE,
  document_type_id  BIGINT      NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  collected         BOOLEAN     NOT NULL DEFAULT false,
  expiry_date       DATE,
  UNIQUE (fy_record_id, document_type_id)
);
CREATE INDEX IF NOT EXISTS checklist_items_fy_idx ON checklist_items (fy_record_id);

-- Repeatable facility numbers; each has a linked data entry field.
CREATE TABLE IF NOT EXISTS facility_numbers (
  id              BIGSERIAL PRIMARY KEY,
  fy_record_id    BIGINT      NOT NULL REFERENCES fy_records(id) ON DELETE CASCADE,
  facility_number TEXT        NOT NULL DEFAULT '',
  linked_data     TEXT        NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS facility_numbers_fy_idx ON facility_numbers (fy_record_id);

-- Repeatable dealing-officer email addresses for reminder emails.
CREATE TABLE IF NOT EXISTS officer_emails (
  id           BIGSERIAL PRIMARY KEY,
  fy_record_id BIGINT      NOT NULL REFERENCES fy_records(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS officer_emails_fy_idx ON officer_emails (fy_record_id);

-- Always-current data fields on the financial-year record.
ALTER TABLE fy_records
  ADD COLUMN IF NOT EXISTS commission_rate TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vat             TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mgt_fee_choice   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mgt_fee_value    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS swift_choice     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS swift_value      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS note             TEXT NOT NULL DEFAULT '';

-- Daily login + usage tracking for the admin (logins with IP, usage counts).
CREATE TABLE IF NOT EXISTS tool_login_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES tool_users(id) ON DELETE CASCADE,
  ip         TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tool_login_events_created_idx ON tool_login_events (created_at DESC);
CREATE INDEX IF NOT EXISTS tool_login_events_user_idx ON tool_login_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tool_usage_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES tool_users(id) ON DELETE CASCADE,
  ip         TEXT        NOT NULL DEFAULT '',
  action     TEXT        NOT NULL DEFAULT 'save',   -- 'load' | 'save'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tool_usage_logs_created_idx ON tool_usage_logs (created_at DESC);

-- Reminder send history: one row per weekly email, drives the reminder count.
CREATE TABLE IF NOT EXISTS reminder_log (
  id           BIGSERIAL PRIMARY KEY,
  client_id    BIGINT      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fy_record_id BIGINT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reminder_log_client_idx ON reminder_log (client_id, sent_at DESC);

-- Seed the default document types (idempotent).
INSERT INTO document_types (name, kind, position) VALUES
  ('IRC',                  'fy_based', 1),
  ('Trade License',        'fy_based', 2),
  ('Income tax return ACK','fy_based', 3),
  ('Membership certificate','dated',   4),
  ('Latest sanction',      'dated',    5),
  ('Trade TP & KYC',       'dated',    6)
ON CONFLICT (name) DO NOTHING;

