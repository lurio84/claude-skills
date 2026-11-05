# agy-live — refinement spec (2026-11-05)

Pending work for the mod and the `delegar` setup, agreed with Lucas on 2026-11-05. Claude spinner behaviour was read from the bundled JS in `~/.local/bin/claude.exe` (Claude Code native build installed 2026-11-04); re-check after Claude Code updates.

5. **Refine mod + setup with what we learned (Lucas, 2026-11-05)**. Done between runs, never while one is in progress (exit 5).
   - **Lucas, 2026-11-05: remove the mod's second line** (log/text under the spinner); it's no use to him. The log is for Claude, who reads it from the file. ~~Previous proposal:~~ under the spinner show the last tool (`Reading Tema_3.pdf`) or `Writing answer…`, not the raw `text_delta`. Check in the stream-json whether `step_update` brings tokens before `DONE`, so the count can be live.
   - Fidelity to Claude's spinner: Lucas sees that the text sometimes pulses white and sometimes sweeps side to side. Record short captures of Claude's spinner in several states (thinking, running a tool, streaming text, a long wait) and compare frame by frame before touching the animation. Also check, against captures and not from memory: the glyph cycle, a color change when it stalls, the ↑/↓ arrow, and the second line (tip/todo).
   - **Claude spinner spec, read from the bundled JS in `~/.local/bin/claude.exe` (v. installed 2026-11-04, read 2026-11-05)**:
     - Glyph: frames `· ✢ * ✶ ✻ ✽` in ping-pong (forward then reversed; Ghostty uses ✳ instead of *). Changes frame every 50 ms while requesting, 100 ms otherwise.
     - Text, *requesting* mode (waiting for the first token): a 3-char glimmer (char ±1 in `shimmerColor`) sweeps **left→right** at 50 ms/char, with 10 chars of padding on each side.
     - Text, *responding/thinking* modes: the same glimmer sweeps **right→left** at 200 ms/char.
     - Text, *tool-use* mode (a tool is running): no sweep. **The whole message pulses** between `messageColor` and `shimmerColor`: `(sin(t/1000·π)+1)/2`, period 2 s, quantised to steps of 1/8. That explains "sometimes it pulses, sometimes it sweeps".
     - Stall: once 10 s pass without new tokens (not counting tools/thinking/pause), glyph and text interpolate toward red `rgb(171,43,63)` over the next 10 s (intensity eased 10 %/50 ms). Above 0.5 it switches to the `error` color.
     - Long thinking: `thinkingIntensity` = (thinking time − 10 s)/10 s, interpolating toward `warning`, bold ≥ 0.5.
     - Parentheses `(…)` in dim, separator ` · `, order: suffix · elapsed time · `↓ N tokens` (↑ arrow while requesting) · thinking status. Time and tokens only show when tokens > 0, or > 16 s elapsed, or thinking, or verbose. Each piece only shows if it fits in the width.
     - Tokens = characters in the response / 4 (estimate). The visible counter **animates** toward the target every 50 ms: +3 if the gap is < 70, +15 % if < 200, +50 if larger.
     - Thinking status: `thinking` → `still thinking` (10 s) → `thinking more` (20 s) → `thinking some more` (30 s) → `deep in thought` (45 s). Grey pulse 153→185 with a 2 s period, starting after 3 s. Afterwards `thought for Ns`. Tools: after 2 s, `running tool for Xs`, then `ran tool for Xs`.
     - Reduced motion (`prefersReducedMotion`): the glyph becomes `●` with a 2 s pulse, no sweep.
     - Mapping for agy-live: agy request with no tokens yet → requesting; `[tool]` active → tool-use (pulse + `running tool for`); text_delta → responding; agy thinking → thinking. Stall based on the timestamp of the last event in the live log.
   - **Skill rule (Lucas, 2026-11-05):** agy is an agent, so let it convert formats itself (docx via python-docx, PDF). Claude only writes the prompt and picks which files it sees, with no pre-processing that spends Claude tokens. It's a known side effect: a console window flashes for an instant with each `run_command`.
   - **Permissions (Lucas, 2026-11-05):** agy uses all its capabilities. Remove the `execute_url(*)` deny. Don't harden "just in case": check the official Antigravity docs or ask Lucas. Control = write deny by default + git-check + Claude's final review.
   - **`-Write` mode (Lucas, 2026-11-05):** a second mode in `delegar.ps1` with no `write_file` deny. agy works only in a git worktree/branch or a scratchpad folder, never on `master`, the vault or memory. Claude reviews the diff and tests and does the merge. Read-only stays the default. Check in the official docs how agy handles worktrees and permissions before implementing.
   - `delegar.ps1`, already fixed this session: escaping `"` on PS < 7.3, `-Effort` optional (Claude/GPT reject it), agy error shown in the footer.
   - Skill `delegar`: **done 2026-11-05** (effort, PDFs/docx, web limits, model costs).
   - Correction to the console note above: Lucas saw **one** flash at the start of a run, not one per `run_command`. Probably agy's own startup. Test hiding it via how `delegar.ps1` launches agy (e.g. `Start-Process -WindowStyle Hidden`), with Lucas confirming visually.

## Open decision — web access (first item next chat)
- Facts (2026-11-05, agy 1.5.1): headless `-p` doesn't load the URL tool, even with `read_url(*)` allowed or `--dangerously-skip-permissions`. `search_web` works. `curl` gets denied by the terminal sandbox. The `write_file` deny holds even with `--dangerously-skip-permissions`.
- Lucas, 2026-11-05: «nos podemos fiar de agy sin sandbox».
- Claude's recommendation: add a `-Web` switch that uses a second settings file with `enableTerminalSandbox: false`, only for research runs on an empty `-Dir`. Keep the sandbox for everything else. Reason: the git-check covers vault/.claude/skills but not OneDrive, which holds the synced PGPI Teams folder shared with teammates.
- Lucas confirms in the next chat.

