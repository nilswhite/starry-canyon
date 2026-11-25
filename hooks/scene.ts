// The Milky Way over the Grand Canyon on a dark-sky night, drawn as plain
// vector SVG: no pictures, no fonts, no filters (radial gradients make every
// glow, so the scene stays light to paint).
//
// A moon marks how full the context window is: it rises at the left as a thin
// crescent, crosses the top of the sky as the window fills, and reaches the
// right as a full moon whose light washes out the Milky Way and lights the
// canyon walls: the night itself says it is time to wrap up or compact.

const W = 1600
const H = 1000

// The canyon is raised this much from where its shapes were first laid out.
const LIFT = 50

// Where the galactic core sits (low, just above the North Rim) and where the
// band runs off the top of the sky.
const CORE = { x: 420, y: 645 }
const TOP = { x: 1400, y: -200 }

type Rand = () => number

function seeded(seed: number): Rand {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rand: Rand): number {
  const u = Math.max(rand(), 1e-9)
  const v = rand()

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const n1 = (value: number) => String(Math.round(value * 10) / 10)
const n2 = (value: number) => String(Math.round(value * 100) / 100)
const pick = <T,>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)

  return t * t * (3 - 2 * t)
}

// Mixes two #rrggbb colors.
function mix(from: string, to: string, amount: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  let out = '#'

  for (let i = 0; i < 3; i += 1) {
    const value = Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * amount)
    out += value.toString(16).padStart(2, '0')
  }

  return out
}

// The band's axis: a unit vector along it, one across it, and its angle.
const AX = TOP.x - CORE.x
const AY = TOP.y - CORE.y
const LEN = Math.hypot(AX, AY)
const UX = AX / LEN
const UY = AY / LEN
const NX = -UY
const NY = UX
const ANGLE = (Math.atan2(AY, AX) * 180) / Math.PI
const SKY_FLOOR = 700 - LIFT + 12

function onBand(t: number, s: number) {
  return { x: CORE.x + UX * LEN * t + NX * s, y: CORE.y + UY * LEN * t + NY * s }
}

const bandWidth = (t: number) => 95 - 45 * t

// Rock by starlight (a cool, faintly warm indigo) and by a full moon (the
// canyon's own rust and umber, still dim), per layer, top stop then bottom.
const ROCK = {
  rim: [['#1a1b3c', '#40355a'], ['#11142f', '#2b2442']],
  far: [['#17173a', '#3f2e45'], ['#0d0f27', '#271c30']],
  mid: [['#121029', '#332337'], ['#090a1c', '#1c1423']],
  wall: [['#0d0b1d', '#26192d'], ['#05050e', '#110b16']],
} as const

function defs(light: number): string {
  const rock = (id: string, layer: keyof typeof ROCK, y1: number, y2: number) => {
    const [[top0, top1], [bottom0, bottom1]] = ROCK[layer]

    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}"><stop offset="0" stop-color="${mix(top0, top1, light)}"/><stop offset="1" stop-color="${mix(bottom0, bottom1, light)}"/></linearGradient>`
  }

  return `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#010208"/>
<stop offset="0.42" stop-color="#050816"/>
<stop offset="0.62" stop-color="#0a1230"/>
<stop offset="0.73" stop-color="#101c44"/>
<stop offset="1" stop-color="#0c1434"/>
</linearGradient>
<linearGradient id="airglow" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#2e6a58" stop-opacity="0"/>
<stop offset="0.7" stop-color="#2e6a58" stop-opacity="0.14"/>
<stop offset="1" stop-color="#36507e" stop-opacity="0.2"/>
</linearGradient>
<linearGradient id="moonsky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#1d2c5a"/>
<stop offset="1" stop-color="#34497e"/>
</linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#d4defc"/><stop offset="1" stop-color="#d4defc" stop-opacity="0"/></radialGradient>
<radialGradient id="warm"><stop offset="0" stop-color="#ffe3bd"/><stop offset="1" stop-color="#ffe3bd" stop-opacity="0"/></radialGradient>
<radialGradient id="dust"><stop offset="0" stop-color="#04060f"/><stop offset="0.55" stop-color="#04060f" stop-opacity="0.6"/><stop offset="1" stop-color="#04060f" stop-opacity="0"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="moonhalo"><stop offset="0" stop-color="#f3f0e2" stop-opacity="0.5"/><stop offset="0.3" stop-color="#c9d4f2" stop-opacity="0.16"/><stop offset="1" stop-color="#9fb2e6" stop-opacity="0"/></radialGradient>
<radialGradient id="moonface" cx="0.42" cy="0.4" r="0.65"><stop offset="0" stop-color="#fffdf4"/><stop offset="1" stop-color="#e2dcc8"/></radialGradient>
${rock('rimG', 'rim', 695, 800)}
${rock('farG', 'far', 688, 800)}
${rock('midG', 'mid', 750, 870)}
${rock('wallG', 'wall', 800, 945)}
</defs>`
}

// Which moon a window shows: the scene is cropped to fill the window, so a
// narrow one (a phone) sees only the middle of the sky. Each copy of the moon
// rides a track sized to what its window shape always shows.
const TRACKS = [
  { visible: 1450, media: '' },
  { visible: 1050, media: '(max-aspect-ratio: 29/20)' },
  { visible: 700, media: '(max-aspect-ratio: 21/20)' },
  { visible: 450, media: '(max-aspect-ratio: 7/10)' },
] as const

const STYLE = `<style>
.tw { animation: tw 5s ease-in-out infinite }
.tw2 { animation: tw 7.5s ease-in-out infinite }
.tw3 { animation: tw 10s ease-in-out infinite }
@keyframes tw { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
.mt1, .mt2, .mt3 { display: none }
${TRACKS.slice(1)
  .map((track, i) => `@media ${track.media} { .mt${i} { display: none } .mt${i + 1} { display: inline } }`)
  .join('\n')}
</style>`

function sky(): string {
  return [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    `<rect y="${500 - LIFT}" width="${W}" height="240" fill="url(#airglow)"/>`,
  ].join('')
}

// Many stars, cheaply: each is a zero-length stroke with a round cap (a dot),
// gathered into one path per size, brightness and tint and written as short
// relative moves, so a star costs a few characters instead of a whole element.
class Dots {
  private readonly bins = new Map<string, Array<[number, number]>>()

  add(x: number, y: number, diameter: number, opacity: number, color: string): void {
    const size = diameter < 1.1 ? 1 : diameter < 1.5 ? 1.35 : diameter < 2 ? 1.8 : 2.5
    const alpha = opacity < 0.42 ? 0.32 : opacity < 0.62 ? 0.52 : opacity < 0.82 ? 0.72 : 0.95
    const key = `${color}|${size}|${alpha}`
    const list = this.bins.get(key) ?? []
    list.push([Math.round(x), Math.round(y)])
    this.bins.set(key, list)
  }

  svg(): string {
    const paths: string[] = []

    for (const [key, list] of this.bins) {
      const [color, size, alpha] = key.split('|')
      // Rows of 40 units, snaking left and right, keep each move short.
      list.sort((a, b) => {
        const rowA = Math.floor(a[1] / 40)
        const rowB = Math.floor(b[1] / 40)

        return rowA !== rowB ? rowA - rowB : rowA % 2 === 0 ? a[0] - b[0] : b[0] - a[0]
      })
      let d = ''
      let px = 0
      let py = 0
      list.forEach(([x, y], i) => {
        d += i === 0 ? `M${x} ${y}h0` : `m${x - px} ${y - py}h0`
        px = x
        py = y
      })
      d = d.replace(/ -/g, '-')
      paths.push(`<path d="${d}" stroke="${color}" stroke-opacity="${alpha}" stroke-width="${size}" stroke-linecap="round" fill="none"/>`)
    }

    return paths.join('')
  }
}

// A star's size and brightness: most faint, a few bright.
function starLook(rand: Rand): { diameter: number; opacity: number } {
  const roll = rand()

  if (roll > 0.993) {
    return { diameter: 2.2 + rand() * 0.4, opacity: 0.9 }
  }
  if (roll > 0.9) {
    return { diameter: 1.5 + rand() * 0.45, opacity: 0.65 + rand() * 0.25 }
  }
  if (roll > 0.6) {
    return { diameter: 1.1 + rand() * 0.35, opacity: 0.45 + rand() * 0.3 }
  }

  return { diameter: 0.9 + rand() * 0.2, opacity: 0.28 + rand() * 0.32 }
}

function milkyWay(rand: Rand): string {
  const parts: string[] = []
  const dots = new Dots()
  const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, opacity: number, tilt = ANGLE) =>
    `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(ry)}" transform="rotate(${n1(tilt)} ${n1(x)} ${n1(y)})" fill="url(#${fill})" fill-opacity="${n2(opacity)}"/>`

  // The Great Rift: a wandering seam along the band, from the core outward,
  // where dust hides most of the stars.
  const SAMPLES = 120
  const drift: number[] = []
  let walk = 4

  for (let i = 0; i <= SAMPLES; i += 1) {
    walk = clamp(walk + gauss(rand) * 3.2, -22, 26)
    drift.push(walk)
  }
  const riftAt = (t: number) => drift[clamp(Math.round(t * SAMPLES), 0, SAMPLES)]!
  const riftWidth = (t: number) => (t < 0.66 ? 8 + 12 * (1 - t / 0.66) : 0)
  const nebulae = Array.from({ length: 16 }, () => {
    const t = rand() * 0.55
    const p = onBand(t, gauss(rand) * bandWidth(t) * 0.6)

    return { x: p.x, y: p.y, r: 6 + rand() * 16 }
  })
  const hidden = (t: number, s: number, x: number, y: number) => {
    if (Math.abs(s - riftAt(t)) < riftWidth(t) * (0.7 + rand() * 0.6) && rand() < 0.88) {
      return true
    }

    return nebulae.some(n => Math.hypot(x - n.x, y - n.y) < n.r) && rand() < 0.8
  }
  const place = (t: number, s: number, warmth: number) => {
    const p = onBand(t, s)

    if (p.y > SKY_FLOOR || p.y < -4 || p.x < -4 || p.x > W + 4 || hidden(t, s, p.x, p.y)) {
      return
    }
    const { diameter, opacity } = starLook(rand)
    const roll = rand()
    const color = roll < warmth ? '#ffe6c7' : roll < warmth + 0.08 ? '#dce6ff' : '#ffffff'
    dots.add(p.x, p.y, diameter, opacity, color)
  }

  // A faint, even glow under it all: the light of stars too faint to see.
  for (let i = 0; i < 15; i += 1) {
    const t = i / 14
    const p = onBand(t, 0)
    parts.push(ellipse(p.x, p.y, 300, bandWidth(t) * 2.4, 'glow', 0.022))
    parts.push(ellipse(p.x, p.y, 220, bandWidth(t) * 1.2, 'glow', 0.032))
  }

  // Star clouds: knots of stars spread the whole length of the band, each
  // over a soft glow of its own.
  for (let c = 0; c < 70; c += 1) {
    const t = rand()
    const s = gauss(rand) * bandWidth(t) * 0.42
    const along = 14 + rand() * 34
    const across = 6 + rand() * 16
    const center = onBand(t, s)
    const warmth = t < 0.25 ? 0.35 : 0.12
    parts.push(ellipse(center.x, center.y, along * 1.6, across * 1.8, t < 0.25 ? 'warm' : 'glow', 0.025 + rand() * 0.035))
    const count = 25 + Math.floor(rand() * 55)

    for (let i = 0; i < count; i += 1) {
      place(t + (gauss(rand) * along) / LEN, s + gauss(rand) * across, warmth)
    }
  }

  // The scattered stars of the band, evenly along it, thickest on its spine.
  for (let i = 0; i < 2600; i += 1) {
    const t = rand()
    place(t, gauss(rand) * bandWidth(t) * 0.55, t < 0.25 ? 0.3 : 0.1)
  }

  // A modest swarm around the core.
  for (let i = 0; i < 200; i += 1) {
    const t = Math.abs(gauss(rand)) * 0.08
    place(t, gauss(rand) * 60, 0.55)
  }

  // The core's glow, small and low.
  parts.push(ellipse(CORE.x + 40, CORE.y - 50, 190, 110, 'warm', 0.09, ANGLE + 20))
  parts.push(ellipse(CORE.x + 50, CORE.y - 58, 100, 64, 'warm', 0.11, ANGLE + 15))
  parts.push(ellipse(CORE.x + 55, CORE.y - 62, 46, 32, 'warm', 0.13, ANGLE + 10))

  // A faint darkening along the rift, so it reads as dust and not only as a gap.
  for (let i = 0; i < 26; i += 1) {
    const t = 0.02 + (i / 26) * 0.6 + rand() * 0.015

    if (rand() < 0.3) {
      continue
    }
    const p = onBand(t, riftAt(t) + gauss(rand) * 4)
    parts.push(ellipse(p.x, p.y, 16 + rand() * 30, riftWidth(t) * (0.6 + rand() * 0.5), 'dust', 0.12 + rand() * 0.16, ANGLE + gauss(rand) * 14))
  }

  parts.push(dots.svg())

  return parts.join('')
}

// The stars of the rest of the sky: spread evenly from the zenith down to the
// rim, a few bright ones with a halo and a slow twinkle.
function fieldStars(rand: Rand): { faint: string; bright: string } {
  const tints = ['#ffffff', '#ffffff', '#ffffff', '#dfe8ff', '#cfdcff', '#fff1dc', '#ffdcc0'] as const
  const bright: string[] = []
  const faint = new Dots()
  const strong = new Dots()

  for (let i = 0; i < 1150; i += 1) {
    const x = rand() * W
    const y = rand() * SKY_FLOOR
    const roll = rand()
    const fill = pick(rand, tints)

    if (roll > 0.975) {
      const r = 1.2 + rand() * 0.9
      bright.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 5)}" fill="url(#halo)" fill-opacity="0.4"/>`)
      bright.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n2(r)}" fill="${fill}" class="${pick(rand, ['tw', 'tw2', 'tw3'])}" style="animation-delay:-${n1(rand() * 10)}s"/>`)
      continue
    }
    if (roll > 0.9) {
      strong.add(x, y, 1.6 + rand() * 0.4, 0.72 + rand() * 0.2, fill)
      continue
    }
    faint.add(x, y, 0.9 + rand() * 0.5, 0.28 + rand() * 0.4, fill)
  }

  return { faint: faint.svg(), bright: bright.join('') + strong.svg() }
}

// One butte or temple of the inner canyon: Grand Canyon's stair-step profile,
// sheer cliffs alternating with sloping ledges, from a cap down to a base,
// each side stepping out on its own.
function butte(rand: Rand, cx: number, top: number, base: number, cap: number): string {
  const tiers = 2 + Math.floor(rand() * 3)
  const left: Array<[number, number]> = []
  const right: Array<[number, number]> = []
  let lx = cx - cap / 2 + gauss(rand) * 4
  let rx = cx + cap / 2 + gauss(rand) * 4
  let y = top

  left.push([lx, y])
  right.push([rx, y])

  for (let i = 0; i < tiers; i += 1) {
    const step = (base - y) / (tiers - i)
    const cliff = step * (0.35 + rand() * 0.4)
    // Cliff face, nearly sheer.
    y += cliff
    lx -= 1 + rand() * 5
    rx += 1 + rand() * 5
    left.push([lx, y])
    right.push([rx, y])
    // A ledge, then the talus slope below it.
    lx -= 4 + rand() * 30
    rx += 4 + rand() * 30
    y += 1 + rand() * 3
    left.push([lx, y])
    right.push([rx, y])
    y = Math.min(base, y + (step - cliff) * 0.9)
    lx -= 14 + rand() * 50
    rx += 14 + rand() * 50
    left.push([lx, y])
    right.push([rx, y])
  }

  const points = [...left.reverse(), ...right].map(([x, py]) => `${n1(x)},${n1(py)}`).join(' ')

  return `<polygon points="${points}"/>`
}

// A canyon wall stepping down from one side of the scene toward the river.
function wall(rand: Rand, from: [number, number], to: [number, number]): string {
  const [x0, y0] = from
  const [x1, y1] = to
  const steps = 5
  const dir = Math.sign(x1 - x0)
  const pts: Array<[number, number]> = [[x0, y0]]
  let x = x0
  let y = y0
  const run = Math.abs(x1 - x0) / steps
  const drop = (y1 - y0) / steps

  for (let i = 0; i < steps; i += 1) {
    // A bench, nearly flat.
    x += dir * run * (0.2 + rand() * 0.4)
    y += drop * 0.06
    pts.push([x, y])
    // A cliff.
    x += dir * (2 + rand() * 6)
    y += drop * (0.45 + rand() * 0.3)
    pts.push([x, y])
    // Talus down to the next bench.
    x = x0 + dir * run * (i + 1)
    y = y0 + drop * (i + 1)
    pts.push([x, y])
  }

  pts.push([x, H], [dir > 0 ? 0 : W, H])

  return `<polygon points="${pts.map(([px, py]) => `${n1(px)},${n1(py)}`).join(' ')}"/>`
}

// A wind-bent juniper on the rim: a twisted trunk and ragged clumps of
// foliage, heavier on the lee side.
function juniper(rand: Rand, x: number, y: number, s: number, lean: number): string {
  const tx = x + lean * s * 0.35
  const trunk = `<path d="M${n1(x - s * 0.07)} ${n1(y)} C${n1(x - s * 0.05)} ${n1(y - s * 0.35)} ${n1(tx - s * 0.12)} ${n1(y - s * 0.45)} ${n1(tx)} ${n1(y - s * 0.78)} L${n1(tx + s * 0.06)} ${n1(y - s * 0.76)} C${n1(tx - s * 0.02)} ${n1(y - s * 0.45)} ${n1(x + s * 0.08)} ${n1(y - s * 0.3)} ${n1(x + s * 0.09)} ${n1(y)} Z"/>`
  const branch = `<path d="M${n1(x)} ${n1(y - s * 0.32)} Q${n1(x - lean * s * 0.3)} ${n1(y - s * 0.42)} ${n1(x - lean * s * 0.42)} ${n1(y - s * 0.58)} L${n1(x - lean * s * 0.39)} ${n1(y - s * 0.6)} Q${n1(x - lean * s * 0.24)} ${n1(y - s * 0.46)} ${n1(x + s * 0.03)} ${n1(y - s * 0.38)} Z"/>`
  const clumps: string[] = []

  for (let i = 0; i < 11; i += 1) {
    const a = rand()
    const cx = tx + (a - 0.5) * s * 0.95 + lean * s * 0.12
    const cy = y - s * (0.55 + rand() * 0.45) + Math.abs(a - 0.5) * s * 0.3
    clumps.push(`<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(s * (0.1 + rand() * 0.14))}" ry="${n1(s * (0.06 + rand() * 0.07))}"/>`)
  }

  return trunk + branch + clumps.join('')
}

type Canyon = { rimEdge: string; body: string }

function canyon(rand: Rand): Canyon {
  // The North Rim, far off and nearly flat: the Kaibab Plateau.
  const edge: string[] = []

  for (let x = 0; x <= W; x += 32) {
    edge.push(`${x === 0 ? 'M' : 'L'}${x} ${n1(700 + Math.sin(x / 230) * 4 + Math.sin(x / 61) * 1.5 + gauss(rand) * 1)}`)
  }
  const rim = `${edge.join(' ')} L${W} ${H} L0 ${H} Z`

  // Temples and buttes inside the canyon, below the far rim and in front of
  // it, at two depths, then the walls dropping toward the river.
  const far = [
    [80, 716, 792, 150], [335, 693, 796, 40], [560, 726, 792, 190], [800, 707, 796, 64],
    [1000, 731, 792, 230], [1185, 689, 798, 30], [1405, 715, 794, 120], [1575, 727, 792, 90],
  ].map(([cx, top, base, cap]) => butte(rand, cx!, top!, base!, cap!))
  const mid = [
    [210, 758, 862, 96], [650, 770, 868, 150], [1085, 752, 866, 58], [1470, 766, 862, 170],
  ].map(([cx, top, base, cap]) => butte(rand, cx!, top!, base!, cap!))

  const layers = [
    `<path d="${rim}" fill="url(#rimG)"/>`,
    `<g fill="url(#farG)">${far.join('')}<rect y="788" width="${W}" height="${H - 788}"/></g>`,
    `<g fill="url(#midG)">${mid.join('')}<rect y="858" width="${W}" height="${H - 858}"/></g>`,
    `<g fill="url(#wallG)">${wall(rand, [0, 806], [640, 936])}${wall(rand, [W, 816], [980, 936])}</g>`,
  ]

  // The near rim, where you stand: a rocky overlook with junipers.
  const ledge: string[] = [`M0 ${H}`, 'L0 866', 'L44 861', 'L72 858', 'L98 868', 'L176 870', 'L214 882', 'L262 889', 'L300 904']

  for (let x = 340; x <= W; x += 48) {
    ledge.push(`L${x} ${n1(930 + Math.sin(x / 140) * 8 + gauss(rand) * 3)}`)
  }
  ledge.push(`L${W} ${H}`, 'Z')

  const near = `<g fill="#020208"><path d="${ledge.join(' ')}"/>${juniper(rand, 122, 866, 78, 1)}${juniper(rand, 1452, 930, 46, -1)}</g>`

  return { rimEdge: edge.join(' '), body: layers.join('') + near }
}

// The moon at a fill of the context window, 0 to 100: where on its track it
// stands, and how much of it is lit (a thin crescent at 0, full at 100).
function moon(percent: number): string {
  const f = clamp(percent, 0, 100) / 100
  const lit = 0.1 + 0.9 * f
  const r = 22
  // The lit limb faces right; the terminator is an ellipse whose width shrinks
  // to nothing at first quarter and grows again past it.
  const terminator = r * Math.abs(1 - 2 * lit)
  const sweep = lit > 0.5 ? 1 : 0
  const litPath = `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${n2(terminator)} ${r} 0 0 ${sweep} 0 ${-r} Z`
  const halo = n2(0.25 + 0.75 * lit)

  return TRACKS.map((track, i) => {
    const x = 800 - track.visible * 0.42 + track.visible * 0.84 * f
    const y = 178 + 105 * Math.pow(2 * f - 1, 2)

    return `<g class="mt${i}" transform="translate(${n1(x)} ${n1(y)}) rotate(-22)"><circle r="${r * 7}" fill="url(#moonhalo)" opacity="${halo}"/><circle r="${r}" fill="#2b3352" opacity="0.6"/><clipPath id="mc${i}"><path d="${litPath}"/></clipPath><g clip-path="url(#mc${i})"><circle r="${r}" fill="url(#moonface)"/><circle cx="-6" cy="-5" r="6" fill="#cdc6b2" opacity="0.55"/><circle cx="5" cy="-9" r="4" fill="#cdc6b2" opacity="0.45"/><circle cx="8" cy="5" r="5.5" fill="#d3ccb8" opacity="0.5"/><circle cx="-3" cy="9" r="3" fill="#cdc6b2" opacity="0.4"/></g></g>`
  }).join('')
}

const SKY = sky()
const BAND = milkyWay(seeded(1977))
const STARS = fieldStars(seeded(2014))
const LAND = canyon(seeded(1919))

// The whole scene with the moon at `percent` of the context window.
export function scene(percent = 0): string {
  const p = clamp(Math.round(percent), 0, 100)
  // Moonlight: nothing to speak of until past halfway, then it brightens the
  // sky, washes out the band and the faint stars, and lights the rock.
  const light = smoothstep(50, 100, p)
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`,
    `<!-- moon at ${p} -->`,
    defs(light),
    STYLE,
    SKY,
    light > 0 ? `<rect width="${W}" height="${H}" fill="url(#moonsky)" opacity="${n2(0.32 * light)}"/>` : '',
    `<g opacity="${n2(1 - 0.6 * light)}">${BAND}</g>`,
    `<g opacity="${n2(1 - 0.55 * light)}">${STARS.faint}</g>`,
    `<g opacity="${n2(1 - 0.2 * light)}">${STARS.bright}</g>`,
    moon(p),
    `<g transform="translate(0 ${-LIFT})">`,
    LAND.body.replace('<g fill="url(#farG)">', `<path d="${LAND.rimEdge}" fill="none" stroke="#8c89bd" stroke-width="1.2" stroke-opacity="${n2(0.2 + 0.3 * light)}"/><g fill="url(#farG)">`),
    `</g>`,
    `<rect y="${H - LIFT - 6}" width="${W}" height="${LIFT + 6}" fill="#020208"/>`,
    `</svg>`,
  ]

  return parts.join('')
}
