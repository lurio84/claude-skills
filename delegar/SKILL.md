---
name: delegar
description: Delegate read-only, token-heavy work (folder sweeps, summaries of many files/PDFs/repos, first-pass reviews) to Antigravity CLI (agy) so it spends Google AI Pro quota instead of Claude's. Use proactively when a task would otherwise go to an Explore/general-purpose subagent and only its conclusion matters, or when the user says "delega", "pásaselo a agy/Gemini".
---

# Delegar (agy)

Runs `~/.claude/tools/delegar.ps1` (lives in the private claude-config repo, together with the never-send list). Tower and laptop both work if `agy` is installed and signed in.

## When
- Delegate: reading/summarizing many files, inventories, "find where X is", first-pass review of a repo or document set, extracting facts into a table.
- Keep in Claude: any write to the vault/memory/repos, judgment calls, finance, outward actions, and anything under the never-send list (the script blocks it, exit 2 — don't work around it, ask Lucas).
- Not yet: web research (agy's `read_url` is denied in headless mode; untested).

## How
```powershell
& "$HOME\.claude\tools\delegar.ps1" -Dir <folder> -Prompt "<task>" [-Model gemini-3.8-flash-medium] [-Effort medium] [-Timeout 10m] [-Schema <json>]
```
- `-Dir` is agy's workspace: pick the narrowest folder. Long prompts: write them to a scratchpad file and pass `-PromptFile`.
- Ask for a compact answer (a table, a list, or `-Schema` JSON) so reading it back costs few Claude tokens.
- Models: `agy models` lists them. Gemini and Claude/GPT models draw from separate quota buckets.
- Run it with `run_in_background` for long tasks. Lucas watches it live through the `agy-live` mod: a Claude-style status band above the prompt during the run, and `/agy` opens the full log of the last run. `delegar-live.log` holds only the current run.
- While a run is in progress, avoid editing files in the vault, claude-config or claude-skills: the git check can't tell your edits from agy's.

## Reading the result
- Exit 0 = usable. 3 = failed/empty (retry once with a simpler prompt, else do it in Claude). 5 = a git repo changed during the run. First check whether the changed files are ones you edited yourself meanwhile (memory lives in claude-config, so this happens). Alert Lucas with `git status` only if a change is unexplained.
- The footer line reports tokens, denied actions and the conversation id (`agy -p ... --conversation <id>` continues it).
- Verify by spot-check (Lucas, 2026-11-05): confirm concrete claims against the source before relying on the output, scaled to the model. Flash outputs get 2–3 checks, because Lucas trusts Flash less, even on high. A stronger model (e.g. Gemini 4 Argon, once available) gets 1–2. Anything that ends up written to the vault still gets full verification.
- Every run is logged to `~/.claude/tools/delegar-log.csv` with tokens and the quota left afterwards (quota measurement). Quota on demand: `agy -p "/usage" --output-format json` (no model call).
