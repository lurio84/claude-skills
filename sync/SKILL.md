---
name: sync
description: Manually commit and push the three setup repos (claude-config, claude-skills, SecondBrain) on demand. Use when Lucas says "/sync", "guarda", "haz commit y push", "sube los cambios", or wants to persist local changes to GitHub. Replaces the old SessionEnd auto-commit hook.
---

# Sync — commit + push manual

Commit y push de los 3 repos del setup **cuando Lucas lo pida**. Sustituye al antiguo hook `SessionEnd` (que solo commiteaba y disparaba "Hook cancelled"). El pull sigue siendo automático al arrancar (`SessionStart`).

## Paso único

Ejecutar el script y reportar su salida tal cual, por repo:

```powershell
powershell -ExecutionPolicy Bypass -File C:/Users/lucas/.claude/skills/sync/sync.ps1
```

El script, por cada repo (`claude-config`, `claude-skills`, `SecondBrain`):
1. Commitea si hay cambios (`chore(sync): ...`).
2. Pushea si hay commits por delante de upstream, con el token de `lurio84` vía `gh` (un push plano da 404 en los repos privados por el GCM cacheado con HGK2646).

## Verificar

Si algún repo reporta `PUSH FAILED` o `sin pushear`, avisar a Lucas: probablemente `gh` no está logueado como `lurio84` (`gh auth status`) o hay un problema de red. No declarar éxito si algún repo no llegó a `pushed` / `up to date`.
