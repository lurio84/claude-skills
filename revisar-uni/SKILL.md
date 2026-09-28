---
name: revisar-uni
description: On-demand sync of the current university term (PSM/EGC/PGPI) against EV (Blackboard) and the EGC wiki — checks for new announcements, content and files, downloads what's new, and updates the vault calendar/hubs. Use when the user says "revisar uni", "revisa la universidad", "sincroniza EV" or invokes /revisar-uni.
---

# Revisar Uni

## Context

Sources of truth for the current term live in the vault under `Universidad/2026-27/` (hub `Curso-2026-27.md`, `Calendario-2026-27.md`, and per-subject hubs `PSM/PSM.md`, `EGC/EGC.md`, `PGPI/PGPI.md`). Documents live in `OneDrive/Universidad/2026-27/{PSM,EGC,PGPI}/...`; code/notebooks stay local under `Documents/Universidad/`.

**Read `Curso-2026-27.md` and the three hubs before doing anything else** — they hold the course ids, group numbers, professor names and other specifics this skill needs. Don't hardcode any of that here: this file is mirrored to a public repo.

**Embedded rule (strict academic accuracy)**: never invent variable names, commands, dates or facts based on generic conventions when an official source exists. Always read the actual official material (Read/WebFetch) before advancing — don't guess from a filename or a ToC. When walking Lucas through a lab/practice step, go one step at a time and wait for him to confirm before continuing.

## Flow

### 1. Preflight

Use `mcp__playwright__*` (Lucas's real logged-in Chrome — this needs his EV session, not the isolated plugin browser).

1. `browser_tabs list` — confirm a tab exists. Never close the last tab (it tears down the extension relay).
2. `browser_evaluate` an absolute-URL fetch to `https://ev.us.es/learn/api/public/v1/users/me/courses?expand=course&limit=100`.
3. If this returns 401/403, or a tab is sitting on the EV splash page or `sso.us.es` → **stop and ask Lucas to log in manually (2FA)**. Don't retry, don't guess a workaround.
4. From the course list, resolve the three current-term courses by matching name prefix `202627-` and course name (PSM = "Procesamiento de Señales Multimedia", EGC = "Evolución y Gestión de la Configuración", PGPI = "Planificación y Gestión de Proyectos Informáticos"). This keeps the skill working next year without editing it — just update the year prefix here or, better, read the target year from `Curso-2026-27.md`.

### 2. Last sync

Read `ev_last_sync` from `Calendario-2026-27.md` frontmatter — compare against it as a **full ISO datetime in UTC** (Blackboard timestamps are UTC; a date-only value either misses or double-reports same-day items). **Capture the new sync timestamp now, at the start of the run** (`date -u`), not at the end — using the end time risks skipping anything posted while the run itself was in progress. Write this captured value in step 6.

### 3. PSM + PGPI (EV-native)

For each course:
- Fetch announcements.
- Fetch `contents?recursive=true&limit=200`, paginating via `paging.nextPage`.
- Dump raw JSON to scratchpad files, then read them back with Grep/Read — don't paste raw JSON into the conversation.
- Filter to items with `created`/`modified` after `ev_last_sync`.
- **Watch for stale course-shell dates**: some items carry timestamps from a prior year's copied course shell — sanity-check against the current term before treating something as "new".

### 4. EGC (wiki-native)

EGC's EV course only links out — the real source is the wiki:
- WebFetch the course page and "Planificación" at `egc.us.es/cursos/egc-20262027`.
- WebFetch `t.me/s/egcetsii` (public Telegram preview) for announcements. **Always fetch this — it's the primary channel, don't skip it even when EV/wiki look quiet.**
- Also check EV announcements for the EGC course, in case anything is posted there directly.
- The wiki won't show up as a "dated announcement" for new undated material (e.g. a practice's enunciado going from "pendiente de publicar" to live). Cross-check the wiki's practice/document links against the EGC hub's table of practices/topics, not just a "what changed recently" prompt.

### 4b. AC (date-only tracking)

Out of scope for content, but the 3ª convocatoria exam (currently 2026-10-30, hour/room unpublished) needs watching until it has a confirmed hour/room. Check the AC 202627 course's announcements each run until that's published, then this check can stop.

### 5. Downloads

For each new/changed attachment:
1. `browser_tabs new` with the download URL: `/learn/api/public/v1/courses/{courseId}/contents/{contentId}/attachments/{attachmentId}/download` (this redirects to a signed S3 URL — a "page closed" event is normal).
2. `browser_tabs list` to read the resulting tab's URL.
3. `curl -sSL -o <dest>` that signed URL to the matching `OneDrive/Universidad/2026-27/{subject}/...` path (mirror the EV folder structure; use `Organizacion/` for subject-root miscellany, matching the existing layout).
4. Close that download tab (never the relay/first tab).
5. **Never print or log the signed URL** — it carries temporary AWS credentials.

Re-download an existing local file only if EV's `modified` is newer than the local file's mtime — don't blindly re-fetch everything. There's no automatic name mapping between an EV attachment's `fileName` and the local filename (EV's internal names don't always match — e.g. an item titled "Problemas 8" was found with an attachment internally called `Problemas5.pdf`, unrelated content). Match by the **content item's title**, not the attachment's `fileName`; for a brand-new file, keep EV's `fileName` as-is. When in doubt whether an EV attachment is genuinely new/different content vs. a mislabeled duplicate, hash-compare before overwriting.

### 6. Update the vault

- Add new dated items to `Calendario-2026-27.md` with a `fuente` column entry (EV page / wiki page / PDF+page).
- Add new facts to the relevant hub. Only write what's sourced; anything uncertain gets marked "sin verificar" rather than asserted.
- Update `ev_last_sync` to the current UTC datetime.

### 7. Report

Close in Spanish with:
```
## Revisión Uni (DD-MM-YYYY HH:MM)
- PSM: [novedades o "sin cambios"]
- EGC: [novedades o "sin cambios"]
- PGPI: [novedades o "sin cambios"]
- Descargado: [lista de archivos o "nada nuevo"]
- Próximos 14 días (Calendario): [filas relevantes]
```

## Notes

- If EV can't be reached this run, say so plainly and don't touch `ev_last_sync` — a failed run is not a sync.
- Don't write personal data (group numbers, member names, emails, professor names) into this file — it belongs in the vault hubs, which stay private.
