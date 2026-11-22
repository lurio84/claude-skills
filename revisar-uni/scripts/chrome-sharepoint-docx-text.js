// Claude in Chrome recipe (worked 2026-11-22): read the text of a .docx straight from the SharePoint server
// when the local OneDrive sync lags behind a teammate's upload. Run with javascript_tool in a tab on the site
// (e.g. https://uses0.sharepoint.com/sites/PGPI-L8-308). Set PATH. Parses the zip by hand and inflates
// word/document.xml with DecompressionStream; keeps paragraphs in window._ps so later calls can slice them
// (javascript_tool output truncates at ~1000 chars: filter or slice window._ps per call).
const PATH = 'Sesión 7/Informe_de_seguimiento_v1.0_2026-11-22.docx';
const buf = new Uint8Array(await (await fetch('/sites/PGPI-L8-308/_api/v2.0/drive/root:/' + PATH + ':/content')).arrayBuffer());
const dv = new DataView(buf.buffer); let e = buf.length - 22; while (dv.getUint32(e, true) !== 0x06054b50) e--;
let cd = dv.getUint32(e + 16, true), n = dv.getUint16(e + 10, true), xml = null;
for (let i = 0; i < n; i++) {
  const m = dv.getUint16(cd + 10, true), cs = dv.getUint32(cd + 20, true), fl = dv.getUint16(cd + 28, true), el = dv.getUint16(cd + 30, true), cl = dv.getUint16(cd + 32, true), lo = dv.getUint32(cd + 42, true);
  const name = new TextDecoder().decode(buf.slice(cd + 46, cd + 46 + fl));
  if (name === 'word/document.xml') {
    const lfl = dv.getUint16(lo + 26, true), lel = dv.getUint16(lo + 28, true);
    const data = buf.slice(lo + 30 + lfl + lel, lo + 30 + lfl + lel + cs);
    xml = m === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  cd += 46 + fl + el + cl;
}
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const doc = new DOMParser().parseFromString(xml, 'application/xml');
window._ps = [...doc.getElementsByTagNameNS(W, 'p')].map(p => [...p.getElementsByTagNameNS(W, 't')].map(t => t.textContent).join('')).filter(t => t.trim());
'paras ' + window._ps.length + ' smallCaps ' + doc.getElementsByTagNameNS(W, 'smallCaps').length;
// Next call, e.g.: window._ps.filter(p => /3\.416/.test(p)).join('\n\n').slice(0, 1900)
