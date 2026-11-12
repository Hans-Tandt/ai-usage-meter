export type Window = { kind: string; percentUsed: number; resetsAt?: string }

// One file per Claude Code session: <home>/.claude/usage-meter-context/<sessionId>.json
export type ContextInfo = {
  sessionId: string
  folder?: string
  percent?: number // % of the model's full context window
  toCompact?: number // % of the point where auto-compaction runs (what the strip shows)
  basis?: 'compaction' | 'window' // 'window' when no compaction point was available
  tokens?: number
  window?: number
  point?: number // tokens at which auto-compaction runs (when known)
  updatedAt?: string
  lastActiveAt?: string
  compactedAt?: string
  ended?: boolean
}

// The strip's own settings, <home>/.claude/usage-meter-settings.json, when the strip is installed;
// otherwise the mod's own options from /config. `source` says which.
export type MeterSettings = {
  source: 'strip' | 'config'
  warn1: number // 5h / Week: orange from
  warn2: number // 5h / Week: red from
  sessLevel1: number // context: yellow from (% of the compaction point)
  sessLevel2: number // context: red from
  notify: boolean
  notifyReset: boolean
  notifyCompaction: boolean
  blink: boolean // at red, the Compress figure and the warning line blink
  staleMinutes: number
  colorOk: string
  colorWarn: string
  colorDanger: string
}

// Close session / Start session while it runs, and its result.
// queued: sent, waiting for Claude; running: Claude reports steps; done: the status line said YES;
// failed: it said NO; stopped: the reply ended without a status line.
export type Routine = {
  task: 'close' | 'start'
  status: 'queued' | 'running' | 'done' | 'failed' | 'stopped'
  step: number
  total: number
  note?: string
  reason?: string
}

// Another live Claude Code session on this PC, from its context file.
export type OtherSession = { id: string; folder: string; toCompact: number; lastSeen: number }

declare module 'claude-code' {
  interface PluginState {
    'ai-usage-meter': {
      limits: Window[]
      limitsAt: number // when the limits were reported (ms); 0 = never
      context: ContextInfo | null // this session
      turns: number[] // context tokens after each of the last turns
      ctxLevel: number // 0, 1 (yellow) or 2 (red): the context warning already shown
      compactions: number
      compactedAt: number
      cost: number | null
      others: OtherSession[]
      now: number // the clock, ticked so countdowns and "updated … ago" move
      settings: MeterSettings
      bandHidden: boolean
      blinkOff: boolean // the dim half of the blink at red
      routine: Routine | null
      prompted: boolean // the person has sent a message in this session (hides Start session in the band)
      paneOpen: boolean // the /meter pane is open: the band's Details button closes it again
      working: boolean // a main turn of Claude's is running
      robot: { state: 'idle' | 'work' | 'yellow' | 'red' | 'happy'; n: number } | null // null: robot off
    }
  }
}
