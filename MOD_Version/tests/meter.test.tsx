import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

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
    title: 'AI Usage Meter',
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
    expect(await ui.find({ type: 'Text', text: /AI Usage Meter mod 1\.8\.0 · Hans Tandt · hanstandt\.be/ })).toBeTruthy()
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
  expect(await ui.find({ type: 'Text', text: /Change them in \/config/ })).toBeTruthy()
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
  expect(await ui.find({ type: 'Text', text: /Change them in \/config/ })).toBeTruthy()
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
