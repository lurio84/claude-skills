---
name: revisar-cryptotrader
description: 'Revisión semanal del proyecto CryptoTrader (lurio84/CryptoTrader). Comprueba estado de los GitHub Actions runs, detecta alertas de compra/venta disparadas, y diagnostica/propone fix si algún run falló. Usar cuando el usuario diga "revisar cryptotrader", "cómo va cryptotrader", "ha saltado alguna alerta" o similar.'
---

# Revisar CryptoTrader

## Contexto

Proyecto: `lurio84/CryptoTrader` — asesor personal de inversión BTC/ETH.
Workflow único: **`Crypto Signal Check`** corre en cron cada ~4h (GitHub Actions) y postea alertas a Discord cuando detecta señales con edge estadístico (BTC crash >15%, funding negativo, S&P -7%, niveles DCA-out, rebalanceo).

**Regla crítica:** la fuente de verdad es **GitHub Actions** (`gh run`), NUNCA una DB local. Lucas se ha equivocado antes mirando archivos locales y sacando conclusiones erróneas — el sistema vive en la nube.

## Flujo del skill

### Paso 1 — Estado de los runs

Lista los últimos 10 runs:

```bash
gh run list -R lurio84/CryptoTrader --limit 10
```

Identifica:
- ✅ Runs `success` → resume cuántos, frecuencia esperada (~4h entre cada uno).
- ❌ Runs `failure` o `cancelled` → marca para diagnóstico (paso 3).
- ⏰ **Gap inesperado**: si entre dos runs consecutivos pasaron >5h, algo va mal con el cron — anótalo aunque ambos sean success.

### Paso 2 — Detectar alertas disparadas

Para cada run `success` de la última semana, mira el log buscando si saltó alguna señal:

```bash
gh run view <run-id> -R lurio84/CryptoTrader --log | grep -iE "alert|signal|crash|funding|dca|rebalanc|discord"
```

Reporta:
- Si NO hay alertas: "Sin señales esta semana — el cron sigue vigilando."
- Si hay alguna: extrae el tipo (BTC crash / funding / S&P / DCA-out / rebalanceo) y la fecha. Recuerda al usuario que estas alertas también llegaron a Discord.

### Paso 3 — Diagnóstico de fallos (si hay)

Para cada run fallido:

```bash
gh run view <run-id> -R lurio84/CryptoTrader --log-failed
```

Identifica la causa típica:
- **API rate limit** (CoinGecko, Yahoo, etc.) → reintentar más tarde, no es bug.
- **Cambio de schema en API externa** → bug real, hay que arreglar el parser.
- **Secret expirado** (Discord webhook, API keys) → renovar en repo settings.
- **Dependencia rota** tras update → pin versión.
- **Error en código** tras commit reciente → revisar `git log` del repo.

### Paso 4 — Proponer fix (NO commitear sin permiso)

Si hay bug claro:

1. Clona/cd al repo si no estás dentro.
2. Lee los archivos implicados (no asumas — verifica el código real).
3. Propón el fix con diff claro al usuario.
4. **Espera aprobación explícita** antes de editar/commitear.
5. Si Lucas aprueba, haz commit con mensaje descriptivo. **Nunca** push directo: deja que él decida cuándo subir.

### Paso 5 — Resumen final

Da un cierre en formato:

```
## Estado CryptoTrader (semana del DD-MM)
- Runs: X success / Y failure (esperado: ~42 runs/semana)
- Cron: regular / con gap el DD-MM
- Alertas disparadas: [lista o "ninguna"]
- Acción requerida: [ninguna / fix propuesto pendiente de aprobación / fix aplicado]
```

## Errores comunes a evitar

1. **No mirar la DB local** del proyecto — está desactualizada y no refleja el estado de producción.
2. **No asumir que "no hay alertas" significa "está roto"**. Las alertas son raras por diseño (2-5/año las de compra extra).
3. **No tocar el código del repo sin haber leído los archivos primero.** Diagnosticar a partir solo del log lleva a fixes que no compilan.
4. **No `git push` automático.** Lucas decide cuándo sube cambios.

## Referencias

- Repo: https://github.com/lurio84/CryptoTrader
- Nota vault: `Proyectos/CryptoTrader.md` (estrategia y resultados validados)
- Memoria: `feedback_cryptotrader_alerts.md` (regla `gh run` siempre)
