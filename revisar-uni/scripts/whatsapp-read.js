// args: {title, cutoff, maxText?}  (title = exact chat title in the sidebar; cutoff = ISO datetime)
// Opens one WhatsApp Web chat by exact title, checks the header, and returns its messages since cutoff.
// The sidebar is virtualised, so it scrolls #pane-side until the title exists; the open is a real
// Playwright click (synthetic mouse events did not open the chat on 2026-11-11).
async (page, args) => {
  if (!page.url().startsWith('https://web.whatsapp.com')) await page.goto('https://web.whatsapp.com/', { waitUntil: 'commit' });
  try { await page.waitForSelector('#pane-side', { timeout: 45000 }); }
  catch (e) { return { err: 'no chat list (login/QR?)' }; }
  const headerTitle = () => page.evaluate(() => { const h = document.querySelector('#main header'); return h ? h.innerText.split('\n')[0].trim() : null; });
  if ((await headerTitle()) !== args.title) {
    const found = await page.evaluate(async (w) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const pane = document.querySelector('#pane-side');
      pane.scrollTop = 0; await sleep(600);
      for (let i = 0; i < 40; i++) {
        const s = [...pane.querySelectorAll('span[title]')].find(x => x.getAttribute('title') === w);
        if (s) { s.scrollIntoView({ block: 'center' }); await sleep(600); return true; }
        pane.scrollTop += pane.clientHeight * 0.8; await sleep(600);
      }
      return false;
    }, args.title);
    if (!found) return { err: 'chat not found in sidebar' };
    await page.locator(`#pane-side span[title=${JSON.stringify(args.title)}]`).first().click();
    await page.waitForTimeout(2500);
  }
  const h = await headerTitle();
  if (h !== args.title) return { err: 'header mismatch', header: (h || '').slice(0, 25) };
  return page.evaluate(async ({ cutoff, maxText }) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const cut = new Date(cutoff);
    const parse = s => { const m = s.match(/\[(\d{1,2}):(\d{2}), (\d{1,2})\/(\d{1,2})\/(\d{4})\] ([^:]+):/); if (!m) return null; return { ts: new Date(+m[5], +m[4] - 1, +m[3], +m[1], +m[2]), author: m[6].trim() }; };
    const msgs = new Map();
    const collect = () => document.querySelectorAll('#main [data-pre-plain-text]').forEach(n => {
      const p = n.getAttribute('data-pre-plain-text'); const meta = parse(p); if (!meta) return;
      const txt = (n.innerText || '').trim();
      msgs.set(p + txt.slice(0, 40), { at: meta.ts.toISOString(), author: meta.author, text: txt.slice(0, maxText || 500) });
    });
    const sc = [...document.querySelectorAll('#main div')].find(d => d.scrollHeight > d.clientHeight + 50 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowY));
    let oldest = null;
    for (let i = 0; i < 60; i++) {
      collect();
      const arr = [...msgs.values()].map(m => new Date(m.at));
      oldest = arr.length ? new Date(Math.min(...arr)) : null;
      if (oldest && oldest < cut) break;
      if (!sc) break;
      sc.scrollTop = 0; await sleep(1500);
    }
    if (sc) { sc.scrollTop = sc.scrollHeight; await sleep(1500); }
    collect();
    const list = [...msgs.values()].filter(m => new Date(m.at) >= cut).sort((a, b) => (a.at < b.at ? -1 : 1));
    return { oldestSeen: oldest && oldest.toISOString(), n: list.length, list };
  }, { cutoff: args.cutoff, maxText: args.maxText });
}
