// The mod's screen texts in English, Dutch, French and German (setting "Language"). Product words stay English in
// every language, as in the manuals: Session, Week, Compress and all button labels (Details, Close session, Start
// session, Write session notes, Compact, Keep warm, Settings, Make it, On, Off…). What the mod sends to Claude
// (the Safe Start prompts, the reader's note, the HTML rules) stays English: Claude reads it, not the person.

export type Lang = 'en' | 'nl' | 'fr' | 'de'
export const LANGS: readonly Lang[] = ['en', 'nl', 'fr', 'de']
export const LANG_NAMES: Record<Lang, string> = { en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch' }

export function toLang(v: unknown): Lang {
  return v === 'nl' || v === 'fr' || v === 'de' ? v : 'en'
}

export type Strings = {
  units: { m: string; h: string; d: string }
  colon: string // ': ', or ' : ' in French
  days: readonly string[] // Sunday first
  // the band
  hundredIn: (name: string, d: string) => string
  limitsUpdated: (d: string) => string
  cacheNote: (d: string) => string
  cacheCold: string
  other: (folder: string, pct: number) => string
  newSession: string
  nextTurn: string
  turnsShort: (n: number) => string
  ofWindowShort: string
  htmlOffer: (name: string, update: boolean) => string
  // the context warning (band, pane, status line, message)
  tokensWhat: (n: string) => string
  toCompaction: (pct: number) => string
  startNew: string
  finishTask: string
  // Close session / Start session
  closing: string
  preparing: string
  waiting: (name: string) => string
  step: (name: string, step: number, total: number, pct: number, note?: string) => string
  safeToEnd: string
  readyToStart: string
  notSafe: string
  notReady: string
  seeReply: string
  stoppedLine: (task: string, reason: string) => string
  stoppedAt: (step: number, total: number) => string
  // the pane
  sessionTitle: string
  weekTitle: string
  compressTitle: string
  noFigure: string
  resets: (when: string, d: string) => string
  paceFull: (d: string) => string
  paceOk: string
  limitsUpdatedLong: (d: string, stale: boolean) => string
  noLimits: string
  ofWindow: string
  toCompactionShort: string
  tokensOf: (n: string, point?: string, window?: string) => string
  lastTurns: string
  nextTurnReaches: string
  moreTurns: (n: number) => string
  compacted: (n: number, at: string) => string
  notCompacted: string
  cost: (usd: string) => string
  warnRedHelp: string
  warnYellowHelp: string
  sessionHeader: string
  routineHelp: string
  cacheHeader: string
  warmFor: (d: string) => string
  cold: string
  conversation: string
  tokens: (n: string) => string
  warmHelp: (size: string) => string
  coldHelp: (size: string) => string
  readerHeader: string
  share: (pct: number, runs: number) => string
  noTokens: string
  tokensRow: string
  sessionCol: string
  weekCol: string
  shareRow: string
  runsRow: string
  otherModel: string
  helpersMoved: (n: number) => string
  modeSummary: string
  modeSearch: string
  readerWhen: (n: string) => string
  readerShareNote: string
  othersHeader: string
  noneLive: string
  ago: (d: string) => string
  levels: (w1: number, w2: number, s1: number, s2: number) => string
  stripDecides: string
  model: (name: string) => string
  // the Settings section
  settingsHeader: string
  settingsUnread: string
  settingsFoot: string
  settingsStrip: string
  locked: (shown: string) => string
  minutes: (n: number) => string
  tokensN: (n: string) => string
  off: string
  sizes: Record<number, string>
  labels: Record<string, string>
  // short messages and /meter answers
  cantChange: (why?: string) => string
  htmlPaused: string
  cacheAlreadyCold: string
  warmed: string
  warmFailed: (why?: string) => string
  routineBusy: string
  promptMissing: (file: string) => string
  promptRefused: string
  routineDone: (close: boolean) => string
  routineNotDone: (what: string, reason: string) => string
  limitReset: (name: string, pct: number) => string
  limitAt: (name: string, pct: number, red: boolean) => string
  limitName: (kind: 'five_hour' | 'seven_day') => string
  bandHidden: string
  compactionRan: string
  sent: (task: string) => string
  paneClosed: string
  paneOpened: string
  widen: string
  htmlMode: (m: string) => string
  htmlNone: string
  htmlMaking: (name: string) => string
  settingsAtBottom: string
  languageSet: (name: string) => string
  languageUsage: string
  demoOff: string
  demoHere: (pct: number) => string
  demoContext: (name: string, pct: number) => string
  demoLimits: (pct: number, week: number) => string
}

const EN: Strings = {
  units: { m: 'm', h: 'h', d: 'd' },
  colon: ': ',
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  hundredIn: (name, d) => `${name}: 100% in ${d}`,
  limitsUpdated: d => `limits updated ${d} ago`,
  cacheNote: d => `cache ${d}`,
  cacheCold: 'cache cold',
  other: (folder, pct) => `other: ${folder} ${pct}%`,
  newSession: 'New session:',
  nextTurn: 'next turn',
  turnsShort: n => `~${n} turns`,
  ofWindowShort: 'of window',
  htmlOffer: (name, update) => (update ? `Update the HTML version of ${name}?` : `An HTML version of ${name}?`),
  tokensWhat: n => `${n} tokens`,
  toCompaction: pct => `${pct}% to compaction`,
  startNew: 'start a new session',
  finishTask: 'finish the task and update your session notes',
  closing: 'Closing session',
  preparing: 'Preparing session',
  waiting: name => `${name}: waiting for Claude to finish the current reply…`,
  step: (name, step, total, pct, note) => `${name}… step ${step} of ${total} · ${pct}%${note ? ` · ${note}` : ''}`,
  safeToEnd: "✓ Now it's safe to end this session",
  readyToStart: '✓ Everything is ready to start this session',
  notSafe: "It's NOT safe to close this session",
  notReady: 'Not ready to start',
  seeReply: "see Claude's reply",
  stoppedLine: (task, reason) => `${task} ${reason}: check Claude's reply`,
  stoppedAt: (step, total) => `stopped at step ${step} of ${total}`,
  sessionTitle: 'Session (5-hour limit)',
  weekTitle: 'Week (weekly limit)',
  compressTitle: "Compress (this session's context)",
  noFigure: "No figure yet: it comes with Claude's next reply.",
  resets: (when, d) => `Resets ${when}, in ${d}`,
  paceFull: d => `At this pace: 100% in ${d}, before the reset`,
  paceOk: 'At this pace the reset comes first',
  limitsUpdatedLong: (d, stale) => `Limits updated ${d} ago${stale ? ': old figures, Claude Code reports new ones with its next reply' : ''}`,
  noLimits: 'No limits reported yet',
  ofWindow: 'of the window',
  toCompactionShort: 'to compaction',
  tokensOf: (n, point, window) => `${n} tokens${point ? ` of ${point} (compaction point)` : ''}${window ? ` · window ${window}` : ''}`,
  lastTurns: 'Last turns',
  nextTurnReaches: 'the next turn like these will reach compaction',
  moreTurns: n => `about ${n} more turns like these before compaction`,
  compacted: (n, at) => `Compacted ${n}× in this session, last at ${at}`,
  notCompacted: 'Not compacted yet in this session',
  cost: usd => `  ·  cost so far $${usd} (API prices)`,
  warnRedHelp: 'After compaction Claude keeps only a summary of the older conversation. Write down what matters, then start a new session.',
  warnYellowHelp: 'Write down what was done, the decisions and the next steps, so a new session can continue.',
  sessionHeader: 'Session',
  routineHelp:
    'Close session checks and updates CLAUDE.md, MEMORY.md and the session notes, then says when it is safe to close. Start session reads them (or creates them in a new project) and picks up where the last session stopped.',
  cacheHeader: 'Cache',
  warmFor: d => `warm for ${d}`,
  cold: 'cold',
  conversation: 'the conversation',
  tokens: n => `${n} tokens`,
  warmHelp: size => `Keep warm asks one tiny question, which re-reads ${size} from the cache: cheaper than new input, but it counts.`,
  coldHelp: size => `Your next message re-reads ${size} at full price, once; after that it is cached again.`,
  readerHeader: 'Haiku reader',
  share: (pct, runs) => `Haiku ${pct} % · ${runs} runs`,
  noTokens: 'no tokens counted yet',
  tokensRow: 'Tokens',
  sessionCol: 'session',
  weekCol: 'this week',
  shareRow: 'Haiku share',
  runsRow: 'Reader runs',
  otherModel: 'Other',
  helpersMoved: n => `Search helpers (Explore) started on Haiku: ${n}`,
  modeSummary: 'Mode: search and summarize. Haiku finds the lines and adds a short summary.',
  modeSearch: 'Mode: search only. Haiku finds files and lines; Opus reads those lines itself.',
  readerWhen: n => `When Opus reads more than ${n} tokens in one turn, it is asked to use the reader. Mode and limit are under Settings at the bottom of this pane.`,
  readerShareNote: "Haiku's share is of tokens, not of your limits: a Haiku token costs less. Claude Code's own helpers may also run on Haiku.",
  othersHeader: 'Other sessions on this PC',
  noneLive: 'None live.',
  ago: d => ` · ${d} ago`,
  levels: (w1, w2, s1, s2) => `Levels: limits ${w1}/${w2}%, context ${s1}/${s2}%.`,
  stripDecides: " The AI Usage Meter strip's Settings decide them.",
  model: name => `Model: ${name}`,
  settingsHeader: 'Settings',
  settingsUnread: 'The settings could not be read here. In a terminal: claude, then /config.',
  settingsFoot: 'A change applies at once. The colours are changed in a terminal: type claude, then /config.',
  settingsStrip:
    " The AI Usage Meter strip is installed: its Settings window decides the levels, colours and messages, unless you switch off \"Use the strip's Settings\".",
  locked: shown => `${shown} (set by your organization)`,
  minutes: n => `${n} min`,
  tokensN: n => `${n} tokens`,
  off: 'off',
  sizes: { 2: 'small', 3: 'medium', 4: 'large' },
  labels: {
    language: 'Language',
    useStripSettings: "Use the strip's Settings when it is installed",
    warn1: 'Limits: first warning (%)',
    warn2: 'Limits: second warning (%)',
    sessLevel1: 'Context: yellow from (% of compaction)',
    sessLevel2: 'Context: red from (% of compaction)',
    notify: 'Message at the limit warnings',
    notifyReset: 'Message when a limit resets',
    notifyCompaction: 'Message when compaction has run',
    blink: 'Blink at red',
    robot: 'Little robot in the band',
    robotPerModel: 'Robot: a different robot for each model',
    robotEffort: 'Robot: show the effort level',
    robotSize: 'Robot size',
    tokenYellow: 'Context: yellow from (tokens)',
    tokenRed: 'Context: red from (tokens)',
    cacheClock: 'Cache clock',
    cacheMinutes: 'Cache clock: cache lifetime (minutes)',
    exploreOnHaiku: 'Search helpers (Explore) on Haiku',
    readerMode: 'Haiku reader',
    readerThreshold: 'Haiku reader: from (tokens read in one turn)',
    htmlCompanion: 'HTML companion',
    staleMinutes: 'Figures are old after (minutes)',
    colorOk: 'Colour: below the warnings',
    colorWarn: 'Colour: first warning (orange / yellow)',
    colorDanger: 'Colour: second warning (red)',
  },
  cantChange: why => `this setting can't be changed here${why ? ` (${why})` : ''}.`,
  htmlPaused: 'no more HTML offers in this session. /meter html ask turns them on again.',
  cacheAlreadyCold: 'the cache is already cold; Keep warm only helps before it runs out.',
  warmed: 'cache kept warm for another period.',
  warmFailed: why => `Keep warm did not work${why ? ` (${why})` : ''}.`,
  routineBusy: 'a Close session or Start session is already running.',
  promptMissing: file => `the prompt file ${file} is missing or has no prompt block.`,
  promptRefused: 'Claude Code did not take the prompt. Try again when Claude is idle.',
  routineDone: close => (close ? "now it's safe to end this session." : 'everything is ready to start this session.'),
  routineNotDone: (what, reason) => `${what}: ${reason}. Check Claude's reply.`,
  limitReset: (name, pct) => `the ${name} has reset (${pct}% used).`,
  limitAt: (name, pct, red) => `${name} at ${pct}%.${red ? ' Finish what you are doing.' : ''}`,
  limitName: kind => (kind === 'five_hour' ? '5-hour limit' : 'weekly limit'),
  bandHidden: 'band hidden. /meter band on shows it again.',
  compactionRan: 'compaction ran. Older parts of this conversation are now a summary: check that paths, rules and decisions are still right.',
  sent: task => `${task} sent. The band shows its progress.`,
  paneClosed: 'pane closed.',
  paneOpened: 'pane opened.',
  widen: 'widen the window to see the pane.',
  htmlMode: m => `HTML companion ${m === 'ask' ? 'asks first' : m}.`,
  htmlNone: 'no Markdown document on offer for an HTML version. /meter html on|ask|off sets the mode.',
  htmlMaking: name => `making the HTML version of ${name}.`,
  settingsAtBottom: 'the settings are at the bottom of the pane.',
  languageSet: name => `language: ${name}.`,
  languageUsage: 'Usage: /meter language en|nl|fr|de',
  demoOff: 'Meter back to your real figures; demo sessions ended.',
  demoHere: pct => `Demo: this session at ${pct}% of compaction (until Claude's next reply). /meter demo off ends it.`,
  demoContext: (name, pct) => `Demo session "${name}" at ${pct}% of compaction. Type /meter demo off to end it.`,
  demoLimits: (pct, week) => `Demo: 5h at ${pct}%, week at ${week}%. Type /meter demo off to go back.`,
}

const NL: Strings = {
  units: { m: 'm', h: 'u', d: 'd' },
  colon: ': ',
  days: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
  hundredIn: (name, d) => `${name}: 100% over ${d}`,
  limitsUpdated: d => `limieten ${d} geleden bijgewerkt`,
  cacheNote: d => `cache ${d}`,
  cacheCold: 'cache koud',
  other: (folder, pct) => `andere: ${folder} ${pct}%`,
  newSession: 'Nieuwe sessie:',
  nextTurn: 'volgende beurt',
  turnsShort: n => `~${n} beurten`,
  ofWindowShort: 'van venster',
  htmlOffer: (name, update) => (update ? `De HTML-versie van ${name} bijwerken?` : `Een HTML-versie van ${name}?`),
  tokensWhat: n => `${n} tokens`,
  toCompaction: pct => `${pct}% tot comprimeren`,
  startNew: 'start een nieuwe sessie',
  finishTask: 'rond de taak af en werk je sessienotities bij',
  closing: 'Sessie afsluiten',
  preparing: 'Sessie voorbereiden',
  waiting: name => `${name}: wacht tot Claude het huidige antwoord afmaakt…`,
  step: (name, step, total, pct, note) => `${name}… stap ${step} van ${total} · ${pct}%${note ? ` · ${note}` : ''}`,
  safeToEnd: '✓ Je kunt deze sessie nu veilig afsluiten',
  readyToStart: '✓ Alles is klaar om deze sessie te starten',
  notSafe: 'Deze sessie afsluiten is NIET veilig',
  notReady: 'Niet klaar om te starten',
  seeReply: 'zie het antwoord van Claude',
  stoppedLine: (task, reason) => `${task} ${reason}: bekijk het antwoord van Claude`,
  stoppedAt: (step, total) => `gestopt bij stap ${step} van ${total}`,
  sessionTitle: 'Session (limiet van 5 uur)',
  weekTitle: 'Week (weeklimiet)',
  compressTitle: 'Compress (context van deze sessie)',
  noFigure: 'Nog geen cijfer: het komt met het volgende antwoord van Claude.',
  resets: (when, d) => `Reset ${when}, over ${d}`,
  paceFull: d => `In dit tempo: 100% over ${d}, voor de reset`,
  paceOk: 'In dit tempo komt de reset eerst',
  limitsUpdatedLong: (d, stale) => `Limieten ${d} geleden bijgewerkt${stale ? ': oude cijfers, Claude Code meldt nieuwe bij zijn volgende antwoord' : ''}`,
  noLimits: 'Nog geen limieten gemeld',
  ofWindow: 'van het venster',
  toCompactionShort: 'tot comprimeren',
  tokensOf: (n, point, window) => `${n} tokens${point ? ` van ${point} (comprimeerpunt)` : ''}${window ? ` · venster ${window}` : ''}`,
  lastTurns: 'Laatste beurten',
  nextTurnReaches: 'de volgende beurt zoals deze bereikt het comprimeren',
  moreTurns: n => `nog ongeveer ${n} beurten zoals deze voor het comprimeren`,
  compacted: (n, at) => `${n}× gecomprimeerd in deze sessie, laatst om ${at}`,
  notCompacted: 'Nog niet gecomprimeerd in deze sessie',
  cost: usd => `  ·  kosten tot nu $${usd} (API-prijzen)`,
  warnRedHelp: 'Na het comprimeren houdt Claude alleen een samenvatting van het oudere gesprek. Schrijf op wat belangrijk is en start dan een nieuwe sessie.',
  warnYellowHelp: 'Schrijf op wat er gedaan is, de beslissingen en de volgende stappen, zodat een nieuwe sessie verder kan.',
  sessionHeader: 'Sessie',
  routineHelp:
    'Close session controleert en werkt CLAUDE.md, MEMORY.md en de sessienotities bij en zegt dan wanneer je veilig kunt afsluiten. Start session leest ze (of maakt ze aan in een nieuw project) en gaat verder waar de vorige sessie stopte.',
  cacheHeader: 'Cache',
  warmFor: d => `warm voor ${d}`,
  cold: 'koud',
  conversation: 'het gesprek',
  tokens: n => `${n} tokens`,
  warmHelp: size => `Keep warm stelt één piepkleine vraag, die ${size} uit de cache leest: goedkoper dan nieuwe invoer, maar het telt mee.`,
  coldHelp: size => `Je volgende bericht leest ${size} één keer tegen de volle prijs; daarna staat het weer in de cache.`,
  readerHeader: 'Haiku-lezer',
  share: (pct, runs) => `Haiku ${pct} % · ${runs} runs`,
  noTokens: 'nog geen tokens geteld',
  tokensRow: 'Tokens',
  sessionCol: 'sessie',
  weekCol: 'deze week',
  shareRow: 'Aandeel Haiku',
  runsRow: 'Runs lezer',
  otherModel: 'Andere',
  helpersMoved: n => `Zoekhulpen (Explore) gestart op Haiku: ${n}`,
  modeSummary: 'Modus: zoeken en samenvatten. Haiku vindt de regels en voegt een korte samenvatting toe.',
  modeSearch: 'Modus: alleen zoeken. Haiku vindt bestanden en regels; Opus leest die regels zelf.',
  readerWhen: n => `Leest Opus meer dan ${n} tokens in één beurt, dan wordt gevraagd de lezer te gebruiken. Modus en grens staan bij Settings onderaan dit paneel.`,
  readerShareNote: 'Het aandeel van Haiku is een aandeel in tokens, niet in je limieten: een Haiku-token kost minder. Ook de eigen hulpen van Claude Code kunnen op Haiku lopen.',
  othersHeader: 'Andere sessies op deze pc',
  noneLive: 'Geen actief.',
  ago: d => ` · ${d} geleden`,
  levels: (w1, w2, s1, s2) => `Niveaus: limieten ${w1}/${w2}%, context ${s1}/${s2}%.`,
  stripDecides: ' De Settings van de AI Usage Meter-balk bepalen ze.',
  model: name => `Model: ${name}`,
  settingsHeader: 'Instellingen',
  settingsUnread: 'De instellingen konden hier niet gelezen worden. In een terminal: claude, dan /config.',
  settingsFoot: 'Een wijziging geldt meteen. De kleuren wijzig je in een terminal: typ claude, dan /config.',
  settingsStrip:
    ' De AI Usage Meter-balk is geïnstalleerd: zijn Settings-venster bepaalt de niveaus, kleuren en meldingen, tenzij je "De Settings van de balk gebruiken" uitzet.',
  locked: shown => `${shown} (ingesteld door je organisatie)`,
  minutes: n => `${n} min`,
  tokensN: n => `${n} tokens`,
  off: 'uit',
  sizes: { 2: 'klein', 3: 'middel', 4: 'groot' },
  labels: {
    language: 'Taal',
    useStripSettings: 'De Settings van de balk gebruiken als die geïnstalleerd is',
    warn1: 'Limieten: eerste waarschuwing (%)',
    warn2: 'Limieten: tweede waarschuwing (%)',
    sessLevel1: 'Context: geel vanaf (% van het comprimeren)',
    sessLevel2: 'Context: rood vanaf (% van het comprimeren)',
    notify: 'Melding bij de limietwaarschuwingen',
    notifyReset: 'Melding als een limiet gereset is',
    notifyCompaction: 'Melding na het comprimeren',
    blink: 'Knipperen bij rood',
    robot: 'Robotje in de band',
    robotPerModel: 'Robot: een robotje per model',
    robotEffort: 'Robot: het inspanningsniveau tonen',
    robotSize: 'Grootte van het robotje',
    tokenYellow: 'Context: geel vanaf (tokens)',
    tokenRed: 'Context: rood vanaf (tokens)',
    cacheClock: 'Cacheklok',
    cacheMinutes: 'Cacheklok: cacheduur (minuten)',
    exploreOnHaiku: 'Zoekhulpen (Explore) op Haiku',
    readerMode: 'Haiku-lezer',
    readerThreshold: 'Haiku-lezer: vanaf (tokens gelezen in één beurt)',
    htmlCompanion: 'HTML-companion',
    staleMinutes: 'Cijfers zijn oud na (minuten)',
    colorOk: 'Kleur: onder de waarschuwingen',
    colorWarn: 'Kleur: eerste waarschuwing (oranje / geel)',
    colorDanger: 'Kleur: tweede waarschuwing (rood)',
  },
  cantChange: why => `deze instelling kan hier niet gewijzigd worden${why ? ` (${why})` : ''}.`,
  htmlPaused: 'geen HTML-aanbod meer in deze sessie. /meter html ask zet het weer aan.',
  cacheAlreadyCold: 'de cache is al koud; Keep warm helpt alleen voor hij verloopt.',
  warmed: 'cache nog een periode warm gehouden.',
  warmFailed: why => `Keep warm is niet gelukt${why ? ` (${why})` : ''}.`,
  routineBusy: 'er loopt al een Close session of Start session.',
  promptMissing: file => `het promptbestand ${file} ontbreekt of heeft geen promptblok.`,
  promptRefused: 'Claude Code nam de prompt niet aan. Probeer opnieuw als Claude niets doet.',
  routineDone: close => (close ? 'je kunt deze sessie nu veilig afsluiten.' : 'alles is klaar om deze sessie te starten.'),
  routineNotDone: (what, reason) => `${what}: ${reason}. Bekijk het antwoord van Claude.`,
  limitReset: (name, pct) => `de ${name} is gereset (${pct}% gebruikt).`,
  limitAt: (name, pct, red) => `${name} op ${pct}%.${red ? ' Rond af waar je mee bezig bent.' : ''}`,
  limitName: kind => (kind === 'five_hour' ? 'limiet van 5 uur' : 'weeklimiet'),
  bandHidden: 'band verborgen. /meter band on toont hem weer.',
  compactionRan: 'er is gecomprimeerd. Oudere delen van dit gesprek zijn nu een samenvatting: controleer of paden, regels en beslissingen nog kloppen.',
  sent: task => `${task} verstuurd. De band toont de voortgang.`,
  paneClosed: 'paneel gesloten.',
  paneOpened: 'paneel geopend.',
  widen: 'maak het venster breder om het paneel te zien.',
  htmlMode: m => `HTML-companion ${m === 'ask' ? 'vraagt eerst' : m}.`,
  htmlNone: 'geen Markdown-document aangeboden voor een HTML-versie. /meter html on|ask|off stelt de modus in.',
  htmlMaking: name => `de HTML-versie van ${name} wordt gemaakt.`,
  settingsAtBottom: 'de instellingen staan onderaan het paneel.',
  languageSet: name => `taal: ${name}.`,
  languageUsage: 'Gebruik: /meter language en|nl|fr|de',
  demoOff: 'Meter terug op je echte cijfers; demosessies beëindigd.',
  demoHere: pct => `Demo: deze sessie op ${pct}% van het comprimeren (tot het volgende antwoord van Claude). /meter demo off beëindigt het.`,
  demoContext: (name, pct) => `Demosessie "${name}" op ${pct}% van het comprimeren. Typ /meter demo off om te stoppen.`,
  demoLimits: (pct, week) => `Demo: 5 uur op ${pct}%, week op ${week}%. Typ /meter demo off om terug te gaan.`,
}

const FR: Strings = {
  units: { m: 'min', h: 'h', d: 'j' },
  colon: ' : ',
  days: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  hundredIn: (name, d) => `${name} : 100 % dans ${d}`,
  limitsUpdated: d => `limites mises à jour il y a ${d}`,
  cacheNote: d => `cache ${d}`,
  cacheCold: 'cache froid',
  other: (folder, pct) => `autre : ${folder} ${pct} %`,
  newSession: 'Nouvelle session :',
  nextTurn: 'prochain échange',
  turnsShort: n => `~${n} échanges`,
  ofWindowShort: 'de la fenêtre',
  htmlOffer: (name, update) => (update ? `Mettre à jour la version HTML de ${name} ?` : `Une version HTML de ${name} ?`),
  tokensWhat: n => `${n} tokens`,
  toCompaction: pct => `${pct} % avant la compaction`,
  startNew: 'démarrez une nouvelle session',
  finishTask: 'terminez la tâche et mettez à jour vos notes de session',
  closing: 'Fermeture de la session',
  preparing: 'Préparation de la session',
  waiting: name => `${name} : attente de la fin de la réponse en cours de Claude…`,
  step: (name, step, total, pct, note) => `${name}… étape ${step} sur ${total} · ${pct} %${note ? ` · ${note}` : ''}`,
  safeToEnd: '✓ Vous pouvez maintenant fermer cette session en sécurité',
  readyToStart: '✓ Tout est prêt pour démarrer cette session',
  notSafe: "Il n'est PAS sûr de fermer cette session",
  notReady: 'Pas prêt à démarrer',
  seeReply: 'voir la réponse de Claude',
  stoppedLine: (task, reason) => `${task} ${reason} : vérifiez la réponse de Claude`,
  stoppedAt: (step, total) => `arrêté à l'étape ${step} sur ${total}`,
  sessionTitle: 'Session (limite de 5 heures)',
  weekTitle: 'Week (limite de la semaine)',
  compressTitle: 'Compress (contexte de cette session)',
  noFigure: 'Pas encore de chiffre : il arrive avec la prochaine réponse de Claude.',
  resets: (when, d) => `Remise à zéro ${when}, dans ${d}`,
  paceFull: d => `À ce rythme : 100 % dans ${d}, avant la remise à zéro`,
  paceOk: 'À ce rythme, la remise à zéro arrive d’abord',
  limitsUpdatedLong: (d, stale) => `Limites mises à jour il y a ${d}${stale ? ' : chiffres anciens, Claude Code en donne de nouveaux à sa prochaine réponse' : ''}`,
  noLimits: 'Aucune limite reçue pour le moment',
  ofWindow: 'de la fenêtre',
  toCompactionShort: 'avant la compaction',
  tokensOf: (n, point, window) => `${n} tokens${point ? ` sur ${point} (point de compaction)` : ''}${window ? ` · fenêtre ${window}` : ''}`,
  lastTurns: 'Derniers échanges',
  nextTurnReaches: 'le prochain échange de ce genre atteindra la compaction',
  moreTurns: n => `encore environ ${n} échanges de ce genre avant la compaction`,
  compacted: (n, at) => `Compacté ${n}× dans cette session, la dernière fois à ${at}`,
  notCompacted: 'Pas encore compacté dans cette session',
  cost: usd => `  ·  coût jusqu'ici ${usd} $ (prix API)`,
  warnRedHelp: "Après la compaction, Claude ne garde qu'un résumé de l'ancienne conversation. Notez ce qui compte, puis démarrez une nouvelle session.",
  warnYellowHelp: "Notez ce qui a été fait, les décisions et les prochaines étapes, pour qu'une nouvelle session puisse continuer.",
  sessionHeader: 'Session',
  routineHelp:
    "Close session vérifie et met à jour CLAUDE.md, MEMORY.md et les notes de session, puis dit quand vous pouvez fermer en sécurité. Start session les lit (ou les crée dans un nouveau projet) et reprend là où la dernière session s'est arrêtée.",
  cacheHeader: 'Cache',
  warmFor: d => `chaud encore ${d}`,
  cold: 'froid',
  conversation: 'la conversation',
  tokens: n => `${n} tokens`,
  warmHelp: size => `Keep warm pose une toute petite question, qui relit ${size} depuis le cache : moins cher qu'une nouvelle entrée, mais cela compte.`,
  coldHelp: size => `Votre prochain message relit ${size} une fois au prix plein ; ensuite, c'est de nouveau en cache.`,
  readerHeader: 'Lecteur Haiku',
  share: (pct, runs) => `Haiku ${pct} % · ${runs} passages`,
  noTokens: 'aucun token compté pour le moment',
  tokensRow: 'Tokens',
  sessionCol: 'session',
  weekCol: 'cette semaine',
  shareRow: 'Part de Haiku',
  runsRow: 'Passages du lecteur',
  otherModel: 'Autre',
  helpersMoved: n => `Assistants de recherche (Explore) lancés sur Haiku : ${n}`,
  modeSummary: 'Mode : chercher et résumer. Haiku trouve les lignes et ajoute un court résumé.',
  modeSearch: 'Mode : chercher seulement. Haiku trouve les fichiers et les lignes ; Opus lit ces lignes lui-même.',
  readerWhen: n => `Quand Opus lit plus de ${n} tokens en un échange, il lui est demandé d'utiliser le lecteur. Mode et limite sont dans Settings, en bas de ce panneau.`,
  readerShareNote: "La part de Haiku est une part de tokens, pas de vos limites : un token Haiku coûte moins. Les assistants de Claude Code peuvent aussi tourner sur Haiku.",
  othersHeader: 'Autres sessions sur ce PC',
  noneLive: 'Aucune active.',
  ago: d => ` · il y a ${d}`,
  levels: (w1, w2, s1, s2) => `Niveaux : limites ${w1}/${w2} %, contexte ${s1}/${s2} %.`,
  stripDecides: ' Les Settings de la barre AI Usage Meter les décident.',
  model: name => `Modèle : ${name}`,
  settingsHeader: 'Réglages',
  settingsUnread: 'Les réglages ne peuvent pas être lus ici. Dans un terminal : claude, puis /config.',
  settingsFoot: "Une modification s'applique tout de suite. Les couleurs se changent dans un terminal : tapez claude, puis /config.",
  settingsStrip:
    " La barre AI Usage Meter est installée : sa fenêtre Settings décide des niveaux, des couleurs et des messages, sauf si vous désactivez « Utiliser les Settings de la barre ».",
  locked: shown => `${shown} (défini par votre organisation)`,
  minutes: n => `${n} min`,
  tokensN: n => `${n} tokens`,
  off: 'désactivé',
  sizes: { 2: 'petit', 3: 'moyen', 4: 'grand' },
  labels: {
    language: 'Langue',
    useStripSettings: 'Utiliser les Settings de la barre quand elle est installée',
    warn1: 'Limites : première alerte (%)',
    warn2: 'Limites : deuxième alerte (%)',
    sessLevel1: 'Contexte : jaune à partir de (% de la compaction)',
    sessLevel2: 'Contexte : rouge à partir de (% de la compaction)',
    notify: 'Message aux alertes de limite',
    notifyReset: "Message à la remise à zéro d'une limite",
    notifyCompaction: 'Message après une compaction',
    blink: 'Clignoter au rouge',
    robot: 'Petit robot dans le bandeau',
    robotPerModel: 'Robot : un robot par modèle',
    robotEffort: "Robot : afficher le niveau d'effort",
    robotSize: 'Taille du robot',
    tokenYellow: 'Contexte : jaune à partir de (tokens)',
    tokenRed: 'Contexte : rouge à partir de (tokens)',
    cacheClock: 'Horloge du cache',
    cacheMinutes: 'Horloge du cache : durée du cache (minutes)',
    exploreOnHaiku: 'Assistants de recherche (Explore) sur Haiku',
    readerMode: 'Lecteur Haiku',
    readerThreshold: 'Lecteur Haiku : à partir de (tokens lus en un échange)',
    htmlCompanion: 'Compagnon HTML',
    staleMinutes: 'Chiffres anciens après (minutes)',
    colorOk: 'Couleur : sous les alertes',
    colorWarn: 'Couleur : première alerte (orange / jaune)',
    colorDanger: 'Couleur : deuxième alerte (rouge)',
  },
  cantChange: why => `ce réglage ne peut pas être modifié ici${why ? ` (${why})` : ''}.`,
  htmlPaused: "plus de propositions HTML dans cette session. /meter html ask les réactive.",
  cacheAlreadyCold: "le cache est déjà froid ; Keep warm n'aide qu'avant qu'il expire.",
  warmed: 'cache gardé chaud pour une nouvelle période.',
  warmFailed: why => `Keep warm n'a pas fonctionné${why ? ` (${why})` : ''}.`,
  routineBusy: 'un Close session ou Start session est déjà en cours.',
  promptMissing: file => `le fichier de prompt ${file} manque ou n'a pas de bloc de prompt.`,
  promptRefused: "Claude Code n'a pas pris le prompt. Réessayez quand Claude ne fait rien.",
  routineDone: close => (close ? 'vous pouvez maintenant fermer cette session en sécurité.' : 'tout est prêt pour démarrer cette session.'),
  routineNotDone: (what, reason) => `${what} : ${reason}. Vérifiez la réponse de Claude.`,
  limitReset: (name, pct) => `la ${name} est remise à zéro (${pct} % utilisés).`,
  limitAt: (name, pct, red) => `${name} à ${pct} %.${red ? ' Terminez ce que vous faites.' : ''}`,
  limitName: kind => (kind === 'five_hour' ? 'limite de 5 heures' : 'limite de la semaine'),
  bandHidden: 'bandeau masqué. /meter band on le réaffiche.',
  compactionRan: "une compaction a eu lieu. Les anciennes parties de cette conversation sont maintenant un résumé : vérifiez que les chemins, règles et décisions sont toujours justes.",
  sent: task => `${task} envoyé. Le bandeau montre la progression.`,
  paneClosed: 'panneau fermé.',
  paneOpened: 'panneau ouvert.',
  widen: 'élargissez la fenêtre pour voir le panneau.',
  htmlMode: m => `compagnon HTML ${m === 'ask' ? 'demande d’abord' : m}.`,
  htmlNone: 'aucun document Markdown proposé pour une version HTML. /meter html on|ask|off règle le mode.',
  htmlMaking: name => `la version HTML de ${name} est en cours.`,
  settingsAtBottom: 'les réglages sont en bas du panneau.',
  languageSet: name => `langue : ${name}.`,
  languageUsage: 'Usage : /meter language en|nl|fr|de',
  demoOff: 'Retour à vos vrais chiffres ; sessions de démonstration terminées.',
  demoHere: pct => `Démo : cette session à ${pct} % de la compaction (jusqu'à la prochaine réponse de Claude). /meter demo off l'arrête.`,
  demoContext: (name, pct) => `Session de démo « ${name} » à ${pct} % de la compaction. Tapez /meter demo off pour l'arrêter.`,
  demoLimits: (pct, week) => `Démo : 5 h à ${pct} %, semaine à ${week} %. Tapez /meter demo off pour revenir.`,
}

const DE: Strings = {
  units: { m: 'min', h: 'h', d: 'T' },
  colon: ': ',
  days: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  hundredIn: (name, d) => `${name}: 100 % in ${d}`,
  limitsUpdated: d => `Limits vor ${d} aktualisiert`,
  cacheNote: d => `Cache ${d}`,
  cacheCold: 'Cache kalt',
  other: (folder, pct) => `andere: ${folder} ${pct} %`,
  newSession: 'Neue Sitzung:',
  nextTurn: 'nächste Runde',
  turnsShort: n => `~${n} Runden`,
  ofWindowShort: 'des Fensters',
  htmlOffer: (name, update) => (update ? `Die HTML-Version von ${name} aktualisieren?` : `Eine HTML-Version von ${name}?`),
  tokensWhat: n => `${n} Tokens`,
  toCompaction: pct => `${pct} % bis zur Komprimierung`,
  startNew: 'starten Sie eine neue Sitzung',
  finishTask: 'schließen Sie die Aufgabe ab und aktualisieren Sie Ihre Sitzungsnotizen',
  closing: 'Sitzung wird beendet',
  preparing: 'Sitzung wird vorbereitet',
  waiting: name => `${name}: wartet, bis Claude die aktuelle Antwort beendet…`,
  step: (name, step, total, pct, note) => `${name}… Schritt ${step} von ${total} · ${pct} %${note ? ` · ${note}` : ''}`,
  safeToEnd: '✓ Sie können diese Sitzung jetzt sicher beenden',
  readyToStart: '✓ Alles ist bereit, um diese Sitzung zu starten',
  notSafe: 'Diese Sitzung zu beenden ist NICHT sicher',
  notReady: 'Nicht bereit zum Start',
  seeReply: 'siehe Claudes Antwort',
  stoppedLine: (task, reason) => `${task} ${reason}: prüfen Sie Claudes Antwort`,
  stoppedAt: (step, total) => `bei Schritt ${step} von ${total} gestoppt`,
  sessionTitle: 'Session (5-Stunden-Limit)',
  weekTitle: 'Week (Wochenlimit)',
  compressTitle: 'Compress (Kontext dieser Sitzung)',
  noFigure: 'Noch keine Zahl: Sie kommt mit Claudes nächster Antwort.',
  resets: (when, d) => `Zurücksetzung ${when}, in ${d}`,
  paceFull: d => `In diesem Tempo: 100 % in ${d}, vor der Zurücksetzung`,
  paceOk: 'In diesem Tempo kommt die Zurücksetzung zuerst',
  limitsUpdatedLong: (d, stale) => `Limits vor ${d} aktualisiert${stale ? ': alte Zahlen, Claude Code meldet neue mit seiner nächsten Antwort' : ''}`,
  noLimits: 'Noch keine Limits gemeldet',
  ofWindow: 'des Fensters',
  toCompactionShort: 'bis zur Komprimierung',
  tokensOf: (n, point, window) => `${n} Tokens${point ? ` von ${point} (Komprimierungspunkt)` : ''}${window ? ` · Fenster ${window}` : ''}`,
  lastTurns: 'Letzte Runden',
  nextTurnReaches: 'die nächste Runde dieser Art erreicht die Komprimierung',
  moreTurns: n => `noch etwa ${n} Runden dieser Art bis zur Komprimierung`,
  compacted: (n, at) => `${n}× komprimiert in dieser Sitzung, zuletzt um ${at}`,
  notCompacted: 'In dieser Sitzung noch nicht komprimiert',
  cost: usd => `  ·  Kosten bisher ${usd} $ (API-Preise)`,
  warnRedHelp: 'Nach dem Komprimieren behält Claude nur eine Zusammenfassung des älteren Gesprächs. Schreiben Sie auf, was wichtig ist, und starten Sie dann eine neue Sitzung.',
  warnYellowHelp: 'Schreiben Sie auf, was erledigt ist, die Entscheidungen und die nächsten Schritte, damit eine neue Sitzung weitermachen kann.',
  sessionHeader: 'Sitzung',
  routineHelp:
    'Close session prüft und aktualisiert CLAUDE.md, MEMORY.md und die Sitzungsnotizen und sagt dann, wann Sie sicher beenden können. Start session liest sie (oder legt sie in einem neuen Projekt an) und macht dort weiter, wo die letzte Sitzung aufgehört hat.',
  cacheHeader: 'Cache',
  warmFor: d => `warm für ${d}`,
  cold: 'kalt',
  conversation: 'das Gespräch',
  tokens: n => `${n} Tokens`,
  warmHelp: size => `Keep warm stellt eine winzige Frage, die ${size} aus dem Cache liest: günstiger als neue Eingabe, aber es zählt.`,
  coldHelp: size => `Ihre nächste Nachricht liest ${size} einmal zum vollen Preis; danach liegt es wieder im Cache.`,
  readerHeader: 'Haiku-Leser',
  share: (pct, runs) => `Haiku ${pct} % · ${runs} Läufe`,
  noTokens: 'noch keine Tokens gezählt',
  tokensRow: 'Tokens',
  sessionCol: 'Sitzung',
  weekCol: 'diese Woche',
  shareRow: 'Anteil Haiku',
  runsRow: 'Läufe des Lesers',
  otherModel: 'Andere',
  helpersMoved: n => `Suchhelfer (Explore) auf Haiku gestartet: ${n}`,
  modeSummary: 'Modus: suchen und zusammenfassen. Haiku findet die Zeilen und fügt eine kurze Zusammenfassung hinzu.',
  modeSearch: 'Modus: nur suchen. Haiku findet Dateien und Zeilen; Opus liest diese Zeilen selbst.',
  readerWhen: n => `Liest Opus mehr als ${n} Tokens in einer Runde, wird es gebeten, den Leser zu nutzen. Modus und Grenze stehen unter Settings unten in diesem Bereich.`,
  readerShareNote: 'Haikus Anteil ist ein Anteil an Tokens, nicht an Ihren Limits: Ein Haiku-Token kostet weniger. Auch Claude Codes eigene Helfer können auf Haiku laufen.',
  othersHeader: 'Andere Sitzungen auf diesem PC',
  noneLive: 'Keine aktiv.',
  ago: d => ` · vor ${d}`,
  levels: (w1, w2, s1, s2) => `Stufen: Limits ${w1}/${w2} %, Kontext ${s1}/${s2} %.`,
  stripDecides: ' Die Settings der AI Usage Meter-Leiste legen sie fest.',
  model: name => `Modell: ${name}`,
  settingsHeader: 'Einstellungen',
  settingsUnread: 'Die Einstellungen konnten hier nicht gelesen werden. In einem Terminal: claude, dann /config.',
  settingsFoot: 'Eine Änderung gilt sofort. Die Farben ändern Sie in einem Terminal: claude tippen, dann /config.',
  settingsStrip:
    ' Die AI Usage Meter-Leiste ist installiert: Ihr Settings-Fenster legt Stufen, Farben und Meldungen fest, außer Sie schalten „Die Settings der Leiste verwenden“ aus.',
  locked: shown => `${shown} (von Ihrer Organisation festgelegt)`,
  minutes: n => `${n} min`,
  tokensN: n => `${n} Tokens`,
  off: 'aus',
  sizes: { 2: 'klein', 3: 'mittel', 4: 'groß' },
  labels: {
    language: 'Sprache',
    useStripSettings: 'Die Settings der Leiste verwenden, wenn sie installiert ist',
    warn1: 'Limits: erste Warnung (%)',
    warn2: 'Limits: zweite Warnung (%)',
    sessLevel1: 'Kontext: Gelb ab (% der Komprimierung)',
    sessLevel2: 'Kontext: Rot ab (% der Komprimierung)',
    notify: 'Meldung bei den Limitwarnungen',
    notifyReset: 'Meldung beim Zurücksetzen eines Limits',
    notifyCompaction: 'Meldung nach einer Komprimierung',
    blink: 'Bei Rot blinken',
    robot: 'Kleiner Roboter im Band',
    robotPerModel: 'Roboter: ein Roboter pro Modell',
    robotEffort: 'Roboter: Aufwandsstufe zeigen',
    robotSize: 'Robotergröße',
    tokenYellow: 'Kontext: Gelb ab (Tokens)',
    tokenRed: 'Kontext: Rot ab (Tokens)',
    cacheClock: 'Cache-Uhr',
    cacheMinutes: 'Cache-Uhr: Cache-Dauer (Minuten)',
    exploreOnHaiku: 'Suchhelfer (Explore) auf Haiku',
    readerMode: 'Haiku-Leser',
    readerThreshold: 'Haiku-Leser: ab (in einer Runde gelesene Tokens)',
    htmlCompanion: 'HTML-Begleiter',
    staleMinutes: 'Werte sind alt nach (Minuten)',
    colorOk: 'Farbe: unter den Warnungen',
    colorWarn: 'Farbe: erste Warnung (orange / gelb)',
    colorDanger: 'Farbe: zweite Warnung (rot)',
  },
  cantChange: why => `diese Einstellung kann hier nicht geändert werden${why ? ` (${why})` : ''}.`,
  htmlPaused: 'keine HTML-Angebote mehr in dieser Sitzung. /meter html ask schaltet sie wieder ein.',
  cacheAlreadyCold: 'der Cache ist schon kalt; Keep warm hilft nur, bevor er abläuft.',
  warmed: 'Cache für eine weitere Periode warm gehalten.',
  warmFailed: why => `Keep warm hat nicht funktioniert${why ? ` (${why})` : ''}.`,
  routineBusy: 'ein Close session oder Start session läuft bereits.',
  promptMissing: file => `die Prompt-Datei ${file} fehlt oder hat keinen Prompt-Block.`,
  promptRefused: 'Claude Code hat den Prompt nicht angenommen. Versuchen Sie es erneut, wenn Claude untätig ist.',
  routineDone: close => (close ? 'Sie können diese Sitzung jetzt sicher beenden.' : 'alles ist bereit, um diese Sitzung zu starten.'),
  routineNotDone: (what, reason) => `${what}: ${reason}. Prüfen Sie Claudes Antwort.`,
  limitReset: (name, pct) => `das ${name} wurde zurückgesetzt (${pct} % verbraucht).`,
  limitAt: (name, pct, red) => `${name} bei ${pct} %.${red ? ' Schließen Sie ab, woran Sie arbeiten.' : ''}`,
  limitName: kind => (kind === 'five_hour' ? '5-Stunden-Limit' : 'Wochenlimit'),
  bandHidden: 'Band ausgeblendet. /meter band on zeigt es wieder.',
  compactionRan: 'eine Komprimierung lief. Ältere Teile dieses Gesprächs sind jetzt eine Zusammenfassung: Prüfen Sie, ob Pfade, Regeln und Entscheidungen noch stimmen.',
  sent: task => `${task} gesendet. Das Band zeigt den Fortschritt.`,
  paneClosed: 'Bereich geschlossen.',
  paneOpened: 'Bereich geöffnet.',
  widen: 'verbreitern Sie das Fenster, um den Bereich zu sehen.',
  htmlMode: m => `HTML-Begleiter ${m === 'ask' ? 'fragt zuerst' : m}.`,
  htmlNone: 'kein Markdown-Dokument für eine HTML-Version angeboten. /meter html on|ask|off stellt den Modus ein.',
  htmlMaking: name => `die HTML-Version von ${name} wird erstellt.`,
  settingsAtBottom: 'die Einstellungen stehen unten im Bereich.',
  languageSet: name => `Sprache: ${name}.`,
  languageUsage: 'Verwendung: /meter language en|nl|fr|de',
  demoOff: 'Wieder Ihre echten Werte; Demo-Sitzungen beendet.',
  demoHere: pct => `Demo: diese Sitzung bei ${pct} % der Komprimierung (bis zu Claudes nächster Antwort). /meter demo off beendet es.`,
  demoContext: (name, pct) => `Demo-Sitzung „${name}“ bei ${pct} % der Komprimierung. Tippen Sie /meter demo off, um sie zu beenden.`,
  demoLimits: (pct, week) => `Demo: 5 h bei ${pct} %, Woche bei ${week} %. Tippen Sie /meter demo off, um zurückzukehren.`,
}

const ALL: Record<Lang, Strings> = { en: EN, nl: NL, fr: FR, de: DE }

export function tr(l: Lang | undefined): Strings {
  return ALL[l ?? 'en'] ?? EN
}
