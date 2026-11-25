import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

// The band and the pane, drawn from the /meter demo figures (no usage spent, no files needed).

const BAND = {
  plugin: 'ai-usage-meter',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const PANE = {
  plugin: 'ai-usage-meter',
  component: 'Pane',
  requestId: 'ai-usage-meter',
  props: {
    title: 'Session Pilot',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

// The engine beneath the plugin: a clock, a store, and the session figures the plugin asks for.
function engine(on: On, paneCalls: string[] = [], env: Record<string, string> = {}) {
  const clock = mock.clock(on, { now: Date.parse('2026-10-25T10:00:00Z') })
  mock.store(on)
  mock.env(on, env) // default: no USERPROFILE or LOCALAPPDATA: no strip, no files
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.usage', () => ({ value: USAGE }))
  on('session.id', () => ({ value: 'test-session' }))
  on('session.cwd', () => ({ value: 'D:/Dev/MyProject' }))
  on('ui.open', () => {
    paneCalls.push('open')
    return { value: { isPlaced: true } }
  })
  on('ui.close', () => {
    paneCalls.push('close')
    return { value: undefined }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  return clock
}

// What the engine stamps on a command the person typed.
const TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

const USAGE = {
  startedAt: 0,
  context: { window: 200000 },
  rateLimits: [],
}

test('the band shows Session, Week and Compress, and the red warning, on every surface', async ($, on) => {
  engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 84', ...TYPED })
  await $.command.run({ command: 'meter', args: 'demo here 92', ...TYPED })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /^84%$/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /^42%$/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /^Compress$/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /^92%$/ })).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /start a new session/ }))?.text).toMatch(/92% to compaction/)
    // At red the band offers Close session (and Compact) instead of Write session notes
    expect(await ui.find({ type: 'Button', key: 'close' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'compact' })).toBeTruthy()
    // Real bars on the desktop; line characters on the terminal, never the shaded grid.
    if (surface === 'desktop') expect(await ui.find({ type: 'Svg' })).toBeTruthy()
    else expect(await ui.find({ type: 'Text', text: /░/ })).toBeFalsy()
    await ui.unmount()
  }
})

test('the pane shows the limits, the context and the buttons', async ($, on) => {
  engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 50', ...TYPED })
  await $.command.run({ command: 'meter', args: 'demo here 83', ...TYPED })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Session \(5-hour limit\)/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /finish the task and update your session notes/ })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'compact' })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /Session Pilot 2\.1\.0 · Hans Tandt · hanstandt\.be/ })).toBeTruthy()
    await ui.unmount()
  }
})

test('the band gives way to a survey', async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 50', ...TYPED })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, hasSurvey: true } })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('without the strip, the levels come from /config', { options: { warn1: 70, warn2: 90, sessLevel1: 75, sessLevel2: 85 } }, async ($, on) => {
  engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo here 78', ...TYPED })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /limits 70\/90%, context 75\/85%/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /strip's Settings decide/ })).toBeFalsy() // the mod's own settings apply
  expect(await ui.find({ type: 'Button', key: 'settings' })).toBeTruthy()
  // 78 % is past the yellow level set in /config (75 %), not the default 80 %
  expect(await ui.find({ type: 'Text', text: /finish the task and update your session notes/ })).toBeTruthy()
  await ui.unmount()
})

test('a leftover AIUsageMeter.exe without its settings file does not count as the strip', { options: { warn1: 70, warn2: 90 } }, async ($, on) => {
  engine(on, [], { USERPROFILE: 'C:/Users/Test', LOCALAPPDATA: 'C:/Users/Test/AppData/Local' })
  // The engine hands over Windows paths with backslashes
  on('fs.exists', (_, e) => ({ value: /AIUsageMeter[\\/]AIUsageMeter\.exe$/.test(e.path) }))
  on('fs.read', () => {
    throw new Error('no file')
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /limits 70\/90%/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /strip's Settings decide/ })).toBeFalsy()
  await ui.unmount()
})

const RED_LINE = { type: 'Text', text: /start a new session/ } as const

test('at red, the warning line blinks', async ($, on) => {
  const clock = engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo here 93', ...TYPED })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const first = (await ui.find(RED_LINE))?.props.dimColor === true
    await clock.advance(600)
    expect((await ui.find(RED_LINE))?.props.dimColor === true).toBe(!first)
    await clock.advance(600)
    expect((await ui.find(RED_LINE))?.props.dimColor === true).toBe(first)
    await ui.unmount()
  }

  // Back below red: the blink stops, bright
  await $.command.run({ command: 'meter', args: 'demo here 40', ...TYPED })
  await clock.advance(600)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find(RED_LINE)).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /^40%$/ }))?.props.dimColor).toBeFalsy()
  await ui.unmount()
})

test('with Blink off in /config, red stays steady', { options: { blink: false } }, async ($, on) => {
  const clock = engine(on)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo here 93', ...TYPED })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  for (let i = 0; i < 3; i++) {
    expect((await ui.find(RED_LINE))?.props.dimColor).toBeFalsy()
    await clock.advance(600)
  }
  await ui.unmount()
})

// ---------- Close session / Start session ----------

// Short stand-ins for the two prompt files the mod ships in prompts/.
// Like v1.1 and v1.3: nothing to fill in, and the start prompt asks its questions first.
const END_MD = '# End\n\n## The prompt\n\n```text\nProject folder: the folder we worked in during this session.\nSTEP 1 ... STEP 6\n```\n'
const NEW_MD = '# New\n\n## Prompt 0 — universal start\n\n```text\nBefore anything else, ask me these questions and wait for my answers:\n1. Project folder?\n2. Today\'s task?\n```\n'

function routineEngine(on: On, sent: string[]) {
  const clock = engine(on)
  on('fs.read', (_, e) => ({ value: e.path.endsWith('End_Session_Prompt_v1.1.md') ? END_MD : NEW_MD }))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)
    return { text: e.text }
  })
  on('turn.complete', () => ({ text: '' }))
  on('tool.register', () => ({ value: { tool: 'mcp__ai-usage-meter__session_progress' } }))
  return clock
}

const turnEnd = (answer: string) =>
  ({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer', category: null, explanation: null }) as const

test('Close session reports progress, then "safe to end"; Start session uses the hand-over', async ($, on) => {
  const sent: string[] = []
  routineEngine(on, sent)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'close' })
  await pane.unmount()
  expect(sent[0]).toContain('Project folder: D:/Dev/MyProject.')
  expect(sent[0]).toContain('counts as my "go"')
  expect(sent[0]).toContain('Keep every open step it lists, word for word')
  expect(sent[0]).toContain('"You are safe to close this session now"')
  expect(sent[0]).toContain("!!! It's NOT safe to close this session, risk of losing data !!! – <reason>")

  const answer = await $.tool.call({ tool: 'mcp__ai-usage-meter__session_progress', task: 'close', step: 3, total: 6, note: 'files compared' })
  // Claude Code rejects an object as a tool's result: it must be text
  expect(typeof (answer as { result?: unknown }).result).toBe('string')
  let band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /Closing session… step 3 of 6 · 50% · files compared/ })).toBeTruthy()
  await band.unmount()

  await $.turn.complete(turnEnd('Done.\n<<<NEXT_SESSION\nRead CLAUDE.md and build the export.\nNEXT_SESSION>>>\n**You are safe to close this session now.**'))
  band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /Now it's safe to end this session/ })).toBeTruthy()
  await band.unmount()

  // Start session in the next session: the hand-over goes along with Prompt 0
  const pane2 = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane2.press({ key: 'start' })
  await pane2.unmount()
  expect(sent[1]).toContain('Hand-over from the previous session:')
  expect(sent[1]).toContain('Read CLAUDE.md and build the export.')
  expect(sent[1]).toContain("My answers to your questions: Project folder: D:/Dev/MyProject. Today's task: continue from the hand-over")

  await $.turn.complete(turnEnd('Case RE-START.\nReady to start: YES'))
  band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /Everything is ready to start this session/ })).toBeTruthy()
  await band.unmount()
})

test('a NO, or a reply without a status line, is never shown as safe', async ($, on) => {
  const sent: string[] = []
  const clock = routineEngine(on, sent)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run({ command: 'meter', args: 'close-session', ...TYPED })
  await clock.advance(50) // the command sends the prompt just after it is handled
  expect(sent).toHaveLength(1)
  await $.turn.complete(turnEnd("!!! It's NOT safe to close this session, risk of losing data !!! – MEMORY.md is over 200 lines"))
  let band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /It's NOT safe to close this session: MEMORY.md is over 200 lines$/ })).toBeTruthy()
  expect(await band.find({ type: 'Text', text: /safe to end/ })).toBeFalsy()
  await band.unmount()

  // Without the "!!!", and the line of older prompt copies: still NO, with the reason
  for (const line of ["It's NOT safe to close this session – no backup made", 'Safe to close: NO – no backup made']) {
    await $.command.run({ command: 'meter', args: 'close-session', ...TYPED })
    await clock.advance(50)
    await $.turn.complete(turnEnd(`You are safe to close this session now?\n${line}`))
    band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await band.find({ type: 'Text', text: /NOT safe to close this session: no backup made$/ })).toBeTruthy()
    expect(await band.find({ type: 'Text', text: /safe to end/ })).toBeFalsy()
    await band.unmount()
  }

  await $.command.run({ command: 'meter', args: 'close-session', ...TYPED })
  await clock.advance(50)
  await $.tool.call({ tool: 'mcp__ai-usage-meter__session_progress', task: 'close', step: 2, total: 6 })
  await $.turn.complete(turnEnd('I was interrupted.'))
  band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /Close session stopped at step 2 of 6/ })).toBeTruthy()
  await band.unmount()
})

test('Details opens the pane, and a second click closes it', async ($, on) => {
  const calls: string[] = []
  engine(on, calls)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'open' })
  await band.press({ key: 'open' })
  await band.press({ key: 'open' })
  await band.unmount()
  expect(calls).toEqual(['open', 'close', 'open'])
})

test('the robot: a face in the terminal, a picture on the desktop, and it follows what happens', async ($, on) => {
  const sent: string[] = []
  const clock = routineEngine(on, sent)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const face = async (re: RegExp) => {
    const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const found = await band.find({ type: 'Text', text: re })
    await band.unmount()
    return found
  }

  expect(await face(/\[-_-\]/)).toBeTruthy() // frame 0 is a blink
  await clock.advance(350)
  expect(await face(/\[o_o\]/)).toBeTruthy()
  const desk = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await desk.find({ type: 'Svg' })).toBeTruthy()
  await desk.unmount()

  // Close session: Claude works (the eyes scan), then the reply says it is safe (the robot cheers)
  await $.command.run({ command: 'meter', args: 'close-session', ...TYPED })
  await clock.advance(350)
  expect(await face(/\[o_ o\]|\[ o_o\]|\[o _o\]/)).toBeTruthy()
  await $.turn.complete(turnEnd('Done.\nYou are safe to close this session now'))
  await clock.advance(350)
  expect(await face(/\[\^_\^\]/)).toBeTruthy()

  // Red outranks everything but the cheer: after the next message, the red face
  await $.command.run({ command: 'meter', args: 'demo here 93', ...TYPED })
  await $.prompt.submit({ text: 'next task', wait: false, origin: TYPED.origin })
  await $.turn.complete(turnEnd('ok'))
  await clock.advance(350)
  expect(await face(/\[!_!\]|\[ _ \]/)).toBeTruthy()
})

test('with the robot off in /config, the band has no robot', { options: { robot: false } }, async ($, on) => {
  const clock = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })
  await clock.advance(350)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /\[o_o\]/ })).toBeFalsy()
  expect(await band.find({ type: 'Text', text: /^Session$/ })).toBeTruthy()
  // The bars on the terminal are line characters, not an empty picture
  expect(await band.find({ type: 'Text', text: /━/ })).toBeTruthy()
  await band.unmount()
})

// A model request of the main conversation (or of a subagent), answered at once by the engine.
function stepper($: Engine, on: On, clock: ReturnType<typeof engine>) {
  on('turn.step', async function* () {
    return { turnId: 't', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return async (model: string, effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | number, agentId?: string) => {
    for await (const _ of $.turn.step({ turnId: 't', index: 0, model, effort, messageCount: 1, agentId })) void _
    await clock.advance(350)
  }
}

const bandFace = async ($: Engine, re: RegExp) => {
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const found = await band.find({ type: 'Text', text: re })
  await band.unmount()
  return found
}

test('the robot shows the model and the effort; a subagent does not change it', async ($, on) => {
  const clock = engine(on)
  const step = stepper($, on, clock)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })

  await step('claude-haiku-5-5', 'high')
  expect(await bandFace($, /\{[o-]_[o-]\} +▮▮▮▯▯/)).toBeTruthy()
  const desk = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const pic = (await desk.find({ type: 'Svg' })) as { props?: { alt?: string; width?: number } } | undefined
  expect(pic?.props?.alt).toBe('robot (Haiku), effort high')
  expect(pic?.props?.width).toBe(36) // Robot size 3 (medium) by default
  // The effort bar under the robot, as wide as the robot
  const box = (await desk.find({ type: 'Box', key: 'robot' })) as { children?: { props?: { alt?: string; width?: number } }[] } | undefined
  const bar = box?.children?.[1]
  expect(bar?.props?.alt).toBe('effort high: 3 of 5')
  expect(bar?.props?.width).toBe(36)
  await desk.unmount()
  // The pane names the model and effort exactly as Claude Code reports them
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await pane.find({ type: 'Text', text: /Model: claude-haiku-5-5 · effort high/ })).toBeTruthy()
  await pane.unmount()

  // A token budget instead of a level: no lights
  await step('claude-opus-5-5', 20000)
  expect(await bandFace($, /^ ?\[[o-]_[o-]\] ?$/)).toBeTruthy()

  // A subagent's request leaves the robot as it is
  await step('claude-sonnet-5-5', 'low', 'agent-1')
  expect(await bandFace($, /\[[o-]_[o-]\]/)).toBeTruthy()
  expect(await bandFace($, /\(/)).toBeFalsy()
})

test('with per-model and effort off, and size 4, the robot is the plain one, larger', { options: { robotPerModel: false, robotEffort: false, robotSize: 4 } }, async ($, on) => {
  const clock = engine(on)
  const step = stepper($, on, clock)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })
  await step('claude-haiku-5-5', 'max')
  expect(await bandFace($, /^ ?\[[o-]_[o-]\] ?$/)).toBeTruthy()
  const desk = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const pic = (await desk.find({ type: 'Svg' })) as { props?: { alt?: string; width?: number } } | undefined
  expect(pic?.props?.alt).toBe('robot')
  expect(pic?.props?.width).toBe(48)
  await desk.unmount()
})

// Model requests that report their tokens, answered at once by the engine.
function usageStepper($: Engine, on: On, clock: ReturnType<typeof engine>) {
  let usage: { model: string; input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number } | null = null
  on('turn.step', async function* () {
    return { turnId: 't', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage }
  })
  return async (model: string, tokens: number, agentId?: string) => {
    usage = { model, input_tokens: tokens - 100, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
    for await (const _ of $.turn.step({ turnId: 't', index: 0, model, effort: 'high', messageCount: 1, agentId })) void _
    await clock.advance(50)
  }
}

test('the token counter adds up tokens per model; the pane shows Haiku\'s share and opens its details', { options: { readerMode: 'search' } }, async ($, on) => {
  const clock = engine(on)
  const step = usageStepper($, on, clock)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })
  await step('claude-opus-5-5', 8000)
  await step('claude-haiku-5-5', 2000, 'agent-1') // a helper on Haiku counts too

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await pane.find({ type: 'Text', text: /Haiku 20 % · 0 runs/ })).toBeTruthy()
  expect(await pane.find({ type: 'Button', key: 'reader' })).toBeTruthy()
  await pane.press({ key: 'readerInfo' })
  expect(await pane.find({ type: 'Text', text: /^Opus +8k/ })).toBeTruthy()
  expect(await pane.find({ type: 'Text', text: /Mode: search only/ })).toBeTruthy()
  await pane.unmount()

  // The band names Haiku's share while the reader is on
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /Haiku 20 %/ })).toBeTruthy()
  await band.unmount()
})

test('over the limit, Opus is told once per turn to use the reader; switched off, never', { options: { readerMode: 'search', readerThreshold: 1000 } }, async ($, on) => {
  engine(on)
  on('tool.call', (_, e) => ({ result: { file: e.tool }, text: 'x'.repeat(2400) })) // about 600 tokens each
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const readFile = async () => (await $.tool.call({ tool: 'Read', file_path: 'a.txt' })) as { context?: readonly string[] }

  await $.turn.start({ text: 'look', turnId: 't1' })
  expect((await readFile()).context ?? []).toHaveLength(0) // 600: under the limit
  const told = (await readFile()).context ?? [] // 1,200: over it
  expect(told.join(' ')).toContain('ai-usage-meter:reader')
  expect((await readFile()).context ?? []).toHaveLength(0) // once per turn
  // A helper agent's reading doesn't count
  expect(((await $.tool.call({ tool: 'Read', file_path: 'b.txt', agentId: 'agent-1' })) as { context?: readonly string[] }).context ?? []).toHaveLength(0)

  // Switched off in the pane: no more notes, even in a new turn
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'reader' })
  await pane.unmount()
  await $.turn.start({ text: 'again', turnId: 't2' })
  await readFile()
  expect((await readFile()).context ?? []).toHaveLength(0)
})

test('a token number warns before the % does', { options: { tokenYellow: 50000, tokenRed: 100000 } }, async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo here 40', ...TYPED }) // 40 % = 64k tokens
  let band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /64k tokens: finish the task and update your session notes/ })).toBeTruthy()
  await band.unmount()
  await $.command.run({ command: 'meter', args: 'demo here 70', ...TYPED }) // 112k tokens
  band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /112k tokens: start a new session/ })).toBeTruthy()
  await band.unmount()
})

test('without token levels, 40 % gives no warning', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo here 40', ...TYPED })
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /finish the task/ })).toBeFalsy()
  await band.unmount()
})

test('the cache clock counts down from the last reply; Keep warm starts it again', { timeoutMs: 20000 }, async ($, on) => { // two simulated hours, minute by minute
  const sent: string[] = []
  const clock = routineEngine(on, sent)
  const forks: string[] = []
  on('model.fork', (_, e) => {
    forks.push(e.prompt)
    return { value: { isAnswered: true, text: 'ok', usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 } } } as never
  })
  // Minute by minute: the robot's 300 ms timer makes one long jump too many steps
  const wait = async (ms: number) => {
    for (let t = 0; t < ms; t += 60000) await clock.advance(Math.min(60000, ms - t))
  }
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })
  await $.turn.complete(turnEnd('Done.'))
  await wait(30000)
  let band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /cache (59|60)m|cache 1h/ })).toBeTruthy()
  await band.unmount()

  await wait(57 * 60000) // 2 to 3 minutes left: Keep warm
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'warm' })
  await pane.unmount()
  expect(forks).toHaveLength(1)
  await wait(30000)
  band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /cache (59|60)m|cache 1h/ })).toBeTruthy()
  await band.unmount()

  await wait(61 * 60000)
  band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /cache cold/ })).toBeTruthy()
  await band.unmount()
})

test('with "Explore on Haiku", only the Explore helper starts on Haiku', { options: { exploreOnHaiku: true } }, async ($, on) => {
  engine(on)
  on('agent.spawn', (_, e) => ({ model: e.model ?? 'claude-opus-5-5', agentId: 'a1' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const spawn = (subagentType: string) => $.agent.spawn({ prompt: 'x', subagentType } as never) as Promise<{ model?: string }>
  const explore = await spawn('Explore')
  const other = await spawn('general-purpose')
  expect(explore.model).toBe('haiku')
  expect(other.model).toBe('claude-opus-5-5')
})

test('the pane lists the mod settings and changes them, for the desktop app where /config is the app window', async ($, on) => {
  engine(on)
  const ROWS = [
    { key: 'ai-usage-meter.cacheClock', label: 'Cache clock', kind: 'boolean', value: true },
    { key: 'ai-usage-meter.cacheMinutes', label: 'Cache clock: cache lifetime (minutes)', kind: 'number', value: 60 },
    { key: 'ai-usage-meter.readerMode', label: 'Haiku reader', kind: 'choice', value: 'off', options: ['off', 'search', 'summary'] },
    { key: 'ai-usage-meter.colorOk', label: 'Colour: below the warnings', kind: 'text', value: '#3FB950' },
    { key: 'theme', label: 'Theme', kind: 'choice', value: 'dark', options: ['dark', 'light'] }, // not the mod's
  ].map(r => ({ ...r, isLocked: false, provider: { plugin: r.key.startsWith('ai-usage-meter') ? 'ai-usage-meter' : 'engine', tier: 'core' } }))
  const set: [string, unknown][] = []
  on('config.list', () => ({ value: ROWS }) as never)
  on('config.set', (_, e) => {
    set.push([e.key, e.value])
    return { value: e.value } as never
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await pane.find({ type: 'Text', text: /^Cache clock$/ })).toBeFalsy() // closed until Settings is clicked
  await pane.press({ key: 'settings' })
  expect(await pane.find({ type: 'Text', text: /^Cache clock$/ })).toBeTruthy()
  expect(await pane.find({ type: 'Text', text: /^Theme$/ })).toBeFalsy() // only the mod's own rows
  await pane.press({ key: 'set:cacheClock' })
  await pane.press({ key: 'dec:cacheMinutes' })
  await pane.press({ key: 'set:readerMode' })
  expect(await pane.find({ type: 'Button', key: 'set:colorOk' })).toBeFalsy() // colours: no button
  await pane.unmount()
  expect(set).toEqual([
    ['ai-usage-meter.cacheClock', false],
    ['ai-usage-meter.cacheMinutes', 5],
    ['ai-usage-meter.readerMode', 'search'],
  ])
})

test('/meter settings opens the pane with the settings shown', async ($, on) => {
  const calls: string[] = []
  engine(on, calls)
  on('config.list', () => ({ value: [{ key: 'ai-usage-meter.blink', label: 'Blink at red', kind: 'boolean', value: true, isLocked: false, provider: { plugin: 'ai-usage-meter', tier: 'core' } }] }) as never)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'settings', ...TYPED })
  expect(calls).toContain('open')
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await pane.find({ type: 'Text', text: /^Blink at red$/ })).toBeTruthy()
  await pane.unmount()
})

test('before the first message the band shows Start session, even without figures; /meter start runs it', async ($, on) => {
  const sent: string[] = []
  const clock = routineEngine(on, sent) // USAGE has no rate limits: a brand-new session, no figures yet
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Button', key: 'start' })).toBeTruthy()
  await band.unmount()

  await $.command.run({ command: 'meter', args: 'start', ...TYPED })
  expect(sent).toHaveLength(0) // sent just after the command, not while it is handled
  await clock.advance(100)
  expect(sent).toHaveLength(1)
  expect(sent[0]).toContain('Before anything else') // the Start session prompt (Prompt 0)
})

// ---------- the HTML companion ----------

const PLAN_MD = ['# Migration plan', '', '## Steps', ...Array.from({ length: 8 }, (_, i) => `${i + 1}. Step ${i + 1}: move part ${i + 1} → the new server, then check it.`), '', ...Array.from({ length: 60 }, (_, i) => `Line ${i} of the background and the decisions behind this plan.`)].join('\n')

function htmlEngine(on: On, files: Record<string, string>, sent: string[], suggested: string[]) {
  const clock = engine(on)
  const at = (path: string) => path.replace(/\\/g, '/') // the engine hands over Windows paths with backslashes
  on('fs.read', (_, e) => {
    const f = files[at(e.path)]
    if (f === undefined) throw new Error('no file')
    return { value: f }
  })
  on('fs.exists', (_, e) => ({ value: at(e.path) in files }))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)
    return { text: e.text }
  })
  on('prompt.suggest', (_, e) => {
    suggested.push(e.text)
    return { isShown: true } as never
  })
  on('tool.call', () => ({ result: 'ok', text: 'ok' }))
  on('turn.complete', () => ({ text: '' }))
  on('config.set', (_, e) => ({ value: e.value }) as never)
  return clock
}

test('after a long plan is written, the HTML version is offered; taking the offer sends the HTML rules', async ($, on) => {
  const sent: string[] = []
  const suggested: string[] = []
  const clock = htmlEngine(on, { 'D:/Dev/MyProject/Plan.md': PLAN_MD }, sent, suggested)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })

  await $.tool.call({ tool: 'Write', file_path: 'D:/Dev/MyProject/Plan.md', content: PLAN_MD })
  await $.turn.complete(turnEnd('Plan written.'))
  await clock.advance(400)
  expect(suggested).toEqual(['Make the HTML version of Plan.md'])
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Button', key: 'htmlYes' })).toBeTruthy()
  await band.unmount()

  await $.prompt.submit({ text: 'Make the HTML version of Plan.md' } as never) // Tab, then Enter
  expect(sent[0]).toContain('D:/Dev/MyProject/Plan.html')
  expect(sent[0]).toContain('Companion HTML view')
  expect(sent[0]).toContain('inline SVG')
  const band2 = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band2.find({ type: 'Button', key: 'htmlYes' })).toBeFalsy() // the offer is gone
  await band2.unmount()
})

test('no offer for short files, the project notes, a helper agent, or with the companion off', { options: { htmlCompanion: 'off' } }, async ($, on) => {
  const sent: string[] = []
  const suggested: string[] = []
  const clock = htmlEngine(on, { 'D:/Dev/MyProject/Plan.md': PLAN_MD }, sent, suggested)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: 'D:/Dev/MyProject/Plan.md', content: PLAN_MD })
  await $.turn.complete(turnEnd('Done.'))
  await clock.advance(400)
  expect(suggested).toHaveLength(0)
})

test('the notes, short texts and helper agents get no offer', async ($, on) => {
  const sent: string[] = []
  const suggested: string[] = []
  const files = { 'D:/Dev/P/Session_Notes.md': PLAN_MD, 'D:/Dev/P/MEMORY.md': PLAN_MD, 'D:/Dev/P/Short.md': '# Plan\n\n1. one\n2. two\n', 'D:/Dev/P/Big.md': PLAN_MD }
  const clock = htmlEngine(on, files, sent, suggested)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const f of ['Session_Notes.md', 'MEMORY.md', 'Short.md']) {
    await $.tool.call({ tool: 'Write', file_path: `D:/Dev/P/${f}`, content: 'x' })
    await $.turn.complete(turnEnd('Done.'))
    await clock.advance(400)
  }
  await $.tool.call({ tool: 'Write', file_path: 'D:/Dev/P/Big.md', content: 'x', agentId: 'agent-1' }) // a helper's write
  await $.turn.complete(turnEnd('Done.'))
  await clock.advance(400)
  expect(suggested).toHaveLength(0)
})

test('two offers in a row not taken pause the offers; /meter html ask turns them on again', async ($, on) => {
  const sent: string[] = []
  const suggested: string[] = []
  const files = { 'D:/Dev/P/Plan.md': PLAN_MD, 'D:/Dev/P/Spec.md': PLAN_MD, 'D:/Dev/P/Design.md': PLAN_MD }
  const clock = htmlEngine(on, files, sent, suggested)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const write = async (f: string) => {
    await $.tool.call({ tool: 'Write', file_path: `D:/Dev/P/${f}`, content: 'x' })
    await $.turn.complete(turnEnd('Done.'))
    await clock.advance(400)
  }
  await write('Plan.md')
  await $.prompt.submit({ text: 'Now fix the tests' } as never) // not taken: 1
  await write('Spec.md')
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'htmlNo' }) // 2: paused
  await band.unmount()
  await write('Design.md')
  expect(suggested).toEqual(['Make the HTML version of Plan.md', 'Make the HTML version of Spec.md'])
  expect(sent).toEqual(['Now fix the tests'])

  await $.command.run({ command: 'meter', args: 'html ask', ...TYPED }) // offers on again
  await $.tool.call({ tool: 'Edit', file_path: 'D:/Dev/P/Design.md', old_string: 'a', new_string: 'b' })
  await $.turn.complete(turnEnd('Done.'))
  await clock.advance(400)
  expect(suggested[2]).toBe('Make the HTML version of Design.md')
})

test('when Claude Code cannot list or change settings (2.1.326 on the desktop), the pane still lists and changes them', async ($, on) => {
  engine(on)
  const broken = () => {
    throw new TypeError("Cannot destructure property 'configRowHandles' from null or undefined value")
  }
  const MANIFEST = JSON.stringify({
    name: 'ai-usage-meter',
    userConfig: {
      cacheClock: { type: 'boolean', title: 'Cache clock', default: true },
      cacheMinutes: { type: 'number', title: 'Cache clock: cache lifetime (minutes)', default: 60 },
      htmlCompanion: { type: 'string', title: 'HTML companion', default: 'ask', options: ['ask', 'on', 'off'] },
    },
  })
  on('fs.read', (_, e) => {
    if (/plugin\.json$/.test(e.path)) return { value: MANIFEST }
    throw new Error('no file')
  })
  on('config.list', broken)
  on('config.set', broken)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'settings' })
  expect(await pane.find({ type: 'Text', text: /could not be read/ })).toBeFalsy()
  expect(await pane.find({ type: 'Text', text: /^Cache clock$/ })).toBeTruthy()
  expect((await pane.find({ type: 'Button', key: 'set:cacheClock' }))?.props.label).toBe('On')
  await pane.press({ key: 'set:cacheClock' })
  expect((await pane.find({ type: 'Button', key: 'set:cacheClock' }))?.props.label).toBe('Off')
  await pane.press({ key: 'dec:cacheMinutes' })
  expect(await pane.find({ type: 'Text', text: /^5 min$/ })).toBeTruthy()
  await pane.press({ key: 'set:htmlCompanion' })
  expect((await pane.find({ type: 'Button', key: 'set:htmlCompanion' }))?.props.label).toBe('on')
  await pane.unmount()
})

// ---------- languages ----------

test('in Dutch the band, the pane and the settings speak Dutch; buttons and Session, Week, Compress stay English', { options: { language: 'nl' } }, async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })
  await $.command.run({ command: 'meter', args: 'demo here 85', ...TYPED })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /85% tot comprimeren: rond de taak af en werk je sessienotities bij/ })).toBeTruthy()
  expect(await band.find({ type: 'Text', text: /^Compress$/ })).toBeTruthy()
  expect(await band.find({ type: 'Button', key: 'notes' })).toBeTruthy() // Write session notes, in English
  await band.unmount()
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await pane.find({ type: 'Text', text: /^Andere sessies op deze pc$/ })).toBeTruthy()
  expect(await pane.find({ type: 'Text', text: /^Session \(limiet van 5 uur\)$/ })).toBeTruthy()
  await pane.press({ key: 'settings' })
  expect(await pane.find({ type: 'Text', text: /^Instellingen$/ })).toBeTruthy()
  await pane.unmount()
})

test('/meter language fr switches the band to French at once', async ($, on) => {
  engine(on)
  on('config.set', (_, e) => ({ value: e.value }) as never)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'meter', args: 'demo 40', ...TYPED })
  await $.command.run({ command: 'meter', args: 'demo here 93', ...TYPED })
  let band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /93% to compaction: start a new session/ })).toBeTruthy()
  await band.unmount()
  const r = (await $.command.run({ command: 'meter', args: 'language fr', ...TYPED })) as { text?: string }
  expect(r.text).toContain('Français')
  band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /93 % avant la compaction : démarrez une nouvelle session/ })).toBeTruthy()
  await band.unmount()
  const bad = (await $.command.run({ command: 'meter', args: 'language xx', ...TYPED })) as { text?: string }
  expect(bad.text).toContain('/meter language en|nl|fr|de')
})

test('in German the HTML offer and its Tab suggestion are German, and "ja" accepts it', { options: { language: 'de' } }, async ($, on) => {
  const sent: string[] = []
  const suggested: string[] = []
  const clock = htmlEngine(on, { 'D:/Dev/MyProject/Plan.md': PLAN_MD }, sent, suggested)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: 'D:/Dev/MyProject/Plan.md', content: PLAN_MD })
  await $.turn.complete(turnEnd('Plan geschrieben.'))
  await clock.advance(400)
  expect(suggested).toEqual(['Erstelle die HTML-Version von Plan.md'])
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /^Eine HTML-Version von Plan\.md\?$/ })).toBeTruthy()
  await band.unmount()
  await $.prompt.submit({ text: 'ja' } as never)
  expect(sent[0]).toContain('Companion HTML view') // the rules for Claude stay English
})
