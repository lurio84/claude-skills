// args: {pattern}  (case-insensitive regex source matched against each message-list row)
// Lists matching rows of the Outlook Web inbox (index + ~260 chars). Read-only: it never opens
// a row, because opening marks the message as read.
async (page, args) => {
  // outlook.office.com redirects to outlook.cloud.microsoft; goto with 'load'/'domcontentloaded' timed out (2026-11-11)
  if (!/^https:\/\/outlook\.(office\.com|cloud\.microsoft)\/mail/.test(page.url())) await page.goto('https://outlook.office.com/mail/', { waitUntil: 'commit' });
  try { await page.waitForSelector('[data-convid]', { timeout: 20000 }); }
  catch (e) { return { err: 'no message list (login?)', url: page.url().slice(0, 60) }; }
  return page.evaluate(({ pattern }) => {
    const re = new RegExp(pattern, 'i');
    const rows = [...document.querySelectorAll('[data-convid]')];
    const hits = rows.map((r, i) => ({ i, t: (r.getAttribute('aria-label') || r.innerText || '').replace(/\s+/g, ' ') }))
      .filter(x => re.test(x.t)).map(x => ({ i: x.i, t: x.t.slice(0, 260) }));
    return { n: rows.length, hits };
  }, args);
}
