// Writes docs/ui_texts.json: the mod's own screen texts (hooks/i18n.ts) as the manual's pictures show them, per
// language, so the drawings never drift from the real band and pane. Run: node docs/make_ui_texts.mjs
// (Node 22.6+ reads the TypeScript file itself.) Then: py docs/make_mod_figures.py en|fr|nl|de.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const { tr, LANGS } = await import(pathToFileURL(join(here, '..', 'hooks', 'i18n.ts')).href)
const { offerText } = await import(pathToFileURL(join(here, '..', 'hooks', 'html.ts')).href)

const dur = (L, m) => {
  const u = L.units
  if (m < 60) return `${m}${u.m}`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}${u.h} ${String(m % 60).padStart(2, '0')}${u.m}`
  return `${Math.floor(h / 24)}${u.d} ${h % 24}${u.h}`
}

const NOTE = { en: 'files compared', nl: 'bestanden vergeleken', fr: 'fichiers comparés', de: 'Dateien verglichen' }
const out = {}
for (const lang of LANGS) {
  const L = tr(lang)
  out[lang] = {
    reset5h: `↻${dur(L, 184)}`,
    resetWeek: `↻${dur(L, 4 * 1440 + 300)}`,
    turns6: L.turnsShort(6),
    turns2: L.turnsShort(2),
    nextTurn: L.nextTurn,
    cache: L.cacheNote(dur(L, 42)),
    yellow: `${L.toCompaction(84)}${L.colon}${L.finishTask}`,
    red: `${L.toCompaction(93)}${L.colon}${L.startNew}`,
    stepLine: L.step(L.closing, 3, 6, 50, NOTE[lang]),
    safe: L.safeToEnd,
    sessionTitle: L.sessionTitle,
    weekTitle: L.weekTitle,
    resets5h: L.resets('14:30', dur(L, 184)),
    resetsWeek: L.resets(`${L.days[4]} 17:00`, dur(L, 4 * 1440 + 300)),
    paceOk: L.paceOk,
    updated: L.limitsUpdatedLong(dur(L, 2), false),
    compressTitle: L.compressTitle,
    toCompaction: L.toCompactionShort,
    tokensOf: L.tokensOf('134k', '160k', '200k'),
    lastTurns: L.lastTurns,
    moreTurns: L.moreTurns(6),
    compactedCost: `${L.notCompacted}${L.cost('4.12')}`,
    sessionHeader: L.sessionHeader,
    routineHelp: L.routineHelp,
    cacheHeader: L.cacheHeader,
    warmFor: L.warmFor(dur(L, 42)),
    warmHelp: L.warmHelp(L.tokens('134k')),
    readerHeader: L.readerHeader,
    share: L.share(19, 7),
    othersHeader: L.othersHeader,
    ago4: L.ago(dur(L, 4)),
    ago72: L.ago(dur(L, 72)),
    levels: L.levels(80, 95, 80, 90),
    // what the manual quotes
    m: {
      finishTask: L.finishTask,
      startNew: L.startNew,
      tokens262: `${L.tokensWhat('262k')}${L.colon}${L.finishTask}`,
      tokens64: `${L.tokensWhat('64k')}${L.colon}${L.finishTask}`,
      hundred: L.hundredIn('5h', dur(L, 80)),
      updated: L.limitsUpdated(dur(L, 70)),
      cache42: L.cacheNote(dur(L, 42)),
      cache8: L.cacheNote(dur(L, 8)),
      cache59: L.cacheNote(dur(L, 59)),
      cacheCold: L.cacheCold,
      otherMy: L.other('MyProject', 92),
      otherDemo: L.other('demo-A', 92),
      htmlAsk: L.htmlOffer('Plan.md', false),
      htmlTab: offerText('Plan.md', false, lang),
      step3: L.step(L.closing, 3, 6, 50),
      step1: L.step(L.closing, 1, 6, 0).replace(/ · 0 ?%$/, ''),
      safe: L.safeToEnd,
      ready: L.readyToStart,
      notSafe: `${L.notSafe}${L.colon}<${{ en: 'reason', nl: 'reden', fr: 'raison', de: 'Grund' }[lang]}>`,
      stopped2: `Close session ${L.stoppedAt(2, 6)}`,
      stoppedAny: `Close session ${L.stoppedAt('…', 6)}`,
      preparing: `${L.preparing}…`,
      label: L.labels.language,
    },
  }
}
writeFileSync(join(here, 'ui_texts.json'), JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log('ui_texts.json:', Object.keys(out).join(', '))
