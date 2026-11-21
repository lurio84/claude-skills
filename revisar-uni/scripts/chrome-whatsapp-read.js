// Claude in Chrome recipe (worked 2026-11-21 on WhatsApp Web, group «PGPI"): two javascript_tool calls + one real click.
// Step 1 (javascript_tool, tab on https://web.whatsapp.com/): scroll the virtualised sidebar to the exact title, return its centre.
//   Set TITLE first. Then click the returned {x,y} with computer left_click (synthetic DOM clicks don't open chats).
const TITLE = 'PGPI';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pane = null; for (let i = 0; i < 60 && !(pane = document.querySelector('#pane-side')); i++) await sleep(1000);
if (!pane) 'no chat list (login/QR?)'; else {
  pane.scrollTop = 0; await sleep(800);
  let s = null; for (let i = 0; i < 40; i++) { s = [...pane.querySelectorAll('span[title]')].find(x => x.getAttribute('title') === TITLE); if (s) break; pane.scrollTop += pane.clientHeight * 0.8; await sleep(600); }
  if (s) { s.scrollIntoView({ block: 'center' }); await sleep(600); const r = s.getBoundingClientRect(); JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); } else 'not found';
}

// Step 2 (javascript_tool, after the click): check the header, expand «Leer más», scroll up to CUTOFF and list messages.
// Output truncates at ~1000 chars: keep per-message text short, or move CUTOFF forward / slice one long message per call.
/*
const CUTOFF = new Date(2026, 10, 19, 0, 0);   // local time, month 0-based
const sleep = ms => new Promise(r => setTimeout(r, ms)); await sleep(2000);
const h = document.querySelector('#main header'); const head = h ? h.innerText.split('\n')[0].trim() : null;
const parse = s => { const m = s.match(/\[(\d{1,2}):(\d{2}), (\d{1,2})\/(\d{1,2})\/(\d{4})\] ([^:]+):/); return m && { ts: new Date(+m[5], +m[4] - 1, +m[3], +m[1], +m[2]), a: m[6].trim() }; };
const msgs = new Map();
const collect = () => document.querySelectorAll('#main [data-pre-plain-text]').forEach(n => { const p = n.getAttribute('data-pre-plain-text'); const m = parse(p); if (!m) return; const t = (n.innerText || '').replace(/\s+/g, ' ').trim(); msgs.set(p + t.slice(0, 40), { ...m, t: t.slice(0, 300) }); });
const sc = [...document.querySelectorAll('#main div')].find(d => d.scrollHeight > d.clientHeight + 50 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowY));
for (let i = 0; i < 40; i++) { collect(); const o = Math.min(...[...msgs.values()].map(m => m.ts)); if (o < CUTOFF || !sc) break; sc.scrollTop = 0; await sleep(1500); }
if (sc) { sc.scrollTop = sc.scrollHeight; await sleep(1500); }
for (let k = 0; k < 5; k++) { const b = [...document.querySelectorAll('#main span, #main div')].filter(e => e.childElementCount === 0 && (e.innerText || '').trim() === 'Leer más'); if (!b.length) break; b.forEach(x => x.click()); await sleep(800); }
msgs.clear(); collect();
head + '\n' + [...msgs.values()].filter(m => m.ts >= CUTOFF).sort((a, b) => a.ts - b.ts).map(m => `${m.ts.toLocaleString('es-ES')} ${m.a}: ${m.t}`).join('\n');
*/
