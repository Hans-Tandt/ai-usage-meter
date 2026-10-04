import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Window } from '../types'

const windows = atom({ plugin: 'usage-meter', key: 'windows' } as const, [])
const warned = atom({ plugin: 'usage-meter', key: 'warned' } as const, {})

const THRESHOLDS = [80, 95]

const LABELS: Record<string, string> = {
  five_hour: '5h',
  seven_day: 'Week',
  spend_limit: 'Spend',
}

function colorFor(pct: number): string {
  if (pct >= 95) return 'error'
  if (pct >= 80) return 'warning'
  return 'success'
}

function bar(pct: number): string {
  const filled = Math.min(10, Math.round(pct / 10))
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function resetIn(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ''
  const mins = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  if (mins >= 1440) return ` · resets in ${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
  if (mins >= 60) return ` · resets in ${Math.floor(mins / 60)}h ${mins % 60}m`
  return ` · resets in ${mins}m`
}

async function ingest($: EngineInterface, list: Window[]) {
  await update($, windows, () => list)

  // Toast once each time a window crosses 80 / 95 %; re-arm after it resets.
  const seen = { ...(await read($, warned)) }
  for (const w of list) {
    const label = LABELS[w.kind] ?? w.kind
    const hit = THRESHOLDS.filter(t => w.percentUsed >= t).pop() ?? 0
    const before = seen[w.kind] ?? 0
    if (hit > before) {
      $.ui.toast(`⚠️ ${label} usage at ${w.percentUsed}%`)
    }
    seen[w.kind] = hit
  }
  await update($, warned, () => seen)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'usage-demo',
      description: 'Preview the usage bar at a given percentage (e.g. /usage-demo 85), or /usage-demo off',
    })
    try {
      const u = await $.session.usage()
      await ingest($, u.rateLimits)
    } catch {}
    return result
  })

  // Fake figures so the colours and pop-ups can be seen without spending usage.
  on('command.run', { command: 'usage-demo' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === '' || arg === 'off') {
      const u = await $.session.usage()
      await ingest($, u.rateLimits)
      return { text: 'Usage bar back to your real figures.' }
    }
    const pct = Math.max(0, Math.min(100, Number(arg)))
    if (Number.isNaN(pct)) return { text: 'Usage: /usage-demo <0-100> or /usage-demo off' }
    const resetsAt = new Date((await $.clock.now()) + 2 * 3600000).toISOString()
    await ingest($, [
      { kind: 'five_hour', percentUsed: pct, resetsAt },
      { kind: 'seven_day', percentUsed: Math.round(pct / 2), resetsAt },
    ])
    return { text: `Demo: 5h at ${pct}%, week at ${Math.round(pct / 2)}%. Type /usage-demo off to go back.` }
  })

  on('session.measure', async ($, e, next) => {
    await ingest($, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, windows)
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()

    if (list.length === 0) {
      return (
        <Box>
          <Text dimColor>Usage: waiting for first reply…</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="row" gap={3}>
        {list.map(w => (
          <Text key={w.kind} color={colorFor(w.percentUsed)} bold={w.percentUsed >= 95}>
            {LABELS[w.kind] ?? w.kind} {bar(w.percentUsed)} {w.percentUsed}%
            <Text dimColor>{resetIn(w.resetsAt, now)}</Text>
          </Text>
        ))}
      </Box>
    )
  })
}
