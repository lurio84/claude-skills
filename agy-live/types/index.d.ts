export type LogLine = string
export type Phase = 'idle' | 'running' | 'done'

declare module 'claude-code' {
  interface PluginState {
    'agy-live': { lines: Shaped<LogLine[]>; phase: Phase; elapsed: number; frame: number; shownTokens: number }
  }
}
