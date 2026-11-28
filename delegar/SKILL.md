---
name: delegar
description: Delegate work to Antigravity CLI (agy) via mcp__agy__delegate to share load off Claude's quota. Use proactively for whole or partial tasks, or when asked ("delega", "pásaselo a agy/Gemini").
---

# Delegar (agy)

`mcp__agy__delegate` (`~/.claude/tools/agy_mcp.py`, user scope) runs `~/.claude/tools/agy_run.py` and returns agy's answer plus a footer. Works on any PC where `agy` is installed and signed in (`tools/agy-install.ps1`). Evidence: vault `Agy-Delegation-Log`; setup details: memory `project_agy_delegacion`.

## When
- **Delegate almost everything** (whole or partial tasks) to spread load off Claude's quota with equally good results: reading/summarizing, inventories, searches, first-pass or deep reviews, judgment/synthesis, builds with self-checks, code repos (via `write` worktrees), vault edits (`vault`), and `~/.claude` config/memory (worktree, tracked files only — `.credentials.json`, `settings.local.json`, `history.jsonl`, `projects/*/` transcripts, and `.claude-tfg` stay out).
- **Keep in the main chat:** outward actions (sending, publishing, pushing) and final judgment/verification. **Keep out of agy:** `~/.ssh` (blocked, exit 2 — don't work around it, ask Lucas).
- **Visual design with taste:** delegate to agy only from a precise art-direction brief.
- Let agy do the work itself (PDF natively, `.docx` via `python-docx`). Claude writes the prompt and picks the scope; don't add restrictions "just in case".
- Not for animation QA: video reading misses brief motion and passes defects as clean.

## Modes
No mode uses a sandbox (since 2026-11-25): base JSON (`agentMode: ""`, `enableTerminalSandbox: false`, `toolPermission: always-proceed`) + per-mode extras. Denies are guardrails against mistakes, not containment: git writes, `~/.gemini` `write_file`, dot-folder commands (read/write modes dropped only `.claude` and still block `.ssh`, `.agents`, `.git`, `.gitignore`, `.obsidian` to protect vault hooks; `vault` keeps the full regex including `.claude`), credential files (`.credentials.json`, `settings.local.json`, `history.jsonl`, `.claude-tfg` via a separate filename regex plus `read_file` rules in `tools/agy-base.json`), and `read_file(~/.claude/projects)` on the live tree (agy reads memory from the worktree copy).

| mode | Use | Constraints |
|---|---|---|
| `read` (default) | reading, research, web (`curl.exe -sL <url>`) | `write_file(*)` denied + read-only preamble. On `~/.claude`, runs in a throwaway worktree (tracked files only; `.credentials.json`, `settings.local.json`, `history.jsonl`, `projects/*/`, `.claude-tfg` excluded) |
| `write` | edits, builds, installs, servers, screenshots (`shot.py` from `Documents/design-skills-test/shot.py`) | `dir` in a git repo → new worktree starting from uncommitted tracked state (branch `agy/<time>`, repo needs ≥1 commit); under `%TEMP%` → in place; else exit 2. Adds `SecondBrain` denies. Apply changes onto the live repo with `mcp__agy__apply_worktree(worktree)` (refuses high-risk paths unless `force=True` with Lucas's OK; do not merge the branch; removes the worktree and branch automatically — no manual cleanup needed). Run manual `git worktree remove` / `git branch -D` (footer prints commands) only to discard a worktree without applying. Allowlist repos (like `~/.claude`) hide new files in `git status` — check for new files explicitly. Never on the vault |
| `vault` | edits in the real vault | `dir` anywhere in the vault (runs from vault root so agy loads `AGENTS.md` and `.agents/hooks.json`). Hooks commit agy's files as author `agy` with trailers `Agy-Model`, `Agy-Launcher: claude`; already-dirty files it touched stay uncommitted (`Touched-Dirty:`). Review listed commits (`git show <hash>`). Undo: `git revert <hash>` |

Browsing defaults to an isolated browser. Use Lucas's real logged-in Chrome only when the task needs his session, and warn him first so he accepts the extension prompt. Real Chrome (tower only): copy `Documents/agy-outputs/agy-chrome-mcp_config.json` to `<dir>/.agents/mcp_config.json`, pass `chrome: true`, and tell agy to use the MCP "playwright" tools (`browser_navigate`…), not its built-in browser. For pages Claude already has a recipe for (WhatsApp Web), Claude's own `browser_evaluate` is cheaper.

## How
Call `mcp__agy__delegate` with `prompt`, `dir`, `tag` (short, unique among this chat's running calls), and optionally `mode`, `model`, `schema`, `timeout_min` (1–55, default 10), `chrome`. Calls running past 2 min become native background tasks; keep working meanwhile. Subagents can call it too (waits). Shell form (`python ~/.claude/tools/agy_run.py --dir D --prompt-file F [--mode m] [--model m] [--tag t] …`) behaves the same.
- **Routing:**
  - **Default:** `gemini-4-neon-medium`; the effort level is part of the model id (e.g. `gemini-4-neon-high` for hard ones). Use ids from `agy models`; display names and `effort` + suffixed id are refused (exit 2). No Sonnet mirror and no pre-run `/usage` check.
  - **Cheap sweeps in the 20–40 % band:** `gemini-4-hydrogen-medium`, only when the quota-warning footer says so.
  - **Verification:** `claude-opus-5-5-medium` (or `-high` for hard cases) in agy when the `3p` bucket has room (separate small bucket; one ~350k-token run empties the 5h bucket, so keep runs small; on «quota reached» after reset, retry once then drop). Otherwise a Claude `opus` subagent for Gemini-built work, Neon High for Claude-built work.
  - **Quota-warning footer** (indicative bands on real reset time from `/usage`, since Google sometimes resets mid-period): ≤24 h to reset → no warning; weekly >40 % → silent; weekly ≤40 % → use Hydrogen Medium for sweeps; weekly <20 % or 5h <15 % → send heavy runs to Claude subagents instead (Sonnet default, `opus` for judgment), announced in one line; ask Lucas only if Claude's quota is known to be tight (he said so or a limit warning appeared); never ask just to check it.
  - **Claude subagents are the equal second pool (Lucas, 2026-11-28):** same tasks and review by risk as agy. Use them, unasked, when agy's quota is low or out, when agy errors or stalls (retry once, then switch), when the task doesn't fit agy, or for extra parallel capacity.
  - Claude orchestrates every run on one level: no Gemini-led subagents.
- `dir` = narrowest folder (or a filtered scratchpad if it mixes disallowed files).
- Ask for a compact answer (table, list or `schema` JSON), **"final answer only"**, and a hard size cap; agy ignores soft limits.

## Patterns
- **Web:** agy has `search_web`, but it fails intermittently (39 "no summary returned" errors in 12 of 331 CLI logs, 2026-11-21→27); a failed search is not "nothing found". Name the URLs when you know them (agy fetches with curl).
- **Research:** 2 independent runs, same prompt, fixed JSON schema with claim ids and verbatim quotes from one official domain. A script diffs the runs and checks each quote on the cited page (template `Documents/agy-outputs/2026-11-05/verify-boe-quotes.js`). Claude reads only the disagreements, and greps one-run-only items before merging.
- **Verifier:** a fresh-context run that gets only the source and the claim list (never the extractor's reasoning) to hunt omissions and overstatements; a different model family when quota allows. A quote check proves the quote exists, not that the claim stays within it.
- **Builds:** don't trust the run's own report. Give agy a visual/test loop (`shot.py`, tests), then check yourself. For anything with permissions, give the reviewer the real permission data and ask about abuse explicitly.

## Reading the result
- Last line `[delegar] exit=N`: `0` = usable; `3` = failed/empty (retry once simpler, else switch to a Claude subagent; same for a persistent `1`/`124`); `2` = blocked by script/server (never-send list, wrong `dir`, missing `chrome`, bad/duplicate tag); `1` = script error; `124` = killed past `timeout_min` + 4. Non-zero exits arrive as a tool error. The band gives up after 60 min.
- Footer reports tokens, denied actions, an informational line if a watched repo changed (may include other sessions' edits; in `vault` mode `git_changed` is also True when this run made commits), quota warnings when triggered, agy's error if any, and the conversation id (`agy -p ... --conversation <id>`).
- Only agy's **last message** comes back; `dropped N earlier message(s)` means progress text was cut (full text in the live log), and a `WARNING: final message … much shorter` line means the real answer may be in that log.
- First line `[delegar] DEGRADED:` (exit 0): agy finished its final message, then ended in ERROR (a leftover background command hit the timeout, or a quota cut). Usable after checking; for extractions and schema runs, the rule below still applies.
- **Verify like a Claude subagent (Lucas, 2026-11-24):** check concrete claims against the source (Hydrogen 2–3 checks, Neon 1–2). Full verification only where a Claude subagent's output would get it (exam/study material, finance, anything sent to third parties, shipped code): use a fresh-context cross-family reviewer (Opus 5.5 in agy if the 3p bucket has room, else a Claude `opus` subagent; Gemini built it → Claude confirms critical/major findings only), not Claude re-reading everything. Builds: never trust the run's own report; re-run its tests yourself. Log misses in `Agy-Delegation-Log` (runs #132–138, 2026-11-24: builder claimed «0 partial hybrids» twice, wrong both times; reviewer caught it).
- **Review by risk (Lucas, 2026-11-26)**, so reviewing agy's diffs doesn't eat the Claude quota agy saves. Low (vault notes, drafts, research, summaries): no diff review; `agy` commit + `git revert`, spot-check 1–2 claims. Medium (code with tests, memory, skills except `delegar`): a fresh cross-family reviewer + the tests; Claude reads only its findings and calls `mcp__agy__apply_worktree(worktree)`, not the diff (every apply asks Lucas: `permissions.ask` rule since 2026-11-27, after the auto-mode classifier blocked one). High (hooks, mods, tools, settings, statusline, `mcp-servers.json`, `delegar/SKILL.md`, `CLAUDE.md`/`AGENTS.md`): cross-family reviewer, Claude reads the diff, then `mcp__agy__apply_worktree(worktree, force=True)` only with Lucas's explicit OK. Evidence: setup step 2 (log #153), builder self-checks passed with 11 real defects that only the cross-family reviewer caught.
- **Extraction runs:** ask for `count`, oldest and newest item per source in the schema and check those edges. Spot-checks confirm what came back, not what's missing.
- **A timed-out, partial or DEGRADED extraction is discarded and relaunched narrower** (one source per run, ready-made scripts). Never resume it asking for "what you already read": it invents verbatim text.
- **Template-driven writing:** grep every quoted phrase against the source and read any self-reported "process" section in full; weaker models fill every slot, inventing content if needed.
- **Check every image** agy picked by eye before publishing.

## Logging
- Every run logs automatically to `~/.claude/tools/delegar-log.csv` (tokens, quota left). Quota on demand: `agy -p "/usage" --output-format json`.
- Add a row to vault `Conocimiento/IA/Coding-LLMs/Agy-Delegation-Log.md` and save output + prompt in `Documents/agy-outputs/<date>/` (with provenance header) **only for notable runs** (A/B comparisons, regressions, lessons).
