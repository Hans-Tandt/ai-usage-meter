import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, Timer } from 'claude-code'

import type { ContextInfo, MeterSettings, OtherSession, Routine, Window } from '../types'
import { DEFAULTS, band, contextLevel, contextMessage, limitLevel, pane } from './draw'
import type { Actions, Kit, View } from './draw'
import { ROBOT_MS, robotKey, type RobotState } from './robot'
import {
  HEADINGS,
  MARK,
  PROGRESS_TOOL,
  PROGRESS_TOOL_FULL,
  PROMPT_FILES,
  STEPS,
  closePrompt,
  extractPrompt,
  readHandover,
  readOutcome,
  startPrompt,
} from './routine'
import type { RoutineTask } from './routine'

// The AI Usage Meter mod: Session · Week · Compress in a band above the prompt, details in a pane (/meter),
// toasts at the warning levels, and the session-notes warnings.
// It works on its own, and beside the AI Usage Meter strip (the separate Windows program, ../source):
// - it writes the same files as the strip's own add-on: <home>/.claude/usage-meter.json and, per session,
//   <home>/.claude/usage-meter-context/<session id>.json, so every session sees the others;
// - when the strip is installed it uses the strip's settings file (<home>/.claude/usage-meter-settings.json),
//   otherwise its own settings from /config.
// Every write is wrapped: this mod must never break a Claude session.

const PANE = 'ai-usage-meter'

const limits = atom({ plugin: 'ai-usage-meter', key: 'limits' } as const, [])
const limitsAt = atom({ plugin: 'ai-usage-meter', key: 'limitsAt' } as const, 0)
const context = atom({ plugin: 'ai-usage-meter', key: 'context' } as const, null)
const turns = atom({ plugin: 'ai-usage-meter', key: 'turns' } as const, [])
const ctxLevel = atom({ plugin: 'ai-usage-meter', key: 'ctxLevel' } as const, 0)
const compactions = atom({ plugin: 'ai-usage-meter', key: 'compactions' } as const, 0)
const compactedAt = atom({ plugin: 'ai-usage-meter', key: 'compactedAt' } as const, 0)
const cost = atom({ plugin: 'ai-usage-meter', key: 'cost' } as const, null)
const others = atom({ plugin: 'ai-usage-meter', key: 'others' } as const, [])
const now = atom({ plugin: 'ai-usage-meter', key: 'now' } as const, 0)
const settings = atom({ plugin: 'ai-usage-meter', key: 'settings' } as const, DEFAULTS)
const bandHidden = atom({ plugin: 'ai-usage-meter', key: 'bandHidden' } as const, false)
const blinkOff = atom({ plugin: 'ai-usage-meter', key: 'blinkOff' } as const, false)
const routine = atom({ plugin: 'ai-usage-meter', key: 'routine' } as const, null)
const prompted = atom({ plugin: 'ai-usage-meter', key: 'prompted' } as const, false)
const paneOpen = atom({ plugin: 'ai-usage-meter', key: 'paneOpen' } as const, false)
const working = atom({ plugin: 'ai-usage-meter', key: 'working' } as const, false)
const robotView = atom({ plugin: 'ai-usage-meter', key: 'robot' } as const, null)

// The robot's state, most important first: safe to close, red, Claude working, yellow, idle.
async function robotState($: EngineInterface): Promise<RobotState> {
  const r = await read($, routine)
  if (r?.task === 'close' && r.status === 'done') return 'happy'
  const c = await read($, context)
  const level = c?.toCompact !== undefined ? contextLevel(await read($, settings), c.toCompact) : 0
  if (level === 2) return 'red'
  if (await read($, working)) return 'work'
  return level === 1 ? 'yellow' : 'idle'
}

// One timer moves the robot on; it redraws the band only when the picture changes, so an idle
// robot costs a redraw every few seconds (its blink). The happy hop stops after a few seconds.
const HAPPY_TICKS = 34
let robotTimer: Timer | undefined
let robotTicks = 0

async function tickRobot($: EngineInterface) {
  try {
    const state = await robotState($)
    const blink = (await read($, settings)).blink
    const prev = await read($, robotView)
    robotTicks = prev?.state === state ? robotTicks + 1 : 0
    const n = state === 'happy' && robotTicks > HAPPY_TICKS ? 1 : robotTicks
    if (!prev || prev.state !== state || robotKey(state, n, blink) !== robotKey(state, prev.n, blink)) {
      await update($, robotView, () => ({ state, n }))
    }
  } catch {}
}

// `restart` at a session start: a timer from an earlier session in the same process ticks for that one.
async function startRobot($: EngineInterface, on: boolean, restart = false) {
  try {
    if (restart) {
      robotTimer?.cancel()
      robotTimer = undefined
      robotTicks = 0
    }
    if (!on) {
      robotTimer?.cancel()
      robotTimer = undefined
      if ((await read($, robotView)) !== null) await update($, robotView, () => null)
      return
    }
    if (!robotTimer) {
      await tickRobot($)
      robotTimer = $.clock.every(ROBOT_MS, () => void tickRobot($))
    }
  } catch {}
}

async function openPane($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE, title: 'AI Usage Meter' })
  if (opened.isPlaced) await update($, paneOpen, () => true)
  return opened
}

// The band's Details button: opens the pane, and closes it again when it is open.
async function togglePane($: EngineInterface) {
  if (await read($, paneOpen)) {
    await $.ui.close({ id: PANE })
    await update($, paneOpen, () => false)
  } else {
    await scan($)
    await openPane($)
  }
}

// ---------- Close session / Start session ----------

async function handoverKey($: EngineInterface) {
  return `handover:${(await $.session.cwd()).toLowerCase()}`
}

// Sends Hans's prompt (from the mod's own prompts folder) with the mod's lines; the band follows its progress.
async function runRoutine($: EngineInterface, task: RoutineTask) {
  const now = await read($, routine)
  if (now && (now.status === 'queued' || now.status === 'running')) {
    $.ui.toast('AI Usage Meter: a Close session or Start session is already running.')
    return
  }
  let template: string | undefined
  try {
    template = extractPrompt(await $.fs.read(`${$.plugin.root}/${PROMPT_FILES[task]}`), HEADINGS[task])
  } catch {}
  if (!template) {
    $.ui.toast(`AI Usage Meter: the prompt file ${PROMPT_FILES[task]} is missing or has no prompt block.`)
    return
  }
  const folder = await $.session.cwd()
  let text: string
  if (task === 'close') {
    text = closePrompt(template, folder)
  } else {
    const handover = (await $.store.get(await handoverKey($))) as string | undefined
    text = startPrompt(template, folder, handover)
  }
  await update($, routine, (): Routine => ({ task, status: 'queued', step: 0, total: STEPS[task] }))
  try {
    // The mod's own hooks don't see a prompt it submits: note the turn here
    await update($, working, () => true)
    await $.prompt.submit({ text, asUser: true })
  } catch {
    await update($, working, () => false)
    await update($, routine, () => null)
    $.ui.toast('AI Usage Meter: Claude Code did not take the prompt. Try again when Claude is idle.')
  }
}

// The end of the routine's turn: read the status line, keep the hand-over for the next Start session.
async function finishRoutine($: EngineInterface, answer: string) {
  const r = await read($, routine)
  if (!r || (r.status !== 'queued' && r.status !== 'running')) return
  const outcome = readOutcome(r.task, answer)
  if (!outcome && r.status === 'queued' && !answer.includes(MARK)) return // another turn ended first
  if (r.task === 'close') {
    const handover = readHandover(answer)
    if (handover) await $.store.set(await handoverKey($), handover)
  } else if (outcome?.ok) {
    await $.store.delete(await handoverKey($))
  }
  let next: Routine
  if (!outcome) next = { ...r, status: 'stopped', reason: `stopped at step ${r.step} of ${r.total}` }
  else if (outcome.ok) next = { ...r, status: 'done', step: r.total }
  else next = { ...r, status: 'failed', reason: outcome.reason }
  await update($, routine, () => next)
  const what = r.task === 'close' ? 'Close session' : 'Start session'
  $.ui.toast(
    next.status === 'done'
      ? `AI Usage Meter: ${r.task === 'close' ? "now it's safe to end this session" : 'everything is ready to start this session'}.`
      : `AI Usage Meter: ${what}: ${next.reason ?? 'not finished'}. Check Claude's reply.`,
    { timeoutMs: 10000 },
  )
}

// The blink at red: one timer flips blinkOff while the context is red and Blink is on.
const BLINK_MS = 600
let blinkTimer: Timer | undefined

async function syncBlink($: EngineInterface) {
  try {
    const s = await read($, settings)
    const c = await read($, context)
    const red = c?.toCompact !== undefined && contextLevel(s, c.toCompact) === 2
    if (red && s.blink) {
      blinkTimer ??= $.clock.every(BLINK_MS, () => void update($, blinkOff, b => !b))
      return
    }
    blinkTimer?.cancel()
    blinkTimer = undefined
    if (await read($, blinkOff)) await update($, blinkOff, () => false)
  } catch {}
}

const NOTES_PROMPT =
  'Update the session notes for this project now (Session_Notes.md, or the notes file this project uses): ' +
  'what was done in this session, the decisions and the reasons for them, the paths and rules that matter, ' +
  'what is still open and the next steps, so that a new session can continue from the notes alone.'

const QUIET_MS = 12 * 3600000 // the strip's rule: a session quiet for 12 hours is no longer live

async function homeDir($: EngineInterface) {
  return (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
}

async function readJson<T>($: EngineInterface, path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await $.fs.read(path)) as T
  } catch {
    return undefined
  }
}

// An empty list (a session before its first reply) leaves the last real figures in place, unless `force`.
async function ingest($: EngineInterface, list: Window[], force = false) {
  try {
    const at = await $.clock.now()
    if (list.length === 0 && !force) return
    if (list.length > 0) {
      await update($, limits, () => list)
      await update($, limitsAt, () => at)
      await checkLimits($, list)
    } else {
      await update($, limits, () => [])
    }
    const home = await homeDir($)
    if (!home) return
    await $.fs.write(
      `${home}/.claude/usage-meter.json`,
      JSON.stringify({ updatedAt: new Date(at).toISOString(), windows: list }),
    )
  } catch {}
}

// Merges `patch` into the session's context file, keeping the fields it doesn't name.
async function patchContext($: EngineInterface, sessionId: string, patch: Partial<ContextInfo>) {
  try {
    const home = await homeDir($)
    if (!home) return
    const path = `${home}/.claude/usage-meter-context/${sessionId}.json`
    const current = (await readJson<Partial<ContextInfo>>($, path)) ?? {}
    await $.fs.write(path, JSON.stringify({ ...current, ...patch, sessionId }))
  } catch {}
}

// How full the context window is, against the point where auto-compaction starts.
async function measureContext($: EngineInterface): Promise<Partial<ContextInfo>> {
  const at = new Date(await $.clock.now()).toISOString()
  const cwd = await $.session.cwd()
  const folder = cwd.split(/[\\/]/).filter(p => p.length > 0).pop() ?? cwd
  const usage = await $.session.usage({ breakdown: 'summary' })
  const c = usage.context
  let toCompact: number | undefined
  let point: number | undefined
  const b = c.breakdown
  if (b) {
    point = b.autoCompactThreshold
    if (!point) {
      const buffer = b.categories.find(x => x.kind === 'buffer')
      point = b.rawMaxTokens - (buffer ? buffer.tokens : 0)
    }
    if (point > 0) toCompact = Math.round((b.totalTokens / point) * 100)
    else point = undefined
  }
  return {
    folder,
    percent: c.percent,
    toCompact: toCompact ?? c.percent,
    basis: toCompact !== undefined ? 'compaction' : 'window',
    tokens: c.tokens,
    window: c.window,
    point,
    updatedAt: at,
  }
}

async function recordContext($: EngineInterface) {
  try {
    const id = await $.session.id()
    const measured = await measureContext($)
    await patchContext($, id, measured)
    await update($, context, prev => ({ ...(prev ?? { sessionId: id }), ...measured, sessionId: id }))
    await checkContext($)
  } catch {}
}

// The mod's own settings, from /config (the manifest's userConfig), checked the way the strip checks its own.
function fromOptions(o: PluginOptions): MeterSettings {
  const num = (k: string, d: number, min: number, max: number) => {
    const v = o[k]
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : d
  }
  const flag = (k: string, d: boolean) => {
    const v = o[k]
    return typeof v === 'boolean' ? v : d
  }
  const colour = (k: string, d: string) => {
    const v = o[k]
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : d
  }
  return {
    source: 'config',
    warn1: num('warn1', DEFAULTS.warn1, 1, 100),
    warn2: num('warn2', DEFAULTS.warn2, 1, 100),
    sessLevel1: num('sessLevel1', DEFAULTS.sessLevel1, 1, 100),
    sessLevel2: num('sessLevel2', DEFAULTS.sessLevel2, 1, 100),
    notify: flag('notify', DEFAULTS.notify),
    notifyReset: flag('notifyReset', DEFAULTS.notifyReset),
    notifyCompaction: flag('notifyCompaction', DEFAULTS.notifyCompaction),
    blink: flag('blink', DEFAULTS.blink),
    staleMinutes: num('staleMinutes', DEFAULTS.staleMinutes, 10, 1440),
    colorOk: colour('colorOk', DEFAULTS.colorOk),
    colorWarn: colour('colorWarn', DEFAULTS.colorWarn),
    colorDanger: colour('colorDanger', DEFAULTS.colorDanger),
  }
}

// The strip counts as installed only when its settings file is there: an uninstall can leave
// AIUsageMeter.exe behind, and then the mod must follow /config.
async function stripInstalled($: EngineInterface, home: string | undefined) {
  return home ? await $.fs.exists(`${home}/.claude/usage-meter-settings.json`) : false
}

async function loadSettings($: EngineInterface, options: PluginOptions) {
  try {
    const home = await homeDir($)
    let s: MeterSettings
    if (options.useStripSettings !== false && (await stripInstalled($, home))) {
      const j = home ? await readJson<Partial<MeterSettings>>($, `${home}/.claude/usage-meter-settings.json`) : undefined
      s = { ...DEFAULTS, ...(j ?? {}), source: 'strip' }
    } else {
      s = fromOptions(options)
    }
    if (s.sessLevel1 >= s.sessLevel2) {
      s.sessLevel1 = DEFAULTS.sessLevel1
      s.sessLevel2 = DEFAULTS.sessLevel2
    }
    if (s.warn1 >= s.warn2) {
      s.warn1 = DEFAULTS.warn1
      s.warn2 = DEFAULTS.warn2
    }
    const old = await read($, settings)
    if (JSON.stringify(old) !== JSON.stringify(s)) await update($, settings, () => s)
  } catch {}
}

// The other live sessions on this PC, from their context files; also picks up newer limits another session wrote.
async function scan($: EngineInterface) {
  try {
    const home = await homeDir($)
    if (!home) return
    const at = await $.clock.now()
    await update($, now, () => at)
    const own = await $.session.id()
    const dir = `${home}/.claude/usage-meter-context`
    const found: OtherSession[] = []
    if (await $.fs.exists(dir)) {
      for (const f of await $.fs.list(dir)) {
        if (f.kind !== 'file' || !f.name.endsWith('.json')) continue
        const info = await readJson<ContextInfo>($, `${dir}/${f.name}`)
        if (!info || info.ended || info.sessionId === own || info.toCompact === undefined) continue
        const seen = Math.max(Date.parse(info.updatedAt ?? '') || 0, Date.parse(info.lastActiveAt ?? '') || 0)
        if (at - seen > QUIET_MS) continue
        found.push({ id: info.sessionId, folder: info.folder ?? info.sessionId, toCompact: info.toCompact, lastSeen: seen })
      }
    }
    const before = await read($, others)
    if (JSON.stringify(before) !== JSON.stringify(found)) await update($, others, () => found)

    const shared = await readJson<{ updatedAt?: string; windows?: Window[] }>($, `${home}/.claude/usage-meter.json`)
    const sharedAt = Date.parse(shared?.updatedAt ?? '') || 0
    if (shared?.windows && shared.windows.length > 0 && sharedAt > (await read($, limitsAt))) {
      const list = shared.windows
      await update($, limits, () => list)
      await update($, limitsAt, () => sharedAt)
      await checkLimits($, list)
    }
  } catch {}
}

// ---------- toasts ----------

// One toast per window, level and reset period, for all sessions together: the first session to see it says it.
async function checkLimits($: EngineInterface, list: Window[]) {
  try {
    const s = await read($, settings)
    for (const w of list) {
      if (w.kind !== 'five_hour' && w.kind !== 'seven_day') continue
      const name = w.kind === 'five_hour' ? '5-hour limit' : 'Weekly limit'
      const period = w.resetsAt ?? ''

      const last = (await $.store.get(`reset:${w.kind}`)) as string | undefined
      if (period !== '' && last !== period) {
        await $.store.set(`reset:${w.kind}`, period)
        if (last && s.notifyReset && Date.parse(period) > Date.parse(last) + 30 * 60000 && w.percentUsed < s.warn1) {
          $.ui.toast(`AI Usage Meter: the ${name.toLowerCase()} has reset (${Math.round(w.percentUsed)}% used).`)
        }
      }

      const level = limitLevel(s, w.percentUsed)
      const key = `toast:${w.kind}:${period}`
      const shown = ((await $.store.get(key)) as number | undefined) ?? 0
      if (level > shown) {
        await $.store.set(key, level)
        if (s.notify) {
          $.ui.toast(
            level === 2
              ? `AI Usage Meter: ${name} at ${Math.round(w.percentUsed)}%. Finish what you are doing.`
              : `AI Usage Meter: ${name} at ${Math.round(w.percentUsed)}%.`,
            { timeoutMs: 8000 },
          )
        }
      }
    }
  } catch {}
}

// Yellow and red once each; armed again when the context drops back (after compaction or /clear).
async function checkContext($: EngineInterface) {
  try {
    const s = await read($, settings)
    const c = await read($, context)
    if (!c || c.toCompact === undefined) return
    const level = contextLevel(s, c.toCompact)
    const shown = await read($, ctxLevel)
    if (level < shown && c.toCompact < s.sessLevel1 - 5) await update($, ctxLevel, () => 0)
    if (level === 2) $.ui.status(`AI Usage Meter: context ${c.toCompact}% to compaction, start a new session`)
    else $.ui.status(undefined)
    await syncBlink($)
    if (level <= shown) return
    await update($, ctxLevel, () => level)
    const m = contextMessage({ ...(await view($)), context: c })
    if (m) $.ui.toast(`AI Usage Meter: ${m.text}.`, { timeoutMs: 10000 })
  } catch {}
}

// ---------- drawing ----------

async function view($: EngineInterface): Promise<View> {
  return {
    settings: await read($, settings),
    now: (await read($, now)) || (await $.clock.now()),
    limits: await read($, limits),
    limitsAt: await read($, limitsAt),
    context: await read($, context),
    turns: await read($, turns),
    compactions: await read($, compactions),
    compactedAt: await read($, compactedAt),
    cost: await read($, cost),
    others: await read($, others),
    blinkOff: await read($, blinkOff),
    routine: await read($, routine),
    prompted: await read($, prompted),
    robot: await read($, robotView),
  }
}

// The elements to draw with. On the terminal `resolve` still hands out an Svg, as an empty fragment:
// leave it out there, so the bars draw as line characters and the robot as its text face.
function kitFor($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0] & { surface?: string }): Kit {
  const k = $.ui.resolve(e) as Kit
  return e.surface === 'terminal' ? { Box: k.Box, Text: k.Text, Button: k.Button } : k
}

function actions($: EngineInterface): Actions {
  return {
    notes: () =>
      void update($, working, () => true)
        .then(() => $.prompt.submit({ text: NOTES_PROMPT }))
        .catch(() => void update($, working, () => false)),
    close: () => void runRoutine($, 'close'),
    start: () => void runRoutine($, 'start'),
    compact: () => void $.command.run({ command: 'compact' }).catch(() => {}),
    hide: () => {
      void update($, bandHidden, () => true)
      void $.store.set('bandHidden', true)
      $.ui.toast('AI Usage Meter: band hidden. /meter band on shows it again.')
    },
    open: () => void togglePane($).catch(() => {}),
  }
}

// Fake figures so the colours and the warnings can be seen without spending usage: /meter demo …
async function demo($: EngineInterface, args: string[]): Promise<{ text: string }> {
  const at = await $.clock.now()
  if (args.length === 0 || args[0] === 'off') {
    try {
      const u = await $.session.usage()
      await update($, limitsAt, () => 0)
      await ingest($, u.rateLimits, true)
    } catch {}
    for (const name of ['demo', 'demo-A', 'demo-B']) {
      if (await $.fs.exists(`${await homeDir($)}/.claude/usage-meter-context/${name}.json`))
        await patchContext($, name, { ended: true })
    }
    await update($, ctxLevel, () => 0)
    await recordContext($)
    await scan($)
    return { text: 'Meter back to your real figures; demo sessions ended.' }
  }
  if (args[0] === 'here') {
    const pct = Math.max(0, Math.min(150, Number(args[1])))
    if (Number.isNaN(pct)) return { text: 'Usage: /meter demo here <percent>' }
    const point = 160000
    await update($, context, (prev): ContextInfo => ({
      ...(prev ?? { sessionId: 'demo-here' }),
      toCompact: pct,
      basis: 'compaction',
      point,
      tokens: Math.round((point * pct) / 100),
    }))
    await update($, turns, () => [0.6, 0.66, 0.71, 0.75, 0.8].map(f => Math.round(point * (pct / 100) * f)).concat(Math.round((point * pct) / 100)))
    await checkContext($)
    return { text: `Demo: this session at ${pct}% of compaction (until Claude's next reply). /meter demo off ends it.` }
  }
  if (args[0] === 'context') {
    const pct = Math.max(0, Math.min(150, Number(args[1])))
    if (Number.isNaN(pct)) return { text: 'Usage: /meter demo context <percent> [name]' }
    const name = args[2] ? `demo-${args[2]}` : 'demo'
    const iso = new Date(at).toISOString()
    await patchContext($, name, {
      folder: name,
      percent: Math.round(pct * 0.8),
      toCompact: pct,
      basis: 'compaction',
      updatedAt: iso,
      lastActiveAt: iso,
      ended: false,
    })
    await scan($)
    return { text: `Demo session "${name}" at ${pct}% of compaction. Type /meter demo off to end it.` }
  }
  const pct = Math.max(0, Math.min(100, Number(args[0])))
  if (Number.isNaN(pct)) return { text: 'Usage: /meter demo <0-100>, /meter demo here <percent>, /meter demo context <percent> [name], or /meter demo off' }
  const resetsAt = new Date(at + 2 * 3600000).toISOString()
  await ingest($, [
    { kind: 'five_hour', percentUsed: pct, resetsAt },
    { kind: 'seven_day', percentUsed: Math.round(pct / 2), resetsAt },
  ])
  return { text: `Demo: 5h at ${pct}%, week at ${Math.round(pct / 2)}%. Type /meter demo off to go back.` }
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'meter',
      description:
        'AI Usage Meter: open the details pane; /meter close-session, /meter start-session, /meter close, /meter band on|off, /meter demo 85|here 85|off',
      argumentHint: '[close-session | start-session | close | band on | band off | demo …]',
    })
    // Claude reports the steps of Close session / Start session with this tool; the band shows them in %.
    try {
      await $.tool.register({
        name: PROGRESS_TOOL,
        description:
          'AI Usage Meter: report the progress of the Close session or Start session routine, after each step. ' +
          'Use it only when a message from the AI Usage Meter mod asks for it.',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', enum: ['close', 'start'] },
            step: { type: 'integer', minimum: 0 },
            total: { type: 'integer', minimum: 1 },
            note: { type: 'string', description: 'A few words: what this step did' },
          },
          required: ['task', 'step', 'total'],
        },
        isDeferred: false,
      })
    } catch {}
    try {
      await update($, bandHidden, () => false)
      if ((await $.store.get('bandHidden')) === true) await update($, bandHidden, () => true)
    } catch {}
    await loadSettings($, options)
    try {
      const u = await $.session.usage()
      await ingest($, u.rateLimits)
      if (u.cost) await update($, cost, () => u.cost?.usd ?? null)
    } catch {}
    try {
      const at = new Date(await $.clock.now()).toISOString()
      await patchContext($, await $.session.id(), { lastActiveAt: at, ended: false })
    } catch {}
    await recordContext($)
    await scan($)
    await startRobot($, options.robot !== false, true)
    // Countdowns, "updated … ago", other sessions and the strip's settings move on their own.
    $.clock.every(30000, () => {
      void loadSettings($, options)
        .then(() => scan($))
        .then(() => syncBlink($))
        .then(() => startRobot($, options.robot !== false))
    })
    return result
  })

  on('command.run', { command: 'meter' }, async ($, e) => {
    const args = e.args.trim().toLowerCase()
    const words = args.split(/\s+/).filter(a => a.length > 0)
    if (words[0] === 'demo') return demo($, words.slice(1))
    if (args === 'close-session' || args === 'start-session') {
      const task = args === 'close-session' ? 'close' : 'start'
      // A prompt can't be queued while this command is still being handled: send it just after.
      $.clock.after(50, () => void runRoutine($, task))
      return { text: `AI Usage Meter: ${task === 'close' ? 'Close session' : 'Start session'} sent. The band shows its progress.` }
    }
    if (args === 'close') {
      await $.ui.close({ id: PANE })
      await update($, paneOpen, () => false)
      return { text: 'AI Usage Meter pane closed.' }
    }
    if (args === 'band off' || args === 'band on') {
      const hidden = args === 'band off'
      await update($, bandHidden, () => hidden)
      await $.store.set('bandHidden', hidden)
      return { text: hidden ? 'Band hidden. /meter band on shows it again.' : 'Band shown above the prompt.' }
    }
    await scan($)
    const opened = await openPane($)
    return { text: opened.isPlaced ? 'AI Usage Meter pane opened.' : 'AI Usage Meter: widen the window to see the pane.' }
  })

  on('session.measure', async ($, e, next) => {
    await ingest($, e.rateLimits)
    if (e.cost) {
      const usd = e.cost.usd
      await update($, cost, () => usd)
    }
    if (e.changed.includes('context')) await recordContext($)
    return next(e)
  })

  // The context after each main turn: what the last turns added, and how many more fit.
  on('turn.complete', async ($, e, next) => {
    try {
      if (!e.agentId) {
        if (await read($, working)) await update($, working, () => false)
        const c = await read($, context)
        const t = c?.tokens
        if (t !== undefined) await update($, turns, list => [...list, t].slice(-13))
        await finishRoutine($, e.answer)
      }
    } catch {}
    return next(e)
  })

  // Claude's progress report for Close session / Start session.
  on('tool.call', { tool: PROGRESS_TOOL_FULL }, async ($, e) => {
    const input = (e as { input?: Record<string, unknown> }).input ?? (e as unknown as Record<string, unknown>)
    const r = await read($, routine)
    const task = input.task === 'start' ? 'start' : 'close'
    const total = Math.max(1, Math.round(Number(input.total) || STEPS[task]))
    const step = Math.max(0, Math.min(total, Math.round(Number(input.step) || 0)))
    const note = typeof input.note === 'string' ? input.note.slice(0, 80) : undefined
    if (r && r.task === task && (r.status === 'queued' || r.status === 'running')) {
      await update($, routine, (): Routine => ({ ...r, status: 'running', step, total, note }))
    }
    // Claude Code accepts only text (or a list) as `result`, never an object.
    const shown = `Progress ${step} of ${total} shown in the AI Usage Meter band.`
    return { result: shown, text: shown }
  })

  // The last time you sent a message in this session: the strip follows the session you work in.
  // A prompt of the mod's own starts its routine; any other clears a finished routine's message.
  on('prompt.submit', async ($, e, next) => {
    try {
      const at = new Date(await $.clock.now()).toISOString()
      await patchContext($, await $.session.id(), { lastActiveAt: at, ended: false })
      if (!e.isMeta && !(await read($, working))) await update($, working, () => true)
      const r = await read($, routine)
      if (e.text.includes(MARK)) {
        if (r && r.status === 'queued') await update($, routine, (): Routine => ({ ...r, status: 'running' }))
      } else if (!e.isMeta) {
        if (!(await read($, prompted))) await update($, prompted, () => true)
        if (r && r.status !== 'queued' && r.status !== 'running') await update($, routine, () => null)
      }
    } catch {}
    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  // Note when compaction runs; never block or change it.
  // The pane closed some other way (its close mark, Esc, a reload): Details opens it again next time.
  on('ui.close', async ($, e, next) => {
    const result = await next(e)
    try {
      if (e.id === PANE) await update($, paneOpen, () => false)
    } catch {}
    return result
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('session.compact', async ($, e, next) => {
    try {
      const at = await $.clock.now()
      await patchContext($, await $.session.id(), { compactedAt: new Date(at).toISOString() })
      await update($, compactions, n => n + 1)
      await update($, compactedAt, () => at)
      await update($, turns, () => [])
      if ((await read($, settings)).notifyCompaction) {
        $.ui.toast(
          'AI Usage Meter: compaction ran. Older parts of this conversation are now a summary: check that paths, rules and decisions are still right.',
          { timeoutMs: 10000 },
        )
      }
    } catch {}
    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('session.end', async ($, e, next) => {
    try {
      await patchContext($, await $.session.id(), { ended: true })
      robotTimer?.cancel()
      robotTimer = undefined
    } catch {}
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, bandHidden))) return next(e)
    const v = await view($)
    if (v.limits.length === 0 && !v.context) return next(e)
    return band(kitFor($, e), v, e.props.bodyColumns, actions($))
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    return pane(kitFor($, e), await view($), e.props.bodyColumns, actions($))
  })
}
