import type { Kit } from './draw'

// The little pixel robot beside Details: an original design (not Anthropic's mascot), 12 × 13 pixels.
// Pure functions: a state and a frame number in, a drawing out. Its antenna shows the Compress colour.

export type RobotState = 'idle' | 'work' | 'yellow' | 'red' | 'happy'

// One tick of the animation; the mod moves the frame number on with its own timer.
export const ROBOT_MS = 300

// A: antenna light, s: stem, H: head, V: visor, E: eye, b: body, m: chest panel, a: arm, w: wheel
const BASE = [
  '.....AA.....',
  '.....ss.....',
  '..HHHHHHHH..',
  '..HVVVVVVH..',
  '..HVEVVEVH..',
  '..HVVVVVVH..',
  '..HHHHHHHH..',
  '...bbbbbb...',
  '..abbmmbba..',
  '..abbbbbba..',
  '...bbbbbb...',
  '...bb..bb...',
  '...ww..ww...',
]

const COLOURS: Record<string, string> = {
  s: '#8A9AA6',
  H: '#6F8796',
  V: '#1B2730',
  E: '#5DE0E6',
  b: '#5C7280',
  m: '#9FB3BF',
  a: '#6F8796',
  w: '#3D4B54',
}

export type RobotFrame = { rows: string[]; dy: number; antennaOn: boolean }

export function robotFrame(state: RobotState, n: number, blink = true): RobotFrame {
  const f = BASE.map(r => r.split(''))
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
      const scan = [[3, 6], [4, 7], [5, 8], [4, 7]][Math.floor(n / 2) % 4] ?? [4, 7]
      eyes(scan)
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
      antennaOn = !blink || Math.floor(n / 2) % 2 === 0
      break
    case 'happy':
      eyes([])
      for (const [r, c] of [[4, 3], [3, 4], [4, 5], [4, 6], [3, 7], [4, 8]] as const) set(r, c, 'E')
      arms(6)
      dy = Math.floor(n / 2) % 2 === 0 ? 0 : -1
      break
  }
  return { rows: f.map(r => r.join('')), dy, antennaOn }
}

// What changes on screen between two frame numbers: the timer redraws only when this differs.
export function robotKey(state: RobotState, n: number, blink = true) {
  const f = robotFrame(state, n, blink)
  return `${state}|${f.dy}|${f.antennaOn}|${f.rows.join('')}`
}

// The terminal has no pictures: a face of seven characters, the same width in every frame.
export function robotFace(state: RobotState, n: number, blink = true) {
  switch (state) {
    case 'idle':
      return n % 16 === 0 ? ' [-_-] ' : ' [o_o] '
    case 'work':
      return [' [o_ o]', ' [ o_o]', ' [o _o]', ' [ o_o]'][Math.floor(n / 2) % 4] ?? ' [o_o] '
    case 'yellow':
      return ' [O_O] '
    case 'red':
      return !blink || Math.floor(n / 2) % 2 === 0 ? ' [!_!] ' : ' [ _ ] '
    case 'happy':
      return Math.floor(n / 2) % 2 === 0 ? '\\[^_^]/' : ' [^_^] '
  }
}

const PX = 2 // screen pixels per robot pixel: 24 × 28, about the height of the Details button

export function robot(kit: Kit, state: RobotState, n: number, antenna: string, blink = true) {
  const { Svg, Text } = kit
  if (!Svg) {
    const eye = state === 'idle' || state === 'work' ? COLOURS.E : antenna
    return <Text color={eye}>{robotFace(state, n, blink)}</Text>
  }
  const f = robotFrame(state, n, blink)
  // Not `h`: the JSX compiles to calls of a function by that name
  const width = 12 * PX
  const height = 14 * PX // one spare row, so the hop stays inside the picture
  let rects = ''
  f.rows.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      const fill = ch === 'A' ? (f.antennaOn ? antenna : '#2E3A42') : COLOURS[ch]
      if (fill) rects += `<rect x="${x * PX}" y="${(y + 1 + f.dy) * PX}" width="${PX}" height="${PX}" fill="${fill}"/>`
    })
  })
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">` +
    rects +
    '</svg>'
  const alt = { idle: 'robot', work: 'robot: Claude is working', yellow: 'robot: yellow warning', red: 'robot: red warning', happy: 'robot: safe to close' }[state]
  return <Svg source={source} alt={alt} width={width} height={height} />
}
