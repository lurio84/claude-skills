export type Task = {
  id: string
  label: string
  path: string | null
  /** The output file was seen at `path`; until then the poll searches the session folders for it. */
  found?: boolean
  startedAt: number
  endedAt: number | null
  exitCode: number | null
  cur: number | null
  total: number | null
  frac: number | null
  /** When `frac` last changed: the band extrapolates from here so the bar moves between log updates. */
  changedAt: number
  note: string
  tail: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'task-progress': { tasks: Task[]; viewing: string | null }
  }
}
