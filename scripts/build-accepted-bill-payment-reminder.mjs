import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Package only the operational app. Never include registers, applicant lists, or logs.
const require = createRequire(import.meta.url);
const JSZip = require('../local-apps/accepted-bill-payment-reminder/lib/jszip.min.js');
const appDir = fileURLToPath(new URL('../local-apps/accepted-bill-payment-reminder/', import.meta.url));
const outputDir = fileURLToPath(new URL('../public/downloads/', import.meta.url));
const outputFile = path.join(outputDir, 'accepted-bill-payment-reminder.zip');
const files = [
  'index.html',
  'server.ps1',
  'Start_BTB_Emailer.bat',
  'Start_Web_App.bat',
  'Get_Offline_Libraries.bat',
  'README.md',
  'lib/xlsx.full.min.js',
  'lib/jszip.min.js',
];

const zip = new JSZip();
for (const relative of files) {
  const contents = await readFile(path.join(appDir, relative));
  zip.file(`Accepted-Bill-Payment-Reminder/${relative}`, contents, { binary: true, date: new Date(2026, 0, 1) });
}

await mkdir(outputDir, { recursive: true });
const archive = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
await writeFile(outputFile, archive);
console.log(`Created public/downloads/accepted-bill-payment-reminder.zip (${archive.length} bytes, ${files.length} files)`);
