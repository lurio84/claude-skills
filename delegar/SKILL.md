---
name: delegar
description: Delegate token-heavy work (folder sweeps, summaries of many files/PDFs/repos, first-pass reviews, web page reading, builds with self-checks, vault edits committed as author agy) to Antigravity CLI (agy) through the MCP tool mcp__agy__delegate, so it spends Google AI Pro quota instead of Claude's. Use proactively when a task would otherwise go to an Explore/general-purpose subagent and only its conclusion matters, or when the user says "delega", "pásaselo a agy/Gemini".
---

# Delegar (agy)

The MCP tool `mcp__agy__delegate` (server `~/.claude/tools/agy_mcp.py`, user scope) runs `~/.claude/tools/delegar.ps1` (private claude-config repo, with the never-send list) and returns agy's answer plus a footer. Works on any PC where `agy` is installed and signed in and the server is registered (`tools/agy-install.ps1`). Evidence and dated tests behind these rules: vault `Agy-Delegation-Log` (§ Evidence behind the delegar skill, and the run table); setup details: private memory `project_agy_delegacion`.

## When
- **Delegate:** reading/summarizing many files, inventories, "find where X is", first-pass review of a repo or document set, extracting facts into a table, web reading, builds that check themselves.
- **Vault edits can go to agy** (mode `vault`, since 2026-11-24, Lucas): notes, sweeps that fix many notes, drafts. Its hooks commit each file as author `agy`, so its work stays traceable. Claude reviews the agy commits listed in the footer (`git show <hash>`) before telling Lucas it's done.
- **Keep in Claude:** memory and repos other than the vault, judgment calls, finance, outward actions, and anything under the never-send list (`~/.claude`, `~/.ssh`; the script exits 2 — don't work around it, ask Lucas). Exception: rules and memories from `~/.claude` may go out as a filtered scratchpad copy (no settings, `.env` or credentials) that passes `mcp__plugin-authoring__scan_secrets`.
- Let agy do the work itself: it converts formats on its own (PDF natively, `.docx` via `python-docx`). Claude only writes the prompt and picks which files it sees. Don't add restrictions "just in case": check the official Antigravity docs or ask Lucas.
- Not for animation QA: Flash reads a local video's content (speech, on-screen text) but misses brief motion and passes defects as clean.

## Modes
Since 2026-11-25 (Lucas: «sin sandbox, solo denies») no mode has a sandbox: each `agy-<mode>.json` sets `agentMode: ""` (auto would force the sandbox on), `enableTerminalSandbox: false`, `toolPermission: always-proceed`. Only deny rules restrict agy: git writes, dot-folders (`.claude .gemini .ssh .agents .git .obsidian`), credential reads.

| mode | Use | Constraints |
|---|---|---|
| `read` (default) | reading, research, web (`curl.exe -sL <url>`) | `write_file` and uploads (`curl -d/-F/-T`, POST/PUT) denied. Its shell can still write: the git check (exit 5) only sees the vault and the two config repos |
| `write` | edits, builds, installs, servers, screenshots (`shot.py`: copy `Documents/design-skills-test/shot.py` into the dir) | `dir` in a git repo → new worktree from `HEAD` (branch `agy/<time>`, uncommitted changes absent; the repo needs ≥1 commit); under `%TEMP%` → in place; else exit 2. Adds denies for any `SecondBrain` path and workspace dot-folders. Snapshot of the 3 watched repos first; undo with `delegar-revert.ps1 -Snapshot <file>` (dry run) → `-Apply` / `-DeleteNew`. Claude reviews the diff, runs tests, merges, removes worktree + branch (footer prints the commands). Never on the vault/memory |
| `vault` | edits in the real vault | `dir` anywhere in the vault (the script uses the vault root so agy loads `AGENTS.md` and `.agents/hooks.json`). The hooks commit agy's files as author `agy` with trailers `Agy-Model`, `Agy-Launcher: claude`; already-dirty files it touched stay uncommitted (`Touched-Dirty:`). Exit 5 = something to review. Don't edit the same notes while it runs. Undo: `git revert <hash>` |

Browsing defaults to an isolated browser (Lucas, 2026-11-20). Use his real logged-in Chrome only when the task needs his session, and tell him before launching, because he must accept the extension's connection prompt or the MCP times out. Real Chrome (tower only): copy `Documents/agy-outputs/agy-chrome-mcp_config.json` to `<dir>/.agents/mcp_config.json`, call with `chrome: true` (refused without it whenever that file exists), any mode, and tell agy to use the MCP server "playwright" tools (`browser_navigate`…), not its built-in browser. For pages Claude already has a recipe for (WhatsApp Web), reading them with Claude's own `browser_evaluate` is cheaper.

## How
Call `mcp__agy__delegate` with `prompt`, `dir`, `tag` (short, unique among this chat's running calls; it names the agy-live band's log), and optionally `mode`, `model`, `effort`, `schema`, `timeout_min` (1–55, default 10), `chrome`. A call still running after two minutes becomes a native background task and its result arrives as a task notification (code.claude.com/docs/en/mcp.md); keep working meanwhile. Subagents can call it too; their call waits. The shell form (`& "$HOME\.claude\tools\delegar.ps1" -Dir … -Prompt … -Mode … -Tag …`) behaves the same, for scripts.
- **Model: routing table (Lucas, 2026-11-24, from benchmarks + quota cost in vault `Agy-Models-Map`). Always pass `model`; read `/usage` before a batch.** Cost = relative to Hydrogen Medium, all in the shared Gemini bucket.
  - Trivial lookup/list/format → `gemini-4-hydrogen-low` (0.4×, ≈ Haiku).
  - Extraction, sweeps (**default**) → `gemini-4-hydrogen-medium` (1×, ≈ Sonnet High).
  - First-pass review, extraction needing judgment → `gemini-4-hydrogen-high` (2×, ≈ Opus High).
  - Judgment, synthesis, multi-source research → `gemini-4-neon-medium` (2.3×, ≈ Sonnet Max).
  - Hard cases where Neon Medium fell short → `gemini-4-neon-high`, `/usage` checked first (4.5×, ≈ Opus Max).
  - Verifying findings → Opus (Claude subagent, or Opus 5.5 in agy on the small 3p bucket), never a Gemini self-check.
  - **Opus 5.5 in agy, opportunistic (Lucas, 2026-11-24):** before a judgment or verification run, read `agy -p "/usage" --output-format json`. If the `3p-weekly` bucket has room, and especially if it resets within ~2 days with quota unused, use `claude-opus-5-5-medium` (or `-high` for hard cases) instead of Neon. Otherwise Neon. Lucas won't track it: Claude does. One ~350k-token Opus run empties the 3p 5-hour bucket (2026-11-13), so keep Opus runs small.
  - Not used: Hydrogen XHigh, Neon XHigh, Carbon (dominated on cost/score), Argon and Flash 3.8 (removed 2026-11-30).
  - Claude orchestrates every run on one level: no Gemini-led subagents.
- `effort` is optional; Claude/GPT models reject it. Use Claude/GPT models (separate small quota bucket) only for probes and verification runs. When that bucket says «quota reached» after its reset time, retry once, then drop the run.
- `dir` = narrowest folder. If it mixes things agy shouldn't see, copy only the allowed files to a scratchpad folder.
- Ask for a compact answer (table, list or `schema` JSON) and **"final answer only"**. Give a hard size cap; agy ignores soft limits.
- While a run is in progress, don't edit files in the vault, claude-config or claude-skills: the git check can't tell your edits from agy's.
- `invoke_subagent` has ~140k tokens of fixed overhead: use subagents only for heavy branches. A subagent's model is only `inherit|flash|pro` (re-check what `flash` maps to after Flash 3.8 leaves on 11-30); a Claude/GPT opinion needs its own run.

## Patterns
- **Research:** 2 independent runs, same prompt, fixed JSON schema with claim ids and verbatim quotes from one official domain. A script diffs the runs and checks each quote on the cited page (template `Documents/agy-outputs/2026-11-05/verify-boe-quotes.js`). Claude reads only the disagreements, and greps one-run-only items before merging.
- **Verifier:** a fresh-context run that gets only the source and the claim list (never the extractor's reasoning) to hunt omissions and overstatements; a different model family when quota allows. A quote check proves the quote exists, not that the claim stays within it.
- **Builds:** don't trust the run's own report. Give agy a visual/test loop (`shot.py`, tests), then check yourself. For anything with permissions, give the reviewer the real permission data and ask about abuse explicitly.

## Reading the result
- Last line `[delegar] exit=N`. 0 = usable. 3 = failed/empty: retry once with a simpler prompt, else do it in Claude. 5 = a watched repo changed and agy could have done it; first check whether the listed files are ones you or another chat edited (memory lives in claude-config). Alert Lucas only if a change is unexplained. 2 = blocked by the script or the server (never-send list, wrong `dir`, missing `chrome`, bad tag). 124 = killed (cancelled or past `timeout_min` + 4).
- The footer reports tokens, denied actions (deny-rule refusals included), agy's error if any, and the conversation id (`agy -p ... --conversation <id>` continues it).
- **Verify like a Claude subagent (Lucas, 2026-11-24):** agy's answer counts like a subagent summary. Check concrete claims against the source: Hydrogen 2–3 checks, Neon 1–2. Full verification only where a Claude subagent's output would get it too (exam/study material, finance, anything sent to third parties, shipped code); that verification is a fresh-context agy reviewer of another model (Opus 5.5 in agy if the 3p bucket has room, else Neon High; Gemini built it → Claude confirms the critical/major findings only), not Claude re-reading everything. Builds: the run's own report is never trusted; re-run its tests yourself. Log misses in `Agy-Delegation-Log` and tighten this rule if Neon errors slip through (runs #132–138, 2026-11-24: builder claimed «0 partial hybrids» twice, wrong both times; the reviewer caught it).
- **Extraction runs:** ask for `count`, oldest and newest item per source in the schema and check those edges. Spot-checks confirm what came back, not what's missing.
- **A timed-out or partial extraction is discarded and relaunched narrower** (one source per run, ready-made scripts). Never resume it asking for "what you already read": it invents verbatim text.
- Template-driven writing: grep every quoted phrase against the source and read any self-reported "process" section in full; Flash fills every slot, inventing content if needed.
- Check every image agy picked by eye before publishing.

## Logging
- Every run goes to `~/.claude/tools/delegar-log.csv` (tokens, quota left). Quota on demand: `agy -p "/usage" --output-format json` (no model call).
- **After each real run, add a row to vault `Conocimiento/IA/Coding-LLMs/Agy-Delegation-Log.md`**: claims checked, errors found, Claude cost (S/M/L), where the result was used. Save output and prompt in `Documents/agy-outputs/<date>/` with a provenance header (model, tokens, conversation id, what was verified).
- Test runs go in folders named `web*`, `flash1`, `toyrepo`, `%TEMP%\agy-probe-*`, or under `%TEMP%\agy-wt`; real runs must never use those names.
