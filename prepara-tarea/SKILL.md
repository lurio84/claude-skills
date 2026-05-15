---
name: prepara-tarea
description: Mandatory checklist BEFORE starting non-trivial tasks — defines scope, success criteria, delegation and E2E verification. Includes research mode with required citations. Trigger with "/prepara", "preparar tarea", "antes de empezar X", or when the task is complex/ambiguous. Skip for trivial tasks (1-2 obvious steps).
disable-model-invocation: false
---

# Preparar tarea — checklist pre-trabajo

**Cuándo aplicar:** tareas con ≥3 pasos, ambigüedad de scope, decisiones reversibles caras, investigación crítica, refactors, features. NO para tareas triviales (un grep, leer un archivo, una pregunta directa).

## Checklist obligatorio

Antes de tocar nada, declarar al usuario las 4 secciones. Si falta info para alguna, preguntar antes de seguir.

### 1. SCOPE

- Qué INCLUYE esta tarea (concreto, verificable).
- Qué NO incluye (cosas que podría hacer pero NO debo).
- Si el scope no está claro: 2-3 preguntas al usuario antes de continuar.

Ejemplo: "Voy a actualizar la skill `verificar` con checklists por tipo de tarea. NO voy a tocar `revisar-cryptotrader` ni el CLAUDE.md global."

### 2. CRITERIOS DE ÉXITO

- Verificables, no genéricos ("que funcione" NO sirve).
- Idealmente: comando que se ejecuta y output esperado.
- Si la tarea es subjetiva (escribir, investigar): qué señales indican que está bien.

Ejemplo: "Éxito = la skill se invoca al decir '/prepara' y devuelve las 4 secciones; verificable con Glob `~/.claude/skills/prepara-tarea/SKILL.md` y leyendo el frontmatter."

### 3. DELEGACIÓN

- Qué se delega a subagentes (Explore para búsqueda amplia, Plan para diseño, general-purpose para investigación abierta).
- Qué hago yo directamente.
- Qué necesito de Lucas (decisión, dato, permiso, acceso).

Ejemplo: "Subagente Explore para listar todos los .ps1 actuales en hooks. Yo escribo el .ps1 nuevo. Lucas decide si quiere PostToolUse opcional."

### 4. VERIFICACIÓN E2E

- Cómo se va a comprobar al final que la tarea está bien.
- Comando concreto, no "haré tests".
- Si es UI/nota/config: ver checklist por tipo en skill `verificar`.

Ejemplo: "Al cerrar: `Glob ~/.claude/skills/**/SKILL.md` muestra prepara-tarea + `/prepara` en un chat nuevo devuelve estas 4 secciones."

## Modo investigación (subcaso crítico)

Cuando la tarea sea investigación de IA, finanzas, papers, datos sensibles, decisiones técnicas con consecuencias:

**Reglas adicionales obligatorias:**
- Cada claim factual → citar fuente (URL, paper, archivo, comando ejecutado).
- "No sé" / "No encontrado" son respuestas VÁLIDAS. Mejor admitir que extrapolar.
- Prohibido razonar desde patrones genéricos sin contrastar con fuente.
- Si hay datos contradictorios → señalarlo explícitamente, no elegir silenciosamente.
- Diferenciar siempre: "según fuente X..." vs "mi inferencia es...".

Activar añadiendo a la sección SCOPE: "Tipo: investigación crítica — aplica modo citas".

## Cuándo SALTARSE este checklist

Tareas triviales donde el preámbulo cuesta más que el trabajo:
- Lectura simple ("¿qué dice este archivo?").
- Un grep concreto.
- Una pregunta directa con respuesta de 1-2 frases.
- Continuación obvia de una tarea ya preparada.

En esos casos: ejecutar directo, sin checklist.

## Tras la preparación

Cuando las 4 secciones están claras, declarar: "Listo, empiezo." Y arrancar.
Al final, ejecutar la VERIFICACIÓN E2E declarada (skill `verificar` la codifica).
