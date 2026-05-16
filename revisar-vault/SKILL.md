---
name: revisar-vault
description: 'Periodic review of the Obsidian vault at C:\Users\lucas\SecondBrain. Sesgado a cerrar hilos abiertos de Meta/Audit/Eval previos y procesar Inbox, no a auditar generalista. Output = nota viva Yo/Revision-Vault.md (no nota nueva por fecha). Use when the user says "revisar vault", "revisión semanal del vault", "qué tengo abierto" or invokes /revisar-vault.'
---

# Revisar Vault

## Contexto

Vault: `C:\Users\lucas\SecondBrain` (~120 notas, muy activo, bien estructurado).

**El problema real que este skill ataca** (no el que parece):

Lucas declaró en `Inbox/Meta-Optimizar-Workflow-2026-05-14.md` que siente que "habla en bucle con Claude porque duda de las decisiones cerradas". Hay 3 intentos previos de meta-revisión en Inbox (`Audit-*`, `Meta-*`, `Eval-*`) que quedaron sin consolidarse. Este skill **cierra hilos abiertos en lugar de abrir nuevos**.

A 120 notas el ROI de "conexiones cross-domain que un humano no vería" es bajo — Lucas conoce su vault. Ser honesto si la fase de conexiones no produce.

## Pre-flight (siempre, antes de Fase 0)

Imprimir un solo párrafo:

> "Ya intentaste meta-revisión 3 veces (Audit/Meta/Eval) sin consolidar. La diferencia esta vez: este skill cierra hilos en vez de abrirlos nuevos. Si en esta iteración no salen ≥3 hilos cerrables y ≥1 acción concreta, lo retiramos sin pelearnos con él."

## Flujo del skill

### Fase 0 — Snapshot rápido (sin LLM pesado)

1. Notas modificadas en los últimos 7 días, agrupadas por carpeta top-level:
   ```powershell
   Get-ChildItem -Path C:\Users\lucas\SecondBrain -Recurse -Filter *.md | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) } | Group-Object { $_.Directory.FullName.Replace('C:\Users\lucas\SecondBrain\','').Split('\')[0] } | Select-Object Name, Count
   ```

2. Inbox: nuevas / con >14 días:
   ```powershell
   Get-ChildItem -Path C:\Users\lucas\SecondBrain\Inbox -Filter *.md | Select-Object Name, LastWriteTime | Sort-Object LastWriteTime
   ```

3. Si existe `Yo/Revision-Vault.md`, leer la fecha de su última entrada y reportar qué cambió desde entonces.

### Fase 1 — Hilos abiertos (PILAR REAL #1, el más importante)

1. Glob para notas tipo meta:
   ```
   Inbox/{Meta,Audit,Eval,Checkpoint}-*.md
   ```
   Y también buscar en `Yo/` y raíz.

2. Para cada nota encontrada, Grep secciones tituladas:
   - "Hilos abiertos"
   - "Pendientes"
   - "Próxima sesión" / "Para próxima sesión"
   - "TODO"

3. Extraer cada hilo individual (típicamente cada bullet o cada elemento numerado).

4. Para cada hilo:
   - Cruzar con cambios recientes del vault (últimos 30 días) y con `MEMORY.md` de proyectos activos.
   - Clasificar: **resuelto** (hay evidencia de que se hizo) / **vivo** (no hay evidencia) / **stale** (>60 días sin movimiento).

5. Output en la nota viva: tabla `hilo | origen | edad | estado | sugerencia`.

6. Al final de la fase, preguntar a Lucas explícitamente: **"De estos N hilos vivos, ¿cuál cerramos hoy?"** No avanzar a la siguiente fase sin que él elija al menos uno o diga "ninguno".

### Fase 2 — Estado de proyectos activos (PILAR REAL #2)

1. Leer `C:\Users\lucas\.claude\projects\C--Users-lucas-SecondBrain\memory\MEMORY.md` → extraer lista de proyectos activos (sección "Proyectos activos").

2. Para cada proyecto:
   - Buscar la carpeta correspondiente en el vault (Glob por nombre).
   - Última fecha de modificación de notas dentro.
   - Comparar con la fecha de "memoria actualizada" del SessionStart hook (visible en el contexto inicial).
   - Cruzar con Inbox: ¿hay capturas pendientes que mencionen el proyecto? (Grep en `Inbox/`).

3. **Flag**: proyectos con memoria activa pero sin notas tocadas >14 días → "¿parado? ¿bloqueado? ¿olvidado?" — preguntar.

4. Output: tabla `proyecto | última nota | edad | pendientes en Inbox | flag`.

### Fase 3 — Conexiones semánticas (ACTIVA, método: Explore subagent leyendo contenido)

**NO usar grep de keywords** (ese método se probó 2026-05-16 y falló — sacó 1 conexión débil y llevó a cancelar el pilar erróneamente). Usar este enfoque:

1. Spawn de un **Explore agent** con la siguiente brief:
   - Vault: `C:\Users\lucas\SecondBrain`
   - Leer las **30-40 notas más sustantivas** (>2KB + todos los índices `*-Indice.md`/`INDEX-*.md` + notas en `Yo/` + capturas meta en `Inbox/` + notas raíz de subcarpetas de Proyectos/Conocimiento/Universidad/3-Carrera)
   - Buscar puentes de tipo: **concepto operativo compartido**, **patrón cognitivo recurrente**, **método transferible**, **dependencia oculta**, **redundancia que merece consolidar**
   - Filtro: descartar conexiones ya enlazadas (verificar con grep antes de proponer)
   - **No inventar**: cada puente debe poder citar texto literal de ambas notas
   - Output: max 10 puentes priorizados, cada uno con tipo + cita + valor (alto/medio/bajo) + acción sugerida

2. **Insight a guardar**: el valor de esta fase no es "descubrir conexiones que Lucas no sabía". Es **hacer explícitos patrones cognitivos que él ya maneja en paralelo pero no están sincronizados en el papel**.

3. **Criterio de cancelación honesta**: si tras 2-3 iteraciones no salen ≥3 puentes con citas literales reales, o se generan conexiones forzadas, volver a cancelar y documentar por qué falló el método semántico también.

4. **Al aplicar enlaces**: contextualizar en cada nota (etiqueta corta "patrón cognitivo afín / dependencia / síntesis…") para que el lector entienda por qué está el enlace sin tener que ir a la otra nota.

### Fase 4 — Higiene del grafo (pilar barato #2, máximo 3 bullets en el output)

1. Notas vacías o <200 bytes → listar (sin acción automática).

2. Notas >5KB sin frontmatter YAML → listar para añadir frontmatter mínimo (con propuesta de aplicar en Fase 5).

3. Wikilinks rotos REALES — excluir los intencionales a memoria:
   - `[[feedback_*]]`, `[[project_*]]`, `[[reference_*]]`, `[[user_*]]` → memoria, NO son rotos.
   - El resto, sí.

4. **Nodos desconectados del hub de su subdominio**. Si una nota índice (`*-Indice.md`, `INDEX-*.md`) existe en una subcarpeta pero NO la lista el índice madre del dominio (típicamente `Universidad/Indice-Asignaturas.md`, `Conocimiento/IA/INDEX-IA.md`, `Proyectos/Dofus/INDEX-Dofus.md`), proponer enlace bidireccional. Detectado en 1ª iteración: AC-Indice no estaba en Indice-Asignaturas → cluster aislado en grafo Obsidian.

5. **Huérfanas intra-domain**. Para cada subcarpeta de proyecto/asignatura/dominio con un hub identificable (`Sprint3-iTop` para PSG2, `INDEX-Dofus` para Dofus, etc.), verificar que TODAS sus notas hermanas estén enlazadas desde el hub o entre sí. Detectado en 1ª iteración: `Sprint3-IA-Usage-Lucas` y `Sprint3-Presentacion-Lucas` eran huérfanas totales en PSG2/ aunque tenían hub natural (Sprint3-iTop). **No confundir con huérfanas reales**: una nota es huérfana intra-domain solo si pertenece a un cluster con hub y nadie del cluster la enlaza. No tocar huérfanas legítimamente solitarias (notas personales puntuales sin cluster).

6. **NO archivar huérfanas reales**. A 120 notas y todo reciente, no hay deuda. Solo proponer enlaces; nunca borrar/mover.

### Fase 5 — Auto-aplicar trivial (lo seguro, lo demás se propone)

Aplicar automáticamente, listando en la nota viva qué se aplicó:

1. **Wikilinks obvios**: si una nota menciona literal el título de otra nota existente del vault (caso exacto, sin signos), envolver con `[[]]`. Solo en el cuerpo, no en frontmatter ni en código.

2. **Frontmatter mínimo** en notas que no lo tengan: `fecha: <last_write_date>` y `tipo:` derivado de la carpeta (`inbox`, `proyecto`, `universidad`, etc.).

**NO auto-aplicar nunca**:
- Mover/renombrar notas.
- Archivar huérfanas.
- Fusionar duplicados.
- Crear nuevas wikilinks a notas que no existen aún.

Cualquier cosa fuera de los 2 puntos anteriores = propuesta con checkbox en la nota viva.

### Fase 6 — Output: actualizar `Yo/Revision-Vault.md`

Formato de la nota viva:

```markdown
---
tipo: revision-vault
ultima-revision: 2026-MM-DD
---

# Revisión del Vault

> Nota viva. Cada revisión nueva se añade arriba; las antiguas se colapsan en un callout `> [!summary]-`.

## Revisión 2026-MM-DD

### Resumen ejecutivo (3 bullets)
- [Cambio más relevante desde la última revisión]
- [Hilo más doloroso a cerrar hoy]
- [Acción concreta sugerida]

### Hilos abiertos
| Hilo | Origen | Edad | Estado | Sugerencia |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### Estado de proyectos activos
| Proyecto | Última nota | Edad | Pendientes Inbox | Flag |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### Conexiones propuestas
- [[Nota A]] ↔ [[Nota B]] — razón en 1 frase.
- ... (si <3, anotar "Fase 3 cancelada — vault demasiado pequeño")

### Higiene (máx 3 bullets)
- Notas vacías: ...
- Notas grandes sin frontmatter: ...
- Wikilinks rotos reales: ...

### Aplicado automáticamente
- [Wikilink envuelto en `Nota X.md`: "concepto" → `[[Nota Y]]`]
- [Frontmatter añadido a: ...]

### Pregunta para Lucas
**¿Qué hilo cerramos ahora?**

---

> [!summary]- Revisión 2026-MM-(DD anterior)
> [contenido de la revisión anterior, colapsado]
```

## Criterios de cancelación honesta del skill

- Si en la 1ª iteración la Fase 3 (conexiones) saca <3 conexiones útiles → desactivar Fase 3 editando este SKILL.md y documentar la razón.
- Si tras 3 ejecuciones la nota viva no genera ninguna acción cerrada por parte de Lucas → archivar el skill (mover a `.claude/skills-archive/` si existe, o borrar) y escribir en memoria una entrada `feedback_revisar_vault_no_funciona` explicando por qué.

## Errores comunes a evitar

1. **Crear nota nueva por fecha cada vez** — eso es exactamente el patrón cementerio que ya tiene en Inbox. La nota es viva, se actualiza.
2. **Auditar generalista** — la tentación es "voy a tocar todo". No. Sesgo a cerrar hilos abiertos, todo lo demás es secundario.
3. **Inventar conexiones forzadas** en la Fase 3 — si no salen orgánicas, decirlo y cancelar el pilar.
4. **Auto-archivar huérfanas** — a esta escala y con la actividad actual, es destructivo. No.
5. **No leer los Meta/Audit/Eval previos** — son la materia prima de la Fase 1. Saltárselos = repetir el ciclo que falló 3 veces.
6. **Wikilinks a memoria como "rotos"** — `[[feedback_*]]`, `[[project_*]]`, etc. son intencionales. Filtrarlos.

## Referencias

- Plan: `C:\Users\lucas\.claude\plans\quiero-hacer-una-whimsical-spindle.md`
- Audits previos (materia prima Fase 1):
  - `Inbox/Audit-Claude-Setup-2026-05-16.md`
  - `Inbox/Meta-Optimizar-Workflow-2026-05-14.md`
  - `Inbox/Eval-Claude-Setup-2026-06-04.md` (checkpoint programado)
- Memorias relacionadas: [[feedback_framework_theater]], [[feedback_memoria_vault]], [[feedback_cierre_chat]], [[feedback_obsidian_first]]
