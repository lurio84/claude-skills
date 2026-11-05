import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Phase } from '../types'

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

// Own style: a twinkling Gemini-like sparkle in Google blue (Claude's spinner is orange).
const SPARKLE = ['✧', '✦', '✦', '✧', '⋆', '✧']
const BLUE = '#4285F4'
const LIGHT = '#7BAAF7'   // subtle: a lighter blue, not near-white (Lucas, 2026-11-05)

let tick: { cancel: () => void } | undefined
let spin: { cancel: () => void } | undefined
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
  const before = (await load($)).replace(/^﻿/, '').split(/\r?\n/)[0]
  previousHeader = before
  const startedAt = await $.clock.now()
  tick?.cancel()
  spin?.cancel()
  await update($, elapsed, () => 0)
  await update($, phase, () => 'running' as Phase)
  await update($, shownTokens, () => 0)
  spin = $.clock.every(140, async () => {
    await update($, frame, n => (n + 1) % 1000)
    const target = liveTokens(thisRun(await read($, lines)))
    // Ease toward the real count so it climbs smoothly instead of jumping per step.
    await update($, shownTokens, n => (n >= target ? target : n + Math.max(7, Math.ceil((target - n) * 0.12))))
  })
  tick = $.clock.every(1000, async () => {
    const text = await load($)
    const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
    await update($, elapsed, () => seconds)
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

// What agy is doing now: a verb for the band and the detail line under it.
function current(all: string[]): { verb: string; detail: string } {
  for (let i = all.length - 1; i >= 0; i--) {
    const l = all[i] ?? ''
    if (l.startsWith('=====')) return { verb: 'Warming up', detail: 'starting the agent' }
    if (l.startsWith('[usage]') || l.startsWith('-----') || l.trim() === '') continue
    if (l.startsWith('[tool] ')) {
      const [tool = '', ...rest] = l.slice(7).split(' ')
      const arg = rest.join(' ')
      const file = /[\\/]/.test(arg) && !arg.includes(' ') ? arg.split(/[\\/]/).pop() ?? arg : arg
      const verb = tool === 'read_file' ? 'Reading' : tool === 'run_command' ? 'Running' : /search|grep|find|list/.test(tool) ? 'Searching' : 'Working'
      return { verb, detail: `${tool} ${file}`.trim() }
    }
    return { verb: 'Writing', detail: l.trim() }
  }
  return { verb: 'Warming up', detail: 'starting the agent' }
}

// Tokens of finished steps, plus ~4 chars per token of answer text written since then.
function liveTokens(all: string[]): number {
  let written = 0
  for (let i = all.length - 1; i >= 0; i--) {
    const l = all[i] ?? ''
    if (l.startsWith('[usage] ')) return (Number(l.slice(8)) || 0) + Math.round(written / 4)
    if (l.startsWith('=====')) break
    if (!l.startsWith('[tool]') && !l.startsWith('-----')) written += l.length
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
      const generated = tokens(liveTokens(all))
      // Like Claude's dim "Crunched for 1m 12s" line; red only when something needs a look.
      return ok ? (
        <Box marginTop={1}>
          <Text dimColor>✦ Antigravity worked for {duration(secs)} · ↓ {generated} tokens · /agy for the log</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="#EA4335">✘ Antigravity needs a look </Text>
          <Text dimColor>({footer.replace(/^-+\s*/, '')}) · /agy for the log</Text>
        </Box>
      )
    }

    const n = await read($, frame)
    const { verb, detail } = current(thisRun(all))
    // The whole label pulses smoothly between blue and light blue (~2 s per cycle), as Claude's word does.
    const pulse = mix(BLUE, LIGHT, (1 - Math.cos((n / 14) * 2 * Math.PI)) / 2)
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text color={pulse}>{SPARKLE[n % SPARKLE.length] ?? '✦'} </Text>
          <Text color={pulse}>Antigravity · {verb}…</Text>
          <Text dimColor> ({duration(secs)} · ↓ {tokens(await read($, shownTokens))} tokens)</Text>
        </Text>
        <Text dimColor wrap="truncate-end">  ⎿  {detail}</Text>
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
