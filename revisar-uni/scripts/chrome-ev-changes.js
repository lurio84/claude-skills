// Claude in Chrome port of ev-course-changes (worked 2026-11-19, first run of the Chrome trial).
// Run with mcp__claude-in-chrome__javascript_tool on a tab already at
// https://ev.us.es/learn/api/public/v1/users/me (in-page fetch fails on the /ultra SPA).
// Edit CUT and C first. Output of javascript_tool is truncated at ~1000 chars, so this
// stores the full result in window._out and returns its length; read it in slices:
//   window._out.slice(0,950), window._out.slice(950,1900), ...
// Course contents are also kept in window._ct for follow-up reads (item bodies, attachments).
const CUT = '2026-11-16T11:56:38Z';                       // ev_last_sync (UTC)
const C = { PSM: '_114393_1', EGC: '_112664_1', PGPI: '_108078_1' }; // from Curso-YYYY-YY.md
const B = '/learn/api/public/v1/';
async function all(u) { let o = []; while (u) { const r = await fetch(u); if (!r.ok) return { err: r.status }; const j = await r.json(); o = o.concat(j.results || []); u = j.paging && j.paging.nextPage; } return o; }
const isNew = x => (x.modified || x.created || '') > CUT;
const strip = h => (h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const res = {}; window._ct = {};
for (const [k, id] of Object.entries(C)) {
  const ann = await all(B + 'courses/' + id + '/announcements?limit=100');
  if (ann.err) { window._out = JSON.stringify({ auth: false, status: ann.err }); break; }
  res[k] = { ann: ann.filter(isNew).map(a => ({ id: a.id, t: a.title, c: a.created, m: a.modified, b: strip(a.body).slice(0, 300) })) };
  if (k !== 'EGC') {
    const ct = await all(B + 'courses/' + id + '/contents?recursive=true&limit=200'); window._ct[k] = ct;
    const byId = Object.fromEntries(ct.map(x => [x.id, x.title]));
    res[k].cont = ct.filter(isNew).map(x => [x.id, (byId[x.parentId] || '').slice(0, 20), x.title.slice(0, 50), (x.modified || '').slice(0, 16)]);
  }
  const gb = await fetch('/learn/api/public/v2/courses/' + id + '/gradebook/columns?limit=100').then(r => r.ok ? r.json() : { results: [] });
  res[k].gb = (gb.results || []).map(g => [g.name, g.grading && g.grading.due]);
}
window._out = window._out || JSON.stringify(res);
window._out.length
// Gotchas seen 2026-11-19: EV re-touches whole folders (e.g. every Práctica item modified the same
// minute), so filter on parent/title, not just `modified`; a 'resource/x-bb-file' item's file list
// comes from .../contents/{id}/attachments.
