import type { Elements } from 'claude-code'

import type { ContextInfo, MeterSettings, OtherSession, Routine, SettingRow, Window } from '../types'
import { robot, type RobotModel, type RobotState } from './robot'
import { haikuShare, totalTokens, type ModelTokens } from './reader'
import { LANG_NAMES, toLang, tr, type Strings } from './i18n'

// What the band and the pane draw. Pure functions of plain data: every surface (terminal, desktop) gets the same tree.

// Shown on the last line of the pane. Raise it together with the version in plugin.json.
export const VERSION = '2.1.0'

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
  robot: { state: RobotState; n: number; model: RobotModel; effort: number; px: number } | null // null: switched off in /config
  modelName: string | null // the model and effort as Claude Code reports them (for the pane)
  cache: { on: boolean; minutes: number; lastAt: number; warming: boolean } // the cache clock
  reader: {
    on: boolean
    open: boolean // its details are open in the pane
    mode: 'search' | 'summary'
    threshold: number
    session: ModelTokens // tokens per model family, this session
    runs: number
    week: { tokens: ModelTokens; runs: number } | null // all sessions, this weekly window
    helpersMoved: number // Explore helpers started on Haiku
  }
  config: { open: boolean; rows: SettingRow[] } // the pane's Settings section: the mod's own /config rows
  html: { offer: { name: string; update: boolean } | null } // an HTML version on offer (hooks/html.ts)
}

export type Actions = {
  notes: () => void
  compact: () => void
  hide: () => void
  open: () => void
  close: () => void
  start: () => void
  reader: () => void
  readerInfo: () => void
  warm: () => void
  settings: () => void // opens or closes the Settings section
  setting: (key: string, value: boolean | string | number) => void // changes one of the mod's settings
  htmlYes: () => void // make the HTML version on offer
  htmlNo: () => void // not now
}

export const DEFAULTS: MeterSettings = {
  source: 'config',
  warn1: 80,
  warn2: 95,
  sessLevel1: 80,
  sessLevel2: 90,
  tokenYellow: 0,
  tokenRed: 0,
  notify: true,
  notifyReset: true,
  notifyCompaction: true,
  blink: true,
  staleMinutes: 60,
  colorOk: '#3FB950',
  colorWarn: '#F0883E',
  colorDanger: '#F85149',
  lang: 'en',
}

const HOUR = 3600000
const LENGTH: Record<string, number> = { five_hour: 5 * HOUR, seven_day: 7 * 24 * HOUR }

// ---------- figures ----------

export function limitLevel(s: MeterSettings, pct: number) {
  return pct >= s.warn2 ? 2 : pct >= s.warn1 ? 1 : 0
}

// The context level: from the % of the compaction point, or from a token number when one is set (a 1M
// window reaches 80 % only near 775,000 tokens); the higher of the two.
export function contextLevel(s: MeterSettings, pct: number, used?: number) {
  const byPct = pct >= s.sessLevel2 ? 2 : pct >= s.sessLevel1 ? 1 : 0
  return Math.max(byPct, tokenLevel(s, used))
}

export function tokenLevel(s: MeterSettings, used?: number) {
  if (used === undefined) return 0
  return s.tokenRed > 0 && used >= s.tokenRed ? 2 : s.tokenYellow > 0 && used >= s.tokenYellow ? 1 : 0
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

export function duration(ms: number, u: Strings['units'] = { m: 'm', h: 'h', d: 'd' }) {
  const m = Math.max(0, Math.round(ms / 60000))
  if (m < 60) return `${m}${u.m}`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}${u.h} ${String(m % 60).padStart(2, '0')}${u.m}`
  return `${Math.floor(h / 24)}${u.d} ${h % 24}${u.h}`
}

// The texts in the chosen language (setting Language), and a duration in its units.
function texts(v: View) {
  const L = tr(toLang(v.settings.lang))
  return { L, d: (ms: number) => duration(ms, L.units) }
}

function clock(t: number) {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function day(t: number, now: number, days: readonly string[]) {
  const d = new Date(t)
  if (t - now < 20 * HOUR) return clock(t)
  return `${days[d.getDay()]} ${clock(t)}`
}

function tokens(n: number) {
  return n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
}

// How long the conversation's cache stays warm: from the last reply, the cache period (1 hour on a Claude
// plan, 5 minutes with an API key). undefined before the first reply or with the clock off.
export function cacheLeft(v: View) {
  if (!v.cache.on || !v.cache.lastAt) return undefined
  return v.cache.minutes * 60000 - (v.now - v.cache.lastAt)
}

// The cache clock in the pane: one line, with Keep warm while it is still warm.
function cacheSection(kit: Kit, v: View, act: Actions) {
  const { Box, Text, Button } = kit
  const left = cacheLeft(v)
  if (left === undefined) return null
  const s = v.settings
  const { L, d } = texts(v)
  const ctx = v.context?.tokens
  const size = ctx ? L.tokens(tokens(ctx)) : L.conversation
  return (
    <Box key="cache" flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1}>
        <Text bold>{L.cacheHeader}</Text>
        {left > 0 ? (
          <Text color={left < 5 * 60000 ? s.colorWarn : undefined}>{L.warmFor(d(left))}</Text>
        ) : (
          <Text dimColor>{L.cold}</Text>
        )}
        {left > 0 && <Button key="warm" label={v.cache.warming ? 'Warming…' : 'Keep warm'} onPress={act.warm} />}
      </Box>
      <Text dimColor>
        {left > 0
          ? L.warmHelp(size)
          : L.coldHelp(size)}
      </Text>
    </Box>
  )
}

// The Haiku reader in the pane: one line (switch, Haiku's share of this session's tokens, Details); the
// details (tokens per model this session and this week, runs, mode) open with a click.
function readerSection(kit: Kit, v: View, act: Actions) {
  const { Box, Text, Button } = kit
  const r = v.reader
  const { L } = texts(v)
  const week = r.week?.tokens
  const share = totalTokens(r.session) > 0 ? L.share(haikuShare(r.session), r.runs) : L.noTokens
  const families = (['opus', 'sonnet', 'haiku', 'fable', 'other'] as const).filter(m => r.session[m] > 0 || (week?.[m] ?? 0) > 0)
  const NAMES = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', fable: 'Fable', other: L.otherModel }
  const row = (label: string, a: string, b: string) => (
    <Text>
      {label.padEnd(13)}
      {a.padStart(9)}
      {b.padStart(11)}
    </Text>
  )
  return (
    <Box key="reader" flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1}>
        <Text bold>{L.readerHeader}</Text>
        <Button key="reader" label={r.on ? 'On' : 'Off'} onPress={act.reader} />
        <Text dimColor>{share}</Text>
        <Button key="readerInfo" label={r.open ? 'Hide' : 'Details'} onPress={act.readerInfo} />
      </Box>
      {r.open && (
        <Box flexDirection="column" marginTop={1}>
          {row(L.tokensRow, L.sessionCol, L.weekCol)}
          {families.map(m => row(NAMES[m], tokens(r.session[m]), week ? tokens(week[m]) : '–'))}
          {row(L.shareRow, `${haikuShare(r.session)} %`, week ? `${haikuShare(week)} %` : '–')}
          {row(L.runsRow, String(r.runs), r.week ? String(r.week.runs) : '–')}
          {r.helpersMoved > 0 && <Text dimColor>{L.helpersMoved(r.helpersMoved)}</Text>}
          <Text dimColor>
            {r.mode === 'summary' ? L.modeSummary : L.modeSearch} {L.readerWhen(tokens(r.threshold))}
          </Text>
          <Text dimColor>{L.readerShareNote}</Text>
        </Box>
      )}
    </Box>
  )
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
  const level = contextLevel(v.settings, c.toCompact, c.tokens)
  const { L } = texts(v)
  // Say what set it off: the token number, or the % of the compaction point
  const what = tokenLevel(v.settings, c.tokens) === level && c.tokens !== undefined ? L.tokensWhat(tokens(c.tokens)) : L.toCompaction(c.toCompact)
  if (level === 2) return { level, text: `${what}${L.colon}${L.startNew}` }
  if (level === 1) return { level, text: `${what}${L.colon}${L.finishTask}` }
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
  const { L } = texts(v)
  const name = r.task === 'close' ? L.closing : L.preparing
  const pct = Math.round((Math.min(r.step, r.total) / Math.max(1, r.total)) * 100)
  switch (r.status) {
    case 'queued':
      return { color: s.colorWarn, pct: undefined, text: L.waiting(name) }
    case 'running':
      return {
        color: s.colorWarn,
        pct,
        text: L.step(name, r.step, r.total, pct, r.note),
      }
    case 'done':
      return {
        color: s.colorOk,
        pct: undefined,
        text: r.task === 'close' ? L.safeToEnd : L.readyToStart,
      }
    case 'failed':
      return {
        // Red when closing is not safe: data can be lost
        color: r.task === 'close' ? s.colorDanger : s.colorWarn,
        pct: undefined,
        text: `${r.task === 'close' ? L.notSafe : L.notReady}${L.colon}${r.reason ?? L.seeReply}`,
      }
    case 'stopped':
      return {
        color: s.colorWarn,
        pct: undefined,
        text: L.stoppedLine(r.task === 'close' ? 'Close session' : 'Start session', r.reason ?? L.stoppedAt(r.step, r.total)),
      }
  }
}

// ---------- the band above the prompt ----------

export function band(kit: Kit, v: View, columns: number, act: Actions) {
  const { Box, Text, Button } = kit
  const s = v.settings
  const { L, d } = texts(v)
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
    return wide && t !== undefined ? `↻${d(t - v.now)}` : ''
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
    if (t !== undefined) notes.push({ key: `pace-${name}`, level: 1, text: L.hundredIn(name, d(t)) })
  }
  if (stale) notes.push({ key: 'stale', level: 0, text: L.limitsUpdated(d(v.now - v.limitsAt)) })
  if (v.reader.on && totalTokens(v.reader.session) > 0) notes.push({ key: 'haiku', level: 0, text: `Haiku ${haikuShare(v.reader.session)} %` })
  // The cache clock: minutes left, orange in the last 5; "cache cold" once it ran out
  const cacheMs = cacheLeft(v)
  if (cacheMs !== undefined) notes.push(cacheMs > 0 ? { key: 'cache', level: cacheMs < 5 * 60000 ? 1 : 0, text: L.cacheNote(d(cacheMs)) } : { key: 'cache', level: 0, text: L.cacheCold })
  const other = redOther(v)
  if (other) notes.push({ key: 'other', level: 2, text: L.other(other.folder, other.toCompact) })
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
            {robot(
              kit,
              v.robot.state,
              v.robot.n,
              v.robot.state === 'happy' ? s.colorOk : color(s, contextLevel(s, ctxPct ?? 0, c?.tokens)),
              { model: v.robot.model, effort: v.robot.effort, blink: s.blink },
              v.robot.px,
            )}
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
            contextLevel(s, ctxPct ?? 0, c?.tokens),
            wide && left !== undefined && left <= 30
              ? left === 0
                ? L.nextTurn
                : L.turnsShort(left)
              : c?.basis === 'window' && mid
                ? L.ofWindowShort
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
      {!warning && !v.routine && v.html.offer && (
        <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1} marginTop={1}>
          <Text dimColor>{L.htmlOffer(v.html.offer.name, v.html.offer.update)}</Text>
          <Button key="htmlYes" label={v.html.offer.update ? 'Update it' : 'Make it'} variant="primary" onPress={act.htmlYes} />
          <Button key="htmlNo" label="No" onPress={act.htmlNo} />
        </Box>
      )}
      {!warning && !v.routine && !v.prompted && (
        <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1} marginTop={1}>
          <Text dimColor>{L.newSession}</Text>
          <Button key="start" label="Start session" variant="primary" onPress={act.start} />
        </Box>
      )}
    </Box>
  )
}

// ---------- the pane: /meter ----------

// The values the − and + buttons step through, per setting; a number not in the list moves to the nearest one.
const STEPS: Record<string, readonly number[]> = {
  warn1: [50, 60, 70, 75, 80, 85, 90, 95, 99],
  warn2: [60, 70, 80, 85, 90, 95, 99, 100],
  sessLevel1: [50, 60, 70, 75, 80, 85, 90],
  sessLevel2: [60, 70, 80, 85, 90, 95],
  tokenYellow: [0, 100000, 150000, 200000, 250000, 300000, 400000, 500000, 750000],
  tokenRed: [0, 150000, 200000, 250000, 300000, 350000, 400000, 500000, 750000, 900000],
  cacheMinutes: [5, 60],
  readerThreshold: [1000, 2000, 5000, 10000],
  robotSize: [2, 3, 4],
  staleMinutes: [15, 30, 60, 120, 240],
}

export function stepSetting(field: string, value: number, dir: 1 | -1): number {
  const list = STEPS[field]
  if (!list) return Math.max(0, value + dir)
  if (dir > 0) return list.find(x => x > value) ?? list[list.length - 1] ?? value
  return [...list].reverse().find(x => x < value) ?? list[0] ?? value
}

function settingValue(field: string, value: SettingRow['value'], L: Strings) {
  if (typeof value === 'boolean') return value ? 'On' : 'Off' // a button label: English, like every button
  if (field === 'language') return LANG_NAMES[toLang(value)]
  if (typeof value !== 'number') return String(value)
  if (field === 'tokenYellow' || field === 'tokenRed') return value === 0 ? L.off : L.tokensN(tokens(value))
  if (field === 'readerThreshold') return L.tokensN(tokens(value))
  if (field === 'cacheMinutes' || field === 'staleMinutes') return L.minutes(value)
  if (field === 'robotSize') return L.sizes[value] ?? String(value)
  return field.startsWith('warn') || field.startsWith('sessLevel') ? `${value} %` : String(value)
}

// The pane's Settings section: the mod's own settings with buttons, so they can be changed in the desktop app,
// where /config opens the app's Settings window instead of Claude Code's menu.
function settingsSection(kit: Kit, v: View, act: Actions) {
  const { Box, Text, Button } = kit
  const rows = v.config.rows
  const { L } = texts(v)
  return (
    <Box key="settingsSection" flexDirection="column" marginTop={1}>
      <Text bold>{L.settingsHeader}</Text>
      {rows.length === 0 && <Text dimColor>{L.settingsUnread}</Text>}
      {rows.map(r => {
        const shown = settingValue(r.field, r.value, L)
        let controls
        if (r.isLocked) controls = <Text dimColor>{L.locked(shown)}</Text>
        else if (r.kind === 'boolean')
          controls = <Button key={`set:${r.field}`} label={shown} onPress={() => act.setting(r.key, !r.value)} />
        else if (r.kind === 'choice' && r.options && r.options.length > 0) {
          const opts = r.options
          const next = opts[(opts.indexOf(String(r.value)) + 1) % opts.length] ?? String(r.value)
          controls = <Button key={`set:${r.field}`} label={shown} onPress={() => act.setting(r.key, next)} />
        } else if (r.kind === 'number' && typeof r.value === 'number') {
          const n = r.value
          controls = (
            <Box flexDirection="row" alignItems="center" gap={1}>
              <Button key={`dec:${r.field}`} label="−" onPress={() => act.setting(r.key, stepSetting(r.field, n, -1))} />
              <Text>{shown}</Text>
              <Button key={`inc:${r.field}`} label="+" onPress={() => act.setting(r.key, stepSetting(r.field, n, 1))} />
            </Box>
          )
        } else controls = <Text dimColor>{shown}</Text>
        return (
          <Box key={`row:${r.field}`} flexDirection="row" flexWrap="wrap" alignItems="center" gap={1}>
            <Text>{L.labels[r.field] ?? r.label}</Text>
            {controls}
          </Box>
        )
      })}
      <Text dimColor>
        {L.settingsFoot}
        {v.settings.source === 'strip' ? L.settingsStrip : ''}
      </Text>
    </Box>
  )
}

export function pane(kit: Kit, v: View, columns: number, act: Actions) {
  const { Box, Text, Button } = kit
  const s = v.settings
  const { L, d } = texts(v)
  const stale = isStale(v)
  const cells = Math.max(10, Math.min(30, columns - 26))
  const px = Math.max(120, Math.min(260, (columns - 12) * 7))

  const limit = (kind: string, title: string) => {
    const w = windowOf(v, kind)
    if (!w) {
      return (
        <Box key={kind} flexDirection="column" marginBottom={1}>
          <Text bold>{title}</Text>
          <Text dimColor>{L.noFigure}</Text>
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
          <Text dimColor>{L.resets(day(t, v.now, L.days), d(t - v.now))}</Text>
        )}
        {full !== undefined ? (
          <Text color={s.colorWarn}>{L.paceFull(d(full))}</Text>
        ) : (
          <Text dimColor>{L.paceOk}</Text>
        )}
      </Box>
    )
  }

  const c = v.context
  const left = turnsLeft(c, v.turns)
  const warning = contextMessage(v)
  const routineRow = routineLine(v)
  const level = contextLevel(s, c?.toCompact ?? 0, c?.tokens)
  const others = [...v.others].sort((a, b) => b.lastSeen - a.lastSeen)

  return (
    <Box flexDirection="column">
      {limit('five_hour', L.sessionTitle)}
      {limit('seven_day', L.weekTitle)}
      <Text dimColor={!stale} color={stale ? s.colorWarn : undefined}>
        {v.limitsAt > 0
          ? L.limitsUpdatedLong(d(v.now - v.limitsAt), stale)
          : L.noLimits}
      </Text>

      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        <Text bold>{L.compressTitle}</Text>
        {c?.toCompact === undefined ? (
          <Text dimColor>{L.noFigure}</Text>
        ) : (
          <Box flexDirection="column">
            <Box flexDirection="row" alignItems="center" gap={1}>
              {meter(kit, c.toCompact, color(s, level), cells, px)}
              <Text color={color(s, level)} bold>
                {c.toCompact}%
              </Text>
              <Text dimColor>{c.basis === 'window' ? L.ofWindow : L.toCompactionShort}</Text>
            </Box>
            {c.tokens !== undefined && (
              <Text dimColor>
                {L.tokensOf(tokens(c.tokens), c.point ? tokens(c.point) : undefined, c.window ? tokens(c.window) : undefined)}
              </Text>
            )}
            {v.turns.length >= 2 && (
              <Box flexDirection="row" alignItems="center" gap={1}>
                <Text dimColor>{L.lastTurns}</Text>
                {spark(kit, v.turns, color(s, level))}
                {left !== undefined && (
                  <Text dimColor>
                    {left === 0 ? L.nextTurnReaches : L.moreTurns(left)}
                  </Text>
                )}
              </Box>
            )}
            <Text dimColor>
              {v.compactions > 0
                ? L.compacted(v.compactions, clock(v.compactedAt))
                : L.notCompacted}
              {v.cost !== null ? L.cost(v.cost.toFixed(2)) : ''}
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
            {warning.level === 2 ? L.warnRedHelp : L.warnYellowHelp}
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

      <Text bold>{L.sessionHeader}</Text>
      <Box flexDirection="row" flexWrap="wrap" gap={1} marginBottom={1}>
        <Button key="close" label="Close session" hotkey="e" variant="primary" onPress={act.close} />
        <Button key="start" label="Start session" hotkey="s" onPress={act.start} />
        <Button key="notes" label="Write session notes" hotkey="n" onPress={act.notes} />
        <Button key="compact" label="Compact" hotkey="c" onPress={act.compact} />
        <Button key="hide" label="Hide the band" hotkey="h" onPress={act.hide} />
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>{L.routineHelp}</Text>
      </Box>

      {cacheSection(kit, v, act)}
      {readerSection(kit, v, act)}

      <Text bold>{L.othersHeader}</Text>
      {others.length === 0 && <Text dimColor>{L.noneLive}</Text>}
      {others.slice(0, 8).map(o => {
        const l = contextLevel(s, o.toCompact)
        return (
          <Text>
            <Text color={color(s, l)} bold={l > 0}>
              {String(o.toCompact).padStart(3)}%
            </Text>{' '}
            {o.folder}
            <Text dimColor>{L.ago(d(v.now - o.lastSeen))}</Text>
          </Text>
        )
      })}

      <Box marginTop={1} flexDirection="row" flexWrap="wrap" alignItems="center" gap={1}>
        <Text dimColor>
          {L.levels(s.warn1, s.warn2, s.sessLevel1, s.sessLevel2)}
          {s.source === 'strip' ? L.stripDecides : ''}
        </Text>
        <Button key="settings" label={v.config.open ? 'Hide settings' : 'Settings'} onPress={act.settings} />
      </Box>
      {v.config.open && settingsSection(kit, v, act)}
      {v.modelName && <Text dimColor>{L.model(v.modelName)}</Text>}
      <Text dimColor>Session Pilot {VERSION} · Hans Tandt · hanstandt.be</Text>
    </Box>
  )
}
