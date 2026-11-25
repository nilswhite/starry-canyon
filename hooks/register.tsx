import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { scene } from './scene'

const SCENE = 'grand-canyon-milky-way'
const COMMAND = 'starry'
const ENABLED_KEY = 'enabled'

// The moon moves in steps of 2% of the context window, so the backdrop is
// redrawn only now and then, never on every turn.
const STEP = 2

const fill = atom({ plugin: 'starry-canyon', key: 'fill' } as const, -1, { shape: 'fill-1' })
const preview = atom({ plugin: 'starry-canyon', key: 'preview' } as const, -1, { shape: 'preview-1' })

// A night palette: deep indigo grays, starlight text, and roles tuned toward
// the scene (airglow green, galactic-core gold, sandstone red).
const { theme, problems } = makeColors({
  label: 'Starry Canyon',
  only: 'dark',
  roles: { accent: '#8aa8ff', danger: '#e87a5d', success: '#6fd6a8', warning: '#f0c46a', pro: '#b896ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#060914',
        'surface-1': '#0b0f20',
        'surface-2': '#10152a',
        'surface-3': '#141a33',
        'text-primary': '#eaeefa',
        'text-secondary': '#bcc4df',
        'text-muted': '#9098bd',
      },
    },
  },
})

// No blur on the glass: a blurred panel smears every star behind the
// conversation into haze. The tint alone keeps the words readable.
const LOOK: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: { scene: SCENE, glass: { blur: 0, tint: '#060914', opacity: 0.5 } },
}

const quantize = (percent: number) => Math.min(100, Math.max(0, Math.floor(percent / STEP) * STEP))

function phaseName(percent: number): string {
  return percent < 20
    ? 'a thin crescent'
    : percent < 42
      ? 'a waxing crescent'
      : percent < 58
        ? 'at first quarter'
        : percent < 86
          ? 'waxing gibbous'
          : percent < 98
            ? 'nearly full'
            : 'full'
}

async function isEnabled($: EngineInterface): Promise<boolean> {
  return (await $.store.get(ENABLED_KEY)) !== false
}

async function applyLook($: EngineInterface): Promise<void> {
  const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.log(`starry-canyon: ${unpainted}`, { to: 'debug' })
  }
  const set = await $.theme.set(LOOK)

  if (!set.isDrawn) {
    $.ui.log(`starry-canyon: ${set.reason}`, { to: 'debug' })
  }
}

// Moves the moon to a new reading, when it has moved a whole step.
async function setFill($: EngineInterface, percent: number | undefined): Promise<void> {
  if (percent === undefined) {
    return
  }
  const next = quantize(percent)

  await update($, fill, now => (now === next ? now : next))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // The look first, so nothing below can keep the sky from going up.
    if (await isEnabled($)) {
      await applyLook($)
    }

    // A resumed session starts with the moon where its context already is.
    try {
      await setFill($, (await $.session.usage()).context.percent)
    } catch (error) {
      $.ui.log(`starry-canyon: no context reading yet: ${String(error)}`, { to: 'debug' })
    }

    // On the very first load after mods are turned on, the engine can refuse
    // this before it counts the module as loaded; the reload that follows
    // registers it, so a refusal here is logged and passed over.
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Starry Canyon theme: on, off, status, or preview the moon at a fill',
        argumentHint: '[on|off|status|preview <percent>]',
      })
    } catch (error) {
      $.ui.log(`starry-canyon: /starry not registered yet: ${String(error)}`, { to: 'debug' })
    }

    return next(e)
  })

  // Measured after each turn: the moon follows the context window's fill, and
  // a preview gives way to the live reading.
  on('session.measure', async ($, e, next) => {
    await setFill($, e.context.percent)

    if ((await read($, preview)) >= 0) {
      await update($, preview, () => -1)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const pinned = await read($, preview)
    const live = await read($, fill)
    const percent = pinned >= 0 ? pinned : Math.max(0, live)

    return (
      <Svg
        source={scene(percent)}
        alt={`The Milky Way over the Grand Canyon at night, with the moon ${phaseName(percent)}`}
        isInteractive
      />
    )
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const [verb = '', amount] = (e.args ?? '').trim().toLowerCase().split(/\s+/)
    const wasOn = await isEnabled($)

    if (verb === 'preview') {
      if (!wasOn) {
        return { text: 'Starry Canyon is off. Turn it on with /starry on first.', isTextDisplayOnly: true }
      }
      const percent = Number(amount)

      if (amount === undefined || !Number.isFinite(percent) || percent < 0 || percent > 100) {
        return { text: 'Usage: /starry preview <0-100>, for example /starry preview 75.', isTextDisplayOnly: true }
      }
      const pinned = quantize(percent)
      await update($, preview, () => pinned)

      return {
        text: `The moon as it looks at ${pinned}% context: ${phaseName(pinned)}. It returns to the live reading after your next message.`,
        isTextDisplayOnly: true,
      }
    }

    if (verb === 'status') {
      const live = await read($, fill)
      const where =
        live < 0
          ? 'no context reading yet; the moon waits at the left as a thin crescent'
          : `the context window is about ${live}% full, and the moon is ${phaseName(live)}`

      return { text: `Starry Canyon is ${wasOn ? 'on' : 'off'}: ${where}.`, isTextDisplayOnly: true }
    }

    const turnOn = verb === 'on' ? true : verb === 'off' ? false : verb === '' ? !wasOn : undefined

    if (turnOn === undefined) {
      return {
        text: 'Usage: /starry [on|off|status|preview <percent>]. With nothing, it toggles.',
        isTextDisplayOnly: true,
      }
    }

    await $.store.set(ENABLED_KEY, turnOn)

    if (turnOn) {
      await applyLook($)

      return {
        text: '✦ Starry Canyon is on, here and in every new session. The moon crosses the sky as the context window fills.',
        isTextDisplayOnly: true,
      }
    }

    // Clear only a theme this mod put up: one theme stands per session, and
    // a clear removes whichever does.
    if (wasOn) {
      await $.theme.clear()
    }

    return {
      text: 'Starry Canyon is off, here and in every new session. Turn it back on with /starry.',
      isTextDisplayOnly: true,
    }
  }).catch(() => ({ text: 'Starry Canyon could not finish that; try /starry again.', isTextDisplayOnly: true }))
}
