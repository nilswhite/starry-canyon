import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { scene } from './scene'

// ---- Shared theme choice (start) ----------------------------------------
// Which theme each session wears, shared by every theme mod that reads this
// file (`~/.claude/theme-mods/choice.json`):
//
//   { "default": "electron-vue",
//     "sessions": { "<session id>": { "theme": "starry-canyon", "at": 1764000000000 } } }
//
// A new session wears `default`, the theme last turned on or off anywhere. A
// session that has worn a theme is pinned to it, so it comes back the same on
// resume whatever other sessions chose since. Keep this section identical in
// each theme mod. It lives in this file, not its own, because older Claude
// Code (2.1.289, for one) refuses a hooks module that hands `$` to a function
// imported from another file.

/** No theme: the app's own look. */
const NONE = 'none'

type Pin = { theme: string; at: number }

type Choice = { default: string; sessions: Record<string, Pin> }

/** How many sessions' pins are kept, newest first. */
const KEEP = 300

function choicePath($: EngineInterface): string {
  const root = $.plugin.root.replace(/\/+$/, '')
  const at = root.lastIndexOf('/.claude/')
  // The Claude config folder holding this mod, else the folder two above it.
  const base = at >= 0 ? root.slice(0, at + '/.claude'.length) : root.replace(/\/[^/]+\/[^/]+$/, '')

  return `${base}/theme-mods/choice.json`
}

function isPin(value: unknown): value is Pin {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Pin).theme === 'string' &&
    typeof (value as Pin).at === 'number'
  )
}

/** The shared choice, or undefined when no theme mod has written one yet. */
async function readChoice($: EngineInterface): Promise<Choice | undefined> {
  try {
    const path = choicePath($)

    if (!(await $.fs.exists(path))) {
      return undefined
    }
    const parsed: unknown = JSON.parse(String(await $.fs.read(path)))

    if (typeof parsed !== 'object' || parsed === null) {
      return undefined
    }
    const raw = parsed as { default?: unknown; sessions?: unknown }
    const sessions: Record<string, Pin> = {}

    if (typeof raw.sessions === 'object' && raw.sessions !== null) {
      for (const [id, pin] of Object.entries(raw.sessions)) {
        if (isPin(pin)) {
          sessions[id] = pin
        }
      }
    }

    return { default: typeof raw.default === 'string' ? raw.default : NONE, sessions }
  } catch {
    return undefined
  }
}

async function writeChoice($: EngineInterface, choice: Choice): Promise<void> {
  const newest = Object.entries(choice.sessions)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, KEEP)

  try {
    await $.fs.write(
      choicePath($),
      `${JSON.stringify({ default: choice.default, sessions: Object.fromEntries(newest) }, null, 2)}\n`,
    )
  } catch (error) {
    $.ui.log(`${$.plugin.name}: could not save the theme choice: ${String(error)}`, { to: 'debug' })
  }
}

/**
 * The theme this session wears: its own pin, else the default for new
 * sessions, else `fallback` when no theme mod has saved a choice yet.
 */
async function themeFor($: EngineInterface, fallback: string): Promise<string> {
  const choice = await readChoice($)

  if (choice === undefined) {
    return fallback
  }
  const pin = choice.sessions[await $.session.id()]

  return pin?.theme ?? choice.default
}

/** Pins this session to `theme` if nothing pinned it yet; the default stays. */
async function keep($: EngineInterface, theme: string): Promise<void> {
  const id = await $.session.id()
  const choice = (await readChoice($)) ?? { default: theme, sessions: {} }

  if (choice.sessions[id] !== undefined) {
    return
  }
  choice.sessions[id] = { theme, at: await $.clock.now() }
  await writeChoice($, choice)
}

/** Wears `theme` (or NONE) in this session and in every new session from now on. */
async function choose($: EngineInterface, theme: string): Promise<void> {
  const id = await $.session.id()
  const choice = (await readChoice($)) ?? { default: theme, sessions: {} }

  choice.default = theme
  choice.sessions[id] = { theme, at: await $.clock.now() }
  await writeChoice($, choice)
}

/**
 * Stops new sessions starting with `theme`, leaving every session's own pin
 * as it is. Resolves whether `theme` was the default.
 */
async function release($: EngineInterface, theme: string): Promise<boolean> {
  const choice = await readChoice($)

  if (choice === undefined || choice.default !== theme) {
    return false
  }
  choice.default = NONE
  await writeChoice($, choice)

  return true
}
// ---- Shared theme choice (end) ------------------------------------------

const THEME = 'starry-canyon'
const SCENE = 'grand-canyon-milky-way'
const COMMAND = 'starry'
// This mod's own on/off, from before theme mods shared a choice: it decides
// only until any theme mod saves one, and is kept in step after.
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

/**
 * Whether this session wears Starry Canyon: its own pin, else the default for
 * new sessions, both shared with other theme mods.
 */
async function isEnabled($: EngineInterface): Promise<boolean> {
  const before = (await $.store.get(ENABLED_KEY)) !== false ? THEME : NONE

  return (await themeFor($, before)) === THEME
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
    // The look first, so nothing below can keep the sky from going up. The
    // session is then pinned to it, so it comes back the same on resume.
    if (await isEnabled($)) {
      try {
        await applyLook($)
        await keep($, THEME)
      } catch {
        // A Claude Code too old to draw themes has no `$.theme`; /starry is
        // still registered below, so the person can ask what's wrong.
      }
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
        return {
          text: 'Starry Canyon is off in this session. Turn it on with /starry on first.',
          isTextDisplayOnly: true,
        }
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

      return { text: `Starry Canyon is ${wasOn ? 'on' : 'off'} in this session: ${where}.`, isTextDisplayOnly: true }
    }

    const turnOn = verb === 'on' ? true : verb === 'off' ? false : verb === '' ? !wasOn : undefined

    if (turnOn === undefined) {
      return {
        text: 'Usage: /starry [on|off|status|preview <percent>]. With nothing, it toggles.',
        isTextDisplayOnly: true,
      }
    }

    if (turnOn) {
      await applyLook($)
      await choose($, THEME)
      await $.store.set(ENABLED_KEY, true)

      return {
        text: '✦ Starry Canyon is on in this session, and new sessions will start with it. Sessions already open keep their own theme. The moon crosses the sky as the context window fills.',
        isTextDisplayOnly: true,
      }
    }

    if (!wasOn) {
      // This session wears another theme or none: leave it, and only stop
      // new sessions starting with this one.
      const wasDefault = await release($, THEME)

      if (wasDefault) {
        await $.store.set(ENABLED_KEY, false)
      }

      return {
        text: wasDefault
          ? 'Starry Canyon isn’t on in this session, so it stays as it is; new sessions will start without it.'
          : 'Starry Canyon isn’t on in this session, so nothing changed.',
        isTextDisplayOnly: true,
      }
    }

    // Clear only a theme this mod put up: one theme stands per session, and
    // a clear removes whichever does.
    await $.theme.clear()
    await choose($, NONE)
    await $.store.set(ENABLED_KEY, false)

    return {
      text: 'Starry Canyon is off in this session, and new sessions will start without it. Turn it back on with /starry.',
      isTextDisplayOnly: true,
    }
  }).catch(() => ({
    text: 'Starry Canyon could not finish that; try /starry again. If it keeps failing, this chat may be on a Claude Code too old to draw themes: update Claude Code and restart the chat.',
    isTextDisplayOnly: true,
  }))
}
