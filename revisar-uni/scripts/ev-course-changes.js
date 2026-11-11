// args: {courseId, cutoff}  (cutoff = ISO UTC, e.g. "2026-11-07T13:00:00Z")
// EV (Blackboard) REST: announcements, recursive contents (+attachments) and gradebook columns
// created/modified after cutoff. In-page fetch fails on the /ultra SPA, so it moves to an API URL first.
async (page, args) => {
  if (!/^https:\/\/ev\.us\.es\/learn\/api\//.test(page.url())) {
    await page.goto('https://ev.us.es/learn/api/public/v1/users/me/courses?limit=1');
  }
  if (!page.url().startsWith('https://ev.us.es/learn/api/')) return { auth: false, url: page.url().slice(0, 60) };
  return page.evaluate(async ({ courseId: C, cutoff: cut }) => {
    const B = 'https://ev.us.es/learn/api/public/';
    const g = async u => { const r = await fetch(B + u); if (r.status === 401 || r.status === 403) throw new Error('auth'); return r.json(); };
    try {
      const ann = (await g(`v1/courses/${C}/announcements?limit=100`)).results || [];
      const a = ann.filter(x => (x.modified || x.created) > cut).map(x => ({ title: x.title, created: x.created, modified: x.modified, body: (x.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300) }));
      let items = [], url = `v1/courses/${C}/contents?recursive=true&limit=200`;
      while (url) { const r = await g(url); items = items.concat(r.results || []); url = r.paging && r.paging.nextPage ? r.paging.nextPage.replace('/learn/api/public/', '') : null; }
      const contents = [];
      for (const x of items.filter(x => (x.modified || x.created) > cut)) {
        let att = [];
        try { att = ((await g(`v1/courses/${C}/contents/${x.id}/attachments`)).results || []).map(a => ({ id: a.id, fileName: a.fileName })); } catch (e) {}
        contents.push({ id: x.id, parentId: x.parentId, title: x.title, created: x.created, modified: x.modified, att });
      }
      const cols = ((await g(`v2/courses/${C}/gradebook/columns?limit=100`)).results || []).map(c => ({ name: c.name, due: c.grading && c.grading.due }));
      return { auth: true, ann: a, contents, cols };
    } catch (e) { return { auth: false, err: String(e) }; }
  }, args);
}
