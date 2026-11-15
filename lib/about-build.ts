export type BuildSection = {
  id: string
  kicker: string
  title: string
  paragraphs: string[]
  points?: string[]
}

/** Plain language for a recruiter. Every line is something the repo actually does. */
export const BUILD_STORY: BuildSection[] = [
  {
    id: 'why',
    kicker: 'Why it exists',
    title: 'A kitchen table, not a mission control',
    paragraphs: [
      'Paul Miller built Liftoff Club in Centennial, Colorado so a family can follow a launch together. A seven year old gets a short story. A grown up gets the pad, the rocket, and an honest answer about whether anyone in the house can see it.',
      'The family site stays free. There are no accounts, no ads, and no payment. A separate desk at /pro is for space industry teams who need public launch and constellation records. That desk does not name a buyer, and it does not claim a tie to any company on the board.',
    ],
  },
  {
    id: 'who',
    kicker: 'Who it is for',
    title: 'Kids first, with the fuller account one switch away',
    paragraphs: [
      'Kids mode is on by default. The same page uses simpler words. Turn it off and the grown up account appears: booster history, customers, and public notes when the listing has them.',
      'Parent controls live under For parents: kids mode, night red, a saved town, and quiet hours. Nothing asks a child to make an account.',
    ],
  },
  {
    id: 'data',
    kicker: 'Data',
    title: 'Public sources, and a blank when we do not have a number',
    paragraphs: [
      'A figure appears only with a source and a date. If the public record does not have it, the line says no public figure yet. A month or a placeholder midnight is not turned into a fake clock. The page says the month and that the clock is not set.',
    ],
    points: [
      'Launch Library 2, from The Space Devs, for launches, pads, timelines, and descriptions. The app caches the board for about an hour so it stays inside the free rate limit.',
      'CelesTrak for public orbital elements and for how many satellites are in orbit. The app does not download the full Starlink list. Pass times are a family estimate from those elements. They are not for flying anything.',
      'Natural Earth land for the mission view globe. The path is an approximate ground track, labeled as approximate. There is no live altitude or speed.',
      'Open-Meteo for the town search and cloud cover. The free API is not for commercial use. A paid plan is required before Pro ever charges. No key.',
      'Rocket photos only when the license is public domain, CC0, CC BY, or CC BY-SA. Each picture names the author, the license, and a source link. Anything else gets a drawn trail, not a copied plume.',
    ],
  },
  {
    id: 'architecture',
    kicker: 'Architecture',
    title: 'A Next.js server, a small browser, and one shared cache',
    paragraphs: [
      'The app is Next.js on the App Router, React, and TypeScript, deployed on Vercel. Pages that can be shared are cached for about an hour. The town, kids mode, and quiet hours stay in this browser.',
      'Orbit math uses satellite.js from its plain JavaScript build, not the WebAssembly entry, so the server build stays simple. Launch Library responses are kept in memory and on disk, with a saved board if the feed is resting.',
    ],
  },
  {
    id: 'design',
    kicker: 'Design',
    title: 'One night sky, three jobs for type',
    paragraphs: [
      'Gloock is for titles. Inclusive Sans is for reading. Barlow is for labels, timestamps, and figures. The palette is a deep field: near black, dusty violet, cold blue, and a small warm core. Text is solid. It does not glow. The trail and the star field carry the decoration.',
      'Motion holds still when the device asks for reduced motion. The mission view says the path is approximate. The product does not invent telemetry.',
    ],
  },
  {
    id: 'next',
    kicker: 'What is next',
    title: 'Still open, and not pretended',
    paragraphs: [
      'Email and text briefs are not sent. The brief page already writes the words. A model writes a story only when an optional key is set. Otherwise the story comes from the listing.',
      'Company pages are public and unclaimed. There is no login, no checkout, and no private graph of who flies with whom. Those are later, if they are built at all.',
    ],
  },
]
