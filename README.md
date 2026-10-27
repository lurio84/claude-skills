# claude-skills

Personal skills for Claude Code: repeatable procedures Claude runs when I invoke them with `/<name>`.

## Current skills

| Skill | What it does |
|---|---|
| [`cerrar-chat`](./cerrar-chat/SKILL.md) | Session closing ritual: reviews what was done, saves what deserves it to the vault, updates memory, offers a continuation prompt if work was left mid-flight. |
| [`grill-me`](./grill-me/SKILL.md) | Intensive interview about a plan or design: one question at a time down the decision tree, each with a recommendation. |
| [`jlhomelab`](./jlhomelab/SKILL.md) | How to connect to and deploy on a homelab server shared with another admin (VPN + SSH, resource/port limits, own tunnel). Maintained by the server's owner; copied here. |
| [`revisar-cryptotrader`](./revisar-cryptotrader/SKILL.md) | Weekly review of the CryptoTrader project: run status, triggered alerts, diagnosis and fixes for failures. |
| [`revisar-uni`](./revisar-uni/SKILL.md) | On-demand sync of the current university term against the course platform (Blackboard) and course wiki; updates the vault calendar and hubs. |
| [`revisar-vault`](./revisar-vault/SKILL.md) | Periodic review of the Obsidian vault: closes open threads from earlier audits, processes the Inbox. Output goes to `Yo/Revision-Vault.md` (a living note, not a new dated one). |
| [`sync`](./sync/SKILL.md) | Manual commit + push of the three setup repos (claude-config, claude-skills, SecondBrain). |
| [`sync-now`](./sync-now/) | Claude Code mod (plugin folder, no SKILL.md): `/sync-now` runs `sync/sync.ps1` directly, with no model turn. Currently disabled in my settings. |
| [`task-progress`](./task-progress/) | Claude Code mod (plugin folder, no SKILL.md): a progress bar above the prompt for each background Bash/PowerShell task (reads `PROGRESS n/m`, tqdm or `NN%` from its output), a `/logs` pane with the live log, and a toast when it ends. |

Not versioned here (local only):
- Third-party skills I installed (`pixijs-*`, `game-feel`, `create-game-assets`, `find-skills`) are listed in `.git/info/exclude`; reinstall them from their sources on a new machine.
- `synced/` holds the claude.ai skills Claude Code syncs automatically. They are Anthropic's (all rights reserved), so `.gitignore` keeps them out.

## Using it on another machine

```bash
git clone https://github.com/lurio84/claude-skills.git ~/.claude/skills
```

On Windows:
```powershell
git clone https://github.com/lurio84/claude-skills.git $env:USERPROFILE\.claude\skills
```

Restart Claude Code and the skills show up as slash commands.

## Adding a new skill

1. Create a `<skill-name>/` folder in this repo.
2. Inside it, a `SKILL.md` with frontmatter:
   ```markdown
   ---
   name: skill-name
   description: "One clear line; Claude uses it to decide when to invoke the skill."
   ---

   # Procedure...
   ```
   Always quote the `description` (`"..."` or `'...'`). If it contains `:` followed by a space, inner quotes, or a leading `~`, unquoted frontmatter doesn't parse on GitHub.
3. `git add . && git commit -m "feat: skill <name>" && git push`.
4. On each machine: `git pull` in `~/.claude/skills/` and restart Claude Code.

## Philosophy

- **Skill ≠ memory.** Memory holds facts about me Claude should always remember. A skill is a procedure that runs when I invoke it.
- **A skill pays off when** the procedure has non-obvious steps, I repeat it, and it has typical failure modes worth guarding against.
- **It doesn't pay off when** it's a one-off order, something I do once a year, or a vault note already covers it.

## Related

- [Obsidian vault](https://github.com/lurio84/SecondBrain) (private): the "why" behind many of these skills.
