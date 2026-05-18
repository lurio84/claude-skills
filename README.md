# claude-skills

Skills personales para Claude Code. Procedimientos repetibles que Claude ejecuta cuando los invoco con `/<nombre>`.

## Skills actuales

| Skill | Para qué sirve |
|---|---|
| [`handoff`](./handoff/SKILL.md) | Genera un documento de traspaso estructurado para que un agente nuevo retome la conversación. |
| [`prepara-tarea`](./prepara-tarea/SKILL.md) | Checklist pre-tarea: scope, criterios de éxito, delegación y verificación E2E. Incluye modo investigación con citas obligatorias. |
| [`revisar-cryptotrader`](./revisar-cryptotrader/SKILL.md) | Revisión semanal del proyecto CryptoTrader: estado de runs, alertas disparadas, diagnóstico y fix de fallos. |
| [`setup-deepseek`](./setup-deepseek/SKILL.md) | Guía paso a paso para configurar Claude Code con DeepSeek (~5x más barato). Pensada para usuarios no técnicos. |
| [`statusline-setup`](./statusline-setup/SKILL.md) | Configura interactivamente el status line de Claude Code: campos, barras de progreso y ancho. Incluye `statusline.py` listo para usar. |
| [`revisar-vault`](./revisar-vault/SKILL.md) | Revisión periódica del vault Obsidian: cierra hilos abiertos de auditorías previas, procesa Inbox. Output en `Yo/Revision-Vault.md` (nota viva, no nueva por fecha). |
| [`verificar`](./verificar/SKILL.md) | Verificación obligatoria al cerrar cualquier tarea: ejecuta el comando real, muestra output y confirma resultado correcto. |

## Cómo usarlo en otra máquina

```bash
git clone https://github.com/lurio84/claude-skills.git ~/.claude/skills
```

En Windows:
```powershell
git clone https://github.com/lurio84/claude-skills.git $env:USERPROFILE\.claude\skills
```

Reinicia Claude Code y las skills aparecerán como slash commands.

## Cómo añadir una skill nueva

1. Crea una carpeta `<nombre-skill>/` en este repo.
2. Dentro, un `SKILL.md` con frontmatter:
   ```markdown
   ---
   name: nombre-skill
   description: Una línea clara — Claude la usa para decidir cuándo invocarla.
   ---

   # Procedimiento...
   ```
3. `git add . && git commit -m "feat: skill <nombre>" && git push`.

> **Nota YAML:** entrecomilla siempre la `description` (con `"..."` o `'...'`). Si contiene `:` seguido de espacio, comillas internas, o `~` al inicio, sin comillas el frontmatter no parsea en GitHub.
4. En cada máquina: `git pull` desde `~/.claude/skills/` y reiniciar Claude Code.

## Filosofía

- **Skill ≠ memoria.** Memoria son hechos sobre mí que Claude debe recordar siempre. Skill es un procedimiento que se ejecuta cuando lo invoco.
- **Skill compensa cuando**: el procedimiento tiene pasos no obvios + lo repito + tiene modos de fallo típicos que conviene blindar.
- **Skill NO compensa cuando**: es una orden única, lo hago una vez al año, o ya lo cubre una nota del vault.

## Relacionado

- [Vault Obsidian](https://github.com/lurio84/SecondBrain) (privado) — el "por qué" de muchas de estas skills.
