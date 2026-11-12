import type { EngineInterface, Register } from 'claude-code'

import type { ContextInfo, Window } from '../types'

// The always-on-top strip (overlay/src/AIUsageMeter.cs) reads <home>/.claude/usage-meter.json
// and, per session, <home>/.claude/usage-meter-context/<session id>.json.
// Every write is wrapped: this add-on must never break a Claude session.

async function homeDir($: EngineInterface) {
  return (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
}

async function ingest($: EngineInterface, list: Window[]) {
  try {
    const home = await homeDir($)
    if (!home) return
    await $.fs.write(
      `${home}/.claude/usage-meter.json`,
      JSON.stringify({ updatedAt: new Date(await $.clock.now()).toISOString(), windows: list }),
    )
  } catch {}
}

// Merges `patch` into the session's context file, keeping the fields it doesn't name.
async function patchContext($: EngineInterface, sessionId: string, patch: Partial<ContextInfo>) {
  try {
    const home = await homeDir($)
    if (!home) return
    const path = `${home}/.claude/usage-meter-context/${sessionId}.json`
    let current: Partial<ContextInfo> = {}
    try {
      current = JSON.parse(await $.fs.read(path))
    } catch {}
    await $.fs.write(path, JSON.stringify({ ...current, ...patch, sessionId }))
  } catch {}
}

// How full the context window is, against the point where auto-compaction starts.
async function measureContext($: EngineInterface): Promise<Partial<ContextInfo>> {
  const now = new Date(await $.clock.now()).toISOString()
  const cwd = await $.session.cwd()
  const folder = cwd.split(/[\\/]/).filter(p => p.length > 0).pop() ?? cwd
  const usage = await $.session.usage({ breakdown: 'summary' })
  const c = usage.context
  let toCompact: number | undefined
  const b = c.breakdown
  if (b) {
    let point = b.autoCompactThreshold
    if (!point) {
      const buffer = b.categories.find(x => x.kind === 'buffer')
      point = b.rawMaxTokens - (buffer ? buffer.tokens : 0)
    }
    if (point > 0) toCompact = Math.round((b.totalTokens / point) * 100)
  }
  return {
    folder,
    percent: c.percent,
    toCompact: toCompact ?? c.percent,
    basis: toCompact !== undefined ? 'compaction' : 'window',
    tokens: c.tokens,
    window: c.window,
    updatedAt: now,
  }
}

async function recordContext($: EngineInterface) {
  try {
    await patchContext($, await $.session.id(), await measureContext($))
  } catch {}
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'usage-demo',
      description:
        'Preview the strip: /usage-demo 85 (5h/Week), /usage-demo context 85 [name] (Session view), /usage-demo off',
    })
    try {
      const u = await $.session.usage()
      await ingest($, u.rateLimits)
    } catch {}
    try {
      const now = new Date(await $.clock.now()).toISOString()
      await patchContext($, await $.session.id(), { lastActiveAt: now, ended: false })
    } catch {}
    await recordContext($)
    return result
  })

  // Fake figures so the colours, warnings and the Session view can be seen without spending usage.
  on('command.run', { command: 'usage-demo' }, async ($, e) => {
    const args = e.args.trim().split(/\s+/).filter(a => a.length > 0)
    const now = await $.clock.now()
    if (args.length === 0 || args[0] === 'off') {
      try {
        const u = await $.session.usage()
        await ingest($, u.rateLimits)
      } catch {}
      for (const name of ['demo', 'demo-A', 'demo-B']) {
        if (await $.fs.exists(`${await homeDir($)}/.claude/usage-meter-context/${name}.json`))
          await patchContext($, name, { ended: true })
      }
      return { text: 'Strip back to your real figures; demo sessions ended.' }
    }
    if (args[0] === 'context') {
      const pct = Math.max(0, Math.min(150, Number(args[1])))
      if (Number.isNaN(pct)) return { text: 'Usage: /usage-demo context <percent> [name]' }
      const name = args[2] ? `demo-${args[2]}` : 'demo'
      const iso = new Date(now).toISOString()
      await patchContext($, name, {
        folder: name,
        percent: Math.round(pct * 0.8),
        toCompact: pct,
        basis: 'compaction',
        updatedAt: iso,
        lastActiveAt: iso,
        ended: false,
      })
      return { text: `Demo session "${name}" at ${pct}% of compaction. Type /usage-demo off to end it.` }
    }
    const pct = Math.max(0, Math.min(100, Number(args[0])))
    if (Number.isNaN(pct)) return { text: 'Usage: /usage-demo <0-100>, /usage-demo context <percent> [name], or /usage-demo off' }
    const resetsAt = new Date(now + 2 * 3600000).toISOString()
    await ingest($, [
      { kind: 'five_hour', percentUsed: pct, resetsAt },
      { kind: 'seven_day', percentUsed: Math.round(pct / 2), resetsAt },
    ])
    return { text: `Demo: 5h at ${pct}%, week at ${Math.round(pct / 2)}%. Type /usage-demo off to go back.` }
  })

  on('session.measure', async ($, e, next) => {
    await ingest($, e.rateLimits)
    if (e.changed.includes('context')) await recordContext($)
    return next(e)
  })

  // The last time you sent a message in this session: the strip follows the session you work in.
  on('prompt.submit', async ($, e, next) => {
    try {
      const now = new Date(await $.clock.now()).toISOString()
      await patchContext($, await $.session.id(), { lastActiveAt: now, ended: false })
    } catch {}
    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  // Note when compaction runs; never block or change it.
  on('session.compact', async ($, e, next) => {
    try {
      const now = new Date(await $.clock.now()).toISOString()
      await patchContext($, await $.session.id(), { compactedAt: now })
    } catch {}
    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('session.end', async ($, e, next) => {
    try {
      await patchContext($, await $.session.id(), { ended: true })
    } catch {}
    return next(e)
  })
}
