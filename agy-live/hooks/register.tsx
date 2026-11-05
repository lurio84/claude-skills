import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Phase } from '../types'
import { PAST_VERBS, VERBS } from './verbs'

// Shows what Antigravity (agy) is doing while Claude delegates via delegar.ps1:
// a Claude-style status above the prompt during the run, and the full log in a pane on /agy.
// Source: ~/.claude/tools/delegar-live.log, rewritten by delegar.ps1 on every run.
const PANE = 'agy-live'
const TITLE = 'agy (Antigravity)'
const lines = atom({ plugin: 'agy-live', key: 'lines' } as const, [], { shape: 'lines-1' })
const phase = atom({ plugin: 'agy-live', key: 'phase' } as const, 'idle' as Phase)
const elapsed = atom({ plugin: 'agy-live', key: 'elapsed' } as const, 0)
const frame = atom({ plugin: 'agy-live', key: 'frame' } as const, 0)
const shownTokens = atom({ plugin: 'agy-live', key: 'shownTokens' } as const, 0)

// Behaviour copied from Claude's spinner: constants and formulas read from the bundled JS of claude.exe
// (installed 2026-11-04, re-read 2026-11-05; see ../SPEC.md). Only the colour differs: blue, so the band can't be
// confused with Claude's orange spinner right above it.
const GLYPHS = ['·', '✢', '*', '✶', '✻', '✽']   // non-Ghostty frames
const GLYPH_PERIOD = 2000   // Hn: one smooth there-and-back through the frames every 2 s
const SWEEP_PAD = 10        // me
const SWEEP_FAST = 50       // ms per char while requesting
const SWEEP_SLOW = 200      // $n: ms per char otherwise
const SNAP_CHARS = 2000     // Gn: the token counter jumps instead of animating past this gap
const SHOW_TIMER_MS = 16000 // Qn: elapsed time shows after this even with no tokens
const THINKING_STEPS: [number, string][] = [[45000, 'deep in thought'], [30000, 'thinking some more'], [20000, 'thinking more'], [10000, 'still thinking']]
const BLUE = '#4285F4'    // messageColor
const LIGHT = '#A8C7FA'   // shimmerColor
const RED = '#AB2B3F'     // Claude's stall colour, rgb(171,43,63)
const ERROR = '#EA4335'
const WARNING = '#FFC107' // a dark-theme `warning` from Claude's theme table, rgb(255,193,7)
const TICK_MS = 50

// Claude's spinner modes. agy reports no thinking events, but its steps do spend thinking tokens (all medium/high
// runs on 2026-11-05; none at low), so a wait on the model is Claude's "thinking", or "requesting" for -low models.
type Mode = 'requesting' | 'thinking' | 'responding' | 'tool'

let tick: { cancel: () => void } | undefined
let spin: { cancel: () => void } | undefined
let runStart = 0   // Claude's animation clock starts with the spinner
let verb = 'Working'
let pastVerb = 'Worked'
// Per-run state Claude keeps in refs: last output (stall), tool window, thinking burst, eased intensities.
let mode: Mode = 'requesting'
let lastLength = 0
let lastChangeAt = 0
let toolWindowStart: number | null = null
let toolWindowEnd: number | null = null
let thinkingStart: number | null = null
let thoughtMs: number | null = null
let stalledEased = 0
let thinkingEased = 0
// Header line of the log before this run: until delegar.ps1 rewrites the file, it still holds the last run.
let previousHeader: string | undefined

function thisRun(all: string[]): string[] {
  return all[0] !== previousHeader ? all : []
}

async function load($: EngineInterface): Promise<string> {
  const home = (await $.env.get('USERPROFILE')) ?? ''
  let text = ''
  try {
    text = String(await $.fs.read(`${home}\\.claude\\tools\\delegar-live.log`))
  } catch {
    return ''
  }
  await update($, lines, () => text.replace(/^﻿/, '').split(/\r?\n/))
  return text
}

async function watch($: EngineInterface): Promise<void> {
  // A later command that only mentions delegar.ps1 (a grep, a cat) must not reset a band that is already running.
  if ((await read($, phase)) === 'running') return
  const current = (await load($)).replace(/^﻿/, '')
  // A log with a header but no footer is a run already in progress: attach to it instead of waiting for a new one.
  const inProgress = current.startsWith('=====') && !/\n----- /.test(current)
  const before = inProgress ? undefined : current.split(/\r?\n/)[0]
  previousHeader = before
  const startedAt = await $.clock.now()
  tick?.cancel()
  spin?.cancel()
  await update($, elapsed, () => 0)
  await update($, phase, () => 'running' as Phase)
  await update($, shownTokens, () => 0)
  runStart = startedAt
  verb = VERBS[Math.floor(Math.random() * VERBS.length)] ?? 'Working'          // fixed for the run, like Claude's turn
  pastVerb = PAST_VERBS[Math.floor(Math.random() * PAST_VERBS.length)] ?? 'Worked'
  mode = 'requesting'
  lastLength = 0
  lastChangeAt = startedAt
  toolWindowStart = null
  toolWindowEnd = null
  thinkingStart = null
  thoughtMs = null
  stalledEased = 0
  thinkingEased = 0
  spin = $.clock.every(TICK_MS, async () => {
    await update($, frame, n => (n + 1) % 100000)
    const now = await $.clock.now()
    const run = thisRun(await read($, lines))
    const was = mode
    mode = currentMode(run)
    // Claude's tool window (Ve): opens when a tool starts (reopens if the last one had closed), closes when none
    // runs, and is cleared once thinking starts.
    if (mode === 'tool') {
      if (toolWindowStart === null || toolWindowEnd !== null) toolWindowStart = now
      toolWindowEnd = null
    } else if (toolWindowStart !== null && toolWindowEnd === null) toolWindowEnd = now
    if (mode === 'thinking' && was !== 'thinking') { thinkingStart = now; toolWindowStart = null; toolWindowEnd = null }
    if (mode !== 'thinking' && was === 'thinking' && thinkingStart !== null) { thoughtMs = now - thinkingStart; thinkingStart = null }
    // Targets as in Claude's Ye/Fe: 0 → 1 between 10 s and 20 s, eased 10 % of the gap per 50 ms.
    const stalledTarget = mode === 'responding' ? Math.min(1, Math.max(0, (now - lastChangeAt - 10_000) / 10_000)) : 0
    const thinkingTarget = mode === 'thinking' && thinkingStart !== null ? Math.min(1, Math.max(0, (now - thinkingStart - 10_000) / 10_000)) : 0
    stalledEased = ease(stalledEased, stalledTarget)
    thinkingEased = ease(thinkingEased, thinkingTarget)
    // Claude animates response characters (shown as chars / 4 tokens): every 50 ms +3 when the gap is < 70,
    // max(8, 15 % of it) when < 200, else +50; a gap over 2000 jumps. The atom keeps characters despite its name.
    const target = liveTokens(run) * 4
    await update($, shownTokens, n => {
      const gap = target - n
      if (gap <= 0 || gap > SNAP_CHARS) return target
      return Math.min(target, n + (gap < 70 ? 3 : gap < 200 ? Math.max(8, Math.ceil(gap * 0.15)) : 50))
    })
  })
  tick = $.clock.every(500, async () => {
    const text = await load($)
    const now = await $.clock.now()
    const seconds = Math.round((now - startedAt) / 1000)
    await update($, elapsed, () => seconds)
    if (text.length !== lastLength) { lastLength = text.length; lastChangeAt = now }
    const isNewRun = text.replace(/^﻿/, '').split(/\r?\n/)[0] !== before
    if ((isNewRun && /\n----- /.test(text)) || seconds > 30 * 60) await stop($, 'done')
    // A background run that was blocked (exit 2) never writes a header: don't leave the band "running".
    else if (!isNewRun && seconds > 15) await stop($, 'idle')
  })
}

async function stop($: EngineInterface, to: Phase): Promise<void> {
  tick?.cancel()
  spin?.cancel()
  await update($, phase, () => to)
}

// After a foreground run returns: no new log (blocked, crashed, or the command only mentioned
// delegar.ps1) -> idle; a finished log -> done.
async function settle($: EngineInterface): Promise<void> {
  if ((await read($, phase)) !== 'running') return
  const text = (await load($)).replace(/^﻿/, '')
  if (text.split(/\r?\n/)[0] === previousHeader) await stop($, 'idle')
  else if (/\n----- /.test(text)) await stop($, 'done')
}

function isDelegar(cmd: unknown): boolean {
  return typeof cmd === 'string' && cmd.includes('delegar.ps1')
}

// Linear blend of two #RRGGBB colours, t in [0, 1].
function mix(from: string, to: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const out = [0, 1, 2].map(i => Math.round(ch(from, i) + (ch(to, i) - ch(from, i)) * t))
  return '#' + out.map(v => v.toString(16).padStart(2, '0')).join('')
}

function duration(s: number): string {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function tokens(n: number): string {
  return n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`
}

// What agy is doing now, from the live log. [tool] = a tool started; [tool-done] or [usage] after a tool or after
// text = that step ended and agy waits on the model. Answer text = responding. A wait is Claude's "thinking" unless
// the header names a -low model/effort (no thinking tokens there).
function currentMode(all: string[]): Mode {
  const wait: Mode = /-low\b|\/low\b/.test(all[0] ?? '') ? 'requesting' : 'thinking'
  let ended = false
  for (let i = all.length - 1; i >= 0; i--) {
    const l = all[i] ?? ''
    if (l.startsWith('=====')) return wait
    if (l.startsWith('[usage]') || l.startsWith('[tool-done]')) { ended = true; continue }
    if (l.startsWith('-----') || l.trim() === '') continue
    if (l.startsWith('[tool] ')) return ended ? wait : 'tool'
    return ended ? wait : 'responding'
  }
  return wait
}

function ease(current: number, target: number): number {
  const next = current + (target - current) * 0.1
  return Math.abs(target - next) < 0.01 ? target : next
}

// Claude's 1/8 quantisation (PO).
function q8(x: number): number {
  return Math.round(x * 8) / 8
}

// Claude's thinking label ladder (Xn).
function thinkingLabel(ms: number): string {
  for (const [at, text] of THINKING_STEPS) if (ms >= at) return text
  return 'thinking'
}

// Claude's glimmer index (centre of a 3-char highlight; -100 hides it): requesting sweeps left→right at 50 ms/char,
// other modes right→left at 200 ms/char, both over the text plus 10 chars of padding each side; hidden when stalled.
function glimmerAt(m: Mode, t: number, length: number, stalled: boolean): number {
  if (stalled) return -100
  const span = length + 2 * SWEEP_PAD
  const step = Math.floor(t / (m === 'requesting' ? SWEEP_FAST : SWEEP_SLOW))
  return m === 'requesting' ? (step % span) - SWEEP_PAD : length + SWEEP_PAD - (step % span)
}

// Claude's glyph: index = round((1 - cos(2πt/2000)) / 2 * (frames - 1)), a smooth there-and-back every 2 s.
function glyphAt(t: number): string {
  const f = (1 - Math.cos((2 * Math.PI * t) / GLYPH_PERIOD)) / 2
  return GLYPHS[Math.round(f * (GLYPHS.length - 1))] ?? '·'
}

// Tokens of finished steps, plus ~4 chars per token of answer text written since then.
function liveTokens(all: string[]): number {
  let written = 0
  for (let i = all.length - 1; i >= 0; i--) {
    const l = all[i] ?? ''
    if (l.startsWith('[usage] ')) return (Number(l.slice(8)) || 0) + Math.round(written / 4)
    if (l.startsWith('=====')) break
    if (!l.startsWith('[tool') && !l.startsWith('-----')) written += l.length
  }
  return Math.round(written / 4)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agy', description: 'Show the full log of the last agy delegation' })
    // Timers don't survive a reload or restart; a run left "running" would count forever.
    if ((await read($, phase)) === 'running') await update($, phase, () => 'idle' as Phase)
    return next(e)
  })

  on('command.run', { command: 'agy' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'agy pane opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if ((await read($, phase)) === 'done') await update($, phase, () => 'idle' as Phase)
    return next(e)
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    if (!isDelegar(e.command)) return next(e)
    await watch($)
    const ran = await next(e)
    if (!e.run_in_background) await settle($)
    return ran
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!isDelegar(e.command)) return next(e)
    await watch($)
    const ran = await next(e)
    if (!e.run_in_background) await settle($)
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, phase)
    if (e.props.hasSurvey || now === 'idle') return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const all = await read($, lines)
    const secs = await read($, elapsed)

    if (now === 'done') {
      const footer = all.find(l => l.startsWith('-----')) ?? ''
      const ok = footer.includes('SUCCESS') && footer.includes('git changed False')
      // Like Claude's dim "✻ Crunched for 1m 12s" line (past verb from its list); red only when something needs a look.
      return ok ? (
        <Box marginTop={1}>
          <Text color={BLUE} dimColor>✻ {pastVerb} for {duration(secs)}</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="#EA4335">✘ Antigravity needs a look </Text>
          <Text dimColor>({footer.replace(/^-+\s*/, '')})</Text>
        </Box>
      )
    }

    await read($, frame)   // subscribes the band to the 50 ms tick
    const nowMs = await $.clock.now()
    const t = nowMs - runStart
    const shown = Math.round((await read($, shownTokens)) / 4)   // the atom holds characters, like Claude's counter

    // Stall (Ye): no new output for 10 s blends toward red over the next 10 s and hides the glimmer; > 0.5 = error.
    // Claude exempts tools and thinking; here that leaves only the writing state (see currentMode).
    // Long thinking (Fe): 10 s into a thinking burst the whole message blends toward warning; > 0.5 = warning.
    const stalled = stalledEased > 0
    const tint = stalledEased > 0 ? { to: RED, full: ERROR, x: stalledEased } : thinkingEased > 0 ? { to: WARNING, full: WARNING, x: thinkingEased } : null
    const tinted = tint ? (tint.x > 0.5 ? tint.full : mix(BLUE, tint.to, q8(tint.x))) : null
    const bold = thinkingEased >= 0.5

    const message = `${verb}…`
    let label
    if (tinted) label = <Text color={tinted}>{message}</Text>
    else if (mode === 'tool') {
      // Tool running: no sweep, the whole message pulses (zn), period 2 s, quantised to 1/8.
      label = <Text color={mix(BLUE, LIGHT, q8((Math.sin((t / 1000) * Math.PI) + 1) / 2))}>{message}</Text>
    } else {
      const at = glimmerAt(mode, t, message.length, stalled)
      label = [...message].map((ch, i) => <Text color={Math.abs(i - at) <= 1 ? LIGHT : BLUE}>{ch}</Text>)
    }

    // Status (Ue): running tool for (window ≥ 2 s) > ran tool for > thinking ladder > thought for.
    let status: string | null = null
    if (toolWindowStart !== null && mode === 'tool' && nowMs - toolWindowStart >= 2000) status = `running tool for ${duration(Math.floor((nowMs - toolWindowStart) / 1000))}`
    else if (toolWindowStart !== null && toolWindowEnd !== null && toolWindowEnd - toolWindowStart >= 2000) status = `ran tool for ${duration(Math.floor((toolWindowEnd - toolWindowStart) / 1000))}`
    else if (mode === 'thinking' && thinkingStart !== null) status = thinkingLabel(nowMs - thinkingStart)
    else if (thoughtMs !== null) status = `thought for ${Math.max(1, Math.round(thoughtMs / 1000))}s`
    // Thinking text: grey pulse 153→185 (2 s), toward warning with the thinking intensity.
    const grey = Math.round(153 + 32 * ((Math.sin((t / 1000) * Math.PI) + 1) / 2)).toString(16).padStart(2, '0')
    const thinkingColor = thinkingEased > 0.5 ? WARNING : mix(`#${grey}${grey}${grey}`, WARNING, thinkingEased)

    // Suffix like Claude's: elapsed (once tokens > 0, > 16 s, or a status shows) · arrow + tokens (only when > 0;
    // ↑ while requesting) · status. All inside dim parentheses.
    const showTimer = shown > 0 || nowMs - runStart > SHOW_TIMER_MS || status !== null
    const parts = [
      ...(showTimer ? [<Text dimColor>{duration(secs)}</Text>] : []),
      ...(shown > 0 ? [<Text dimColor>{mode === 'requesting' ? '↑' : '↓'} {tokens(shown)} tokens</Text>] : []),
      ...(status ? [mode === 'thinking' ? <Text color={thinkingColor}>{status}</Text> : <Text dimColor>{status}</Text>] : []),
    ]
    const suffix = parts.length === 0 ? null : (
      <Text>
        <Text dimColor> (</Text>
        {parts.map((p, i) => (i === 0 ? p : <Text><Text dimColor> · </Text>{p}</Text>))}
        <Text dimColor>)</Text>
      </Text>
    )
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text color={tinted ?? BLUE} bold={bold}>{glyphAt(t)} </Text>
          {label}
          {suffix}
        </Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const all = await read($, lines)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 3)
    const shown = all.filter(l => l.trim() !== '' && !l.startsWith('[usage]')).slice(-room)

    return (
      <Box flexDirection="column">
        {shown.length === 0 && <Text dimColor>No delegation yet.</Text>}
        {shown.map(l =>
          l.startsWith('=====') ? <Text bold>{l}</Text>
          : l.startsWith('[tool]') ? <Text color="cyan" wrap="truncate-end">{l}</Text>
          : l.startsWith('-----') ? <Text color={l.includes('SUCCESS') ? 'green' : 'red'}>{l}</Text>
          : <Text>{l}</Text>,
        )}
      </Box>
    )
  })
}
