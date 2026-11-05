---
name: delegar
description: Delegate read-only, token-heavy work (folder sweeps, summaries of many files/PDFs/repos, first-pass reviews) to Antigravity CLI (agy) so it spends Google AI Pro quota instead of Claude's. Use proactively when a task would otherwise go to an Explore/general-purpose subagent and only its conclusion matters, or when the user says "delega", "pásaselo a agy/Gemini".
---

# Delegar (agy)

Runs `~/.claude/tools/delegar.ps1` (lives in the private claude-config repo, together with the never-send list). Tower and laptop both work if `agy` is installed and signed in.

## When
- Delegate: reading/summarizing many files, inventories, "find where X is", first-pass review of a repo or document set, extracting facts into a table.
- Keep in Claude: any write to the vault/memory/repos, judgment calls, finance, outward actions, and anything under the never-send list (the script blocks it, exit 2 — don't work around it, ask Lucas).
- Web research: `search_web` (Google search) works headless, but returns only snippets. Fetching pages does NOT work (tested 2026-11-05, agy 1.5.1). The URL tool isn't loaded in `-p` mode, even with `read_url(*)` allowed or `--dangerously-skip-permissions`. The terminal sandbox also blocks `curl`. For full pages, Claude fetches them, or uses `gh api` for GitHub.
- Let agy do the work itself (Lucas, 2026-11-05): it converts formats on its own (PDF natively, `.docx` via `python-docx` through `run_command`). Claude only writes the prompt and picks which files it sees. No pre-processing that spends Claude tokens. Don't add restrictions "just in case": check the official Antigravity docs or ask Lucas.

## How
```powershell
& "$HOME\.claude\tools\delegar.ps1" -Dir <folder> -Prompt "<task>" [-Model gemini-3.8-flash-medium] [-Effort low|medium|high] [-Timeout 10m] [-Schema <json>]
```
- `-Effort` is optional. Gemini slugs already carry the effort (`gemini-3.8-flash-high`). Claude/GPT models reject `--effort`. If agy fails, the footer shows `[delegar] agy error: …`.
- `-Dir` is agy's workspace: pick the narrowest folder. If the folder mixes things agy shouldn't see (e.g. an exam reserved for a mock), copy only the allowed files into a scratchpad folder and pass that. Long prompts: write them to a scratchpad file and pass `-PromptFile`.
- Model choice: Flash for routine work (~214k tokens ≈ 0.4 pp of the Gemini weekly quota). Opus 4.6 only for one-off probes: one mid-size task (149k tokens) took ~33 pp weekly / ~66 pp 5h of the Claude/GPT bucket (2026-11-05, one run per model). The Opus here runs inside agy's harness, not Claude Code's.
- Ask for a compact answer (a table, a list, or `-Schema` JSON) so reading it back costs few Claude tokens.
- Models: `agy models` lists them. Gemini and Claude/GPT models draw from separate quota buckets.
- Run it with `run_in_background` for long tasks. Lucas watches it live through the `agy-live` mod: a Claude-style status band above the prompt during the run. The full log of the last run (`/agy`, `delegar-live.log`) is for Claude; Lucas doesn't need it surfaced. `delegar-live.log` holds only the current run.
- While a run is in progress, avoid editing files in the vault, claude-config or claude-skills: the git check can't tell your edits from agy's.

## Reading the result
- Exit 0 = usable. 3 = failed/empty (retry once with a simpler prompt, else do it in Claude). 5 = a git repo changed during the run. First check whether the changed files are ones you edited yourself meanwhile (memory lives in claude-config, so this happens). Alert Lucas with `git status` only if a change is unexplained.
- The footer line reports tokens, denied actions and the conversation id (`agy -p ... --conversation <id>` continues it).
- Verify by spot-check (Lucas, 2026-11-05): confirm concrete claims against the source before relying on the output, scaled to the model. Flash outputs get 2–3 checks, because Lucas trusts Flash less, even on high. A stronger model (e.g. Gemini 4 Argon, once available) gets 1–2. Anything that ends up written to the vault still gets full verification.
- Every run is logged to `~/.claude/tools/delegar-log.csv` with tokens and the quota left afterwards (quota measurement). Quota on demand: `agy -p "/usage" --output-format json` (no model call).
