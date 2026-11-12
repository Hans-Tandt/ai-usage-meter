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
  updatedAt?: string
  lastActiveAt?: string
  compactedAt?: string
  ended?: boolean
}
