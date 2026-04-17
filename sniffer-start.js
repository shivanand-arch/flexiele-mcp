/*
 * Flexiele API Sniffer — Step 1 of 2
 * Paste into DevTools Console while logged into https://feexotel.flexiele.com as admin.
 * Then navigate around the portal — open every section you want us to automate.
 * When done, paste sniffer-dump.js to export the captured calls.
 */
(async () => {
  if (window.__fe_sniffer_active) {
    console.log('[fe-sniffer] already running (' + window.__fe_capture.length + ' captures so far)');
    return;
  }

  // Load CryptoJS for decryption
  if (!window.CryptoJS) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js';
      s.onload = res;
      s.onerror = () => rej(new Error('CryptoJS CDN blocked — check network'));
      document.head.appendChild(s);
    });
  }

  const KEY = '2e35f242a46d67eeb74aabc37d5e5d05';
  window.__fe_capture = window.__fe_capture || [];
  window.__fe_sniffer_active = true;

  const tryDecrypt = (val) => {
    try {
      const dec = CryptoJS.AES.decrypt(val, KEY).toString(CryptoJS.enc.Utf8);
      if (!dec) return val;
      return JSON.parse(dec);
    } catch (_) { return val; }
  };

  const decryptResponse = (raw) => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const keys = Object.keys(parsed);
      // Flexiele encrypted response: single 8-char hex key
      if (keys.length === 1 && /^[0-9a-f]{8}$/i.test(keys[0])) {
        return tryDecrypt(parsed[keys[0]]);
      }
      return parsed;
    } catch (_) { return raw; }
  };

  const decryptRequest = (url, encHeaderKey) => {
    try {
      const u = new URL(url, location.origin);
      const encoded = u.searchParams.get(encHeaderKey);
      if (!encoded) return null;
      return tryDecrypt(atob(encoded));
    } catch (_) { return null; }
  };

  // Patch fetch
  const _fetch = window.fetch;
  window.fetch = async function(input, init = {}) {
    const url = (typeof input === 'string' ? input : input?.url) || '';
    const method = (init.method || 'GET').toUpperCase();

    // Only intercept Flexiele API calls
    if (!url.includes('feexotel-api.flexiele.com') && !url.includes('/api/')) {
      return _fetch.apply(this, arguments);
    }

    const headers = init.headers || {};
    const encKey = headers['fe-req-encrypted'] || headers['Fe-Req-Encrypted'];
    const reqParams = encKey ? decryptRequest(url, encKey) : null;

    let res;
    try { res = await _fetch.apply(this, arguments); }
    catch (err) {
      window.__fe_capture.push({ ts: new Date().toISOString(), method, url, error: err.message });
      throw err;
    }

    const clone = res.clone();
    clone.text().then(text => {
      let responseBody;
      try { responseBody = decryptResponse(JSON.parse(text)); }
      catch (_) { responseBody = text.slice(0, 500); }

      const path = (() => { try { return new URL(url).pathname; } catch(_) { return url; } })();
      const entry = {
        ts: new Date().toISOString(),
        method,
        path,
        status: res.status,
        request: reqParams,
        response: responseBody,
      };
      window.__fe_capture.push(entry);
      console.log(
        `%c[fe-sniffer] ${method} ${path} → ${res.status}  (total: ${window.__fe_capture.length})`,
        'color:#0077cc'
      );
    }).catch(() => {});

    return res;
  };

  console.log(
    '%c[fe-sniffer] ✅ Running. Navigate the admin portal now.\n' +
    '  Open: Appraisals · Attendance · Leave · Comp · Goals · Separation · Reports · Hiring',
    'color:green;font-weight:bold;font-size:13px'
  );
  console.log(
    '%cWhen done: paste sniffer-dump.js  (or run:  copy(JSON.stringify(window.__fe_capture)))',
    'color:#888;font-style:italic'
  );
})();
