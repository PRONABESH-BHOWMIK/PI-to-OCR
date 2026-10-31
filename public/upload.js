(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UploadHelpers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const acceptedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
  const acceptedExtension = /\.(?:pdf|png|jpe?g)$/i;

  function isSupportedUpload(file) {
    if (!file) return false;
    return acceptedTypes.has(String(file.type || '').toLowerCase()) || acceptedExtension.test(file.name || '');
  }

  function partitionUploadFiles(fileList) {
    const accepted = [];
    const rejected = [];
    Array.from(fileList || []).forEach((file) => {
      (isSupportedUpload(file) ? accepted : rejected).push(file);
    });
    return { accepted, rejected };
  }

  function filesFromClipboard(clipboardData) {
    const directFiles = Array.from(clipboardData && clipboardData.files || []);
    if (directFiles.length) return directFiles;
    return Array.from(clipboardData && clipboardData.items || [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean);
  }

  return { isSupportedUpload, partitionUploadFiles, filesFromClipboard };
});
