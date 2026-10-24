import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Task } from '../types'

const PANE = 'task-logs'
const TAIL = 200 // log lines kept per task
const LINGER_MS = 15_000 // a finished task stays in the band this long
const LOST_MS = 60_000 // a task whose output file never shows up leaves the band after this
const tasks = atom({ plugin: 'task-progress', key: 'tasks' } as const, [])
const viewing = atom({ plugin: 'task-progress', key: 'viewing' } as const, null)

const KILLED = 143 // a stopped task's file ends in `[killed]`, no code: shown as SIGTERM's
const ANSI =/\x1b\[[0-9;?]*[A-Za-z]/g

/** Progress from a task's output: an explicit `PROGRESS cur/total note` line wins, else tqdm / `N/M` / `NN%` on the last line. */
export function parse(text: string) {
  const lines = text.replace(ANSI, '').split(/\r\n|\r|\n/).map(l => l.trimEnd()).filter(l => l.trim() !== '')
  const exit = /\[(?:exited with code (-?\d+)|killed)\]\s*$/.exec(text)
  const body = exit ? lines.slice(0, -1) : lines
  const last = body.at(-1) ?? ''
  let cur: number | null = null
  let total: number | null = null
  let frac: number | null = null
  let note = last

  for (let i = body.length - 1; i >= 0; i--) {
    const m = /^PROGRESS\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/.exec(body[i]!.trim())
    if (m) {
      cur = Number(m[1]); total = Number(m[2]); note = m[3] || last
      break
    }
  }
  if (total === null) {
    const nm = /(\d+)\s*\/\s*(\d+)(?!\d)/.exec(last)
    const pct = /(\d{1,3}(?:\.\d+)?)\s*%/.exec(last)
    if (nm && Number(nm[2]) > 0 && Number(nm[1]) <= Number(nm[2])) {
      cur = Number(nm[1]); total = Number(nm[2])
    } else if (pct) {
      frac = Math.min(1, Number(pct[1]) / 100)
    }
  }
  if (total) frac = cur! / total

  return { lines: body.slice(-TAIL), cur, total, frac, note, exitCode: exit ? (exit[1] === undefined ? KILLED : Number(exit[1])) : null }
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

/** Progress drawn now: the last parsed value moved on at its average rate, never past the next reported step. */
function smooth(t: Task, now: number) {
  if (t.endedAt !== null) return t.exitCode === 0 ? 1 : t.frac
  if (t.frac === null || t.frac <= 0 || !(t.changedAt > t.startedAt)) return t.frac // also a row saved before changedAt existed
  const rate = t.frac / (t.changedAt - t.startedAt)
  const cap = t.total ? (t.cur! + 1) / t.total : t.frac + 0.05
  return Math.min(t.frac + rate * (now - t.changedAt), cap - 0.002, 0.999)
}

const mix = (a: number[], b: number[], k: number) =>
  '#' + a.map((x, i) => Math.round(x + (b[i]! - x) * k).toString(16).padStart(2, '0')).join('')

const CYAN = [90, 209, 255]
const VIOLET = [180, 140, 255]
const TRACK = [58, 64, 75]
const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))

/**
 * One cell per entry, filled (■) or hollow (□) squares. While running, the fill is a cyan-to-violet gradient whose
 * leading square brightens with the fraction of its cell, and a glint travels along the filled part; with no number,
 * a short run of squares sweeps back and forth.
 */
function cells(frac: number | null, width: number, now: number, ended: Task['exitCode'] | undefined) {
  const out: { ch: string; color: string }[] = []
  const done = ended !== undefined
  const grad = (i: number) => hex(mix(CYAN, VIOLET, i / width))
  if (frac === null && !done) {
    const pos = (now / 60) % (2 * width)
    const at = pos < width ? pos : 2 * width - pos
    for (let i = 0; i < width; i++) {
      const k = Math.max(0, 1 - Math.abs(i - at) / 2.5)
      out.push(k > 0 ? { ch: '■', color: mix(TRACK, grad(i), k) } : { ch: '□', color: '#3a404b' })
    }
    return out
  }
  const x = (frac ?? 0) * width
  const full = Math.floor(x)
  const glint = (now / 45) % (full + 10) // passes the filled part, then rests off the end for a beat
  for (let i = 0; i < width; i++) {
    if (done) {
      out.push(i < Math.round(x) ? { ch: '■', color: ended === 0 ? '#58d68d' : '#ff6b6b' } : { ch: '□', color: '#3a404b' })
    } else if (i < full) {
      const shine = Math.max(0, 1 - Math.abs(i - glint) / 2)
      out.push({ ch: '■', color: mix(grad(i), [255, 255, 255], shine * 0.55) })
    } else if (i === full && x > full) {
      out.push({ ch: '■', color: mix(TRACK, grad(i), x - full) })
    } else {
      out.push({ ch: '□', color: '#3a404b' })
    }
  }
  return out
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(0, n - 1)) + '…' : s)

/**
 * Where a task's output really is. The guess built from `$.session.id()` misses after a `/clear` (the output keeps
 * going to another session folder), so look for `tasks\<id>.output` in every session folder of this project.
 */
async function locate($: EngineInterface, t: Task) {
  if (t.path !== null && (await $.fs.exists(t.path))) return t.path
  const temp = await $.env.get('TEMP')
  if (!temp) return null
  const project = `${temp}\\claude\\${(await $.session.cwd()).replace(/[:\\/]/g, '-')}`
  for (const session of await $.fs.list(project).catch(() => [])) {
    const p = `${project}\\${session.name}\\tasks\\${t.id}.output`
    if (session.kind === 'dir' && (await $.fs.exists(p))) return p
  }
  return null
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'logs', description: 'Show the live log of the latest background task' })

    // Animation frames (spinner, sweep, extrapolated fill) while something runs.
    $.clock.every(100, async () => {
      if ((await read($, tasks)).some(t => t.endedAt === null)) $.ui.invalidate('ui.render')
    })

    // Poll the output file of every running task once a second.
    $.clock.every(1000, async () => {
      const list = await read($, tasks)
      const now = await $.clock.now()
      if (!list.some(t => t.endedAt === null)) {
        // Redraw while a finished row lingers, so it leaves the band on time.
        if (list.some(t => now - t.endedAt! < LINGER_MS + 2000)) $.ui.invalidate('ui.render')
        return
      }
      const fresh: Record<string, Partial<Task>> = {}
      for (const t of list) {
        if (t.endedAt !== null) continue
        const path = t.found ? t.path : await locate($, t)
        if (path === null) {
          if (now - t.startedAt > LOST_MS) fresh[t.id] = { endedAt: now, note: 'log not found' }
          continue
        }
        let text: string
        try {
          text = await $.fs.read(path)
        } catch {
          continue // over 4 MiB
        }
        const p = parse(text)
        fresh[t.id] = {
          path, found: true,
          cur: p.cur, total: p.total, frac: p.frac, note: p.note, tail: p.lines,
          ...(p.frac !== t.frac ? { changedAt: now } : {}),
          ...(p.exitCode !== null ? { exitCode: p.exitCode, endedAt: now } : {}),
        }
      }
      await update($, tasks, all => all.map(t => (fresh[t.id] ? { ...t, ...fresh[t.id] } : t)))
      for (const t of list) {
        const f = fresh[t.id]
        if (f?.exitCode === undefined) continue // still running, or lost (no toast for those)
        $.ui.toast(`${f.exitCode === 0 ? '✓' : `✗ exit ${f.exitCode}`}  ${t.label} · ${clock(now - t.startedAt)}`)
      }
    })

    return next(e)
  })

  on('tool.call', { tool: ['Bash', 'PowerShell'] }, async ($, e, next) => {
    const ran = await next(e)
    const id = ran.deny === undefined && !ran.isError ? ran.result?.backgroundTaskId : undefined
    if (id === undefined) return ran

    const [temp, cwd, session, now] = await Promise.all([
      $.env.get('TEMP'), $.session.cwd(), $.session.id(), $.clock.now(),
    ])
    // Claude Code writes background output to %TEMP%\claude\<cwd with :\/ as dashes>\<session id>\tasks\<id>.output
    // Kept even when the file is not there yet: the poll retries it every second.
    const path = temp ? `${temp}\\claude\\${cwd.replace(/[:\\/]/g, '-')}\\${session}\\tasks\\${id}.output` : null
    const task: Task = {
      id, label: e.description || e.command.slice(0, 60), path, startedAt: now, endedAt: null, exitCode: null,
      cur: null, total: null, frac: null, changedAt: now, note: path ? '' : '(TEMP not set: no log)', tail: [],
    }
    await update($, tasks, all => [...all.filter(t => t.id !== id), task].slice(-20))

    return ran
  }).catch(($, e, next) => next(e)) // tracking must never block a Bash call

  on('command.run', { command: 'logs' }, async $ => {
    const list = await read($, tasks)
    if (list.length === 0) return { text: 'No background tasks yet in this session.' }
    await update($, viewing, () => list.at(-1)!.id)
    await $.ui.open({ id: PANE, title: 'Task logs' })

    return { text: 'Task log pane opened.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await $.clock.now()
    const shown = (await read($, tasks)).filter(t => t.endedAt === null || now - t.endedAt < LINGER_MS)
    if (shown.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const cols = (e.props.bodyColumns ?? 80) - 4 // round border + padding
    const barWidth = Math.max(10, Math.min(32, cols - 62))

    return (
      <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="#444a55" paddingX={1}>
        {shown.map((t, i) => {
          const end = t.endedAt ?? now
          const running = t.endedAt === null
          const shownFrac = smooth(t, now)
          const eta = running && t.frac !== null && t.frac > 0.02 && t.frac < 1 && t.changedAt > t.startedAt
            ? `  ETA ${clock(((t.changedAt - t.startedAt) * (1 - t.frac)) / t.frac - (now - t.changedAt))}` : ''
          const count = t.total !== null ? `${t.cur}/${t.total}  ` : ''
          const pct = shownFrac !== null ? `${String(Math.floor(shownFrac * 100)).padStart(3)}%` : '    '
          const lost = !running && t.exitCode === null
          const icon = running ? SPIN[Math.floor(now / 100) % SPIN.length] : lost ? '–' : t.exitCode === 0 ? '✓' : '✗'
          const accent = running ? '#5ad1ff' : lost ? '#6b7280' : t.exitCode === 0 ? '#58d68d' : '#ff6b6b'
          return (
            <Box key={t.id} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
              <Box>
                <Text color={accent}>{icon} </Text>
                <Text bold={running} dimColor={!running}>{cut(t.label, 26).padEnd(26)}  </Text>
                {cells(shownFrac, barWidth, now, running ? undefined : t.exitCode).map((c, k) => (
                  <Text key={`c${k}`} color={c.color}>{c.ch}</Text>
                ))}
                <Text bold> {pct}</Text>
                <Text dimColor>  {cols < 100 ? '' : count}{clock(end - t.startedAt)}{cols < 90 ? '' : eta}{running || lost || t.exitCode === 0 ? '' : `  exit ${t.exitCode}`}  </Text>
                <Button key={`log-${t.id}`} label="log" onPress={async () => {
                  await update($, viewing, () => t.id)
                  await $.ui.open({ id: PANE, title: 'Task logs' })
                }} />
              </Box>
              {t.note !== '' && <Text dimColor>  └ {cut(t.note, cols - 6)}</Text>}
            </Box>
          )
        })}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, tasks)
    const id = await read($, viewing)
    const t = list.find(x => x.id === id) ?? list.at(-1)
    const cols = e.props.bodyColumns ?? 80
    const room = Math.max(3, (e.viewport?.rows ?? 24) - 6)

    return (
      <Box flexDirection="column">
        <Box flexWrap="wrap">
          {list.slice(-6).map(x => (
            <Button key={`pick-${x.id}`} variant={x.id === t?.id ? 'primary' : undefined}
              onPress={() => update($, viewing, () => x.id)}>
              {cut(x.label, 18)}{x.endedAt === null ? ' …' : x.exitCode === 0 ? ' ✓' : ' ✗'}
            </Button>
          ))}
        </Box>
        {t === undefined && <Text dimColor>No background tasks yet.</Text>}
        {t !== undefined && t.path === null && <Text dimColor>Output file not found for {t.id}.</Text>}
        {t !== undefined && t.tail.length === 0 && t.path !== null && <Text dimColor>(no output yet)</Text>}
        {t !== undefined && t.tail.slice(-room).map((line, i) => (
          <Text key={`l${i}`} dimColor={t.endedAt !== null}
            color={/error|traceback|exception|failed/i.test(line) ? '#ff6b6b' : /warn/i.test(line) ? '#e5c07b' : undefined}>
            {cut(line, cols)}
          </Text>
        ))}
      </Box>
    )
  })
}
