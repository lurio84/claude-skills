export type LogLine = string
export type Phase = 'idle' | 'running' | 'done'
/** A tagged delegar.ps1 run in progress, shown as one dim row under the band, laid out like Claude's agent rows. */
export type SideRun = { tag: string; secs: number; step: string | null; tokens: number }

declare module 'claude-code' {
  interface PluginState {
    'agy-live': { lines: Shaped<LogLine[]>; phase: Phase; elapsed: number; frame: number; shownTokens: number; side: SideRun[] }
  }
}
