export function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function downloadBlueprintPair(sbp, sbpcfg, baseName) {
  downloadBytes(sbp, `${baseName}.sbp`);
  downloadBytes(sbpcfg, `${baseName}.sbpcfg`);
}
