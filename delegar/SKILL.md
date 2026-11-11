---
name: delegar
description: Delegate token-heavy work (folder sweeps, summaries of many files/PDFs/repos, first-pass reviews, web page reading; edits only in a reviewed worktree) to Antigravity CLI (agy) so it spends Google AI Pro quota instead of Claude's. Use proactively when a task would otherwise go to an Explore/general-purpose subagent and only its conclusion matters, or when the user says "delega", "pásaselo a agy/Gemini".
---

# Delegar (agy)

Runs `~/.claude/tools/delegar.ps1` (private claude-config repo, with the never-send list). Works on any PC where `agy` is installed and signed in. Evidence and dated tests behind these rules: vault `Agy-Delegation-Log` (§ Evidence behind the delegar skill, and the run table); setup details: private memory `project_agy_delegacion`.

## When
- **Delegate:** reading/summarizing many files, inventories, "find where X is", first-pass review of a repo or document set, extracting facts into a table.
- **Keep in Claude:** direct writes to the vault/memory/repos, judgment calls, finance, outward actions, and anything under the never-send list (`~/.claude`, `~/.ssh`; the script exits 2 — don't work around it, ask Lucas). Exception: rules and memories from `~/.claude` may go out as a filtered scratchpad copy (no settings, `.env` or credentials) that passes `mcp__plugin-authoring__scan_secrets`.
- Let agy do the work itself: it converts formats on its own (PDF natively, `.docx` via `python-docx`). Claude only writes the prompt and picks which files it sees. Don't add restrictions "just in case": check the official Antigravity docs or ask Lucas.
- Not for animation QA: Flash reads a local video's content (speech, on-screen text) but misses brief motion and passes defects as clean.

## Modes
| Mode | Use | Constraints |
|---|---|---|
| default | read-only (sandbox + `write_file` deny) | `search_web` gives snippets only; no URL fetch |
| `-Web` | fetch full pages (`curl.exe -sL <url>`) | `-Dir` must be an **empty** fresh scratchpad folder (exit 2 otherwise); anything appearing in it → exit 5. Sandbox off + auto mode: shell can write anywhere, only the git/empty-dir checks notice |
| `-Write` | edits | `-Dir` in a git repo → new worktree from `HEAD` (branch `agy/<time>`, uncommitted changes absent); under `%TEMP%` → in place; else exit 2. Only agy's `write_file` can write: binary output (`.docx`, `.xlsx`) needs `-Full`. Claude reviews the diff, runs tests, merges, removes worktree + branch (footer prints the commands). Never on the vault/memory |
| `-Full` | builds that install packages, browse, self-verify | `-Dir` under `%TEMP%`; no sandbox. Snapshot of the 3 watched repos first; undo with `delegar-revert.ps1 -Snapshot <file>` (dry run) → `-Apply` (restores tracked files, also undoes others' later edits: review the list; can't see edits to files that were already untracked) / `-DeleteNew` |

Modes don't combine. Lucas's real logged-in Chrome (tower only): copy `Documents/agy-outputs/agy-chrome-mcp_config.json` to `<Dir>/.agents/mcp_config.json`, run with `-Full` (or `-Web`; its `.playwright-mcp/` logs trip a harmless exit 5), and tell agy to use the MCP server "playwright" tools (`browser_navigate`…), not its built-in browser. For pages Claude already has a recipe for (WhatsApp Web), reading them with Claude's own `browser_evaluate` is cheaper.

## How
```powershell
& "$HOME\.claude\tools\delegar.ps1" -Dir <folder> -Prompt "<task>" [-PromptFile <file>] [-Model "Gemini 4 Argon (Low)"] [-Solo] [-Effort low|medium|high] [-Timeout 10m] [-Schema <json>] [-Tag <name>] [-Web|-Write|-Full]
```
- **Default model:** Argon Low leads and spawns 2-4 `flash` subagents via `invoke_subagent` (preamble added by the script). `-Solo` = Argon alone (spends scarce Argon quota). Argon needs its display name (`"Gemini 4 Argon (Low)"`; the slug `gemini-4-argon-low` is rejected in `-p`). Flash and other Gemini models take slugs that carry the effort (`gemini-3.8-flash-high`). `agy models` lists them.
- `-Effort` is optional; Claude/GPT models reject it. Use Claude/GPT models (separate quota bucket) only for one-off probes. When that bucket says «quota reached» after its reset time, retry once, then drop the run.
- `-Dir` = narrowest folder. If it mixes things agy shouldn't see, copy only the allowed files to a scratchpad folder. Long prompts → `-PromptFile`.
- Ask for a compact answer (table, list or `-Schema` JSON) and **"final answer only"** (otherwise the lead dumps drafts). Give a hard size cap; agy ignores soft limits.
- Read-only tasks: tell agy not to use shell commands (`read_file` only); a needless shell call can hang until timeout.
- Long tasks: `run_in_background`. Lucas watches the `agy-live` band; the full log (`~/.claude/tools/live/<session id>.log`) is for Claude.
- **One `delegar.ps1` call per tool call, never after a `Start-Sleep`** (the band attaches only if agy starts within 15 s). To re-attach the band to a running run, run any foreground command containing `delegar.ps1`.
- Parallel runs from one chat: launch every run except at most one with `-Tag <name>`, each in its own background call.
- While a run is in progress, don't edit files in the vault, claude-config or claude-skills: the git check can't tell your edits from agy's.
- `invoke_subagent` has ~140k tokens of fixed overhead: use subagents only for heavy branches. A subagent's model is only `inherit|flash|pro`; a Claude/GPT opinion needs its own run.

## Patterns
- **Research:** 2 independent runs, same prompt, fixed JSON schema with claim ids and verbatim quotes from one official domain. A script diffs the runs and checks each quote on the cited page (template `Documents/agy-outputs/2026-11-05/verify-boe-quotes.js`). Claude reads only the disagreements, and greps one-run-only items before merging.
- **Verifier:** a fresh-context run that gets only the source and the claim list (never the extractor's reasoning) to hunt omissions and overstatements; a different model family when quota allows. A quote check proves the quote exists, not that the claim stays within it.
- **Builds:** don't trust the run's own report. Use a reviewer that sees only the output and a facts file, then check yourself. For anything with permissions, give the reviewer the real permission data and ask about abuse explicitly.

## Reading the result
- Exit 0 = usable. 3 = failed/empty: retry once with a simpler prompt, else do it in Claude. 5 = a watched repo changed and agy could have done it; first check whether the listed files are ones you or another chat edited (memory lives in claude-config). Alert Lucas only if a change is unexplained. The footer lists changed paths even on exit 0, labelled as another chat or a sync when agy used no write-capable tool. 2 = blocked by the script (never-send list or wrong `-Dir`).
- The footer reports tokens, denied actions, agy's error if any, and the conversation id (`agy -p ... --conversation <id>` continues it).
- **Verify** concrete claims against the source before relying on the output: Flash 2–3 checks, Argon 1–2. Anything written to the vault or shown to others gets full verification (spot-checks overstate accuracy).
- **Extraction runs:** ask for `count`, oldest and newest item per source in the schema and check those edges. Spot-checks confirm what came back, not what's missing.
- **A timed-out or partial extraction is discarded and relaunched narrower** (one source per run, ready-made scripts). Never resume it asking for "what you already read": it invents verbatim text.
- Template-driven writing: grep every quoted phrase against the source and read any self-reported "process" section in full; Flash fills every slot, inventing content if needed.
- Check every image agy picked by eye before publishing.

## Logging
- Every run goes to `~/.claude/tools/delegar-log.csv` (tokens, quota left). Quota on demand: `agy -p "/usage" --output-format json` (no model call).
- **After each real run, add a row to vault `Conocimiento/IA/Coding-LLMs/Agy-Delegation-Log.md`**: claims checked, errors found, Claude cost (S/M/L), where the result was used. Save output and prompt in `Documents/agy-outputs/<date>/` with a provenance header (model, tokens, conversation id, what was verified).
- Test runs go in folders named `web*`, `flash1`, `toyrepo`, or under `%TEMP%\agy-wt`; real runs must never use those names.
