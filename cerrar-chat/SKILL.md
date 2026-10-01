---
name: cerrar-chat
description: Closing ritual for a chat session. Reviews what was done, persists what merits saving to the Obsidian vault, updates memory if stale, checks wikilinks of notes touched this session, and offers a continuation prompt ONLY if work was left mid-flight. Use ONLY when the user explicitly invokes /cerrar-chat — do NOT auto-trigger on "cerramos".
---

# Cerrar Chat

Session closing ritual. **Runs only when Lucas types `/cerrar-chat`** — don't self-trigger on "cerramos" in prose.

Don't rewrite the closing rules: this skill **executes** them. The policy lives in `CLAUDE.md` (§ "Session closing policy") and in the memories `feedback_cierre_chat` / `feedback_memoria_vault`. On conflict, those sources win.

## Steps

### 1. Session summary
2-4 bullets of what was actually done in this chat.

If the chat was **trivial** (an ack, a single question already answered, waiting on a third party, copy-paste of something already prepared): say so in one line and jump straight to step 5. Don't run the full ritual over nothing. The "trivial" criterion lives here, not in the trigger.

### 2. Persist to the vault
Does anything deserve to outlive the chat? — decisions taken, commit hashes, findings, a project changing state. Save it directly in the matching note; don't ask unless where it goes is genuinely ambiguous.

Vault rules (`C:\Users\lucas\SecondBrain`):
- Before creating a new note, check with Glob/Grep that no similar one exists.
- Wikilinks `[[note]]` by name only (no path), YAML frontmatter, English (exceptions per `CLAUDE.md` § Language).
- Don't save what the repo or the vault already records by itself.
- Every factual claim you save (here or in memory, step 3) carries source + verification date; anything unverified is marked as intuition or not saved ([[feedback_memoria_vault]]).

### 3. Update memory
Only if an active project changed state or new feedback came up. Edit the existing file in `memory/` (don't duplicate) and adjust its pointer in `MEMORY.md`. If nothing changed at that level, don't touch memory.

### 4. Wikilink check (notes touched today)
Identify the vault `.md` notes modified this session:

```powershell
git -C C:\Users\lucas\SecondBrain status --porcelain -- "*.md"
```

For ONLY those notes:
- **Real broken wikilinks** → fix them. **Exclude** `[[feedback_*]]`, `[[project_*]]`, `[[reference_*]]`, `[[user_*]]`: they point to memory, are intentional, NOT broken (same rule as `revisar-vault`).
- **Obvious unlinked connection**: if the note literally mentions the exact title of another existing vault note, wrap it in `[[]]` — body only, never in frontmatter or code blocks.

If no notes were touched, or there's nothing to fix, say so in one line and move on. Don't invent work or audit notes not touched today.

### 5. Continuation prompt (CONDITIONAL)
Offer it **only** if non-trivial work was left mid-flight — complex mental state (half-done debugging, decision in progress, long reasoning thread) that would be lost in a clean chat. If everything is closed and already in memory/vault, **don't** offer a prompt: it's noise.

### 6. Commit + push (manual sync)
As the final step, persist to remote by running the sync script (there's no automatic hook doing it anymore):

```powershell
powershell -ExecutionPolicy Bypass -File C:/Users/lucas/.claude/skills/sync/sync.ps1
```

Show the result per repo. If any repo reports `PUSH FAILED` or `sin pushear`, tell Lucas (probably `gh` not logged in as `lurio84`). Don't close declaring success if any repo didn't reach `pushed` / `up to date`.

## Hard limits (what this skill does NOT do)
- **DON'T** invoke `/handoff` automatically. It's expensive and only worth it with complex mental state; that's Lucas's call, not the skill's. At most, suggest it in one line if step 5 detects that case.
- **DON'T** chain `/revisar-vault`. That's the heavy periodic review of the whole vault, a different scope.
- **DON'T** move, rename, archive or merge notes. **DON'T** create wikilinks to notes that don't exist.
- The commit + push in step 6 is the ONLY one this skill makes. DON'T invent other commits or touch repos outside the 3 setup repos (`feedback_workflow_secondbrain`).
