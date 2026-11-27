// Claude in Chrome recipe: send a multi-paragraph message to a WhatsApp Web chat (worked 2026-11-27, group «PGPI»).
// Only with Lucas's explicit OK on the exact text (memory feedback_mensajes_grupo). Write «1)» not «1.» (WhatsApp auto-numbers).
// Step 1: open the chat with chrome-whatsapp-read.js step 1 + a real computer left_click on the returned {x,y}.
// Step 2 (javascript_tool): check the header and focus the composer. Clicking the composer by coordinates can fall
//   outside the screenshot frame (the DOM rect is in a different scale), so focus it from the DOM instead:
/*
const box = document.querySelector('#main footer [contenteditable="true"]'); box.focus();
const head = document.querySelector('#main header').innerText.split('\n')[0];
JSON.stringify({ head, focused: document.activeElement === box, empty: !box.innerText.trim() });   // head must equal the chat title
*/
// Step 3: computer `type` one paragraph per call; between paragraphs computer `key` "shift+Enter"
//   (repeat 2 for a blank line). A plain Enter sends.
// Step 4 (javascript_tool): read box.innerText back and compare with the approved text; screenshot; then computer `key` "Enter".
// Step 5 (javascript_tool): confirm it was sent: last message's pre-plain-text has today's time and «Lucas Ronquillo», composer empty:
/*
await new Promise(r => setTimeout(r, 3000));
const ns = [...document.querySelectorAll('#main [data-pre-plain-text]')]; const l = ns[ns.length - 1];
JSON.stringify({ pre: l.getAttribute('data-pre-plain-text'), start: l.innerText.slice(0, 60),
  box: document.querySelector('#main footer [contenteditable="true"]').innerText.trim().length });
*/
