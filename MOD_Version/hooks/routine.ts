// Close session and Start session: Hans's two prompts (prompts/*.md, shipped in the mod), the lines the mod
// adds to them, and reading Claude's status line and hand-over back from the reply. Pure functions.

export type RoutineTask = 'close' | 'start'

export const PROMPT_FILES: Record<RoutineTask, string> = {
  close: 'prompts/End_Session_Prompt_v1.1.md',
  start: 'prompts/New_Session_Prompt_v1.3.md',
}

// The steps each prompt reports, for the progress in %.
export const STEPS: Record<RoutineTask, number> = { close: 6, start: 4 }

export const PROGRESS_TOOL = 'session_progress'
export const PROGRESS_TOOL_FULL = `mcp__ai-usage-meter__${PROGRESS_TOOL}`

// Marks a prompt the mod sent, so its turn can be recognised.
export const MARK = '--- Added by the AI Usage Meter mod ---'

// The last line of Close session, word for word as STEP 6 of the End Session prompt gives it.
export const CLOSE_YES = 'You are safe to close this session now'
export const CLOSE_NO = "!!! It's NOT safe to close this session, risk of losing data !!!"

const HANDOVER_OPEN = '<<<NEXT_SESSION'
const HANDOVER_CLOSE = 'NEXT_SESSION>>>'

// The first ```text block after the heading that matches: the prompt itself, without the notes around it.
export function extractPrompt(markdown: string, heading: RegExp): string | undefined {
  const lines = markdown.split(/\r?\n/)
  const at = lines.findIndex(l => heading.test(l))
  if (at < 0) return undefined
  const open = lines.findIndex((l, i) => i > at && l.trim().startsWith('```'))
  if (open < 0) return undefined
  const close = lines.findIndex((l, i) => i > open && l.trim() === '```')
  if (close < 0) return undefined
  return lines.slice(open + 1, close).join('\n').trim()
}

export const HEADINGS: Record<RoutineTask, RegExp> = {
  close: /^##\s+The prompt/i,
  start: /^##\s+Prompt 0\b/i,
}

const BACKUPS =
  '- Backups (STEP 5): in a git repository where a file has no uncommitted changes, git already keeps the ' +
  'old version: make no backup file for it, and say so. Otherwise make the backup as the prompt says.'

// A session that already wrote a note (a pause note with steps still to do) must not lose it to the
// close: one entry per session, and every open step carried on until it is done.
export const SAME_SESSION_NOTE =
  '- Session notes (STEP 5): if the latest entry was written in this same session (for example a pause note ' +
  'with steps still to do), do not add a second entry beside it: update that entry. Keep every open step it ' +
  'lists, word for word, unless it is done now, and say which ones you closed. Never delete or shorten an ' +
  'older entry.'

export function closePrompt(template: string, folder: string) {
  return [
    // Older prompt copies have a <project folder> to fill in; since v1.1 the folder line below answers it
    template.replace(/<project folder>/g, () => folder),
    '',
    MARK,
    `- Project folder: ${folder}.`,
    '- This message counts as my "go": do not stop to wait for it. Do STEP 1 to STEP 6 in one go.',
    BACKUPS,
    SAME_SESSION_NOTE,
    `- After each STEP, call the tool ${PROGRESS_TOOL_FULL} with {"task": "close", "step": <1-6>, "total": 6, "note": "<a few words>"}.`,
    `- In STEP 6, put the exact first message for the next session between a line ${HANDOVER_OPEN} and a line ${HANDOVER_CLOSE}.`,
    `- After that, the very last line of your reply is "${CLOSE_YES}" or "${CLOSE_NO} – <reason>", exactly as STEP 6 says.`,
  ].join('\n')
}

export function startPrompt(template: string, folder: string, handover?: string) {
  const task = handover ? 'continue from the hand-over of the previous session, below' : 'propose the next step from the latest note'
  return [
    // A function as the replacement: a folder name is never read as a $-pattern
    template.replace(/<project folder>/g, () => folder).replace(/<one task, or "propose the next step">/g, () => task),
    '',
    MARK,
    // Since v1.3 the prompt first asks for the folder and the task: these lines answer, so one click runs on
    `- My answers to your questions: Project folder: ${folder}. Today's task: ${task}. Do not ask them again.`,
    '- This message counts as my "go" for this start: in case NEW, create the files you propose (never overwrite ' +
      'an existing file); in case RE-START, read and run the health check; in case BROKEN, only report.',
    `- After each step, call the tool ${PROGRESS_TOOL_FULL} with {"task": "start", "step": <1-4>, "total": 4, "note": "<a few words>"}: ` +
      '1 find the case, 2 read or create the files, 3 the health check, 4 the status.',
    '- End your reply with the line "Ready to start: YES" or "Ready to start: NO – <reason>".',
    ...(handover ? ['', 'Hand-over from the previous session:', handover] : []),
  ].join('\n')
}

export type RoutineOutcome = { ok: boolean; reason?: string }

// The status line at the end of Claude's reply; undefined when there is none.
export function readOutcome(task: RoutineTask, answer: string): RoutineOutcome | undefined {
  if (task === 'close') {
    const no = /it[’']?s\s+NOT\s+safe\s+to\s+close\s+this\s+session/i
    const yes = /you\s+are\s+safe\s+to\s+close\s+this\s+session/i
    const old = /Safe to close:?\s*(YES|NO)\b/i
    const lines = answer.split(/\r?\n/).map(l => l.replace(/[*_`]/g, '').trim()).filter(l => no.test(l) || yes.test(l) || old.test(l))
    const last = lines[lines.length - 1]
    if (last && no.test(last)) {
      // The reason comes after the warning: "… risk of losing data !!! – <reason>"
      const reason = last
        .replace(/^.*?close\s+this\s+session/i, '')
        .replace(/^[\s,]*risk\s+\w+\s+los\w*\s+data/i, '')
        .replace(/^[\s!]*[-–—:]?\s*/, '')
        .trim()
      return { ok: false, reason: reason || "see Claude's reply" }
    }
    if (last && yes.test(last)) return { ok: true }
    // Older prompt copies end with "Safe to close: YES" or "Safe to close: NO – <reason>": read below
  }
  const label = task === 'close' ? 'Safe to close' : 'Ready to start'
  const lines = answer.split(/\r?\n/).filter(l => l.includes(label))
  const last = lines[lines.length - 1]
  if (!last) return undefined
  const m = new RegExp(`${label}:?\\s*\\**\\s*(YES|NO)\\b\\**\\s*[-–—:]?\\s*(.*)$`, 'i').exec(last.replace(/[*_`]/g, ''))
  if (!m) return undefined
  const ok = (m[1] ?? '').toUpperCase() === 'YES'
  const reason = (m[2] ?? '').trim()
  return ok ? { ok } : { ok, reason: reason || 'see Claude\'s reply' }
}

// The first message for the next session, between the hand-over markers.
export function readHandover(answer: string): string | undefined {
  const a = answer.indexOf(HANDOVER_OPEN)
  const b = answer.indexOf(HANDOVER_CLOSE, a + 1)
  if (a < 0 || b < 0) return undefined
  const text = answer
    .slice(a + HANDOVER_OPEN.length, b)
    .replace(/^\s*```\w*\s*|\s*```\s*$/g, '')
    .trim()
  return text.length > 0 ? text.slice(0, 4000) : undefined
}
