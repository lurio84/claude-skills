// args: {site, cutoff}  (site = "https://<tenant>.sharepoint.com/sites/<name>", cutoff = ISO UTC)
// Walks the site's default document library through the SharePoint REST v2.0 drive API
// and lists files modified after cutoff (path, modified, first two words of the editor's name).
async (page, args) => {
  if (!page.url().startsWith(args.site)) await page.goto(args.site);
  if (!page.url().startsWith(args.site)) return { err: 'not on site (login?)', url: page.url().slice(0, 60) };
  return page.evaluate(async ({ site, cutoff }) => {
    const B = site + '/_api/v2.0/drive';
    const out = [];
    const walk = async (url, path) => {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      for (const it of j.value) {
        const p = path + '/' + it.name;
        if (it.folder) await walk(`${B}/items/${it.id}/children?$top=500`, p);
        else if (it.lastModifiedDateTime > cutoff) out.push({ p: p.slice(1), m: it.lastModifiedDateTime, by: ((it.lastModifiedBy && it.lastModifiedBy.user && it.lastModifiedBy.user.displayName) || '').split(' ').slice(0, 2).join(' ') });
      }
      if (j['@odata.nextLink']) await walk(j['@odata.nextLink'], path);
    };
    try { await walk(`${B}/root/children?$top=500`, ''); } catch (e) { return { err: String(e) }; }
    out.sort((a, b) => (a.m < b.m ? -1 : 1));
    return { n: out.length, out };
  }, args);
}
