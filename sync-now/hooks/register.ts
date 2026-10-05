import type { Register } from 'claude-code'

const SCRIPT = 'C:/Users/lucas/.claude/skills/sync/sync.ps1'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sync-now',
      description: 'Commit + push claude-config, claude-skills and SecondBrain (runs sync.ps1, no model turn)',
    })
    return next(e)
  })

  on('command.run', { command: 'sync-now' }, async $ => {
    $.ui.status('running...')
    try {
      const { exitCode, stdout, stderr } = await $.process.run(
        ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT],
        { timeoutMs: 180_000 },
      )
      const out = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
      const failed = exitCode !== 0 || /PUSH FAILED|sin pushear/i.test(out)
      return { text: `${failed ? 'CHECK OUTPUT' : 'ok'} (exit ${exitCode})\n${out}` }
    } catch (err) {
      return { text: `could not run sync.ps1: ${String(err)}` }
    } finally {
      $.ui.status(undefined)
    }
  })
}
