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
  model?: string // the model of the main conversation's last request, as Claude Code names it
  effort?: string | number // its effort: a level or a token budget
  usedTokens?: Partial<Record<'opus' | 'sonnet' | 'haiku' | 'fable' | 'other', number>> // tokens per model family, this session
  readerRuns?: number // how often the Haiku reader ran in this session
  week?: string // the weekly window these counts belong to (its reset time)
}

// The strip's own settings, <home>/.claude/usage-meter-settings.json, when the strip is installed;
// otherwise the mod's own options from /config. `source` says which.
export type MeterSettings = {
  source: 'strip' | 'config'
  warn1: number // 5h / Week: orange from
  warn2: number // 5h / Week: red from
  sessLevel1: number // context: yellow from (% of the compaction point)
  sessLevel2: number // context: red from
  tokenYellow: number // context: yellow from this many tokens as well (0 = off); from /config, also with the strip
  tokenRed: number // context: red from this many tokens as well (0 = off)
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

// One of the mod's own settings (a /config row), for the pane's Settings section. In the desktop app /config
// opens the app's own Settings window, so the pane is where desktop users change the mod's settings.
export type SettingRow = {
  key: string // `<plugin>.<field>`, what $.config.set takes
  field: string // the userConfig field name
  label: string
  kind: 'boolean' | 'choice' | 'text' | 'number'
  value: boolean | string | number | readonly string[]
  options?: readonly string[]
  isLocked: boolean
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
      robot: {
        state: 'idle' | 'work' | 'yellow' | 'red' | 'happy'
        n: number
        model: 'opus' | 'sonnet' | 'haiku' | 'fable' | 'other'
        effort: number // 0: no lights, 1 low … 5 max
        px: number // screen pixels per robot pixel (/config Robot size)
      } | null // null: robot off
      robotSeen: {
        model: 'opus' | 'sonnet' | 'haiku' | 'fable' | 'other'
        effort: number
        name?: string // the model as Claude Code names it
        effortName?: string // the effort as Claude Code gives it
      } // the main conversation's last request
      tokensByModel: Record<'opus' | 'sonnet' | 'haiku' | 'fable' | 'other', number> // this session, all agents
      readerRuns: number // Haiku reader runs this session
      weekTokens: { tokens: Record<'opus' | 'sonnet' | 'haiku' | 'fable' | 'other', number>; runs: number } | null // all sessions, this weekly window
      turnRead: { tokens: number; nudged: boolean } // read by the main conversation this turn; told about the reader yet
      readerOn: boolean // the reader's switch (pane), kept in the store for the next sessions
      readerOpen: boolean // the reader's details are open in the pane
      readerCfg: { mode: 'search' | 'summary'; threshold: number } // from /config
      lastReplyAt: number // when the main conversation last answered (ms): the cache clock starts there
      warming: boolean // Keep warm is running
      helpersMoved: number // Explore helpers started on Haiku this session
      cacheCfg: { on: boolean; minutes: number } // from /config
      settingsOpen: boolean // the Settings section is open in the pane
      configRows: SettingRow[] // the mod's own /config rows, as the pane's Settings section shows them
    }
  }
}
