/** Share sheet text. Kept out of the push module so a launch page does not load crypto. */
export function shareLaunchText(name: string, when: string): string {
  return `${name}. ${when}.`
}
