/*
 * Flexiele API Sniffer — Step 2 of 2
 * Paste into DevTools Console after navigating the admin portal.
 * Copies the full captured catalog to your clipboard as JSON.
 * Save it to a file and share with Shivanand.
 */
(async () => {
  if (!window.__fe_capture || window.__fe_capture.length === 0) {
    console.warn('[fe-sniffer] Nothing captured yet. Did you paste sniffer-start.js first?');
    return;
  }

  // Summarise before dump
  const byPath = {};
  for (const e of window.__fe_capture) {
    byPath[e.path] = byPath[e.path] || [];
    byPath[e.path].push(e.status);
  }
  const uniquePaths = Object.keys(byPath).sort();
  console.log(`[fe-sniffer] ${window.__fe_capture.length} total captures · ${uniquePaths.length} unique endpoints`);
  console.table(uniquePaths.map(p => ({ path: p, calls: byPath[p].length, statuses: [...new Set(byPath[p])].join(',') })));

  const json = JSON.stringify(window.__fe_capture, null, 2);

  try {
    await navigator.clipboard.writeText(json);
    console.log(
      '%c[fe-sniffer] ✅ Copied to clipboard. Paste into captured-apis.json and share.',
      'color:green;font-weight:bold;font-size:13px'
    );
  } catch (_) {
    // Fallback: open a new tab with the JSON
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'captured-apis.json'; a.click();
    console.log('[fe-sniffer] Clipboard blocked — downloading captured-apis.json instead.');
  }
})();
