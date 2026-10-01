---
name: revisar-vault
description: 'Periodic review of the Obsidian vault at C:\Users\lucas\SecondBrain and of Claude''s memory. Biased toward closing open threads, processing Inbox, checking active-project state and auditing memory for stale or unsourced claims — not a generalist audit. Output = living note Yo/Revision-Vault.md (never a new dated note). Use when the user says "revisar vault", "revisión del vault", "qué tengo abierto", "audita la memoria" or invokes /revisar-vault.'
---

# Revisar Vault

## Context

Vault: `C:\Users\lucas\SecondBrain`. Memory: `C:\Users\lucas\.claude\projects\C--Users-lucas-SecondBrain\memory\` (`MEMORY.md` hot index + `MEMORY-archivo.md` low-frequency index).

What this skill is for:
1. **Close threads instead of opening new ones** (Inbox and open threads from the previous review).
2. **Stop errors from propagating.** Memory and CLAUDE.md load into every chat, so a wrong or stale claim there spreads to all future chats until someone notices. The memory audit (Phase 3) is where that gets caught.

Don't hardcode sizes (number of notes/memories) in this file — measure them in Phase 0.

## Flow

### Phase 0 — Quick snapshot (no heavy LLM work)

1. Notes modified in the last 7 days, grouped by top-level folder:
   ```powershell
   Get-ChildItem -Path C:\Users\lucas\SecondBrain -Recurse -Filter *.md | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) } | Group-Object { $_.Directory.FullName.Replace('C:\Users\lucas\SecondBrain\','').Split('\')[0] } | Select-Object Name, Count
   ```
2. Inbox (excluding `_archivo/`), oldest first:
   ```powershell
   Get-ChildItem -Path C:\Users\lucas\SecondBrain\Inbox -Filter *.md | Select-Object Name, LastWriteTime | Sort-Object LastWriteTime
   ```
3. Read the date of the last entry in `Yo/Revision-Vault.md` and report the gap since then. Count vault notes and memory files.

### Phase 1 — Open threads (main pillar)

Sources:
- The "Open threads" table of the latest review in `Yo/Revision-Vault.md` (anything not ✅).
- Every note currently in `Inbox/` (not `_archivo/`).

For each thread: cross-check with recent vault changes (30 days), git log and the active projects in `MEMORY.md`. Classify **resolved** (evidence it was done) / **live** / **stale** (>60 days with no movement).

Output: table `thread | source | age | status | suggestion`. Processed Inbox notes go to `Inbox/_archivo/` (move, never delete).

End of phase: ask Lucas **"Of these N live threads, which do we close today?"** Don't move on until he picks one or says "none".

### Phase 2 — Active-project state

1. Take the "Active projects" list from `MEMORY.md`.
2. For each: matching vault folder/note (Glob by name), last modification date, Inbox captures mentioning it (Grep `Inbox/`).
3. **Flag** projects with an active memory entry but no notes touched in >14 days → "paused? blocked? forgotten?" — ask.

Output: table `project | last note | age | flag`.

### Phase 3 — Memory audit (error propagation)

1. **Index integrity** (script, no LLM):
   ```bash
   cd "C:/Users/lucas/.claude/projects/C--Users-lucas-SecondBrain/memory"
   grep -ohE '\]\([^)]+\.md\)' MEMORY.md MEMORY-archivo.md | sed 's/](//;s/)//' | sort > /tmp/idx.txt
   ls *.md | grep -vE '^MEMORY(-archivo)?\.md$' | sort > /tmp/files.txt
   echo "broken pointers:"; comm -23 /tmp/idx.txt /tmp/files.txt
   echo "unindexed files:"; comm -13 <(sort -u /tmp/idx.txt) /tmp/files.txt
   echo "indexed twice:"; uniq -d /tmp/idx.txt
   ```
   Also grep both CLAUDE.md files for hardcoded counts or references to skills/files that no longer exist.
2. **Content check**, for every `project_*` and `feedback_*` memory (read them yourself — they're small; no subagent):
   - **Still true?** Project state vs vault notes / repo / `git log`; feedback vs CLAUDE.md and other memories (contradictions).
   - **Sourced?** Factual claims (prices, states, numbers, tool behavior) carry source + date. Unsourced → verify now, mark as intuition, or drop.
   - **Right tier?** Hot index vs `MEMORY-archivo.md` per the split rule at the top of `MEMORY.md`; closed project → vault note + remove from memory.
3. Output: table `memory | issue | proposed action (OK / fix / archive / delete)`. **Apply only after Lucas approves**, except broken-pointer typos. Set `modified:` on every file you touch.

### Phase 4 — Graph hygiene (cheap pillar, max 3 bullets in the output)

1. Empty notes or <200 bytes → list (no automatic action).
2. Notes >5KB without YAML frontmatter → list, propose minimal frontmatter in Phase 5.
3. Real broken wikilinks — exclude the intentional ones to memory: `[[feedback_*]]`, `[[project_*]]`, `[[reference_*]]`, `[[user_*]]` are NOT broken.
4. **Index notes disconnected from their domain hub**: a `*-Indice.md` / `INDEX-*.md` in a subfolder that the domain's parent index doesn't list → propose a bidirectional link.
5. **Intra-domain orphans**: in a folder with an identifiable hub, every sibling note should be linked from the hub or from a sibling. Don't touch legitimately standalone notes.
6. **Never archive real orphans.** Only propose links; never delete/move.
7. **BFS of connected components** (run after applying fixes 1-5) to tell Obsidian's visual clouds from real disconnection:

   ```powershell
   $root = "C:\Users\lucas\SecondBrain"
   $notes = Get-ChildItem -Path $root -Recurse -Filter *.md -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\\.obsidian\\' -and $_.FullName -notmatch '\\Colab Notebooks\\' }
   $nameToFile = @{}
   foreach ($n in $notes) { $bn = [System.IO.Path]::GetFileNameWithoutExtension($n.Name); if (-not $nameToFile.ContainsKey($bn)) { $nameToFile[$bn] = $n.FullName } }
   $adj = @{}
   foreach ($bn in $nameToFile.Keys) { $adj[$bn] = New-Object System.Collections.Generic.HashSet[string] }
   foreach ($n in $notes) {
     $bn = [System.IO.Path]::GetFileNameWithoutExtension($n.Name)
     # -Encoding UTF8 is mandatory: PS 5.1 reads ANSI by default and corrupts
     # accents/ñ in wikilinks -> false broken links and false islands.
     $content = Get-Content $n.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
     if (-not $content) { continue }
     $regexMatches = [regex]::Matches($content, '\[\[([^\]\|#]+)')
     foreach ($m in $regexMatches) {
       $target = ($m.Groups[1].Value -split '\|')[0].Trim()
       $target = ($target -split '/')[-1]   # path links ([[_archivo/Note]]) resolve by name
       if ($nameToFile.ContainsKey($target) -and $target -ne $bn) { [void]$adj[$bn].Add($target); [void]$adj[$target].Add($bn) }
     }
   }
   $visited = @{}; $components = New-Object System.Collections.ArrayList
   foreach ($bn in ($nameToFile.Keys | Sort-Object)) {
     if ($visited.ContainsKey($bn)) { continue }
     $comp = New-Object System.Collections.ArrayList; $queue = New-Object System.Collections.Queue
     $queue.Enqueue($bn); $visited[$bn] = $true
     while ($queue.Count -gt 0) { $cur = $queue.Dequeue(); [void]$comp.Add($cur); foreach ($next in $adj[$cur]) { if (-not $visited.ContainsKey($next)) { $visited[$next] = $true; $queue.Enqueue($next) } } }
     [void]$components.Add($comp)
   }
   ```

   For each component with ≥2 nodes that isn't the main one: **legitimate island** (one-off event, config, checkpoint) vs **island to connect** (a cluster that will grow). In the main component, flag nodes whose only bridge is `Revision-Vault.md` or another meta note — those bridges are accidental (they vanish when the meta note is rewritten); propose a link from a real content hub.

### Phase 5 — Auto-apply the trivial (everything else is proposed)

Apply automatically, listing in the living note what was applied:
1. **Obvious wikilinks**: a note mentions the exact title of another existing note → wrap in `[[]]`. Body only, never frontmatter or code.
2. **Minimal frontmatter** where missing: `fecha: <last_write_date>` and `tipo:` derived from the folder.

**Never auto-apply**: moving/renaming notes (except processed Inbox → `Inbox/_archivo/` in Phase 1), archiving orphans, merging duplicates, wikilinks to notes that don't exist, memory content changes (Phase 3 needs approval).

### Phase 6 — Output: update `Yo/Revision-Vault.md`

Living note. The new review goes on top; previous ones collapse into a `> [!summary]-` callout. Keep it short — the value is in what's actionable.

```markdown
## Review YYYY-MM-DD (focus: ...)

### Executive summary (3 bullets)
- [Most relevant change since the last review]
- [Most painful thread to close today]
- [Concrete suggested action]

### Open threads
| Thread | Source | Age | Status | Suggestion |
|---|---|---|---|---|

### Active-project state
| Project | Last note | Age | Flag |
|---|---|---|---|

### Memory audit
- Index integrity: [broken pointers / unindexed / duplicates, or "clean"]
| Memory | Issue | Action | Applied? |
|---|---|---|---|

### Hygiene (max 3 bullets)

### Auto-applied

### Question for Lucas
**Which thread do we close now?**
```

Update the frontmatter `ultima-revision:` date.

## Honest cancellation criterion

If 3 consecutive runs produce no action closed by Lucas → archive the skill and write a `feedback_revisar_vault_no_funciona` memory explaining why.

## Common mistakes

1. **New dated note each time** — the note is living; update it.
2. **Generalist audit** — bias toward closing threads and catching wrong memory; everything else is secondary.
3. **Auto-archiving orphans** — destructive. No.
4. **Treating memory wikilinks as broken** — `[[feedback_*]]`, `[[project_*]]`, etc. are intentional.
5. **Fixing memory without asking** — Phase 3 proposes; Lucas approves.
6. **Keyword grep for semantic judgments** — read content (see [[feedback_revisar_vault_metodologia]]).

## References

- Related memories: [[feedback_memoria_vault]], [[feedback_cierre_chat]], [[feedback_obsidian_first]], [[feedback_revisar_vault_metodologia]]
- Phase 3 (semantic connections via Explore) was removed on 2026-10-01 by Lucas's decision: expensive, and not the current problem.
