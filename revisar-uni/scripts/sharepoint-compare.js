// args: {site, pairs: [[pathA, pathB], ...]}  (paths relative to the site's document library root)
// Compares files on a SharePoint site by content. Copying a file inside SharePoint injects metadata into
// Office files, so their quickXorHash changes; for .docx/.xlsx/.pptx this hashes the inner content parts
// (document/sheets/slides XML, headers/footers, media, ink) instead. Other files compare by quickXorHash.
// The inner-part logic ran inline on 2026-11-15 on PGPI-L8-308 (Teams folders vs a copied delivery folder);
// this generalized file (site arg, xlsx/pptx parts, quickXorHash branch) has not been run yet.
async (page, args) => {
  if (!page.url().startsWith(args.site)) {
    try { await page.goto(args.site, { waitUntil: 'commit', timeout: 45000 }); } catch (e) {}
    await page.waitForTimeout(5000);
  }
  return page.evaluate(async ({ site, pairs }) => {
    const sp = new URL(site).pathname.replace(/\/$/, '');
    const enc = p => p.split('/').map(encodeURIComponent).join('/');
    const api = p => `${sp}/_api/v2.0/drive/root:/${enc(p)}:`;
    const inner = /^(word\/(document|header\d*|footer\d*|footnotes|comments)\.xml|xl\/(worksheets\/sheet\d+|sharedStrings)\.xml|ppt\/slides\/slide\d+\.xml|(word|xl|ppt)\/media\/.*|word\/ink\/.*)$/;
    async function parts(path) {
      const r = await fetch(api(path) + '/content'); if (!r.ok) return { err: r.status };
      const buf = new Uint8Array(await r.arrayBuffer()); const dv = new DataView(buf.buffer);
      let e = buf.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
      let cd = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true); const res = {};
      for (let i = 0; i < n; i++) {
        const comp = dv.getUint16(cd + 10, true), csz = dv.getUint32(cd + 20, true), nl = dv.getUint16(cd + 28, true),
          xl = dv.getUint16(cd + 30, true), cl = dv.getUint16(cd + 32, true), lo = dv.getUint32(cd + 42, true);
        const name = new TextDecoder().decode(buf.slice(cd + 46, cd + 46 + nl)); cd += 46 + nl + xl + cl;
        if (!inner.test(name)) continue;
        const off = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
        let data = buf.slice(off, off + csz);
        if (comp === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
        res[name] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data))).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      return res;
    }
    async function meta(path) { const r = await fetch(api(path), { headers: { accept: 'application/json' } }); return r.ok ? r.json() : null; }
    const out = [];
    for (const [a, b] of pairs) {
      if (/\.(docx|xlsx|pptx)$/i.test(a)) {
        const A = await parts(a), B = await parts(b);
        if (A.err || B.err) { out.push([b, 'HTTP ' + (A.err || B.err)]); continue; }
        const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])]; const d = keys.filter(k => A[k] !== B[k]);
        out.push([b, d.length ? 'DIFF ' + d.join(',') : `same (${keys.length} parts)`]);
      } else {
        const A = await meta(a), B = await meta(b);
        const h = x => x && x.file && x.file.hashes && x.file.hashes.quickXorHash;
        out.push([b, !A || !B ? 'missing' : h(A) === h(B) ? 'same (bytes)' : 'DIFF bytes']);
      }
    }
    return out;
  }, args);
}
