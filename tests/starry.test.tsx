import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, ThemeSetArgs } from 'claude-code'

const SCENE = 'grand-canyon-milky-way'

const BACKDROP = {
  plugin: 'starry-canyon',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: SCENE, plugin: 'starry-canyon', glass: false },
} as const

const reading = (percent?: number) => ({
  tokens: percent === undefined ? undefined : percent * 10_000,
  window: 1_000_000,
  percent,
})

// The engine beneath the plugin: themes and clears are recorded, and the
// session's usage answers `startAt` until a measurement says otherwise.
function engine(on: On, startAt?: number) {
  const themes: ThemeSetArgs[] = []
  const clears: number[] = []

  on('command.register', () => ({ value: { command: 'starry' } }))
  on('theme.set', (_, e) => {
    themes.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('theme.clear', () => {
    clears.push(1)

    return { value: { isDrawn: false, reason: 'cleared' } }
  })
  on('session.usage', () => ({ value: { startedAt: 0, context: reading(startAt), rateLimits: [] } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('command.run', () => ({ text: 'engine' }))
  mock.store(on)
  mock.clock(on, { now: 1_000 })

  return { themes, clears }
}

const start = ($: Engine) => $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

const measure = ($: Engine, percent: number) =>
  $.session.measure({ context: reading(percent), rateLimits: [], changed: ['context'] })

// The person typing `/starry <args>` at the prompt.
const starry = ($: Engine, args = '') =>
  $.command.run({
    command: 'starry',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  })

// Where the backdrop draws the moon: the fill it marks.
async function moonAt($: Engine): Promise<number> {
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()
  const match = /<!-- moon at (\d+) -->/.exec(String(svg?.props.source ?? ''))

  return match ? Number(match[1]) : -1
}

test('the theme goes up at session start, with unblurred glass', async ($, on) => {
  const { themes } = engine(on)

  await start($)

  expect(themes.length).toBe(1)
  expect(themes[0]?.backdrop).toEqual(expect.objectContaining({ scene: SCENE, glass: expect.objectContaining({ blur: 0 }) }))
  expect(themes[0]?.overrideColorScheme).toBe('dark')
  expect(await moonAt($)).toBe(0)
})

test('the moon follows the context window as it fills, in steps of 2%', async ($, on) => {
  engine(on)
  await start($)

  await measure($, 15)
  expect(await moonAt($)).toBe(14)

  await measure($, 47)
  expect(await moonAt($)).toBe(46)

  // A compaction empties the window: the moon goes back to the left.
  await measure($, 8)
  expect(await moonAt($)).toBe(8)

  await measure($, 100)
  expect(await moonAt($)).toBe(100)
})

test('a resumed session starts with the moon where its context already is', async ($, on) => {
  engine(on, 37)

  await start($)

  expect(await moonAt($)).toBe(36)
})

test('/starry preview pins the moon until the next turn ends', async ($, on) => {
  engine(on)
  await start($)
  await measure($, 20)

  const shown = await starry($, 'preview 80')
  expect(shown.text).toContain('80%')
  expect(await moonAt($)).toBe(80)

  await measure($, 22)
  expect(await moonAt($)).toBe(22)

  const wrong = await starry($, 'preview lots')
  expect(wrong.text).toContain('Usage')
})

test('/starry toggles the theme off and on, and remembers it', async ($, on) => {
  const { themes, clears } = engine(on)
  await start($)
  expect(themes.length).toBe(1)

  const off = await starry($)
  expect(off.text).toContain('off')
  expect(clears.length).toBe(1)

  // A new session starts without the theme while it is off.
  await start($)
  expect(themes.length).toBe(1)

  // Turning off again clears nothing: another theme may be standing.
  await starry($, 'off')
  expect(clears.length).toBe(1)

  const backOn = await starry($, 'on')
  expect(backOn.text).toContain('on')
  expect(themes.length).toBe(2)

  const status = await starry($, 'status')
  expect(status.text).toContain('Starry Canyon is on')
})

test('another scene is left alone', async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const other = await $.ui.mount({ ...BACKDROP, surface: 'desktop', props: { ...BACKDROP.props, scene: 'lagoon' } })
  expect((await other.find({ type: 'Text' }))?.text).toBe('engine')
  await other.unmount()
})
