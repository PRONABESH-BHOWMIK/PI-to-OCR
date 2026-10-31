const assert = require('node:assert/strict');
const { isSupportedUpload, partitionUploadFiles, filesFromClipboard } = require('./public/upload.js');

assert.equal(isSupportedUpload({ name: 'invoice.pdf', type: '' }), true);
assert.equal(isSupportedUpload({ name: 'scan.JPEG', type: '' }), true);
assert.equal(isSupportedUpload({ name: '', type: 'image/png' }), true);
assert.equal(isSupportedUpload({ name: 'invoice', type: 'application/pdf' }), true);
assert.equal(isSupportedUpload({ name: 'photo.gif', type: 'image/gif' }), false);
assert.equal(isSupportedUpload({ name: 'invoice.docx', type: 'application/octet-stream' }), false);
assert.equal(isSupportedUpload(null), false);

const pdf = { name: 'pi.pdf', type: 'application/pdf' };
const image = { name: 'page.png', type: 'image/png' };
const document = { name: 'notes.txt', type: 'text/plain' };
assert.deepEqual(partitionUploadFiles([pdf, document, image]), { accepted: [pdf, image], rejected: [document] });
assert.deepEqual(partitionUploadFiles(null), { accepted: [], rejected: [] });

assert.deepEqual(filesFromClipboard({ files: [pdf], items: [] }), [pdf]);
assert.deepEqual(filesFromClipboard({
  files: [],
  items: [
    { kind: 'text', getAsFile: () => null },
    { kind: 'file', getAsFile: () => image },
    { kind: 'file', getAsFile: () => null },
  ],
}), [image]);
assert.deepEqual(filesFromClipboard(null), []);

console.log('Upload helper tests passed.');
