---
name: sync
description: Commit and push the three setup repos (claude-config, claude-skills, SecondBrain) on demand.
disable-model-invocation: true
---

# Sync — manual commit + push

Commits and pushes the 3 setup repos, only when Lucas types `/sync`. `disable-model-invocation` keeps a casual "guarda esto" from pushing three repos (one public); normally `/cerrar-chat` runs the same script at the end. Pull is automatic at startup (`SessionStart`).

## Single step

Run the script and report its output per repo, as is:

```powershell
powershell -ExecutionPolicy Bypass -File C:/Users/lucas/.claude/skills/sync/sync.ps1
```

For each repo (`claude-config`, `claude-skills`, `SecondBrain`) the script:
1. Commits if there are changes (`chore(sync): ...`).
2. Pushes if there are commits ahead of upstream, with the `lurio84` token via `gh` (a plain push gets 404 on the private repos because GCM caches a different GitHub account).

## Verify

If any repo reports `PUSH FAILED` or `sin pushear`, tell Lucas: probably `gh` isn't logged in as `lurio84` (`gh auth status`) or there's a network problem. Don't declare success unless every repo reached `pushed` / `up to date`.
