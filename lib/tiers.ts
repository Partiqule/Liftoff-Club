/**
 * Family, Pro, and Business. Tests reject company names, prices, and the word walk.
 */
export const TIER_COPY = {
  kicker: 'Three ways to use Liftoff Club',
  familyTitle: 'Family',
  familyWho: 'For a household. Kids mode is on until a grown up turns it off.',
  familyOffer: 'Free.',
  familyPoints: ['The public launch board and the night sky.', 'A town and a time zone stay on this device.', 'No account.'],
  proTitle: 'Pro',
  proWho: 'For one person: someone who sells space services, works business development, studies the industry, reports on it, or is looking for work.',
  proOffer: 'Free during early access.',
  proPoints: ['A watchlist, a manifest, and a constellation tracker.', 'Sourced figures you can put in a deck.', 'Alerts when a clock you follow moves.'],
  businessTitle: 'Business',
  businessWho: 'For a team at a small satellite or constellation company.',
  businessOffer: 'Free during early access.',
  businessPoints: [
    'A quarterly launch review you can hand to a customer.',
    'The same sourced public record as Pro, gathered for the team.',
    'Coming soon: a network buildout board, slip notes for a customer, a shared team watchlist, and a data export.',
  ],
} as const

export const BUSINESS_COPY = {
  title: 'Liftoff Club Business',
  lede: 'A quarterly review for teams at small satellite and constellation companies. The family site stays free.',
  offer: 'Free during early access.',
  accessTitle: 'Request business access',
  accessBody: 'Leave your name, work email, company, role, and company size. What you track is optional. Free during early access. A valid note emails a sign in link.',
  comingTitle: 'Coming soon',
  coming: [
    'A network buildout board, in orbit versus planned, only where a public source states both.',
    'Slip notes written so you can hand them to a customer, using only a published reason.',
    'A shared team watchlist.',
    'A data export of the review.',
  ],
  reviewTitle: 'Quarterly launch review',
  reviewBody: 'Pick a company or the launches saved in this browser, and a calendar quarter. The page lists flights, payloads, published slip reasons, and what is next. Print or save a PDF from the browser.',
} as const
