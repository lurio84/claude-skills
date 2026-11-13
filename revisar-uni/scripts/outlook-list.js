// args: {pattern, maxText?}  (case-insensitive regex source matched against each message-list row)
// Lists matching rows of the Outlook Web inbox (index + row text, default 600 chars: a course row is
// ~550 and its time and body preview sit past char 250, after the repeated course name). Read-only: it never opens
// a row, because opening marks the message as read.
async (page, args) => {
  // outlook.office.com redirects to outlook.cloud.microsoft; on 2026-11-11 two gotos from another site's tab
  // timed out waiting for 'load'/'domcontentloaded', so wait for 'commit' and then for the list
  // OWA doesn't boot in a hidden tab (visibilityState 'hidden', 2026-11-13), so bring the tab to front first
  await page.bringToFront().catch(() => {});
  if (!/^https:\/\/outlook\.(office\.com|cloud\.microsoft)\/mail/.test(page.url())) await page.goto('https://outlook.office.com/mail/', { waitUntil: 'commit' });
  try { await page.waitForSelector('[data-convid]', { timeout: 20000 }); }
  catch (e) { return { err: 'no message list (login?)', url: page.url().slice(0, 60) }; }
  return page.evaluate(({ pattern, maxText }) => {
    const re = new RegExp(pattern, 'i');
    const rows = [...document.querySelectorAll('[data-convid]')];
    const hits = rows.map((r, i) => ({ i, t: (r.getAttribute('aria-label') || r.innerText || '').replace(/\s+/g, ' ') }))
      .filter(x => re.test(x.t)).map(x => ({ i: x.i, t: x.t.slice(0, maxText || 600) }));
    return { n: rows.length, hits };
  }, args);
}
