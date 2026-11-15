export type TimelineItem = {
  id: string
  at: string | null
  kind: 'launch' | 'event' | 'award' | 'filing'
  title: string
  detail: string
  href: string
}

/** Newest first. Items with no date stay at the end. */
export function mergeTimeline(groups: TimelineItem[][]): TimelineItem[] {
  return groups
    .flat()
    .sort((a, b) => {
      if (!a.at && !b.at) return a.title.localeCompare(b.title)
      if (!a.at) return 1
      if (!b.at) return -1
      return b.at.localeCompare(a.at)
    })
}
