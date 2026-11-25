/** How full the context window is, 0 to 100; -1 for none. */
export type Fill = number

declare module 'claude-code' {
  interface PluginState {
    'starry-canyon': {
      /** How full the context window last read, 0 to 100 in steps of 2; -1 before the first reading. */
      fill: Shaped<Fill>
      /** A fill `/starry preview` pinned the moon to until the next turn ends; -1 for the live reading. */
      preview: Shaped<Fill>
    }
  }
}
