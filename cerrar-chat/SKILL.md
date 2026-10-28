---
name: cerrar-chat
description: Session closing ritual — persist to vault and memory, check wikilinks, sync the setup repos.
disable-model-invocation: true
---

# Cerrar Chat

Session closing ritual. Runs only when Lucas types `/cerrar-chat`; `disable-model-invocation` keeps Claude from starting it on "cerramos" in prose.

This skill is the single source for the closing ritual (`CLAUDE.md` § "Session closing" points here). The general vault/memory rules it applies live in `feedback_memoria_vault`.

## Steps

### 1. Session summary
2-4 bullets of what was actually done in this chat.

If the chat was **trivial** (an ack, a single question already answered, waiting on a third party, copy-paste of something already prepared): say so in one line and jump straight to step 5. Don't run the full ritual over nothing. The "trivial" criterion lives here, not in the trigger.

### 2. Persist to the vault
Does anything deserve to outlive the chat? — decisions taken, commit hashes, findings, a project changing state. Save it directly in the matching note; don't ask unless where it goes is genuinely ambiguous.

Vault rules (`C:\Users\lucas\SecondBrain`):
- Before creating a new note, check with Glob/Grep that no similar one exists.
- Wikilinks `[[note]]` by name only (no path), YAML frontmatter, English (exceptions per `CLAUDE.md` § "Language & style").
- Don't save what the repo or the vault already records by itself.
- Every factual claim you save (here or in memory, step 3) carries source + verification date; anything unverified is marked as intuition or not saved ([[feedback_memoria_vault]]).

### 3. Update memory
Only if an active project changed state or new feedback came up. Edit the existing file in `memory/` (don't duplicate) and adjust its pointer in `MEMORY.md`. If nothing changed at that level, don't touch memory.
- **Replace, don't append.** Rewrite the file's current-state lines. Never add a dated "Update …" section: the session log goes to the vault. Vault hubs work the same way: a hub holds current state, and dated logs go to the topic's `-Historico` note (or a dated `_archivo/` note). Index lines get the same treatment: rewrite the line, don't chain dated clauses onto it. (2026-10-24: a project memory grew from 13 to 39 KB through appended updates.)
- A new memory goes to the hot index only if it passes the split rule at the top of `MEMORY.md`. Domain-gated references go to `MEMORY-archivo.md`.

### 4. Wikilink check (notes touched today)
Identify the vault `.md` notes modified this session: the ones in your own Edit/Write calls, plus whatever this shows (a sync earlier in the session may already have committed some, so git status alone misses them):

```powershell
git -C C:\Users\lucas\SecondBrain status --porcelain -- "*.md"
```

For only those notes (auditing the rest is `/revisar-vault`'s job):
- **Real broken wikilinks** → fix them. **Exclude** `[[feedback_*]]`, `[[project_*]]`, `[[reference_*]]`, `[[user_*]]`: they point to memory, are intentional, NOT broken (same rule as `revisar-vault`).
- **Obvious unlinked connection**: if the note literally mentions the exact title of another existing vault note, wrap it in `[[]]` — body only, never in frontmatter or code blocks.

If no notes were touched, or there's nothing to fix, say so in one line and move on. Don't invent work or audit notes not touched today.

### 4b. Re-read pass (what the advisor used to catch)
Lucas doesn't want to call the advisor on every close, so do this pass yourself. Re-read the files from disk; don't rely on what you remember writing. Scope: every file you edited this session according to your own Edit/Write calls, not only what `git status` shows, because a sync earlier in the session already committed some of them. Add the hub of every topic whose state changed this session, even if you didn't edit that hub.
- **State sections.** Read each hub's "Estado" or current-state section and each edited memory's state lines. Every line must be true *now*, and its date or "as of" header must be updated. If a memory and its hub both state the same thing, the hub is the source: cut the memory line down to a pointer.
- **Temporary source files.** Grep those notes for `Downloads`, `AppData\Local\Temp` and `scratchpad`. If a note cites a file there as a source, copy it to a permanent place (the subject's OneDrive folder or the vault) and repoint the note.
- **Claims written this session.** Each claim needs the source it was read from. If you saw it only in a search-result summary or recalled it from memory, mark it as unconfirmed.

Why this step exists: stale hub/memory state was the most common close miss in the 2026-10 transcript sweep (unmeasured since).

### 5. Continuation prompt (CONDITIONAL)
Offer it **only** if non-trivial work was left mid-flight — complex mental state (half-done debugging, decision in progress, long reasoning thread) that would be lost in a clean chat. If everything is closed and already in memory/vault, **don't** offer a prompt: it's noise.

### 6. Commit + push (manual sync)
As the final step, persist to remote by running the sync script (there's no automatic hook doing it anymore):

```powershell
powershell -ExecutionPolicy Bypass -File C:/Users/lucas/.claude/skills/sync/sync.ps1
```

Show the result per repo. If any repo reports `PUSH FAILED` or `sin pushear`, tell Lucas (probably `gh` not logged in as `lurio84`). Don't close declaring success if any repo didn't reach `pushed` / `up to date`.

## Limits (what this skill doesn't do)
- Don't chain `/revisar-vault`: it's the heavy whole-vault review, costs far more than a close, and Lucas runs it on his own schedule.
- Don't move, rename, archive or merge notes: that breaks wikilinks across the vault and is a structural call Lucas makes. Don't create wikilinks to notes that don't exist: they read as real links and rot into broken ones.
- The step-6 sync is the only commit this skill makes. Code repos are committed from their own cwd, on Lucas's request (`feedback_workflow_secondbrain`); a close that commits them would push work he hasn't reviewed.
