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
  api/describe/route.js      Groq-backed structured extraction endpoint
  tools/                     Tool listing and PI OCR page
components/                  Shared React components
public/
  pi-ocr.html                Standalone browser OCR tool, shown in an iframe
  enhance.js                 Image scaling, grayscale and contrast
  tablelines.js              Removes long ruled table lines from the OCR copy
  format.js                  Fixed formatting for items and beneficiary
  verify.js                  Arithmetic checks against numbers in the OCR text
*.test.js                    Standalone legacy checks (see "Tests" below)
```

The PI OCR page embeds `public/pi-ocr.html` using `components/ToolFrame.jsx`, so the original browser tool can remain a static asset.

## Requirements

- A Node.js version supported by Next.js 15 (18.18 or newer).
- npm.
- A Groq API key for AI-assisted item extraction.
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

Model availability and names can change. Use the model environment variables to override the defaults instead of hard-coding a replacement. `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` from older documentation are no longer used.

## Deploying to Vercel

1. Import the GitHub repository into Vercel.
2. Keep the automatically detected Next.js framework and build settings.
3. Add `GROQ_API_KEY` in the project's environment variables. Add the optional model and timeout variables if needed.
4. Deploy and open `/tools/proforma-invoice-ocr`.

The Groq key remains server-side. Do not prefix it with `NEXT_PUBLIC_`.

The AI endpoint currently has no application-level authentication, spending cap, or rate limit. A public deployment can be abused and consume Groq quota. Use Vercel Firewall or an equivalent rate limit before exposing it widely, and check your Vercel plan's terms if the site is used commercially.

## Limits and browser behavior

- Processing is limited to 30 OCR pages. Only the first three page pictures and approximately 3 MB of picture data are sent to the vision model; the first 8,000 OCR characters are sent as supporting text.
- Large scans can be slow because OCR and PDF construction happen on the visitor's device.
- The first OCR run downloads Tesseract language data, including a larger download when Bangla is selected.
- The searchable PDF is displayed in an iframe using the browser's PDF viewer. Some mobile browsers cannot display embedded PDFs, but the download button and extracted-text box still work.
- Bangla conjuncts copied from a PDF viewer can become scrambled; use the extracted-text box as the reliable copy source.
- If the AI request times out or fails, the searchable PDF and raw OCR text remain available.
- The contact form opens the visitor's email application with a prefilled `mailto:` message; it does not send through a server.

## Tests

`enhance.test.js`, `format.test.js`, and `tablelines.test.js` are standalone Node checks. They currently target an older flat file layout and are not wired into `package.json`, so they need their import paths and exports repaired before they can serve as regression tests. There is no working `npm test` command yet.
