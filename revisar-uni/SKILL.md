---
name: revisar-uni
description: On-demand sync of the current university term (PSM/EGC/PGPI) against EV (Blackboard) and the EGC wiki — checks for new announcements, content and files, downloads what's new, and updates the vault calendar/hubs. Use when the user says "revisar uni", "revisa la universidad", "sincroniza EV" or invokes /revisar-uni.
---

# Revisar Uni

## Context

Sources of truth for the current term live in the vault under `Universidad/2026-27/` (hub `Curso-2026-27.md`, `Calendario-2026-27.md`, and per-subject hubs `PSM/PSM.md`, `EGC/EGC.md`, `PGPI/PGPI.md`). Documents live in `OneDrive/Universidad/2026-27/{PSM,EGC,PGPI}/...`; code/notebooks stay local under `Documents/Universidad/`.

**Read `Curso-2026-27.md` in full before doing anything else** — it holds the course ids, group numbers and year prefix this skill needs. Don't hardcode any of that here: this file is mirrored to a public repo. **Don't read the subject hubs in full** (they are large and grow every week): Grep them for the section you need (practices table, InnoSoft table, …) and Read only that line range, and only once that subject actually has a new item — except EGC's practices and InnoSoft tables, which §4 cross-checks every run (Grep + ranged Read).

**Embedded rule (strict academic accuracy)**: never invent variable names, commands, dates or facts based on generic conventions when an official source exists. Always read the actual official material (Read/WebFetch) before advancing — don't guess from a filename or a ToC. When walking Lucas through a lab/practice step, go one step at a time and wait for him to confirm before continuing.

## Flow

### 1. Preflight

Use `mcp__playwright__*` (Lucas's real logged-in Chrome — this needs his EV session, not the isolated plugin browser).

**Expect to need a login first**: the EV session in that Chrome is usually expired (401 at the start of most runs). So at the very start, before any other step, navigate the tab to `https://ev.us.es` and ask Lucas to log in (2FA). Wait for his "listo", then continue with §2–§3.

Call `browser_tabs` only if a navigate/evaluate fails, not as a routine check. Never close the last tab (it tears down the extension relay).

### 2. Last sync

Read `ev_last_sync` from `Calendario-2026-27.md` frontmatter (Read the frontmatter with a small `limit`, not the whole file) — compare against it as a **full ISO datetime in UTC** (Blackboard timestamps are UTC; a date-only value either misses or double-reports same-day items). **Capture the new sync timestamp now, at the start of the run** (`date -u`), not at the end — using the end time risks skipping anything posted while the run itself was in progress. Write this captured value in step 6.

### 3. One batched EV query (PSM, PGPI, EGC-on-EV, AC)

Before the batched evaluate, navigate the tab to any `/learn/api/public/v1/...` URL (in-page fetch fails with "Failed to fetch" on the `/ultra` SPA). Then do all EV reads in a **single `browser_evaluate`** (absolute URLs under `https://ev.us.es/learn/api/public/v1/...`). The in-page async function takes `ev_last_sync` and the AC course ids (from the vault hub) and:
1. Fetches `users/me/courses?expand=course&limit=100`. On 401/403 (or if the tab sits on the EV splash page or `sso.us.es`) it returns `{auth:false}` → **stop and ask Lucas to log in manually (2FA)**, then rerun this same call once. Don't guess a workaround.
2. Resolves the three current-term courses by name prefix `202627-` and course name (PSM = "Procesamiento de Señales Multimedia", EGC = "Evolución y Gestión de la Configuración", PGPI = "Planificación y Gestión de Proyectos Informáticos"). Read the target year from `Curso-2026-27.md` so the skill keeps working next year.
3. Fetches announcements for PSM, PGPI, EGC and the AC courses (§4b), and `contents?recursive=true&limit=200` for PSM and PGPI, following `paging.nextPage`.
4. Filters in the page to items with `created`/`modified` after `ev_last_sync` and **returns only a compact list**: `{course, kind, id, parentId, title, created, modified, attachments:[{id, fileName}]}` (announcements: title + created + first ~300 chars of body text). No raw JSON in the conversation, no scratchpad dumps.

**Watch for stale course-shell dates**: some items carry timestamps from a prior year's copied course shell — sanity-check against the current term before treating something as "new".

### 4. EGC (wiki-native)

EGC's EV course only links out — the real source is the wiki:
- WebFetch the course page at `egc.us.es/cursos/egc-20262027`. The "Planificación" is not its own page (`/planificacion` 404s): it's the weekly-planning PDF linked from `/cursos/egc-20262027/documento/organizacion` (the bare `/documento/organizacion` 404s). `curl` it to the scratchpad and hash-compare against the local copy in `OneDrive/.../EGC/Organizacion/` in **one** Bash command that prints only `same`/`changed` — identical hash = no schedule change; only read it if it differs.
- WebFetch `t.me/s/egcetsii` (public Telegram preview) for announcements. **Always fetch this — it's the primary channel, don't skip it even when EV/wiki look quiet.**
- EV announcements for the EGC course come from the batched query in §3.
- **InnoSoft-related theory sessions**: any wiki/Telegram/EV mention that a theory class is tied to InnoSoft (sessions marked "(Innosoft)" in the Planificación, attendance-hour rules, Evidentia) must always be called out in the report — Lucas wants to attend those. Cross-check against the InnoSoft table in the EGC hub and flag anything new or changed.
- The wiki won't show up as a "dated announcement" for new undated material (e.g. a practice's enunciado going from "pendiente de publicar" to live). Cross-check the wiki's practice/document links against the EGC hub's table of practices/topics, not just a "what changed recently" prompt.

### 4b. AC (date-only tracking)

Out of scope for content, but while the AC exam row in `Calendario-2026-27.md` has no confirmed hour/room, it needs watching. Check the announcements of **both** the previous-year AC course (the sitting belongs to it; earlier sitting notices were posted there) and the current-year one (included in the batched query of §3), each run until that's published, then this check can stop. Course ids are in the vault hub.

### 5. Downloads

For each new/changed attachment:
1. In the EV tab, `browser_evaluate` an in-page `fetch` of `/learn/api/public/v1/courses/{courseId}/contents/{contentId}/attachments/{attachmentId}/download` and write only the final `r.url` (the signed S3 URL) to a file under the gitignored `SecondBrain/.playwright-mcp/` (Playwright can only write inside `SecondBrain/`). If the in-page `fetch` fails with "Failed to fetch" (seen on the `/ultra` SPA), navigate the tab to any `/learn/api/public/v1/...` URL first and retry from there.
2. `curl -sSL -o <dest> "$(cat <that file>)"` to the matching `OneDrive/Universidad/2026-27/{subject}/...` path (mirror the EV folder structure; use `Organizacion/` for subject-root miscellany, matching the existing layout), then delete the file.
3. **Never print or log the signed URL** — it carries temporary AWS credentials. Opening it in a tab and reading `browser_tabs list` prints it in the tool output, so avoid that route; if it is the only one that works, say so and don't repeat the URL anywhere.

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
- A run limited to one subject (e.g. "solo PGPI") must not change `ev_last_sync`: it is shared by all subjects, and moving it would skip the others' new items. Record the partial check in that subject's hub instead, by replacing its "last EV check" line, not by adding a new dated section.
- Keep tool output small: print `same`/`changed`, hashes, counts or `| tail` instead of file contents; never `cat` a hub or a JSON dump. Every extra KB is re-read on every later turn of the run.
- Don't write personal data (group numbers, member names, emails, professor names) into this file — it belongs in the vault hubs, which stay private.
