---
name: cerrar-agy
description: "Closing ritual for an agy (Antigravity) session in Lucas's vault. Use when Lucas says cerrar, cierra, cerrar-agy, or ends the session. agy only; Claude uses cerrar-chat."
---

# cerrar-agy

You are closing an agy session in `C:\Users\lucas\SecondBrain`. Commits and pushes are not your job: the vault hook commits your files as author `agy`, and Claude's `/cerrar-chat` pushes later.

1. **List what you changed.** Every note you created or edited this session, one line each: path and what changed. Re-read each one; fix anything broken (frontmatter, links to notes that don't exist).
2. **Memory proposals.** If Lucas gave a standing instruction, made a decision, or you verified a fact with a source, append one entry per item to `Inbox/agy-propuestas-memoria.md` (create it if missing):
   ```
   ## YYYY-MM-DD — <short title>
   - Fact: <one or two sentences>
   - Source: <Lucas's words in quotes, or file/URL + date checked>
   - Updates memory: <memory name if known, else "new">
   ```
   Don't propose things already written in `CLAUDE.md` or in `.agents/memory/`.
3. **Open threads.** If work is half done, add it to the note it belongs to (a short "Pending" line with today's date), not only in chat.
4. **Tell Lucas, in Spanish, in 3 lines max:** what changed, what you proposed for memory, what's pending. Remind him that the push happens on Claude's next `/cerrar-chat` or with `gbrain`'s exit message.
