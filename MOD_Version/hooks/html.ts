// The HTML companion: after Claude writes a long Markdown document worth re-reading (a plan, a spec, a
// comparison, a flow), the mod offers an HTML version of it, as the prompt box's Tab suggestion and as a
// band button. Claude gets the HTML rules only when the person accepts, so nothing costs a token before
// that. The Markdown file stays the source of truth; the HTML is written next to it with the same name.
//
// Modes (/config "HTML companion", the pane's Settings, or /meter html on|ask|off):
//   ask (default): offer, and make it only on a yes;  on: make it after the turn by itself;  off: never.

export type HtmlMode = 'off' | 'ask' | 'on'

export function htmlMode(v: unknown): HtmlMode {
  return v === 'off' || v === 'on' ? v : 'ask'
}

// Files that stay Markdown only: the project's memory and log files, agent and Spec Kit task lists, and
// anything in tool or dependency folders.
const NEVER = /^(claude|memory|agents|changelog|tasks|old_notes)\.md$|session[_ -]?notes/i
const NEVER_DIR = /[\\/](\.git|\.claude|\.specify|node_modules)[\\/]/i

export function baseName(path: string) {
  return path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
}

export function isMarkdownCandidate(path: string): boolean {
  return /\.md$/i.test(path) && !NEVER.test(baseName(path)) && !NEVER_DIR.test(path)
}

export function htmlPathFor(path: string) {
  return path.replace(/\.md$/i, '.html')
}

// Worth an HTML version: at least two of these, as the idea file asks, and never for a short text:
//  - longer than about one screen;
//  - a kind of document you re-read (plan, spec, architecture, comparison, guide, …), by its name or title;
//  - a process, a flow, steps or a timeline, or a comparison table: something a diagram or layout helps;
//  - the person accepted an HTML version in this folder before.
const KIND = /\b(plan|planning|spec|specification|architecture|design|decision|comparison|compare|overview|proposal|roadmap|strategy|report|guide|manual|summary|analysis|review|workflow|process|flow)\b/i
const FLOW = /(→|->|=>|\bstep \d|\bphase\b|\bstage\b|\btimeline\b|\bworkflow\b|\bdepends on\b|\bsequence\b)/gi

export function htmlWorth(name: string, text: string, acceptedBefore: boolean): boolean {
  if (text.length < 1200) return false
  const lines = text.split('\n')
  const long = text.length >= 3000 || lines.length >= 60
  const title = lines.find(l => /^#\s/.test(l)) ?? ''
  const kind = KIND.test(name.replace(/[_-]/g, ' ')) || KIND.test(title)
  const numbered = lines.filter(l => /^\s*\d+[.)]\s/.test(l)).length
  const tableRows = lines.filter(l => /^\s*\|.*\|\s*$/.test(l)).length
  const flow = (text.match(FLOW) ?? []).length >= 3 || numbered >= 5 || tableRows >= 5 || /```mermaid/i.test(text)
  return [long, kind, flow, acceptedBefore].filter(Boolean).length >= 2
}

// The words of the offer: the Tab suggestion in the prompt box, and what the person sends to accept it.
export function offerText(name: string, update: boolean, lang: string = 'en') {
  const t: Record<string, [string, string]> = {
    en: [`Make the HTML version of ${name}`, `Update the HTML version of ${name}`],
    nl: [`Maak de HTML-versie van ${name}`, `Werk de HTML-versie van ${name} bij`],
    fr: [`Crée la version HTML de ${name}`, `Mets à jour la version HTML de ${name}`],
    de: [`Erstelle die HTML-Version von ${name}`, `Aktualisiere die HTML-Version von ${name}`],
  }
  const [make, upd] = t[lang] ?? t.en ?? ['', '']
  return update ? upd : make
}

export function isAccept(text: string, offer: string) {
  const t = text.trim().replace(/[.!]+$/, '').toLowerCase()
  return t === offer.toLowerCase() || ['yes', 'ja', 'oui', 'html'].includes(t)
}

// What Claude gets once the person said yes.
export function htmlPrompt(path: string, update: boolean) {
  const html = htmlPathFor(path)
  return [
    `${update ? 'Update' : 'Make'} the companion HTML version of \`${path}\`, as \`${html}\`.`,
    '',
    'Rules:',
    '- The Markdown file stays the source of truth: do not change it. Use only what it says; add nothing new.',
    '- One self-contained HTML file: all CSS inside it, no external links, scripts, fonts or libraries, so it works offline and can be sent as one file.',
    '- At the top, a small note: "Companion HTML view — Markdown remains the source of truth."',
    '- A table of contents: a sticky sidebar on a wide screen, at the top on a narrow one.',
    '- Turn clear processes, flows, relationships, hierarchies or timelines into simple diagrams drawn as inline SVG (no Mermaid, no JavaScript libraries). Keep them small and readable.',
    '- Clean, readable styling that works in light and dark mode (prefers-color-scheme). Clarity over decoration.',
    '- Keep the file compact: no heavy custom JavaScript.',
    `When it is written, give the path of the HTML file in one line.`,
  ].join('\n')
}
