import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, Timer } from 'claude-code'

import type { ContextInfo, MeterSettings, OtherSession, Routine, SettingRow, Window } from '../types'
import { DEFAULTS, band, contextLevel, contextMessage, limitLevel, pane, tokenLevel } from './draw'
import type { Actions, Kit, View } from './draw'
import { ROBOT_MS, effortLevel, robotKey, robotModel, type RobotLook, type RobotModel, type RobotState } from './robot'
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
import { baseName, htmlMode, htmlPathFor, htmlPrompt, htmlWorth, isAccept, isMarkdownCandidate, offerText } from './html'
import {
  NO_TOKENS,
  READER_AGENT,
  READER_DESCRIPTION,
  READ_TOOLS,
  addTokens,
  readerMode,
  type ReaderMode,
  readerNudge,
  readerPrompt,
  readerThreshold,
  requestTokens,
  roughTokens,
} from './reader'

// Session Pilot (formerly the AI Usage Meter mod): Session · Week · Compress in a band above the prompt, details in a pane (/meter),
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
const robotSeen = atom({ plugin: 'ai-usage-meter', key: 'robotSeen' } as const, { model: 'other', effort: 0 })
const tokensByModel = atom({ plugin: 'ai-usage-meter', key: 'tokensByModel' } as const, NO_TOKENS)
const readerRuns = atom({ plugin: 'ai-usage-meter', key: 'readerRuns' } as const, 0)
const weekTokens = atom({ plugin: 'ai-usage-meter', key: 'weekTokens' } as const, null)
const turnRead = atom({ plugin: 'ai-usage-meter', key: 'turnRead' } as const, { tokens: 0, nudged: false })
const lastReplyAt = atom({ plugin: 'ai-usage-meter', key: 'lastReplyAt' } as const, 0)
const warming = atom({ plugin: 'ai-usage-meter', key: 'warming' } as const, false)
const helpersMoved = atom({ plugin: 'ai-usage-meter', key: 'helpersMoved' } as const, 0)
const cacheCfg = atom({ plugin: 'ai-usage-meter', key: 'cacheCfg' } as const, { on: true, minutes: 60 })
const settingsOpen = atom({ plugin: 'ai-usage-meter', key: 'settingsOpen' } as const, false)
const configRows = atom({ plugin: 'ai-usage-meter', key: 'configRows' } as const, [])
const htmlCandidate = atom({ plugin: 'ai-usage-meter', key: 'htmlCandidate' } as const, null)
const htmlOffer = atom({ plugin: 'ai-usage-meter', key: 'htmlOffer' } as const, null)
const htmlOffered = atom({ plugin: 'ai-usage-meter', key: 'htmlOffered' } as const, [])
const htmlRefusals = atom({ plugin: 'ai-usage-meter', key: 'htmlRefusals' } as const, 0)
const htmlPaused = atom({ plugin: 'ai-usage-meter', key: 'htmlPaused' } as const, false)

// ---------- the mod's settings in the pane ----------
// In the desktop app /config opens the app's own Settings window, not Claude Code's /config menu, so the
// mod's settings can't be reached there. The pane lists the mod's own /config rows and changes them with
// $.config.set, as the menu would; Claude Code then reloads the mod with the new values.

// The values Claude Code handed this load, and the ones the mod runs with: Claude Code's plus the pane's own saved
// changes, for when Claude Code can't change a setting itself (2.1.326 in the desktop app fails $.config.list and
// $.config.set). A saved change keeps the value it replaced: when /config shows another value later, that one wins.
let engineOptions: PluginOptions = {}
let liveOptions: Record<string, PluginOptions[string]> = {}
const OVERRIDES = 'settingOverrides'
type Override = { value: boolean | string | number; base?: PluginOptions[string] }

async function savedOverrides($: EngineInterface): Promise<Record<string, Override>> {
  return { ...(((await $.store.get(OVERRIDES)) as Record<string, Override> | undefined) ?? {}) }
}

async function loadOverrides($: EngineInterface) {
  try {
    const saved = await savedOverrides($)
    let dropped = false
    for (const [field, o] of Object.entries(saved)) {
      if (JSON.stringify(engineOptions[field]) === JSON.stringify(o.base)) liveOptions[field] = o.value
      else {
        delete saved[field] // changed in /config since: that value wins
        dropped = true
      }
    }
    if (dropped) await $.store.set(OVERRIDES, saved)
  } catch {}
}

async function refreshConfig($: EngineInterface) {
  let rows: SettingRow[] = []
  try {
    rows = (await $.config.list())
      .filter(r => r.provider.plugin.startsWith('ai-usage-meter') || r.key.startsWith('ai-usage-meter'))
      .map(r => ({
        key: r.key,
        field: r.key.slice(r.key.lastIndexOf('.') + 1),
        label: r.label,
        kind: r.kind,
        value: liveOptions[r.key.slice(r.key.lastIndexOf('.') + 1)] ?? r.value,
        options: r.options,
        isLocked: r.isLocked,
      }))
  } catch {}
  if (rows.length === 0) rows = await manifestRows($)
  try {
    await update($, configRows, () => rows)
  } catch {}
}

// The mod's own list of its settings: the manifest's userConfig, with the values the mod runs with.
async function manifestRows($: EngineInterface): Promise<SettingRow[]> {
  try {
    type Field = { type?: string; title?: string; default?: PluginOptions[string]; options?: string[] }
    const m = JSON.parse(await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`)) as { userConfig?: Record<string, Field> }
    return Object.entries(m.userConfig ?? {}).map(([field, f]): SettingRow => {
      const kind = f.type === 'boolean' ? 'boolean' : f.type === 'number' ? 'number' : f.options && f.options.length > 0 ? 'choice' : 'text'
      const value = liveOptions[field] ?? f.default ?? (kind === 'boolean' ? false : kind === 'number' ? 0 : '')
      return { key: `${$.plugin.name}.${field}`, field, label: f.title ?? field, kind, value, options: f.options, isLocked: false }
    })
  } catch {
    return []
  }
}

// The settings the mod runs with changed: apply them now, without waiting for a reload.
async function applyLive($: EngineInterface) {
  const o = liveOptions as PluginOptions
  await loadSettings($, o)
  await startRobot($, o, true)
  await startReader($, o)
}

async function changeSetting($: EngineInterface, key: string, value: boolean | string | number) {
  const field = key.slice(key.lastIndexOf('.') + 1)
  let stored = false
  try {
    const r = await $.config.set({ key, value })
    if ('deny' in r && r.deny) {
      $.ui.toast(`Session Pilot: this setting can't be changed here (${r.deny}).`)
      await refreshConfig($)
      return
    }
    stored = true // Claude Code keeps it, and reloads the mod with it
  } catch {}
  try {
    const saved = await savedOverrides($)
    if (stored) delete saved[field]
    else saved[field] = { value, base: engineOptions[field] }
    await $.store.set(OVERRIDES, saved)
    liveOptions[field] = value
    await applyLive($)
  } catch {
    $.ui.toast("Session Pilot: this setting can't be changed here.")
  }
  await refreshConfig($)
}

// ---------- the HTML companion (hooks/html.ts) ----------

// Write and Edit of the main conversation (not a helper agent's): a Markdown file worth a look after the turn.
async function noteMarkdown($: EngineInterface, e: { agentId?: string }, done: boolean) {
  try {
    const path = (e as unknown as { file_path?: unknown }).file_path
    if (done && !e.agentId && typeof path === 'string' && isMarkdownCandidate(path)) await update($, htmlCandidate, () => path)
  } catch {}
}

async function acceptedKey($: EngineInterface) {
  return `html:accepted:${(await $.session.cwd()).toLowerCase()}`
}

// After a main turn that wrote a Markdown file: offer its HTML version (ask), or make it (on).
async function considerHtml($: EngineInterface, o: PluginOptions) {
  try {
    const path = await read($, htmlCandidate)
    if (!path) return
    await update($, htmlCandidate, () => null)
    const mode = htmlMode(o.htmlCompanion)
    if (mode === 'off' || (await read($, htmlPaused))) return
    const r = await read($, routine)
    if (r && (r.status === 'queued' || r.status === 'running')) return
    const name = baseName(path)
    const accepted = (((await $.store.get(await acceptedKey($))) as number | undefined) ?? 0) > 0
    if (!htmlWorth(name, await $.fs.read(path), accepted)) return
    const updating = await $.fs.exists(htmlPathFor(path))
    if (mode === 'on') {
      $.clock.after(50, () => void sendHtml($, path, updating))
      return
    }
    if ((await read($, htmlOffered)).includes(path)) return // once per file and session, unless accepted
    const offer = { path, name, update: updating, text: offerText(name, updating) }
    await update($, htmlOffer, () => offer)
    await update($, htmlOffered, list => [...list, path])
    // The prompt box takes a suggestion only once the turn is over.
    $.clock.after(300, () => void $.prompt.suggest({ text: offer.text }).catch(() => {}))
  } catch {}
}

// Yes: Claude gets the HTML rules with the file's path. The mod's own hooks don't see this prompt.
async function sendHtml($: EngineInterface, path: string, updating: boolean) {
  try {
    await htmlAccepted($, path)
    await $.prompt.submit({ text: htmlPrompt(path, updating) })
  } catch {}
}

async function htmlAccepted($: EngineInterface, path: string) {
  await update($, htmlOffer, () => null)
  await update($, htmlRefusals, () => 0)
  await update($, htmlOffered, list => list.filter(p => p !== path)) // a later change may be offered again
  const key = await acceptedKey($)
  await $.store.set(key, (((await $.store.get(key)) as number | undefined) ?? 0) + 1)
}

// No (the band's No, or another message instead of the offer): two in a row pause the offers.
async function htmlRefused($: EngineInterface) {
  await update($, htmlOffer, () => null)
  const n = (await read($, htmlRefusals)) + 1
  await update($, htmlRefusals, () => n)
  if (n >= 2 && !(await read($, htmlPaused))) {
    await update($, htmlPaused, () => true)
    $.ui.toast('Session Pilot: no more HTML offers in this session. /meter html ask turns them on again.')
  }
}

// Keep warm: one tiny question on top of the conversation, through its own cache, so the cache lives on.
// One per click, never automatic; only while the cache is still warm (a cold one would be re-read in full).
async function keepWarm($: EngineInterface) {
  try {
    if (await read($, warming)) return
    const cfg = await read($, cacheCfg)
    const at = await read($, lastReplyAt)
    const nowMs = await $.clock.now()
    if (!at || nowMs - at >= cfg.minutes * 60000) {
      $.ui.toast('Session Pilot: the cache is already cold; Keep warm only helps before it runs out.')
      return
    }
    await update($, warming, () => true)
    const r = await $.model.fork({ prompt: 'Reply with the single word: ok' })
    if (r.isAnswered) {
      const warmedAt = await $.clock.now()
      await update($, lastReplyAt, () => warmedAt)
      $.ui.toast('Session Pilot: cache kept warm for another period.')
    } else {
      $.ui.toast(`Session Pilot: Keep warm did not work (${r.reason}).`)
    }
  } catch {
    $.ui.toast('Session Pilot: Keep warm did not work.')
  } finally {
    await update($, warming, () => false).catch(() => {})
  }
}

const readerOn = atom({ plugin: 'ai-usage-meter', key: 'readerOn' } as const, false)
const readerOpen = atom({ plugin: 'ai-usage-meter', key: 'readerOpen' } as const, false)
const readerCfg = atom({ plugin: 'ai-usage-meter', key: 'readerCfg' } as const, { mode: 'search', threshold: 2000 })

// The reader's mode now: off when switched off in the pane; on, the /config mode (search when that says off).
async function activeReaderMode($: EngineInterface, o: PluginOptions): Promise<ReaderMode> {
  if (!(await read($, readerOn))) return 'off'
  const m = readerMode(o.readerMode)
  return m === 'off' ? 'search' : m
}

// At session start: define the reader's agent type (offered to the model only while on), and take the
// switch from the pane's last choice, or else from /config.
async function startReader($: EngineInterface, o: PluginOptions) {
  try {
    const stored = await $.store.get('readerOn')
    const on = typeof stored === 'boolean' ? stored : readerMode(o.readerMode) !== 'off'
    await update($, readerOn, () => on)
    await update($, cacheCfg, () => ({
      on: o.cacheClock !== false,
      minutes: typeof o.cacheMinutes === 'number' && o.cacheMinutes > 0 ? Math.round(o.cacheMinutes) : 60,
    }))
    const mode = readerMode(o.readerMode)
    await update($, readerCfg, () => ({ mode: mode === 'off' ? 'search' : mode, threshold: readerThreshold(o.readerThreshold) }))
    await $.agent.register({
      name: 'reader',
      description: READER_DESCRIPTION,
      prompt: readerPrompt(mode === 'off' ? 'search' : mode),
      model: 'haiku',
      tools: READ_TOOLS,
      omitClaudeMd: true,
    })
  } catch {}
}

// The weekly window the token counts belong to: its reset time, so a new week starts from zero.
async function weekKey($: EngineInterface) {
  const w = (await read($, limits)).find(x => x.kind === 'seven_day')
  return w?.resetsAt ? new Date(w.resetsAt).toISOString() : undefined
}

// This session's token counts in its own context file, for the week totals in every session.
async function saveTokens($: EngineInterface) {
  try {
    await patchContext($, await $.session.id(), {
      usedTokens: await read($, tokensByModel),
      readerRuns: await read($, readerRuns),
      week: await weekKey($),
    })
  } catch {}
}

// The robot's look from /config: one robot per model, the effort lights, and its size.
function robotLook(o: PluginOptions, seen: { model: RobotModel; effort: number }, blink: boolean): RobotLook {
  return { model: o.robotPerModel !== false ? seen.model : 'other', effort: o.robotEffort !== false ? seen.effort : 0, blink }
}
function robotPx(o: PluginOptions) {
  const v = o.robotSize
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(2, Math.min(4, Math.round(v))) : 3
}

// The robot's state, most important first: safe to close, red, Claude working, yellow, idle.
async function robotState($: EngineInterface): Promise<RobotState> {
  const r = await read($, routine)
  if (r?.task === 'close' && r.status === 'done') return 'happy'
  const c = await read($, context)
  const level = c?.toCompact !== undefined ? contextLevel(await read($, settings), c.toCompact, c.tokens) : 0
  if (level === 2) return 'red'
  if (await read($, working)) return 'work'
  return level === 1 ? 'yellow' : 'idle'
}

// One timer moves the robot on; it redraws the band only when the picture changes, so an idle
// robot costs a redraw every few seconds (its blink). The happy hop stops after a few seconds.
const HAPPY_TICKS = 34
let robotTimer: Timer | undefined
let robotTicks = 0

async function tickRobot($: EngineInterface, o: PluginOptions) {
  try {
    const state = await robotState($)
    const look = robotLook(o, await read($, robotSeen), (await read($, settings)).blink)
    const px = robotPx(o)
    const prev = await read($, robotView)
    robotTicks = prev?.state === state ? robotTicks + 1 : 0
    const n = state === 'happy' && robotTicks > HAPPY_TICKS ? 1 : robotTicks
    const same =
      prev?.state === state &&
      prev.px === px &&
      robotKey(state, n, look) === robotKey(state, prev.n, { model: prev.model, effort: prev.effort, blink: look.blink })
    if (!same) await update($, robotView, () => ({ state, n, model: look.model, effort: look.effort, px }))
  } catch {}
}

// The model and effort of the main conversation's last model request (not a subagent's).
async function seeModel($: EngineInterface, model: string | undefined, effort: string | number | undefined) {
  try {
    const seen = {
      model: robotModel(model),
      effort: effortLevel(effort),
      name: model,
      effortName: effort === undefined ? undefined : String(effort),
    }
    const prev = await read($, robotSeen)
    if (prev.name === seen.name && prev.effortName === seen.effortName) return
    await update($, robotSeen, () => seen)
    // Also in the session's context file: the exact names, to check what Claude Code reports
    await patchContext($, await $.session.id(), { model, effort })
  } catch {}
}

// `restart` at a session start: a timer from an earlier session in the same process ticks for that one.
async function startRobot($: EngineInterface, o: PluginOptions, restart = false) {
  const on = o.robot !== false
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
      await tickRobot($, o)
      robotTimer = $.clock.every(ROBOT_MS, () => void tickRobot($, o))
    }
  } catch {}
}

async function openPane($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE, title: 'Session Pilot' })
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
    $.ui.toast('Session Pilot: a Close session or Start session is already running.')
    return
  }
  let template: string | undefined
  try {
    template = extractPrompt(await $.fs.read(`${$.plugin.root}/${PROMPT_FILES[task]}`), HEADINGS[task])
  } catch {}
  if (!template) {
    $.ui.toast(`Session Pilot: the prompt file ${PROMPT_FILES[task]} is missing or has no prompt block.`)
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
    $.ui.toast('Session Pilot: Claude Code did not take the prompt. Try again when Claude is idle.')
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
      ? `Session Pilot: ${r.task === 'close' ? "now it's safe to end this session" : 'everything is ready to start this session'}.`
      : `Session Pilot: ${what}: ${next.reason ?? 'not finished'}. Check Claude's reply.`,
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
    const red = c?.toCompact !== undefined && contextLevel(s, c.toCompact, c.tokens) === 2
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
    tokenYellow: 0, // set in loadSettings, whoever decides the rest
    tokenRed: 0,
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
    // The token levels come from /config also when the strip decides the rest (the strip doesn't have them).
    const tok = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0)
    s.tokenYellow = tok(options.tokenYellow)
    s.tokenRed = tok(options.tokenRed)
    if (s.tokenYellow > 0 && s.tokenRed > 0 && s.tokenYellow >= s.tokenRed) s.tokenYellow = 0
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
    // This week's tokens per model: every session's own file (ended ones too) for the same weekly window,
    // plus this session's own figures. Each session writes only its own file, so none overwrites another.
    const week = await weekKey($)
    let weekSum = await read($, tokensByModel)
    let weekRuns = await read($, readerRuns)
    if (await $.fs.exists(dir)) {
      for (const f of await $.fs.list(dir)) {
        if (f.kind !== 'file' || !f.name.endsWith('.json')) continue
        const info = await readJson<ContextInfo>($, `${dir}/${f.name}`)
        if (info && week && info.week === week && info.sessionId !== own) {
          weekSum = addTokens(weekSum, info.usedTokens ?? {})
          weekRuns += info.readerRuns ?? 0
        }
        if (!info || info.ended || info.sessionId === own || info.toCompact === undefined) continue
        const seen = Math.max(Date.parse(info.updatedAt ?? '') || 0, Date.parse(info.lastActiveAt ?? '') || 0)
        if (at - seen > QUIET_MS) continue
        found.push({ id: info.sessionId, folder: info.folder ?? info.sessionId, toCompact: info.toCompact, lastSeen: seen })
      }
    }
    const before = await read($, others)
    if (JSON.stringify(before) !== JSON.stringify(found)) await update($, others, () => found)
    const weekNow = week ? { tokens: weekSum, runs: weekRuns } : null
    if (JSON.stringify(await read($, weekTokens)) !== JSON.stringify(weekNow)) await update($, weekTokens, () => weekNow)

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
          $.ui.toast(`Session Pilot: the ${name.toLowerCase()} has reset (${Math.round(w.percentUsed)}% used).`)
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
              ? `Session Pilot: ${name} at ${Math.round(w.percentUsed)}%. Finish what you are doing.`
              : `Session Pilot: ${name} at ${Math.round(w.percentUsed)}%.`,
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
    const level = contextLevel(s, c.toCompact, c.tokens)
    const shown = await read($, ctxLevel)
    if (level < shown && c.toCompact < s.sessLevel1 - 5 && tokenLevel(s, c.tokens) === 0) await update($, ctxLevel, () => 0)
    if (level === 2) $.ui.status(`Session Pilot: ${contextMessage({ ...(await view($)), context: c })?.text ?? 'start a new session'}`)
    else $.ui.status(undefined)
    await syncBlink($)
    if (level <= shown) return
    await update($, ctxLevel, () => level)
    const m = contextMessage({ ...(await view($)), context: c })
    if (m) $.ui.toast(`Session Pilot: ${m.text}.`, { timeoutMs: 10000 })
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
    modelName: await read($, robotSeen).then(s => (s.name ? `${s.name}${s.effortName ? ` · effort ${s.effortName}` : ''}` : null)),
    cache: { ...(await read($, cacheCfg)), lastAt: await read($, lastReplyAt), warming: await read($, warming) },
    reader: {
      on: await read($, readerOn),
      open: await read($, readerOpen),
      ...(await read($, readerCfg)),
      session: await read($, tokensByModel),
      runs: await read($, readerRuns),
      week: await read($, weekTokens),
      helpersMoved: await read($, helpersMoved),
    },
    config: { open: await read($, settingsOpen), rows: await read($, configRows) },
    html: { offer: await read($, htmlOffer).then(o => (o ? { name: o.name, update: o.update } : null)) },
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
      $.ui.toast('Session Pilot: band hidden. /meter band on shows it again.')
    },
    open: () => void togglePane($).catch(() => {}),
    // The pane's reader switch; the choice is kept for the next sessions too.
    reader: () =>
      void read($, readerOn)
        .then(on => update($, readerOn, () => !on).then(() => $.store.set('readerOn', !on)))
        .catch(() => {}),
    readerInfo: () => void update($, readerOpen, open => !open).catch(() => {}),
    warm: () => void keepWarm($),
    settings: () =>
      void read($, settingsOpen)
        .then(open => update($, settingsOpen, () => !open).then(() => (open ? undefined : refreshConfig($))))
        .catch(() => {}),
    setting: (key, value) => void changeSetting($, key, value),
    htmlYes: () =>
      void read($, htmlOffer)
        .then(o => (o ? sendHtml($, o.path, o.update) : undefined))
        .catch(() => {}),
    htmlNo: () => void htmlRefused($).catch(() => {}),
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

export const register: Register = (on, engine) => {
  // Claude Code's values, plus the pane's own saved changes (see changeSetting); every hook reads `options`.
  engineOptions = engine
  liveOptions = { ...engine }
  const options = liveOptions as PluginOptions
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'meter',
      description:
        'Session Pilot: open the details pane; /meter start (Start session), /meter settings, /meter html [on|ask|off], /meter close-session, /meter start-session, /meter close, /meter band on|off, /meter demo 85|here 85|off',
      argumentHint: '[start | settings | html [on|ask|off] | close-session | start-session | close | band on | band off | demo …]',
    })
    // Claude reports the steps of Close session / Start session with this tool; the band shows them in %.
    try {
      await $.tool.register({
        name: PROGRESS_TOOL,
        description:
          'Session Pilot: report the progress of the Close session or Start session routine, after each step. ' +
          'Use it only when a message from Session Pilot asks for it.',
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
    await loadOverrides($)
    await loadSettings($, options)
    await refreshConfig($) // also after a change in the pane: Claude Code reloads the mod with the new values
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
    await seeModel($, await $.session.model().catch(() => undefined), undefined)
    await startRobot($, options, true)
    await startReader($, options)
    // Countdowns, "updated … ago", other sessions and the strip's settings move on their own.
    $.clock.every(30000, () => {
      void loadSettings($, options)
        .then(() => scan($))
        .then(() => syncBlink($))
        .then(() => startRobot($, options))
    })
    return result
  })

  on('command.run', { command: 'meter' }, async ($, e) => {
    const args = e.args.trim().toLowerCase()
    const words = args.split(/\s+/).filter(a => a.length > 0)
    if (words[0] === 'demo') return demo($, words.slice(1))
    // `/meter start` is the short form: in the desktop app the band only shows after the first message, so a new
    // session is started by typing it as that first message (Claude then gets the Start session prompt, nothing else).
    if (args === 'close-session' || args === 'start-session' || args === 'start') {
      const task = args === 'close-session' ? 'close' : 'start'
      // A prompt can't be queued while this command is still being handled: send it just after.
      $.clock.after(50, () => void runRoutine($, task))
      return { text: `Session Pilot: ${task === 'close' ? 'Close session' : 'Start session'} sent. The band shows its progress.` }
    }
    if (args === 'close') {
      await $.ui.close({ id: PANE })
      await update($, paneOpen, () => false)
      return { text: 'Session Pilot pane closed.' }
    }
    if (words[0] === 'html') {
      const m = words[1]
      if (m === 'on' || m === 'ask' || m === 'off') {
        await update($, htmlPaused, () => false)
        await update($, htmlRefusals, () => 0)
        const row = (await read($, configRows)).find(r => r.field === 'htmlCompanion')
        await changeSetting($, row?.key ?? 'ai-usage-meter.htmlCompanion', m)
        return { text: `Session Pilot: HTML companion ${m === 'ask' ? 'asks first' : m}.` }
      }
      const o = await read($, htmlOffer)
      if (!o) return { text: 'Session Pilot: no Markdown document on offer for an HTML version. /meter html on|ask|off sets the mode.' }
      $.clock.after(50, () => void sendHtml($, o.path, o.update))
      return { text: `Session Pilot: making the HTML version of ${o.name}.` }
    }
    if (args === 'settings') {
      await update($, settingsOpen, () => true)
      await refreshConfig($)
      await scan($)
      if (!(await read($, paneOpen))) await openPane($)
      return { text: 'Session Pilot: the settings are at the bottom of the pane.' }
    }
    if (args === 'band off' || args === 'band on') {
      const hidden = args === 'band off'
      await update($, bandHidden, () => hidden)
      await $.store.set('bandHidden', hidden)
      return { text: hidden ? 'Band hidden. /meter band on shows it again.' : 'Band shown above the prompt.' }
    }
    await scan($)
    const opened = await openPane($)
    return { text: opened.isPlaced ? 'Session Pilot pane opened.' : 'Session Pilot: widen the window to see the pane.' }
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

  // Each model request of the main conversation: the robot shows its model and effort (a /model switch
  // or a fallback shows at the next request). Never changes the request.
  // turn.step streams: the hook passes every chunk of the answer through unchanged.
  // Every request, a subagent's too: its tokens go to the counter of its model family.
  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) await seeModel($, e.model, e.effort)
    const r = yield* next(e)
    try {
      const u = r?.usage
      if (u) {
        const m = robotModel(u.model)
        const n = requestTokens(u)
        await update($, tokensByModel, t => ({ ...t, [m]: t[m] + n }))
      }
    } catch {}
    return r
  })

  // A new turn of the main conversation: its reading starts from zero.
  on('turn.start', async ($, e, next) => {
    try {
      if (!e.agentId) await update($, turnRead, () => ({ tokens: 0, nudged: false }))
    } catch {}
    return next(e)
  })

  // The Haiku reader: when the main conversation has read more than the limit in one turn, Opus is told
  // once, after that tool's result, to give further reading to the reader. Never changes the result itself.
  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    try {
      if (e.agentId || !READ_TOOLS.includes(e.tool) || r.deny !== undefined) return r
      const mode = await activeReaderMode($, options)
      if (mode === 'off') return r
      const seen = await read($, turnRead)
      const total = seen.tokens + roughTokens(r.text)
      const tell = !seen.nudged && total > readerThreshold(options.readerThreshold)
      await update($, turnRead, () => ({ tokens: total, nudged: seen.nudged || tell }))
      return tell ? { ...r, context: [...(r.context ?? []), readerNudge(mode, total)] } : r
    } catch {
      return r
    }
  })

  // The HTML companion: note a Markdown file the main conversation wrote; after the turn, it may be offered.
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const r = await next(e)
    await noteMarkdown($, e, r.deny === undefined)
    return r
  })
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const r = await next(e)
    await noteMarkdown($, e, r.deny === undefined)
    return r
  })

  // Count the reader's runs.
  // Helper agents: count the reader's runs, and with "Explore helpers on Haiku" on, start Claude Code's
  // read-only search helper (Explore) on Haiku instead of the session's model. A model the helper already
  // asked for is left as it is.
  on('agent.spawn', async ($, e, next) => {
    let input = e
    try {
      if (options.exploreOnHaiku === true && e.subagentType === 'Explore' && !e.model) input = { ...e, model: 'haiku' }
    } catch {}
    const r = await next(input)
    try {
      if (r.deny === undefined) {
        if (e.subagentType === READER_AGENT) await update($, readerRuns, n => n + 1)
        if (input !== e) await update($, helpersMoved, n => n + 1)
      }
    } catch {}
    return r
  })

  // The model sees the reader only while it is on.
  on('agent.offer', { agent: READER_AGENT }, async ($, e, next) => ((await read($, readerOn)) ? next(e) : { isOffered: false }))

  // The context after each main turn: what the last turns added, and how many more fit.
  on('turn.complete', async ($, e, next) => {
    try {
      if (!e.agentId) {
        if (await read($, working)) await update($, working, () => false)
        const c = await read($, context)
        const t = c?.tokens
        if (t !== undefined) await update($, turns, list => [...list, t].slice(-13))
        await finishRoutine($, e.answer)
        await saveTokens($)
        const repliedAt = await $.clock.now()
        await update($, lastReplyAt, () => repliedAt) // the cache clock starts again
        await considerHtml($, options)
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
    const shown = `Progress ${step} of ${total} shown in the Session Pilot band.`
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
    // A pending HTML offer: the offer's words (Tab, Enter), "yes" or "html" accept it; anything else refuses it.
    try {
      const o = await read($, htmlOffer)
      if (o && !e.isMeta && !e.command && !e.text.includes(MARK)) {
        if (isAccept(e.text, o.text)) {
          await htmlAccepted($, o.path)
          return next({ ...e, text: htmlPrompt(o.path, o.update) })
        }
        await htmlRefused($)
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
          'Session Pilot: compaction ran. Older parts of this conversation are now a summary: check that paths, rules and decisions are still right.',
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
    // No figures yet: still show the band before the first message, for its Start session button.
    if (v.limits.length === 0 && !v.context && v.prompted) return next(e)
    return band(kitFor($, e), v, e.props.bodyColumns, actions($))
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    return pane(kitFor($, e), await view($), e.props.bodyColumns, actions($))
  })
}
