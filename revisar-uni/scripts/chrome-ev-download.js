// Claude in Chrome download of EV attachments (worked 2026-11-19). The signed S3 URL never
// leaves the page: the file is fetched in-page as a blob and saved through an <a download>,
// so it lands in ~/Downloads; then move it with bash and hash-check.
// Run with mcp__claude-in-chrome__javascript_tool on a tab at https://ev.us.es/learn/api/public/v1/...
// FIRST TIME: Chrome blocks the 2nd+ automatic download from ev.us.es until Lucas clicks the
// blocked-download icon in the address bar → «Permitir siempre» (done on the tower 2026-11-19).
// Downloads queued while blocked are released afterwards as «name (1).pdf» duplicates:
// hash-compare and delete them.
// L = [[contentId, attachmentId, fileName], ...]
const COURSE = '_108078_1';
const L = [];
const out = [];
for (const [c, a, name] of L) {
  const r = await fetch(`/learn/api/public/v1/courses/${COURSE}/contents/${c}/attachments/${a}/download`);
  const b = await r.blob();
  const el = document.createElement('a'); el.href = URL.createObjectURL(b); el.download = name;
  document.body.appendChild(el); el.click(); el.remove();
  out.push(name + ' ' + r.status + ' ' + b.size);
  await new Promise(s => setTimeout(s, 1200));
}
out.join(' | ')
