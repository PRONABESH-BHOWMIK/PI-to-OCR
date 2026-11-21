# Trade Finance Tools — Proforma Invoice OCR

A Next.js site for trade finance professionals. Its first live tool turns a proforma invoice (PDF or image, English or Bangla) into:

- a searchable PDF with an enhanced page image and an invisible OCR text layer;
- copy-ready item lines in a fixed format;
- the PI number and date, where they can be found;
- formatted beneficiary information; and
- notes about rows whose quantity, unit price, and line total do not agree.

OCR and searchable-PDF generation run in the visitor's browser. Structured item extraction uses a server-side Next.js route that calls [Groq](https://groq.com/).

## How it works

1. `public/pi-ocr.html` accepts one or more PDFs or images and an optional PDF page range.
2. PDF.js renders PDF pages; Tesseract.js performs OCR using English or English + Bangla.
3. `enhance.js`, `tablelines.js`, `format.js`, and `verify.js` prepare the OCR image, format the result, and cross-check the arithmetic.
4. pdf-lib combines each enhanced page image with Tesseract's invisible text layer into a downloadable searchable PDF.
5. `POST /api/describe` sends the OCR text and, when available, up to three page images to Groq. The response supplies the beneficiary and invoice item lines. If picture-based reading fails or finds nothing, the tool falls back to OCR text.

The application has no database or file-storage code. For item extraction, OCR text and page images are passed through the app's API to Groq; nothing is intentionally persisted by this application. Review Groq's data-handling and retention terms before uploading documents covered by confidentiality requirements.

## Project structure

```text
app/                         Next.js App Router pages, global CSS, metadata
  api/describe/route.js      Groq-backed structured extraction endpoint (rate-limited, usage-logged)
  api/exchange-rate/route.js Bangladesh Bank exchange-rate endpoint (usage-logged)
  api/admin/                 Admin login, logout, session and stats endpoints
  admin/                     Admin login page and usage dashboard
components/                  Shared React components
lib/
  db.js                      Neon / Vercel Postgres connection (graceful without POSTGRES_URL)
  usage.js                   Usage logging and per-IP daily rate limit
  admin-auth.js              Admin scrypt password check and signed session cookies
public/
  pi-ocr.html                Standalone browser OCR tool, shown in an iframe
  enhance.js                 Image scaling, grayscale and contrast
  tablelines.js              Removes long ruled table lines from the OCR copy
  format.js                  Fixed formatting for items and beneficiary
  verify.js                  Arithmetic checks against numbers in the OCR text
scripts/
  sql/schema.sql             usage_logs table and indexes
  hash-password.js           Generates the ADMIN_PASSWORD_HASH scrypt value
*.test.js                    Standalone legacy checks (see "Tests" below)
```

The PI OCR page embeds `public/pi-ocr.html` using `components/ToolFrame.jsx`, so the original browser tool can remain a static asset.

## Requirements

- A Node.js version supported by Next.js 15 (18.18 or newer).
- npm.
- A Groq API key for AI-assisted item extraction.
- A Postgres database (Neon / Vercel Postgres) for usage tracking, the admin panel and the AI rate limit. The site runs without one, but usage rows are skipped and the rate limit falls back to an in-memory counter.
- Browser access to jsDelivr and Tesseract's language-data CDN. Tesseract, PDF.js, and pdf-lib are loaded from jsDelivr rather than installed locally. Google Fonts is also loaded externally.

The searchable PDF and raw extracted text still work when the AI endpoint is unavailable; only the structured item lines, beneficiary information, and checks are missing.

## Local development

Install dependencies:

```bash
npm install
```

Set the required environment variable:

```bash
export GROQ_API_KEY="your-groq-api-key"
```

Then start the development server:

```bash
npm run dev
```

Open <http://localhost:3000>. The OCR tool is available at `/tools/proforma-invoice-ocr` or directly at `/pi-ocr.html`.

To check a production build:

```bash
npm run build
npm start
```

Never commit a real API key. This repository does not currently include a `.gitignore`, so prefer shell or deployment-dashboard variables unless you add an ignore rule for files such as `.env.local`.

### Environment variables

| Variable | Required | Default / purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes for AI extraction | Groq API key, read only on the server. |
| `GROQ_MODEL` | No | Text model; currently defaults to `openai/gpt-oss-120b`. |
| `GROQ_VISION_MODEL` | No | Vision model; currently defaults to `qwen/qwen3.8-27b`. |
| `AI_TIMEOUT_MS` | No | Abort a Groq request after this many milliseconds; defaults to `8000`. |
| `POSTGRES_URL` | Yes for usage tracking | Vercel sets this automatically once the project is linked to a Postgres database (Neon). `DATABASE_URL` is also accepted. |
| `ADMIN_USERNAME` | Yes for the admin panel | Admin login name. |
| `ADMIN_PASSWORD_HASH` | Yes for the admin panel | scrypt password hash, generated with `node scripts/hash-password.js "your password"`. |
| `ADMIN_SESSION_SECRET` | Yes for the admin panel | HMAC key for the admin session cookie (`openssl rand -hex 32`). |
| `RATE_LIMIT_PER_DAY` | No | Per-IP daily limit on `/api/describe`; defaults to `50`. |

Model availability and names can change. Use the model environment variables to override the defaults instead of hard-coding a replacement. `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` from older documentation are no longer used.

## Admin panel, usage tracking and rate limiting

The site logs every tool request to a Postgres `usage_logs` table and protects the AI endpoint with a per-IP daily limit. An admin dashboard at `/admin` shows usage across **all tools** (PI OCR, exchange rate, and any future tool that logs requests).

**Setup:**

1. Link a Postgres database to the Vercel project (Neon or Vercel Postgres). Vercel sets `POSTGRES_URL` automatically.
2. Create the table once in the database:

   ```bash
   psql "$POSTGRES_URL" -f scripts/sql/schema.sql
   ```

3. Create an admin password hash and copy it to the project environment:

   ```bash
   node scripts/hash-password.js "your password"
   ```

   Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` in the project environment (Vercel → Project → Settings → Environment Variables). See `.env.example`.
4. Sign in at `/admin/login` with the admin account.

**Behavior:**

- `POST /api/describe` is rate-limited to `RATE_LIMIT_PER_DAY` (default **50**) requests per IP address per UTC day. Requests beyond the limit get a `429`.
- Every request to `/api/describe` and `/api/exchange-rate` writes one row to `usage_logs` with `tool`, `status` (`success` / `error` / `rate_limited`), `pages`, `model`, `ip` and `created_at`.
- The dashboard (`/admin`) aggregates totals, per-tool and per-status breakdowns, a daily series and recent activity over a date range.
- The client IP is taken from the last entry of `X-Forwarded-For`, which the platform's edge appends and a client cannot forge by prepending fake addresses.
- If Postgres is not configured, the site keeps working: usage rows are skipped, rate limiting falls back to an in-memory counter, and the dashboard reports that Postgres is not configured.

## Deploying to Vercel

1. Import the GitHub repository into Vercel.
2. Keep the automatically detected Next.js framework and build settings.
3. Add `GROQ_API_KEY` in the project's environment variables. Add the optional model and timeout variables if needed.
4. Link a Postgres database (Neon / Vercel Postgres), run `scripts/sql/schema.sql` against it, and add the admin environment variables (see above).
5. Deploy and open `/tools/proforma-invoice-ocr`.

The Groq key remains server-side. Do not prefix it with `NEXT_PUBLIC_`.

The AI endpoint is rate-limited to 50 requests per day per IP address. The admin panel is protected by the configured credentials; keep `ADMIN_SESSION_SECRET` secret and set a strong password hash.

## Limits and browser behavior

- Processing is limited to 30 OCR pages. Only the first three page pictures and approximately 3 MB of picture data are sent to the vision model; the first 8,000 OCR characters are sent as supporting text.
- Large scans can be slow because OCR and PDF construction happen on the visitor's device.
- The first OCR run downloads Tesseract language data, including a larger download when Bangla is selected.
- The searchable PDF is displayed in an iframe using the browser's PDF viewer. Some mobile browsers cannot display embedded PDFs, but the download button and extracted-text box still work.
- Bangla conjuncts copied from a PDF viewer can become scrambled; use the extracted-text box as the reliable copy source.
- If the AI request times out or fails, the searchable PDF and raw OCR text remain available.
- The contact form opens the visitor's email application with a prefilled `mailto:` message; it does not send through a server.

## Tests

`admin-auth.test.js` and `usage.test.js` cover the admin password check, session cookies, the per-IP rate limit and the no-database fallback:

```bash
node --test admin-auth.test.js usage.test.js
```

`enhance.test.js`, `format.test.js`, and `tablelines.test.js` are standalone Node checks. They currently target an older flat file layout and are not wired into `package.json`, so they need their import paths and exports repaired before they can serve as regression tests. The tool logic tests in `lib/` run with `npm run test:tools`.
