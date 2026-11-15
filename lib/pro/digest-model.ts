import { FREE_LINE } from '@/lib/pro/access-gate'

export type DigestItem = { title: string; detail: string; href: string }

export type DigestIssue = {
  title: string
  windowLabel: string
  launches: DigestItem[]
  tests: DigestItem[]
  slips: DigestItem[]
  filings: DigestItem[]
}

export function digestShouldSend(input: { event: string | null; admin: boolean; now: Date }): boolean {
  if (input.admin || input.event === 'workflow_dispatch') return true
  if (input.event !== 'schedule') return false
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(input.now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  return weekday === 'Mon' && hour === 7
}

export function digestText(issue: DigestIssue, origin: string): string {
  const lines = [issue.title, FREE_LINE, issue.windowLabel, '']
  lines.push('Launches', ...section(issue.launches, origin), '', 'Tests', ...section(issue.tests, origin), '', 'Slips', ...section(issue.slips, origin), '', 'Filings', ...section(issue.filings, origin))
  lines.push('', 'Independent project. Liftoff Club is not affiliated with or endorsed by any launch provider or agency.')
  return lines.join('\n')
}

export function digestConfirmText(link: string): { subject: string; text: string } {
  return {
    subject: 'Confirm your Liftoff Club Pro digest',
    text: ['Confirm your Liftoff Club Pro digest', FREE_LINE, '', 'Open this link to join the Monday note. It expires in seven days.', link, '', 'The family site does not use this list.'].join('\n'),
  }
}

function section(items: DigestItem[], origin: string): string[] {
  if (items.length === 0) return ['None on the public list for this window.']
  return items.map((item) => `${item.title}. ${item.detail} ${item.href.startsWith('http') ? item.href : `${origin}${item.href}`}`)
}
