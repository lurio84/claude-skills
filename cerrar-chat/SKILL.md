---
name: cerrar-chat
description: Closing ritual for a chat session. Reviews what was done, persists what merits saving to the Obsidian vault, updates memory if stale, checks wikilinks of notes touched this session, and offers a continuation prompt ONLY if work was left mid-flight. Use ONLY when the user explicitly invokes /cerrar-chat — do NOT auto-trigger on "cerramos".
---

# Cerrar Chat

Ritual de cierre de sesión. **Solo se ejecuta cuando Lucas escribe `/cerrar-chat`** — no auto-dispararse al detectar "cerramos" en prosa.

No reescribas las reglas de cierre: este skill **las ejecuta**. La política vive en `CLAUDE.md` (§ "Política de cierre de sesión") y en las memorias `feedback_cierre_chat` / `feedback_memoria_vault`. Si hay conflicto, mandan esas fuentes.

## Pasos

### 1. Resumen de la sesión
2-4 bullets de qué se hizo realmente este chat.

Si el chat fue **trivial** (un ack, una pregunta suelta ya respondida, esperar acción de un tercero, copy-paste de algo ya preparado): dilo en una línea y salta directo al paso 5. No ejecutes el ritual completo sobre nada. El criterio de "trivial" vive aquí, no en el trigger.

### 2. Persistir en vault
¿Algo merece sobrevivir al chat? — decisiones tomadas, hashes de commit, hallazgos, cambio de estado de un proyecto. Guárdalo directamente en la nota que corresponda; no preguntes salvo ambigüedad real de dónde va.

Reglas del vault (`C:\Users\lucas\SecondBrain`):
- Antes de crear nota nueva, verifica con Glob/Grep que no exista una similar.
- Wikilinks `[[nota]]` solo con el nombre (sin ruta), frontmatter YAML, español.
- No guardes lo que el repo o el vault ya registran por sí mismos.

### 3. Actualizar memoria
Solo si cambió el estado de un proyecto activo o surgió feedback nuevo. Edita el archivo existente en `memory/` (no dupliques) y ajusta su puntero en `MEMORY.md`. Si nada cambió a ese nivel, no toques memoria.

### 4. Chequeo de wikilinks (notas tocadas hoy)
Identifica las notas `.md` del vault modificadas en esta sesión:

```powershell
git -C C:\Users\lucas\SecondBrain status --porcelain -- "*.md"
```

Para SOLO esas notas:
- **Wikilinks rotos reales** → arréglalos. **Excluye** `[[feedback_*]]`, `[[project_*]]`, `[[reference_*]]`, `[[user_*]]`: apuntan a memoria, son intencionales, NO son rotos (misma regla que `revisar-vault` Fase 4).
- **Conexión obvia sin enlazar**: si la nota menciona literal el título exacto de otra nota existente del vault, envuélvelo en `[[]]` — solo en el cuerpo, nunca en frontmatter ni en bloques de código.

Si no hay notas tocadas, o no hay nada que arreglar, dilo en una línea y sigue. No inventes trabajo ni audites notas que no se tocaron hoy.

### 5. Prompt de continuación (CONDICIONAL)
Ofrécelo **solo** si quedó trabajo a medias no trivial — estado mental complejo (debugging a medias, decisión en curso, hilo de razonamiento largo) que se perdería en un chat limpio. Si todo está cerrado y ya en memoria/vault, **no** ofrezcas prompt: es ruido.

## Límites duros (lo que este skill NO hace)
- **NO** invocar `/handoff` automáticamente. Es caro y solo merece la pena con estado mental complejo; esa decisión es de Lucas, no del skill. Como mucho, sugiérelo en una línea si el paso 5 detecta ese caso.
- **NO** encadenar `/revisar-vault`. Esa es la revisión periódica pesada del vault completo, otro ámbito.
- **NO** mover, renombrar, archivar ni fusionar notas. **NO** crear wikilinks a notas que no existen.
- **NO** hacer commit ni push. El sync del vault es automático vía hook (`feedback_workflow_secondbrain`).
