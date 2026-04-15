/*
 * Flexiele sessionId extractor — paste into browser DevTools Console while on
 * https://feexotel.flexiele.com (any page, logged in).
 *
 * Copies your sessionId to the clipboard.
 */
(async () => {
  const KEY = "2e35f242a46d67eeb74aabc37d5e5d05";
  try {
    const r = await fetch(
      "https://feexotel-api.flexiele.com/api/default/home/userInfo",
      { credentials: "include", headers: { Accept: "application/json" } }
    );
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} — are you logged in?`);
    const body = await r.json();

    if (!window.CryptoJS) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js";
        s.onload = res;
        s.onerror = () =>
          rej(
            new Error(
              "Could not load CryptoJS (CSP may be blocking). Use manual fallback — see README."
            )
          );
        document.head.appendChild(s);
      });
    }

    const val = Object.values(body)[0];
    let sessionId;
    if (typeof val === "string") {
      const decrypted = CryptoJS.AES.decrypt(val, KEY).toString(
        CryptoJS.enc.Utf8
      );
      const parsed = JSON.parse(decrypted);
      sessionId = parsed.sessionId;
    } else if (val && typeof val === "object" && val.sessionId) {
      sessionId = val.sessionId;
    }
    if (!sessionId) throw new Error("sessionId not found in userInfo response");

    await navigator.clipboard.writeText(sessionId);
    console.log(
      "%c✅ sessionId copied to clipboard",
      "color:#090;font-weight:bold;font-size:14px"
    );
    console.log(sessionId);
  } catch (e) {
    console.error("❌ Extraction failed:", e.message);
    console.log(
      "Manual fallback: DevTools → Network → reload → find 'userInfo' → Response → copy sessionId"
    );
  }
})();
