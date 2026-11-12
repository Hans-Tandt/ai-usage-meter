import type { Elements } from 'claude-code'

import type { ContextInfo, MeterSettings, OtherSession, Routine, Window } from '../types'
import { robot, type RobotState } from './robot'

// What the band and the pane draw. Pure functions of plain data: every surface (terminal, desktop) gets the same tree.

// Shown on the last line of the pane. Raise it together with the version in plugin.json.
export const VERSION = '1.8.0'

// Svg is there on the desktop app, VS Code and mobile; the terminal draws the bars with line characters.
export type Kit = Pick<Elements['desktop'], 'Box' | 'Text' | 'Button'> & { Svg?: Elements['desktop']['Svg'] }

export type View = {
  settings: MeterSettings
  now: number
  limits: Window[]
  limitsAt: number
  context: ContextInfo | null
  turns: number[]
  compactions: number
  compactedAt: number
  cost: number | null
  others: OtherSession[]
  blinkOff: boolean
  routine: Routine | null
  prompted: boolean
  robot: { state: RobotState; n: number } | null // null: switched off in /config
}

export type Actions = {
  notes: () => void
  compact: () => void
  hide: () => void
  open: () => void
  close: () => void
  start: () => void
}

export const DEFAULTS: MeterSettings = {
  source: 'config',
  warn1: 80,
  warn2: 95,
  sessLevel1: 80,
  sessLevel2: 90,
  notify: true,
  notifyReset: true,
  notifyCompaction: true,
  blink: true,
  staleMinutes: 60,
  colorOk: '#3FB950',
  colorWarn: '#F0883E',
  colorDanger: '#F85149',
}

const HOUR = 3600000
const LENGTH: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }

// ---------- figures ----------

export function limitLevel(s: MeterSettings, pct: number) {
  return pct >= s.warn2 ? 2 : pct >= s.warn1 ? 1 : 0
}

export function contextLevel(s: MeterSettings, pct: number) {
  return pct >= s.sessLevel2 ? 2 : pct >= s.sessLevel1 ? 1 : 0
}

function color(s: MeterSettings, level: number) {
  return level === 2 ? s.colorDanger : level === 1 ? s.colorWarn : s.colorOk
}

export function windowOf(v: View, kind: string) {
  return v.limits.find(w => w.kind === kind)
}

function resetMs(w: Window | undefined) {
  const t = w?.resetsAt ? Date.parse(w.resetsAt) : NaN
  return Number.isNaN(t) ? undefined : t
}

// At the pace so far in this window, when it would reach 100 %; undefined when the reset comes first.
export function hitsFullIn(w: Window | undefined, now: number) {
  const reset = resetMs(w)
  const length = w ? LENGTH[w.kind] : undefined
  if (!w || reset === undefined || length === undefined || w.percentUsed <= 0 || w.percentUsed >= 100) return undefined
  const elapsed = now - (reset - length)
  if (elapsed < 10 * 60000) return undefined
  const toFull = ((100 - w.percentUsed) * elapsed) / w.percentUsed
  return now + toFull < reset ? toFull : undefined
}

// How many more turns like the last few fit before compaction.
export function turnsLeft(c: ContextInfo | null, turns: number[]) {
  if (!c?.point || c.tokens === undefined || turns.length < 3) return undefined
  const steps: number[] = []
  for (let i = Math.max(1, turns.length - 6); i < turns.length; i++) {
    const d = (turns[i] ?? 0) - (turns[i - 1] ?? 0)
    if (d > 0) steps.push(d)
  }
  if (steps.length === 0) return undefined
  const avg = steps.reduce((a, b) => a + b, 0) / steps.length
  return Math.max(0, Math.floor((c.point - c.tokens) / avg))
}

export function isStale(v: View) {
  return v.limitsAt > 0 && v.now - v.limitsAt > v.settings.staleMinutes * 60000
}

export function duration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

function clock(t: number) {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function day(t: number, now: number) {
  const d = new Date(t)
  if (t - now < 20 * HOUR) return clock(t)
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${clock(t)}`
}

function tokens(n: number) {
  return n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
}

const TRACK = '#8B949E'

// A rounded bar like the strip's on surfaces that draw SVG; a solid line of cells on the terminal.
function meter(kit: Kit, pct: number, fill: string, cells: number, px: number, dim = false) {
  const { Svg, Text } = kit
  const share = Math.max(0, Math.min(1, pct / 100))
  if (Svg) {
    const tall = 8
    const w = px
    const f = share > 0 ? Math.max(tall, Math.round(share * w)) : 0
    const source =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${tall}" viewBox="0 0 ${w} ${tall}">` +
      `<rect width="${w}" height="${tall}" rx="${tall / 2}" fill="${TRACK}" fill-opacity="0.25"/>` +
      (f > 0 ? `<rect width="${f}" height="${tall}" rx="${tall / 2}" fill="${fill}" fill-opacity="${dim ? 0.45 : 1}"/>` : '') +
      '</svg>'
    return <Svg source={source} alt={`${Math.round(pct)}%`} width={w} height={tall} />
  }
  const full = Math.round(share * cells)
  return (
    <Text>
      <Text color={fill} dimColor={dim}>
        {'━'.repeat(full)}
      </Text>
      <Text dimColor>{'━'.repeat(cells - full)}</Text>
    </Text>
  )
}

const SPARK = '▁▂▃▄▅▆▇█'

function steps(turns: number[]) {
  const d: number[] = []
  for (let i = 1; i < turns.length; i++) d.push(Math.max(0, (turns[i] ?? 0) - (turns[i - 1] ?? 0)))
  return d
}

// What each of the last turns added to the context, as small columns.
function spark(kit: Kit, turns: number[], fill: string) {
  const { Svg, Text } = kit
  const d = steps(turns)
  const max = Math.max(1, ...d)
  if (Svg) {
    const tall = 16
    const cols = d
      .map((x, i) => {
        const bh = Math.max(2, Math.round((x / max) * tall))
        return `<rect x="${i * 7}" y="${tall - bh}" width="5" height="${bh}" rx="1" fill="${fill}"/>`
      })
      .join('')
    const w = Math.max(7, d.length * 7)
    return (
      <Svg
        source={`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${tall}" viewBox="0 0 ${w} ${tall}">${cols}</svg>`}
        alt="What the last turns added"
        width={w}
        height={tall}
      />
    )
  }
  return <Text color={fill}>{d.map(x => SPARK[Math.min(7, Math.floor((x / max) * 7.99))]).join('')}</Text>
}

// The warning line for the context of this session, or undefined below the yellow level.
export function contextMessage(v: View) {
  const c = v.context
  if (!c || c.toCompact === undefined) return undefined
  const level = contextLevel(v.settings, c.toCompact)
  if (level === 2) return { level, text: `${c.toCompact}% to compaction: start a new session` }
  if (level === 1) return { level, text: `${c.toCompact}% to compaction: finish the task and update your session notes` }
  return undefined
}

function redOther(v: View) {
  return v.others.filter(o => contextLevel(v.settings, o.toCompact) === 2).sort((a, b) => b.toCompact - a.toCompact)[0]
}

// The line for Close session / Start session: progress while it runs, then the result.
export function routineLine(v: View) {
  const r = v.routine
  if (!r) return undefined
  const s = v.settings
  const name = r.task === 'close' ? 'Closing session' : 'Preparing session'
  const pct = Math.round((Math.min(r.step, r.total) / Math.max(1, r.total)) * 100)
  switch (r.status) {
    case 'queued':
      return { color: s.colorWarn, pct: undefined, text: `${name}: waiting for Claude to finish the current reply…` }
    case 'running':
      return {
        color: s.colorWarn,
        pct,
        text: `${name}… step ${r.step} of ${r.total} · ${pct}%${r.note ? ` · ${r.note}` : ''}`,
      }
    case 'done':
      return {
        color: s.colorOk,
        pct: undefined,
        text: r.task === 'close' ? "✓ Now it's safe to end this session" : '✓ Everything is ready to start this session',
      }
    case 'failed':
      return {
        // Red when closing is not safe: data can be lost
        color: r.task === 'close' ? s.colorDanger : s.colorWarn,
        pct: undefined,
        text: `${r.task === 'close' ? "It's NOT safe to close this session" : 'Not ready to start'}: ${r.reason ?? "see Claude's reply"}`,
      }
    case 'stopped':
      return {
        color: s.colorWarn,
        pct: undefined,
        text: `${r.task === 'close' ? 'Close session' : 'Start session'} ${r.reason ?? 'stopped'}: check Claude's reply`,
      }
  }
}

// ---------- the band above the prompt ----------

export function band(kit: Kit, v: View, columns: number, act: Actions) {
  const { Box, Text, Button } = kit
  const s = v.settings
  const stale = isStale(v)
  const wide = columns >= 96
  const mid = columns >= 70
  const cells = wide ? 8 : 5

  const gauge = (key: string, label: string, short: string, pct: number | undefined, level: number, tail: string) => {
    // Limits dim when their figures are old; Compress dims on the off beat of the blink at red.
    const old = key === 'ctx' ? v.blinkOff : stale
    return (
      <Box key={key} flexDirection="row" alignItems="center" gap={1} marginRight={2}>
        <Text dimColor>{mid ? label : short}</Text>
        {pct === undefined ? (
          <Text dimColor>–</Text>
        ) : (
          <Box flexDirection="row" alignItems="center" gap={1}>
            {mid && meter(kit, pct, color(s, level), cells, wide ? 44 : 32, old)}
            <Text color={color(s, level)} bold={level > 0} dimColor={old}>
              {Math.round(pct)}%
            </Text>
            {tail !== '' && <Text dimColor>{tail}</Text>}
          </Box>
        )}
      </Box>
    )
  }

  const five = windowOf(v, 'five_hour')
  const week = windowOf(v, 'seven_day')
  const reset = (w: Window | undefined) => {
    const t = resetMs(w)
    return wide && t !== undefined ? `↻${duration(t - v.now)}` : ''
  }
  const c = v.context
  const left = turnsLeft(c, v.turns)
  const ctxPct = c?.toCompact

  const notes: { key: string; level: number; text: string }[] = []
  for (const [w, name] of [
    [five, '5h'],
    [week, 'Week'],
  ] as const) {
    const t = hitsFullIn(w, v.now)
    if (t !== undefined) notes.push({ key: `pace-${name}`, level: 1, text: `${name}: 100% in ${duration(t)}` })
  }
  if (stale) notes.push({ key: 'stale', level: 0, text: `limits updated ${duration(v.now - v.limitsAt)} ago` })
  const other = redOther(v)
  if (other) notes.push({ key: 'other', level: 2, text: `other: ${other.folder} ${other.toCompact}%` })
  const warning = contextMessage(v)
  const routineRow = routineLine(v)
  // While Close / Start session runs, its own line replaces the warning and its buttons.
  const busy = v.routine?.status === 'queued' || v.routine?.status === 'running' || v.routine?.status === 'done'

  return (
    <Box flexDirection="column">
      {/* Details keeps a fixed place at the left: at the right it sat next to the engine's [-],
          which folds the band away on a click. The gauges wrap inside their own area. */}
      <Box flexDirection="row" alignItems="center">
        <Box flexShrink={0} marginRight={2}>
          <Button key="open" label={mid ? 'Details' : '…'} onPress={act.open} />
        </Box>
        {v.robot && (
          <Box flexShrink={0} marginRight={2}>
            {robot(kit, v.robot.state, v.robot.n, v.robot.state === 'happy' ? s.colorOk : color(s, contextLevel(s, ctxPct ?? 0)), s.blink)}
          </Box>
        )}
        <Box flexDirection="row" flexWrap="wrap" flexGrow={1} flexShrink={1}>
          {gauge('five', 'Session', 'S', five?.percentUsed, limitLevel(s, five?.percentUsed ?? 0), reset(five))}
          {gauge('week', 'Week', 'W', week?.percentUsed, limitLevel(s, week?.percentUsed ?? 0), reset(week))}
          {gauge(
            'ctx',
            'Compress',
            'C',
            ctxPct,
            contextLevel(s, ctxPct ?? 0),
            wide && left !== undefined && left <= 30
              ? left === 0
                ? 'next turn'
                : `~${left} turns`
              : c?.basis === 'window' && mid
                ? 'of window'
                : '',
          )}
          {notes.map(n => (
            <Text color={n.level > 0 ? color(s, n.level) : undefined} dimColor={n.level === 0}>
              · {n.text}{' '}
            </Text>
          ))}
        </Box>
      </Box>
      {/* A full button is taller than a line of text: each row below keeps a gap above it. */}
      {routineRow && (
        <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1} marginTop={1}>
          {routineRow.pct !== undefined && meter(kit, routineRow.pct, routineRow.color, cells, wide ? 56 : 40)}
          <Text color={routineRow.color} bold>
            {routineRow.text}
          </Text>
        </Box>
      )}
      {warning && !busy && (
        <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1} marginTop={1}>
          <Text color={color(s, warning.level)} bold dimColor={warning.level === 2 && v.blinkOff}>
            {warning.level === 2 ? '■ ' : '▲ '}
            {warning.text}
          </Text>
          {warning.level === 2 ? (
            <Button key="close" label="Close session" variant="primary" onPress={act.close} />
          ) : (
            <Button key="notes" label="Write session notes" variant="primary" onPress={act.notes} />
          )}
          {warning.level === 2 && <Button key="compact" label="Compact" onPress={act.compact} />}
        </Box>
      )}
      {!warning && !v.routine && !v.prompted && (
        <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1} marginTop={1}>
          <Text dimColor>New session:</Text>
          <Button key="start" label="Start session" variant="primary" onPress={act.start} />
        </Box>
      )}
    </Box>
  )
}

// ---------- the pane: /meter ----------

export function pane(kit: Kit, v: View, columns: number, act: Actions) {
  const { Box, Text, Button } = kit
  const s = v.settings
  const stale = isStale(v)
  const cells = Math.max(10, Math.min(30, columns - 26))
  const px = Math.max(120, Math.min(260, (columns - 12) * 7))

  const limit = (kind: string, title: string) => {
    const w = windowOf(v, kind)
    if (!w) {
      return (
        <Box key={kind} flexDirection="column" marginBottom={1}>
          <Text bold>{title}</Text>
          <Text dimColor>No figure yet: it comes with Claude's next reply.</Text>
        </Box>
      )
    }
    const level = limitLevel(s, w.percentUsed)
    const t = resetMs(w)
    const full = hitsFullIn(w, v.now)
    return (
      <Box key={kind} flexDirection="column" marginBottom={1}>
        <Text bold>{title}</Text>
        <Box flexDirection="row" alignItems="center" gap={1}>
          {meter(kit, w.percentUsed, color(s, level), cells, px, stale)}
          <Text color={color(s, level)} bold dimColor={stale}>
            {Math.round(w.percentUsed)}%
          </Text>
        </Box>
        {t !== undefined && (
          <Text dimColor>
            Resets {day(t, v.now)}, in {duration(t - v.now)}
          </Text>
        )}
        {full !== undefined ? (
          <Text color={s.colorWarn}>At this pace: 100% in {duration(full)}, before the reset</Text>
        ) : (
          <Text dimColor>At this pace the reset comes first</Text>
        )}
      </Box>
    )
  }

  const c = v.context
  const left = turnsLeft(c, v.turns)
  const warning = contextMessage(v)
  const routineRow = routineLine(v)
  const level = contextLevel(s, c?.toCompact ?? 0)
  const others = [...v.others].sort((a, b) => b.lastSeen - a.lastSeen)

  return (
    <Box flexDirection="column">
      {limit('five_hour', 'Session (5-hour limit)')}
      {limit('seven_day', 'Week (weekly limit)')}
      <Text dimColor={!stale} color={stale ? s.colorWarn : undefined}>
        {v.limitsAt > 0
          ? `Limits updated ${duration(v.now - v.limitsAt)} ago${stale ? ': old figures, Claude Code reports new ones with its next reply' : ''}`
          : 'No limits reported yet'}
      </Text>

      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        <Text bold>Compress (this session's context)</Text>
        {c?.toCompact === undefined ? (
          <Text dimColor>No figure yet: it comes with Claude's next reply.</Text>
        ) : (
          <Box flexDirection="column">
            <Box flexDirection="row" alignItems="center" gap={1}>
              {meter(kit, c.toCompact, color(s, level), cells, px)}
              <Text color={color(s, level)} bold>
                {c.toCompact}%
              </Text>
              <Text dimColor>{c.basis === 'window' ? 'of the window' : 'to compaction'}</Text>
            </Box>
            {c.tokens !== undefined && (
              <Text dimColor>
                {tokens(c.tokens)} tokens
                {c.point ? ` of ${tokens(c.point)} (compaction point)` : ''}
                {c.window ? ` · window ${tokens(c.window)}` : ''}
              </Text>
            )}
            {v.turns.length >= 2 && (
              <Box flexDirection="row" alignItems="center" gap={1}>
                <Text dimColor>Last turns</Text>
                {spark(kit, v.turns, color(s, level))}
                {left !== undefined && (
                  <Text dimColor>
                    {left === 0
                      ? 'the next turn like these will reach compaction'
                      : `about ${left} more turns like these before compaction`}
                  </Text>
                )}
              </Box>
            )}
            <Text dimColor>
              {v.compactions > 0
                ? `Compacted ${v.compactions}× in this session, last at ${clock(v.compactedAt)}`
                : 'Not compacted yet in this session'}
              {v.cost !== null ? `  ·  cost so far $${v.cost.toFixed(2)} (API prices)` : ''}
            </Text>
          </Box>
        )}
      </Box>

      {warning && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={color(s, warning.level)} bold>
            {warning.text}
          </Text>
          <Text dimColor>
            {warning.level === 2
              ? 'After compaction Claude keeps only a summary of the older conversation. Write down what matters, then start a new session.'
              : 'Write down what was done, the decisions and the next steps, so a new session can continue.'}
          </Text>
        </Box>
      )}

      {routineRow && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>{v.routine?.task === 'close' ? 'Close session' : 'Start session'}</Text>
          {routineRow.pct !== undefined && meter(kit, routineRow.pct, routineRow.color, cells, px)}
          <Text color={routineRow.color} bold>
            {routineRow.text}
          </Text>
        </Box>
      )}

      <Text bold>Session</Text>
      <Box flexDirection="row" flexWrap="wrap" gap={1} marginBottom={1}>
        <Button key="close" label="Close session" hotkey="e" variant="primary" onPress={act.close} />
        <Button key="start" label="Start session" hotkey="s" onPress={act.start} />
        <Button key="notes" label="Write session notes" hotkey="n" onPress={act.notes} />
        <Button key="compact" label="Compact" hotkey="c" onPress={act.compact} />
        <Button key="hide" label="Hide the band" hotkey="h" onPress={act.hide} />
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>
          Close session checks and updates CLAUDE.md, MEMORY.md and the session notes, then says when it is safe to
          close. Start session reads them (or creates them in a new project) and picks up where the last session stopped.
        </Text>
      </Box>

      <Text bold>Other sessions on this PC</Text>
      {others.length === 0 && <Text dimColor>None live.</Text>}
      {others.slice(0, 8).map(o => {
        const l = contextLevel(s, o.toCompact)
        return (
          <Text>
            <Text color={color(s, l)} bold={l > 0}>
              {String(o.toCompact).padStart(3)}%
            </Text>{' '}
            {o.folder}
            <Text dimColor> · {duration(v.now - o.lastSeen)} ago</Text>
          </Text>
        )
      })}

      <Box marginTop={1}>
        <Text dimColor>
          Levels: limits {s.warn1}/{s.warn2}%, context {s.sessLevel1}/{s.sessLevel2}%.{' '}
          {s.source === 'strip' ? "Change them in the AI Usage Meter strip's Settings." : 'Change them in /config.'}
        </Text>
      </Box>
      <Text dimColor>AI Usage Meter mod {VERSION} · Hans Tandt · hanstandt.be</Text>
    </Box>
  )
}
