---
name: verificar
description: Before declaring any task complete, runs the real verification command, shows the output and confirms the result is correct. Use when finishing features, bugs, refactors, vault notes, configs, scripts, or any change. Also when the user asks "¿funciona?" or "¿está bien?".
disable-model-invocation: false
---

# Verificación obligatoria

**Regla de hierro:** No puedes decir que algo funciona si no has ejecutado el comando que lo prueba en ESTA conversación. Output fresco o no está hecho. Métricas verdes ≠ resultado correcto — revisar el output antes de declarar done.

## Antes de declarar éxito — checklist por tipo de tarea

### Código (Java/Node/Python/Go/Rust)
1. Identifica comando de verify del proyecto:
   - Java/Maven: `mvn test` o `mvn verify`
   - Node: `npm test` o `npm run build`
   - Python: `pytest` o `python -m pytest`
   - Go: `go test ./...`
   - Rust: `cargo test` o `cargo check`
2. Si no hay tests: al menos compila/lint (`npm run build`, `mvn compile`, `cargo check`).
3. Ejecuta el comando COMPLETO. No atajos. No "debería funcionar".
4. Muestra el output real. Si hay failures, mostrarlos textualmente.
5. Si falla → no has terminado. Arregla y vuelve a verificar.

### UI / Visual (frontend, sprites, dashboards)
1. Arranca el dev server o servicio real.
2. Captura pantalla del resultado (Playwright MCP, o pedirla a Lucas).
3. Compara contra criterio de éxito explícito.
4. Probar golden path + 1 edge case mínimo.
5. NO declarar éxito solo porque "compila" o "tests pasan" — verificar el output visual.

### Nota en vault (Obsidian)
1. Tras escribir la nota: LEERLA entera (Read tool).
2. Comprobar que: frontmatter válido, wikilinks `[[nota]]` existen (no rotos), estructura coherente con notas similares.
3. Si la nota referencia números/hashes/fechas: contrastar con la fuente real.
4. Si reorganizas folders: comprobar que los wikilinks afectados siguen funcionando.

### Config / scripts / settings
1. Ejecuta el comando final que la config gobierna.
2. Para `.bat` / `.ps1`: ejecutar al menos una vez en seco para validar.
3. Para JSON: validar que parsea (`Get-Content x.json | ConvertFrom-Json` o equivalente).
4. Para hooks: disparar el evento real y observar el output.

### Investigación / datos
1. Cada claim factual → citar fuente (URL, archivo, comando que lo probó).
2. Si no hay fuente verificable → marcar como "no encontrado" o "no confirmado", NO inventar.
3. Cifras: contrastar con al menos 2 fuentes si la decisión depende de ellas.

## Prohibido (banderas rojas)

- "Los tests deberían pasar" — ejecútalos
- "Esto debería funcionar" — pruébalo
- "Parece correcto" — verifícalo
- "Asumo que..." — comprueba
- Decir "done" / "completado" / "listo" sin haber mostrado output real en esta conversación
- Asumir que un cambio trivial no necesita verificación

## Cuando no se puede verificar

Si por alguna razón no puedes ejecutar el verify (entorno bloqueado, requiere acceso humano, etc.):
- Decirlo **explícitamente**: "No he podido verificar X porque Y".
- Listar qué tendría que hacer Lucas para verificarlo manualmente.
- NO declarar éxito.
