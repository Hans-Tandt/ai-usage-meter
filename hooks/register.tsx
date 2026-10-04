import type { EngineInterface, Register } from 'claude-code'

import type { Window } from '../types'

// The always-on-top strip (overlay/strip.ps1) reads <home>/.claude/usage-meter.json.
async function ingest($: EngineInterface, list: Window[]) {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  if (!home) return
  await $.fs.write(
    `${home}/.claude/usage-meter.json`,
    JSON.stringify({ updatedAt: new Date(await $.clock.now()).toISOString(), windows: list }),
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'usage-demo',
      description: 'Preview the usage strip at a given percentage (e.g. /usage-demo 85), or /usage-demo off',
    })
    try {
      const u = await $.session.usage()
      await ingest($, u.rateLimits)
    } catch {}
    return result
  })

  // Fake figures so the colours and warnings can be seen without spending usage.
  on('command.run', { command: 'usage-demo' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === '' || arg === 'off') {
      const u = await $.session.usage()
      await ingest($, u.rateLimits)
      return { text: 'Usage strip back to your real figures.' }
    }
    const pct = Math.max(0, Math.min(100, Number(arg)))
    if (Number.isNaN(pct)) return { text: 'Usage: /usage-demo <0-100> or /usage-demo off' }
    const resetsAt = new Date((await $.clock.now()) + 2 * 3600000).toISOString()
    await ingest($, [
      { kind: 'five_hour', percentUsed: pct, resetsAt },
      { kind: 'seven_day', percentUsed: Math.round(pct / 2), resetsAt },
    ])
    return { text: `Demo: 5h at ${pct}%, week at ${Math.round(pct / 2)}%. Type /usage-demo off to go back.` }
  })

  on('session.measure', async ($, e, next) => {
    await ingest($, e.rateLimits)
    return next(e)
  })
}
