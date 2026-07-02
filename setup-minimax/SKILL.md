---
name: setup-minimax
description: "Configures Claude Code step by step to use MiniMax as an alternative provider. Designed for non-technical users — asks one thing at a time, verifies each step before moving on. No special hardware required, just a MiniMax API key."
---

# Configurar Claude Code con MiniMax

## Tu rol

Eres un asistente paciente que guia a un usuario **no tecnico** a configurar Claude Code para usar MiniMax en vez de Anthropic. **Nunca asumas conocimientos previos**. Pregunta una cosa a la vez. Espera respuesta antes de avanzar. Si algo falla, explicalo en lenguaje natural antes de proponer la solucion.

## Idioma

Habla siempre en español. Tono cercano, frases cortas. Sin jerga tecnica innecesaria — y si la usas, explicala (ej: "API key (es como una contraseña que da acceso al servicio)").

## Flujo del skill

### Paso 0 — Saludar y explicar

Saluda y explica que vas a configurar Claude Code para usar MiniMax:

> Hola! Voy a ayudarte a configurar Claude Code para que use MiniMax en vez del modelo oficial de Anthropic. MiniMax es bastante mas barato y tiene 1 millon de tokens de contexto (puedes tener conversaciones muy largas sin que se reinicie).
>
> Primero, necesito comprobar que tienes Claude Code instalado.

### Paso 1 — Verificar que Claude Code esta instalado

Ejecuta `claude --version`. Si falla:

> Necesitas instalar Claude Code primero. Sigue las instrucciones en https://claude.ai/code y vuelve cuando lo tengas. Baja el instalador, ejecutalo, y cuando veas la terminal de Claude Code ya esta listo.

Si ya lo tiene instalado, continua.

### Paso 2 — Pedir la API key

> Ahora necesito que vayas a https://platform.minimax.io/, te crees una cuenta si no tienes, vayas a "API Keys" en el menu de la izquierda y le des a "Create API key". Te dara un texto largo. Copialo y pegamelo aqui.

Cuando te la den, **avisa**:

> Ojo: esa clave es como una contraseña. No la compartas con nadie. La vamos a guardar en un archivo de tu ordenador y solo la usaras tu.

### Paso 2.5 — Elegir modelos por tier

Antes de generar el archivo, una pregunta sobre los modelos. Tienes dos opciones:

> **Opcion A — "Uno solo para todo"** (la mas facil): uso el mismo modelo para Haiku, Sonnet y Opus. Es lo que hace la mayoria y funciona con cualquier modelo de MiniMax. Si eliges esta, dime **"uno solo"** y dime tambien que modelo (por defecto te propongo `MiniMax-M3[1m]`, que es el mas capaz con contexto de 1 millon).
>
> **Opcion B — Tres modelos distintos** (recomendado si quieres optimizar precio/velocidad): te propongo esta distribucion que ya usa mi hermano Lucas:
> - Para **Haiku** (tareas rapidas y baratas): `MiniMax-M2.5-highspeed`
> - Para **Sonnet** (tareas medianas, equilibrio): `MiniMax-M2.7`
> - Para **Opus** (lo mas potente): `MiniMax-M3[1m]`
>
> Si quieres cambiar alguno, dime cuales quieres usar exactamente (respetando mayusculas y el formato `MiniMax-X.Y`). Si te da igual y quieres los que te propongo, dime **"los que me propones"** y los uso.

### Paso 3 — Crear el archivo lanzador

Crea el archivo `claude-minimax.bat` en el Escritorio del usuario (`%USERPROFILE%\Desktop\claude-minimax.bat`) con este contenido (sustituyendo `LA_API_KEY_QUE_TE_DIO` por la key que te paso, y los `MODELO_*` por los que decidio en el Paso 2.5):

```batch
@echo off
set ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
set ANTHROPIC_AUTH_TOKEN=LA_API_KEY_QUE_TE_DIO
set ANTHROPIC_DEFAULT_HAIKU_MODEL=MODELO_HAIKU_AQUI
set ANTHROPIC_DEFAULT_SONNET_MODEL=MODELO_SONNET_AQUI
set ANTHROPIC_DEFAULT_OPUS_MODEL=MODELO_OPUS_AQUI
set ANTHROPIC_MODEL=MODELO_PRINCIPAL_AQUI
set CLAUDE_CODE_AUTO_COMPACT_WINDOW=1000000
set API_TIMEOUT_MS=3000000

echo Claude Code con MiniMax (tier mapping configurado)
echo.

claude --model MODELO_PRINCIPAL_AQUI
```

**Logica de sustitucion** (segun lo que respondio en el Paso 2.5):
- Si respondio "uno solo" con modelo `X` → los 4 valores = `X`
- Si respondio "uno solo" sin modelo → los 4 valores = `MiniMax-M3[1m]`
- Si dijo "los que me propones" → HAIKU=`MiniMax-M2.5-highspeed`, SONNET=`MiniMax-M2.7`, OPUS=`MiniMax-M3[1m]`, PRINCIPAL=`MiniMax-M3[1m]`
- Si dio 3 IDs custom → cada uno en su sitio, PRINCIPAL = el que dijo para Opus

> **Nota importante**: si pides `MiniMax-M3` sin el `[1m]`, el contexto baja a 200k en vez de 1 millon. El `[1m]` solo existe para M3 (los M2.x son siempre 204k). Los nombres son **case-sensitive**: respetalos exactos como te los doy (mayusculas en `MiniMax-`, no `minimax-`).

Explicale:

> He creado un archivo en tu Escritorio llamado `claude-minimax.bat`. Para usar Claude Code con MiniMax, simplemente haz doble clic en ese archivo. La interfaz es la misma de siempre pero usando MiniMax por debajo.

### Paso 4 — Activar busqueda web (MCP de MiniMax)

MiniMax incluye un servidor de busqueda web que hay que instalar por separado. Necesita `uvx` (una herramienta de Python). Primero comprueba si ya esta:

Ejecuta `uvx --version`. Si funciona, continua. Si falla:

> Necesitas instalar `uv` para activar la busqueda web. Abre una terminal (busca "cmd" en el menu de inicio) y pega este comando:
>
> `winget install astral-sh.uv`
>
> Cuando termine, cierra la terminal y dime cuando este listo.

Una vez confirmado que `uvx` funciona, crea o actualiza el archivo `%USERPROFILE%\.mcp.json`:

- Si el archivo no existe, crealo con este contenido (sustituyendo la key):
  ```json
  {
    "mcpServers": {
      "minimax": {
        "type": "stdio",
        "command": "uvx",
        "args": ["minimax-coding-plan-mcp", "-y"],
        "env": {
          "MINIMAX_API_KEY": "LA_API_KEY_QUE_TE_DIO",
          "MINIMAX_API_HOST": "https://api.minimax.io"
        }
      }
    }
  }
  ```
- Si el archivo ya existe, añade el bloque `"minimax": { ... }` dentro de `"mcpServers"` sin borrar lo que haya.

Lee el archivo resultante y confirma que tiene el bloque `minimax` con la key correcta antes de continuar.

#### Paso 4b (OPCIONAL, solo si lo pides) — MCP de búsqueda con browse

> Si quieres que pueda **visitar páginas web y extraer su contenido automáticamente** (útil para investigar temas leyendo webs), hay un segundo MCP oficial hermano: `minimax_search`. NO es obligatorio — el primero ya cubre búsquedas web normales.
>
> **OJO: este setup es más complicado.** Necesitas 3 claves:
> 1. `MINIMAX_API_KEY` — la misma que ya tienes (MiniMax)
> 2. `SERPER_API_KEY` — de https://serper.dev (Google Search API, gratis hasta 2.500 búsquedas/mes). Te creas cuenta, vas al dashboard y copias la key.
> 3. `JINA_API_KEY` — de https://jina.ai (lector de contenido web, tier gratis limitado). Te creas cuenta y copias la key del dashboard.
>
> Si me las pasas, las añado. Si no, sáltate este paso — no pasa nada, lo otro ya funciona para búsquedas normales.

Si el usuario acepta y da las 3 keys, añade este segundo bloque en `mcpServers` (no reemplaza el primero):

```json
"minimax_search": {
  "type": "stdio",
  "command": "uvx",
  "args": [
    "--from",
    "git+https://github.com/MiniMax-AI/minimax_search.git",
    "minimax-search"
  ],
  "env": {
    "MINIMAX_API_KEY": "LA_MISMA_KEY_DE_ANTES",
    "SERPER_API_KEY": "LA_KEY_DE_SERPER",
    "JINA_API_KEY": "LA_KEY_DE_JINA"
  }
}
```

> Nota: el comando usa `git+https://...` en vez del `git+ssh://...` oficial porque en Windows normalmente no hay clave SSH de GitHub configurada. La versión HTTPS funciona igual.

### Paso 5 — Test rapido

Pidele que haga doble clic en el `.bat` y dentro de Claude Code escriba:

> di hola y dime que modelo eres

Si responde mencionando MiniMax o M3, el modelo funciona. Si da error de autenticacion, volver al Paso 2 y comprobar que la key se copio bien (sin espacios al principio ni al final).

Luego pide que escriba:

> busca en internet que tiempo hace hoy en Madrid

Si responde con el tiempo actual, la busqueda web funciona. Si no aparece la herramienta de busqueda, el MCP no cargo: pide que cierre y vuelva a abrir el `.bat`.

> Listo! Tienes Claude Code con MiniMax-M3 (1 millon de tokens de contexto) y busqueda web integrada. Para lanzarlo, doble clic en `claude-minimax.bat` del Escritorio.

## Reglas generales

1. **Una pregunta a la vez.** No vuelques toda la guia de golpe.
2. **Verifica cada paso.** Despues de cada accion, comprueba que funciono antes de avanzar.
3. **Si algo falla, traduce el error.** No pegues stderr crudo. Explica que paso, en lenguaje normal.
4. **Avisa de los riesgos.** La API key es como una contraseña, no compartirla.
5. **Confirma al final.** Resumen de como volver a lanzarlo.
