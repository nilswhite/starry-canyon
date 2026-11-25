import type { EngineInterface } from 'claude-code'

// Which theme each session wears, shared by every theme mod that reads this
// file (`~/.claude/theme-mods/choice.json`):
//
//   { "default": "electron-vue",
//     "sessions": { "<session id>": { "theme": "starry-canyon", "at": 1764000000000 } } }
//
// A new session wears `default`, the theme last turned on or off anywhere. A
// session that has worn a theme is pinned to it, so it comes back the same on
// resume whatever other sessions chose since. Keep this file identical in each
// theme mod.

/** No theme: the app's own look. */
export const NONE = 'none'

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
export async function readChoice($: EngineInterface): Promise<Choice | undefined> {
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
export async function themeFor($: EngineInterface, fallback: string): Promise<string> {
  const choice = await readChoice($)

  if (choice === undefined) {
    return fallback
  }
  const pin = choice.sessions[await $.session.id()]

  return pin?.theme ?? choice.default
}

/** Pins this session to `theme` if nothing pinned it yet; the default stays. */
export async function keep($: EngineInterface, theme: string): Promise<void> {
  const id = await $.session.id()
  const choice = (await readChoice($)) ?? { default: theme, sessions: {} }

  if (choice.sessions[id] !== undefined) {
    return
  }
  choice.sessions[id] = { theme, at: await $.clock.now() }
  await writeChoice($, choice)
}

/** Wears `theme` (or NONE) in this session and in every new session from now on. */
export async function choose($: EngineInterface, theme: string): Promise<void> {
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
export async function release($: EngineInterface, theme: string): Promise<boolean> {
  const choice = await readChoice($)

  if (choice === undefined || choice.default !== theme) {
    return false
  }
  choice.default = NONE
  await writeChoice($, choice)

  return true
}
