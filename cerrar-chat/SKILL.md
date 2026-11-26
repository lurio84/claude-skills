---
name: cerrar-chat
description: Session closing ritual — persist to vault and memory, check wikilinks, sync the setup repos.
disable-model-invocation: true
---

# Cerrar Chat

Session closing ritual. Runs when Lucas types `/cerrar-chat` or explicitly asks Claude to run it (e.g. "advisor y /cerrar-chat", said out of habit: the advisor is off, so this just means the close). Never start it on your own from a vague "cerramos" in prose.

This skill is the single source for the closing ritual (`CLAUDE.md` § "Session closing" points here). The general vault/memory rules it applies live in `feedback_memoria_vault`.

## Steps

### 1. Session summary
2-4 bullets of what was actually done in this chat.

**Cost scales with what changed** (Lucas, 2026-11-18: «me gusta cerrar de forma consistente», same ritual every close but cheap when little changed; applied 2026-11-25):
- **Trivial or no edits:** an ack, a single question already answered, waiting on a third party, copy-paste of something already prepared, or a chat with no file changes (Edit/Write or shell), nothing sent outside, no financial verdict, and nothing worth persisting. Say so in one line and jump straight to step 6. The "trivial" criterion lives here, not in the trigger.
- **Otherwise:** run steps 2-6, scoped as each step says.

### 2. Persist to the vault
Does anything deserve to outlive the chat? — decisions taken, commit hashes, findings, a project changing state. Save it directly in the matching note; don't ask unless where it goes is genuinely ambiguous.

Vault rules (`C:\Users\lucas\SecondBrain`):
- Follow the vault/memory persistence and language rules in `CLAUDE.md` (§ "Vault", § "Language & style") and `[[feedback_memoria_vault]]`.
- Don't save what the repo or the vault already records by itself.
- Did a snippet or recipe work against an external site (WhatsApp Web, SharePoint, EV…)? Save it as a file (e.g. in the relevant skill's `scripts/`) and link it from the note; don't leave it only as prose.

### 3. Update memory
Only if an active project changed state or new feedback came up. Edit the existing file in `memory/` (don't duplicate) and adjust its pointer in `MEMORY.md`. If nothing changed at that level, don't touch memory.
- **Replace, don't append.** Rewrite the file's current-state lines. Never add a dated "Update …" section: the session log goes to the vault. Vault hubs work the same way: a hub holds current state, and dated logs go to the topic's `-Historico` note (or a dated `_archivo/` note). Index lines get the same treatment: rewrite the line, don't chain dated clauses onto it. (2026-10-24: a project memory grew from 13 to 39 KB through appended updates.)
- **agy proposals.** If `Inbox/agy-propuestas-memoria.md` exists in the vault, treat each entry as a candidate (agy can't write memory). Check its source; save the ones that hold, under the usual rules; ask Lucas about any you can't verify. Then remove the handled entries from the file, or delete it if empty.
- A new memory goes to the hot index only if it passes the split rule at the top of `MEMORY.md`. Domain-gated references go to `MEMORY-archivo.md`.

### 4. Wikilink check (notes touched today)
Run `python -I ~/.claude/tools/refcheck.py --vault --changed`. It checks the vault notes uncommitted or committed today for broken wikilinks and broken YAML frontmatter (memory links, path links, attachments and code are already handled). Fix what it reports. If you edited a note this session that it didn't list, check that one too.

Then one judgment pass on those notes only: if a note literally mentions the exact title of another existing vault note, wrap it in `[[]]` (body only, never frontmatter or code blocks). Nothing to fix → one line, move on.

### 4b. Re-read pass
The advisor is off for good (2026-11-25, memory `project_advisor_off_trial`), so do this pass yourself.
- **Opus review, only when it applies:** the session shipped code, a deploy, a publish, text sent to an external system (form, email, platform post), a financial action or verdict, and nothing has reviewed it yet. In that case run an `opus` subagent review of the diff, the verdict or the sent text first, and triage its findings. Otherwise no subagent.
- **Re-read scope:** only the files that hold rules or state, i.e. memory files, `MEMORY.md`, hubs and state sections, skills, `CLAUDE.md`/`AGENTS.md`, hooks and settings. Take them from your own Edit/Write calls and shell edits this session, not only from `git status`, because a sync earlier in the session already committed some of them. Add the hub of every topic whose state changed this session, even if you didn't edit that hub. Plain content notes (study material, research write-ups) skip the state-section check, but the **Claims** bullet below still applies to them.
- Re-read the files from disk; don't rely on what you remember writing.
- **State sections.** Read each hub's "Estado" or current-state section and each edited memory's state lines. Every line must be true *now*, and its date or "as of" header must be updated. If a memory and its hub both state the same thing, the hub is the source: cut the memory line down to a pointer.
- **Temporary source files.** Grep those notes for `Downloads`, `AppData\Local\Temp` and `scratchpad`. If a note cites a file there as a source, copy it to a permanent place (the subject's OneDrive folder or the vault) and repoint the note.
- **Claims written this session**, in files or in text sent to external systems. Each claim needs the source it was read from. If you saw it only in a search-result summary or recalled it from memory, mark it as unconfirmed.

Why this step exists: stale hub/memory state was the most common close miss in the 2026-10 transcript sweep (unmeasured since).

### 5. Continuation prompt (CONDITIONAL)
Offer it **only** if non-trivial work was left mid-flight — complex mental state (half-done debugging, decision in progress, long reasoning thread) that would be lost in a clean chat. If everything is closed and already in memory/vault, **don't** offer a prompt: it's noise.

### 6. Commit + push (manual sync)
As the final step, persist to remote by running the sync script (no hook does this automatically):

```powershell
powershell -ExecutionPolicy Bypass -File C:/Users/lucas/.claude/hooks/sync.ps1 -Label "<chat topic>" -Paths "<abs path>;<abs path>"
```

`-Label`: 2-5 words naming this chat's topic (no quotes inside). `-Paths`: absolute Windows paths of every file this chat created or edited, from your own Edit/Write calls and shell edits (vault notes, memory files, skills, hooks), `;`-separated. Files already committed or unchanged are skipped. The script commits them first as `[label]`, then everything else (other open chats) as `[other chats]`, so the history shows which chat did what. On a trivial chat with no edits, run it without parameters.

Show the result per repo. If any repo reports `PUSH FAILED` or `sin pushear`, tell Lucas (probably `gh` not logged in as `lurio84`). `COMMIT FAILED` usually means another chat was closing at the same time (`index.lock`): wait a few seconds and run the script again. Don't close declaring success if any repo didn't reach `pushed` / `up to date`.

## Limits (what this skill doesn't do)
- Don't chain `/revisar-vault`: it's the heavy whole-vault review, costs far more than a close, and Lucas runs it on his own schedule.
- Don't move, rename, archive or merge notes: that breaks wikilinks across the vault and is a structural call Lucas makes. Don't create wikilinks to notes that don't exist: they read as real links and rot into broken ones.
- The step-6 sync is the only commit this skill makes. Code repos are committed from their own cwd, on Lucas's request (`feedback_workflow_secondbrain`); a close that commits them would push work he hasn't reviewed.
