import type { Kit } from './draw'

// The little pixel robot beside Details: an original design (not Anthropic's mascot), 12 × 13 pixels.
// Pure functions: a state and a frame number in, a drawing out. Its antenna shows the Compress colour.
// Each model has its own robot (colours and one shape detail, so it also reads without colour), and
// five chest lights show the effort level.

export type RobotState = 'idle' | 'work' | 'yellow' | 'red' | 'happy'
export type RobotModel = 'opus' | 'sonnet' | 'haiku' | 'fable' | 'other'

// How the robot looks: which model, the effort level (0 = none shown, 1 = low … 5 = max), Blink at red.
export type RobotLook = { model: RobotModel; effort: number; blink: boolean }
export const PLAIN: RobotLook = { model: 'other', effort: 0, blink: true }

// One tick of the animation; the mod moves the frame number on with its own timer.
export const ROBOT_MS = 300

// A: antenna light, s: stem, H: head, V: visor, E: eye, b: body, m: chest panel, a: arm, w: wheel,
// k: crown band (Opus), e: ear (Sonnet), L / l: chest light on / off (drawn by robotFrame)
const BODY = ['...bbbbbb...', '..abbmmbba..', '..abbbbbba..', '...bbbbbb...', '...bb..bb...', '...ww..ww...']
const HEAD = ['..HHHHHHHH..', '..HVVVVVVH..', '..HVEVVEVH..', '..HVVVVVVH..', '..HHHHHHHH..']
const BASES: Record<RobotModel, string[]> = {
  other: ['.....AA.....', '.....ss.....', ...HEAD, ...BODY],
  opus: ['...k.AA.k...', '...kkkkkk...', ...HEAD, ...BODY], // a gold crown; its middle stone shows the Compress colour
  sonnet: ['.....AA.....', '.....ss.....', '..HHHHHHHH..', '.eHVVVVVVHe.', '.eHVEVVEVHe.', '..HVVVVVVH..', '..HHHHHHHH..', ...BODY], // ears
  haiku: ['............', '.....AA.....', '...HHHHHH...', '..HVVVVVVH..', '..HVEVVEVH..', '..HVVVVVVH..', '...HHHHHH...', ...BODY], // short antenna, round head
  fable: ['....A..A....', '.....AA.....', ...HEAD, ...BODY], // two antenna points
}

const SHARED: Record<string, string> = { s: '#8A9AA6', V: '#1B2730', E: '#5DE0E6', w: '#3D4B54', L: '#5DE0E6', l: '#24313A' }
const PALETTES: Record<RobotModel, Record<string, string>> = {
  other: { H: '#6F8796', b: '#5C7280', m: '#9FB3BF', a: '#6F8796' },
  opus: { H: '#C9A227', b: '#2F4A7A', m: '#E0C35A', a: '#3E5E96', k: '#E0B83C' },
  sonnet: { H: '#B8BEC6', b: '#6B4FA0', m: '#D2D6DB', a: '#8268B5', e: '#B8BEC6' },
  haiku: { H: '#C9CFD2', b: '#3E8E5E', m: '#E1E5E7', a: '#52A574' },
  fable: { H: '#E9DFC8', b: '#B2603A', m: '#F3EBDA', a: '#C47650' },
}
const BRACKETS: Record<RobotModel, [string, string]> = {
  other: ['[', ']'],
  opus: ['[', ']'],
  sonnet: ['(', ')'],
  haiku: ['{', '}'],
  fable: ['<', '>'],
}
const NAMES: Record<RobotModel, string> = { other: '', opus: ' (Opus)', sonnet: ' (Sonnet)', haiku: ' (Haiku)', fable: ' (Fable)' }

// The model as Claude Code names it ("opus", "claude-opus-5-5", …) to its robot.
export function robotModel(name: string | undefined): RobotModel {
  const n = (name ?? '').toLowerCase()
  for (const m of ['opus', 'sonnet', 'haiku', 'fable'] as const) if (n.includes(m)) return m
  return 'other'
}

// The effort as Claude Code gives it to a level 1-5; a token budget or nothing shows no lights.
export function effortLevel(effort: string | number | undefined): number {
  return typeof effort === 'string' ? ['low', 'medium', 'high', 'xhigh', 'max'].indexOf(effort) + 1 : 0
}

// While Claude works the eyes move one step every so many ticks: faster at a higher effort.
const SCAN_TICKS = [2, 4, 3, 2, 1, 1]

export type RobotFrame = { rows: string[]; dy: number; antennaOn: boolean }

export function robotFrame(state: RobotState, n: number, look: RobotLook = PLAIN): RobotFrame {
  const f = BASES[look.model].map(r => r.split(''))
  const set = (row: number, col: number, ch: string) => {
    const r = f[row]
    if (r) r[col] = ch
  }
  const eyes = (cols: number[], row = 4) => {
    for (let c = 3; c <= 8; c++) set(row, c, 'V')
    for (const c of cols) set(row, c, 'E')
  }
  // Arms from the sides (rows 8-9) to a new place: out at red, up when happy
  const arms = (top: number) => {
    for (const [r, c] of [[8, 2], [9, 2], [8, 9], [9, 9]] as const) set(r, c, '.')
    for (const r of [top, top + 1]) {
      set(r, 1, 'a')
      set(r, 10, 'a')
    }
  }
  let dy = 0
  let antennaOn = true
  switch (state) {
    case 'idle':
      if (n % 16 === 0) eyes([]) // a blink every few seconds
      break
    case 'work': {
      const scan = [[3, 6], [4, 7], [5, 8], [4, 7]][Math.floor(n / (SCAN_TICKS[look.effort] ?? 2)) % 4] ?? [4, 7]
      // At max the eyes are two pixels wide
      eyes(look.effort === 5 ? scan.flatMap(c => [c, c + 1]).filter(c => c <= 8) : scan)
      antennaOn = Math.floor(n / 2) % 2 === 0
      break
    }
    case 'yellow':
      set(3, 4, 'E')
      set(3, 7, 'E')
      break
    case 'red':
      for (const r of [3, 5]) {
        set(r, 4, 'E')
        set(r, 7, 'E')
      }
      arms(7)
      antennaOn = !look.blink || Math.floor(n / 2) % 2 === 0
      break
    case 'happy':
      eyes([])
      for (const [r, c] of [[4, 3], [3, 4], [4, 5], [4, 6], [3, 7], [4, 8]] as const) set(r, c, 'E')
      arms(6)
      dy = Math.floor(n / 2) % 2 === 0 ? 0 : -1
      break
  }
  // The effort: lights 1 to 5 of five on the chest, one colour; you count them
  if (look.effort > 0) for (let i = 0; i < 5; i++) set(9, 3 + i, i < look.effort ? 'L' : 'l')
  return { rows: f.map(r => r.join('')), dy, antennaOn }
}

// What changes on screen between two frame numbers: the timer redraws only when this differs.
export function robotKey(state: RobotState, n: number, look: RobotLook = PLAIN) {
  const f = robotFrame(state, n, look)
  return `${look.model}|${look.effort}|${state}|${f.dy}|${f.antennaOn}|${f.rows.join('')}`
}

// The terminal has no pictures: a face of seven characters (the brackets show the model), the same
// width in every frame, then the effort as five marks.
export function robotFace(state: RobotState, n: number, look: RobotLook = PLAIN) {
  const scan = Math.floor(n / (SCAN_TICKS[look.effort] ?? 2)) % 4
  const eyes = {
    idle: n % 16 === 0 ? '-_-' : 'o_o',
    work: ['o_ o', ' o_o', 'o _o', ' o_o'][scan] ?? 'o_o',
    yellow: 'O_O',
    red: !look.blink || Math.floor(n / 2) % 2 === 0 ? '!_!' : ' _ ',
    happy: '^_^',
  }[state]
  const [open, close] = BRACKETS[look.model]
  let face = `${open}${eyes}${close}`
  if (state === 'happy' && Math.floor(n / 2) % 2 === 0) face = `\\${face}/`
  const pad = Math.max(0, 7 - face.length)
  face = ' '.repeat(Math.ceil(pad / 2)) + face + ' '.repeat(Math.floor(pad / 2))
  return look.effort > 0 ? `${face} ${'▮'.repeat(look.effort)}${'▯'.repeat(5 - look.effort)}` : face
}

// px: screen pixels per robot pixel, 2 (small) to 4 (large); 3 is half as big again as the Details button
// The effort as a bar of five marks under the robot, as wide as the robot: easier to read than the
// small chest lights. Lit marks have the eye colour.
function effortBar(look: RobotLook, px: number) {
  const mark = 2 * px
  const gap = px / 2 // 5 marks and 4 gaps fill the robot's 12 pixels exactly
  const width = 12 * px
  let rects = ''
  for (let i = 0; i < 5; i++) {
    const fill = i < look.effort ? SHARED.L : SHARED.l
    rects += `<rect x="${i * (mark + gap)}" y="0" width="${mark}" height="${mark}" fill="${fill}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${mark}" viewBox="0 0 ${width} ${mark}" shape-rendering="crispEdges">${rects}</svg>`
}

export function robot(kit: Kit, state: RobotState, n: number, antenna: string, look: RobotLook = PLAIN, px = 3) {
  const { Box, Svg, Text } = kit
  if (!Svg) {
    const eye = state === 'idle' || state === 'work' ? SHARED.E : antenna
    return <Text color={eye}>{robotFace(state, n, look)}</Text>
  }
  const f = robotFrame(state, n, look)
  const colours = { ...SHARED, ...PALETTES[look.model] }
  // Not `h`: the JSX compiles to calls of a function by that name
  const width = 12 * px
  const height = 14 * px // one spare row, so the hop stays inside the picture
  let rects = ''
  f.rows.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      const fill = ch === 'A' ? (f.antennaOn ? antenna : '#2E3A42') : colours[ch]
      if (fill) rects += `<rect x="${x * px}" y="${(y + 1 + f.dy) * px}" width="${px}" height="${px}" fill="${fill}"/>`
    })
  })
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">` +
    rects +
    '</svg>'
  const what = { idle: '', work: ': Claude is working', yellow: ': yellow warning', red: ': red warning', happy: ': safe to close' }[state]
  const effort = look.effort > 0 ? `, effort ${['low', 'medium', 'high', 'extra', 'max'][look.effort - 1]}` : ''
  const picture = <Svg source={source} alt={`robot${NAMES[look.model]}${what}${effort}`} width={width} height={height} />
  if (look.effort === 0) return picture
  const level = ['low', 'medium', 'high', 'extra', 'max'][look.effort - 1]
  return (
    <Box key="robot" flexDirection="column" alignItems="center" gap={1}>
      {picture}
      <Svg source={effortBar(look, px)} alt={`effort ${level}: ${look.effort} of 5`} width={width} height={2 * px} />
    </Box>
  )
}
