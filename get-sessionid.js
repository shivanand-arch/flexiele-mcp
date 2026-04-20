/*
 * Flexiele sessionId extractor — zero external dependencies
 * Paste into DevTools Console while on https://feexotel.flexiele.com (logged in).
 * Copies sessionId to clipboard.
 */
(async () => {
  const KEY = '2e35f242a46d67eeb74aabc37d5e5d05';

  // ── Decrypt helper (uses Web Crypto + inline EVP_BytesToKey via MD5) ──
  const md5 = (data) => {
    // Pure-JS MD5, no dependencies
    const r = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const k = Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*2**32)>>>0);
    let b = typeof data==='string' ? new TextEncoder().encode(data) : data;
    let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;
    const orig = b.length;
    const pad = new Uint8Array(((orig+8>>6)+1)*64);
    pad.set(b); pad[orig]=0x80;
    new DataView(pad.buffer).setUint32(pad.length-8,orig*8,true);
    for(let i=0;i<pad.length;i+=64){
      const w=Array.from({length:16},(_,j)=>new DataView(pad.buffer).getUint32(i+j*4,true));
      let A=a0,B=b0,C=c0,D=d0;
      for(let j=0;j<64;j++){
        let F,g;
        if(j<16){F=(B&C)|(~B&D);g=j;}
        else if(j<32){F=(D&B)|(~D&C);g=(5*j+1)%16;}
        else if(j<48){F=B^C^D;g=(3*j+5)%16;}
        else{F=C^(B|~D);g=(7*j)%16;}
        F=((F+A+k[j]+w[g])>>>0);
        A=D;D=C;C=B;
        B=(B+((F<<r[j])|(F>>>(32-r[j]))))>>>0;
      }
      a0=(a0+A)>>>0;b0=(b0+B)>>>0;c0=(c0+C)>>>0;d0=(d0+D)>>>0;
    }
    const out=new Uint8Array(16);
    [a0,b0,c0,d0].forEach((v,i)=>new DataView(out.buffer).setUint32(i*4,v,true));
    return out;
  };

  const evpKey = (pass, salt) => {
    const p = new TextEncoder().encode(pass);
    let d=new Uint8Array(0), di=new Uint8Array(0);
    while(d.length<48){ di=md5(new Uint8Array([...di,...p,...salt])); d=new Uint8Array([...d,...di]); }
    return { key:d.slice(0,32), iv:d.slice(32,48) };
  };

  const decrypt = async (b64) => {
    const raw = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
    const {key,iv} = evpKey(KEY, raw.slice(8,16));
    const k = await crypto.subtle.importKey('raw',key,{name:'AES-CBC'},false,['decrypt']);
    const dec = await crypto.subtle.decrypt({name:'AES-CBC',iv},k,raw.slice(16));
    return JSON.parse(new TextDecoder().decode(dec));
  };

  // ── Fetch + extract ──
  try {
    const r = await fetch('https://feexotel-api.flexiele.com/api/default/home/userInfo',
      { credentials:'include', headers:{Accept:'application/json'} });
    if (!r.ok) throw new Error(`${r.status} — are you logged in?`);
    const body = await r.json();
    const encVal = Object.values(body)[0];
    const data = await decrypt(encVal);
    const sessionId = data.sessionId;
    if (!sessionId) throw new Error('sessionId missing from response');
    await navigator.clipboard.writeText(sessionId);
    console.log('%c✅ sessionId copied to clipboard', 'color:green;font-weight:bold;font-size:14px');
    console.log(sessionId);
  } catch(e) {
    console.error('❌', e.message);
  }
})();
