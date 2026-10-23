# PI OCR & Description Tool (Vercel + DeepSeek)

OCR runs in the visitor's browser (Tesseract.js, Bangla + English) and builds the searchable PDF there. The only server code is `api/describe.js`, which calls DeepSeek and keeps your API key secret.

## Files
- `index.html` — the page and all browser logic
- `format.js` — your output format (numbering, commas, 60-character lines)
- `enhance.js` — grayscale + contrast, same math as the notebook
- `api/describe.js` — the DeepSeek call
- `format.test.js`, `enhance.test.js` — `node format.test.js` and `node enhance.test.js` (optional self-checks, not needed for deployment)

## Deploy
1. Get a key at <https://platform.deepseek.com> (API keys page).
2. Put this folder in a GitHub repository (GitHub web "Add file → Upload files" works).
3. On <https://vercel.com>: Add New → Project → import the repository. No build settings needed.
4. Before deploying, add environment variable `DEEPSEEK_API_KEY` = your key. Optional: `DEEPSEEK_MODEL` (default `deepseek-v4-flash`).
5. Deploy. Open the URL, upload a PI, click Process PI.

## Know before going public
- Nothing limits how often the AI endpoint is called. DeepSeek's free grant is one-time and small, so a stranger (or a bot) can use it up. Add a Vercel Firewall rate-limit rule in the dashboard, or keep the URL private.
- The first OCR run in a browser downloads the Bangla + English data (several MB), then it is cached.
- Large scans are slow on weak PCs because the browser does the OCR.
- The OCR'd PDF is shown in the page using the browser's built-in PDF viewer, so text can be selected and copied there. Phone browsers often cannot show PDFs inside a page; the Download button and the "Extracted text" box still work. Copying Bangla from a PDF viewer can scramble conjuncts; the "Extracted text" box is the reliable copy source.
- As far as I know, Vercel's free Hobby plan is limited to personal, non-commercial use. If this site serves bank work or the public at large, read Vercel's Fair Use Guidelines first; the paid Pro plan is the alternative.
- If the AI step times out on Vercel's free function limit, the searchable PDF is still produced; only the item text is missing.
