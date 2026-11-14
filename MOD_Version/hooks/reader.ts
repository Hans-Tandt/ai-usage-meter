// The Haiku reader and the token counter per model. Pure functions: what the reader is told, what Opus
// is told when it reads a lot, and how tokens are added up. The hooks are in register.tsx.

import type { RobotModel } from './robot'

export type ReaderMode = 'off' | 'search' | 'summary'
export const READER_AGENT = 'ai-usage-meter:reader'
export const READ_TOOLS = ['Read', 'Grep', 'Glob']

// Tokens per model family; `other` is any model the mod doesn't know.
export type ModelTokens = Record<RobotModel, number>
export const NO_TOKENS: ModelTokens = { opus: 0, sonnet: 0, haiku: 0, fable: 0, other: 0 }

export function readerMode(v: unknown): ReaderMode {
  return v === 'search' || v === 'summary' ? v : 'off'
}

export function readerThreshold(v: unknown) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(500, Math.round(v)) : 2000
}

// What one model request cost: everything the model took in (new, from cache, written to cache) and wrote.
export function requestTokens(u: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }) {
  return u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens + u.output_tokens
}

export function addTokens(a: ModelTokens, b: Partial<ModelTokens>): ModelTokens {
  const out = { ...a }
  for (const k of Object.keys(out) as RobotModel[]) out[k] += b[k] ?? 0
  return out
}

export function totalTokens(t: ModelTokens) {
  return t.opus + t.sonnet + t.haiku + t.fable + t.other
}

// Haiku's share of all tokens, in % (0 when nothing was counted yet).
export function haikuShare(t: ModelTokens) {
  const all = totalTokens(t)
  return all > 0 ? Math.round((t.haiku / all) * 100) : 0
}

// About 4 characters to a token: enough to tell when a turn has read a lot.
export function roughTokens(text: string | undefined) {
  return Math.ceil((text ?? '').length / 4)
}

// The reader's own instructions: it finds and quotes, it never changes anything.
export function readerPrompt(mode: ReaderMode) {
  return [
    'You are a reader. You never change, create or delete anything.',
    'Answer the question with:',
    '1. The relevant files, each with line numbers.',
    '2. The relevant lines, copied word for word, with file and line number.',
    ...(mode === 'summary' ? ['3. A short summary, at most 10 lines.'] : []),
    `${mode === 'summary' ? '4' : '3'}. Files you opened but found not relevant, one line each.`,
    'If you are not sure, say so. Never guess.',
  ].join('\n')
}

export const READER_DESCRIPTION =
  'Finds files and lines for a question, on Haiku, in its own context. Answers with file, line numbers and exact ' +
  'quotes. Use it for big searches and reading; read the found lines yourself, and always before you edit a file.'

// Told to the main model once per turn, after a read that takes the turn over the limit. Search mode keeps
// Opus reading the found lines itself; summary mode lets it use the reader's summary for questions.
export function readerNudge(mode: ReaderMode, readSoFar: number) {
  const use =
    mode === 'summary'
      ? 'it answers with file, line numbers, exact quotes and a short summary you may use for questions and overviews'
      : 'it answers with file, line numbers and exact quotes; then read only those lines yourself'
  return (
    `AI Usage Meter: this turn has read about ${readSoFar.toLocaleString('en')} tokens. For further searching and ` +
    `reading, use the agent ${READER_AGENT} (Haiku): ${use}. Always read a file yourself before you change it.`
  )
}
