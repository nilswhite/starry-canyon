# Starry Canyon

A Claude Code theme: the Milky Way arching over the Grand Canyon on a dark-sky night, with the galactic core rising over the North Rim, faint green airglow along the horizon, and slowly twinkling stars.

A moon shows how full the session's context window is. It rises at the upper left as a thin crescent when the window is empty, moves across the top of the sky as the window fills, and reaches the right as a full moon at 100%. Past halfway its light starts to wash out the Milky Way and light up the canyon's rust-colored walls, so a bright sky is your cue to wrap up or compact. After a compaction the moon goes back toward the left.

The scene draws in the Claude desktop and mobile apps. The terminal does not draw themes.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install starry-canyon --marketplace nilswhite/starry-canyon
```

Answer `y` to add the marketplace, then press Enter to install for your user, so it loads in every session.

Or from a shell:

```bash
claude plugin install starry-canyon --marketplace nilswhite/starry-canyon
```

In the Claude desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `nilswhite/starry-canyon`, then **Add plugin**. A theme installed from a terminal for your user also shows in the desktop app's sessions.

## Commands

| Command | What it does |
| --- | --- |
| `/starry` | Toggle the theme in this session |
| `/starry on` / `/starry off` | Turn it on or off explicitly |
| `/starry status` | Show whether this session wears it, the context fill and the moon's phase |
| `/starry preview 75` | Show the moon at any fill (0-100) until your next message |

## Each session keeps its own theme

Turning the theme on or off sets it for this session and for every session you start afterwards. Sessions already open keep whatever they have, and a session you resume comes back with the theme it last wore. So you can have Starry Canyon in one session and another theme in the next.

`/starry off` in a session that wears another theme leaves that session alone and only stops new sessions starting with Starry Canyon.

The choice lives in `~/.claude/theme-mods/choice.json`, which other theme mods can read too: `default` is what a new session starts with, and `sessions` pins each session to its own theme. [Electron Vue](https://github.com/nilswhite/electron-vue-theme) reads the same file, so switching between the two works the same way in both.

## Notes

- The moon moves in steps of 2% of the context window, after Claude finishes a turn.
- If you've turned on reduced motion, the stars stop twinkling; the moon still moves.

## License

MIT, except `hooks/make-colors.js` and `hooks/make-colors.d.ts`, which come from Claude Code's plugin-authoring kit; see [LICENSE](LICENSE).
