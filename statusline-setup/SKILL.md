---
name: statusline-setup
description: "Configura interactivamente el status line de Claude Code (~/.claude/statusline.py). Pregunta qué campos mostrar, si quiere barras de progreso y el ancho, genera el script y verifica que funciona. Usar cuando el usuario diga 'configurar status line', 'cambiar status line', 'setup statusline' o similar."
---

# statusline-setup

Configura interactivamente el status line de Claude Code (`~/.claude/statusline.py`).

## Trigger

Usar cuando el usuario diga "configurar status line", "cambiar status line", "setup statusline", "/statusline-setup" o similar.

## Instrucciones

Sigue estos pasos EN ORDEN. No hagas nada hasta tener las respuestas del usuario.

### Paso 1 — Leer estado actual

Lee `~/.claude/statusline.py` (si existe) y `~/.claude/settings.json` para saber qué hay configurado. Si no existe `statusline.py`, asume configuración desde cero.

### Paso 2 — Preguntar campos (multiSelect)

Pregunta al usuario qué campos quiere mostrar usando AskUserQuestion con `multiSelect: true`:

| Campo | Qué muestra |
|---|---|
| Modelo | Nombre del modelo activo, ej. "Sonnet 4.6" |
| Contexto | % de ventana de contexto usada |
| Coste | Coste acumulado de la sesión en $ |
| Rate limit 5h | % del límite de 5 horas consumido |
| Rate limit 7d | % del límite de 7 días consumido |
| Effort | Nivel de razonamiento (high/medium/low) |
| Thinking | Solo visible cuando extended thinking está activo |

### Paso 3 — Preguntar estilo de barras

Para campos de porcentaje (ctx, 5h, 7d), pregunta:
- **Con barras** — `ctx ████░░░░ 26%`
- **Solo número** — `ctx 26%`

Si elige barras, pregunta el ancho:
- **Compacto** (6) — `██░░░░`
- **Estándar** (8) — `████░░░░` *(recomendado)*
- **Amplio** (10) — `██████░░░░`

### Paso 4 — Generar statusline.py

Escribe `~/.claude/statusline.py` con la configuración elegida.

**Plantilla base** (probada en Windows y macOS):

```python
import sys, json
sys.stdout.reconfigure(encoding='utf-8')

d = json.load(sys.stdin)
parts = []

W    = '\033[97m'   # bright white
RST  = '\033[0m'
WARN = '\033[33m'   # yellow >=75%
CRIT = '\033[31m'   # red    >=90%
SEP  = f' {RST}│{W} '

def bar(pct, width=8):
    filled = round(pct / 100 * width)
    return '█' * filled + '░' * (width - filled)

def fmt_pct(pct):
    if pct >= 90: return f'{CRIT}{pct}%{RST}{W}'
    if pct >= 75: return f'{WARN}{pct}%{RST}{W}'
    return f'{pct}%'
```

Añade solo los bloques de campos que el usuario eligió. Termina siempre con:
```python
print(f'{W}' + SEP.join(parts) + RST)
```

**Notas importantes:**
- `sys.stdout.reconfigure(encoding='utf-8')` es obligatorio en Windows (evita UnicodeEncodeError con █ y │)
- Semáforo: amarillo ≥75%, rojo ≥90%
- `think:on` solo añadirlo si el usuario eligió Thinking: `if d.get('thinking', {}).get('enabled'): parts.append(f'{WARN}think:on{RST}{W}')`

### Paso 5 — Verificar que settings.json apunta al script

Comprueba que `~/.claude/settings.json` tiene:
```json
"statusLine": {
  "type": "command",
  "command": "python ~/.claude/statusline.py"
}
```
Si no, añádelo. En Windows usar la ruta absoluta con `/` (no `\`).

### Paso 6 — Verificar ejecución

Ejecuta con JSON de prueba y muestra el output raw:

```bash
echo '{"model":{"display_name":"Claude Sonnet 4.6"},"context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.123},"rate_limits":{"five_hour":{"used_percentage":80},"seven_day":{"used_percentage":12}},"effort":{"level":"high"},"thinking":{"enabled":false}}' | python ~/.claude/statusline.py
```

Si hay UnicodeEncodeError: añadir `sys.stdout.reconfigure(encoding='utf-8')` al inicio del script.

Indica al usuario que **reinicie Claude Code** para ver los cambios.
