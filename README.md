# Liftoff Club

A family companion for rocket launches and the night sky.

Live site: [https://liftoffclub.app](https://liftoffclub.app)

Liftoff Club covers launches worldwide. It is built for a kitchen table in Centennial, Colorado: a seven year old can follow the story, and a grown up still gets the pad, the rocket, and an honest answer about whether anyone in the house can see it. There are no accounts, no ads, and no required API keys. Your town stays in the browser.

The story of the build, in plain language, is at [/about/build](https://liftoffclub.app/about/build).

## What it feels like

Night sky, solid type, and a launch trail. Text does not glow. Mission marks are drawn for the club. They are not copies of anyone’s logo.

![Tonight from Centennial, desktop](docs/screenshots/02-home-desktop.png)

![The same night on a phone](docs/screenshots/10-home-mobile.png)

![A launch, in kids mode](docs/screenshots/04-detail-desktop.png)

![Launch day](docs/screenshots/06-day-desktop.png)

## Stack

- Next.js App Router, React, TypeScript
- Vercel for hosting
- Self hosted type: Gloock for titles, Inclusive Sans for reading, Barlow for labels and figures (SIL Open Font License)
- satellite.js, plain JavaScript build, for pass estimates
- Optional Vercel Web Analytics. Query strings are stripped. No cookies are required for the family site

## Data sources

- [The Space Devs, Launch Library 2](https://thespacedevs.com/llapi) for launches, pads, timelines, and descriptions. Cached for about an hour. A saved board is used if the feed is resting.
- [CelesTrak](https://celestrak.org) for public orbital elements and in orbit counts.
- [Natural Earth](https://www.naturalearthdata.com/) land for the mission view globe. The path is labeled approximate.
- [Open-Meteo](https://open-meteo.com) for geocoding and cloud cover. No key.
- Rocket photos only under public domain, CC0, CC BY, or CC BY-SA, each with author, license, and source. Other rockets use a drawn trail.

A number is shown only with a source and a date. Otherwise the line says no public figure yet. A coarse launch time says the clock is not set instead of inventing an hour.

## Try it

You need Node.js 20 or newer.

```bash
npm install
npm test
npm run lint
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). Kids mode is already on. Parent controls are under For parents.

## Deploy

1. Import this GitHub repo in the Vercel team `partiqules-projects` as the project `liftoff-club`. Framework preset: Next.js.
2. The production domain is `liftoffclub.app`. `www` redirects to the apex. `liftoff-club.vercel.app` keeps working.
3. Set `NEXT_PUBLIC_SITE_URL` to `https://liftoffclub.app` so calendar links, the sitemap, and share cards use the public site. Production already falls back to that address when the variable is blank. Preview deploys keep their own host.
4. No variable is required for the family site to build. Optional ones are in `.env.example`: `LL2_API_TOKEN` for a higher Launch Library limit, `EXPLAINER_API_KEY` if a model should draft a story, and the phone alert keys below. Without the explainer key, stories come from the listing. Never commit a real key.

## What the family app does

- Upcoming launches worldwide, with the next flight called out on the home page.
- A launch page, a full screen launch day, and a mission view with an approximate path.
- A share card for each launch: mission name, rocket, and the time in Mountain Time.
- Kids mode, on by default. Grown up mode adds booster history, customers, and public delay notes when the listing has them.
- A saved town. “Can we see this launch from here?” says when the answer is no.
- Tonight’s station passes and a small Starlink sample, with a go, maybe, or no go from cloud cover.
- Alerts while this tab is open, quiet hours, and a calendar feed that updates when a clock moves.
- A home screen install, an offline page, and phone alerts for followed launches when the keys below are set. Kids mode keeps phone alerts off.
- Follow a company in this browser. Company pages are public and unclaimed.
- Constellation counts at `/constellations`, cited or left blank.
- Glossary cards for countdown words.
- “Ask about this launch” on the grown up page. Answers come only from that launch’s listing.

## Phone alerts

GitHub Actions calls `/api/push/cron` every 10 minutes. Vercel calls it once a day, because a Hobby account cannot schedule a cron more often than that. The one hour note is sent inside a window, and Redis remembers the send. The controls stay hidden until these are set. See `.env.example`.

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or the Vercel KV pair
- `CRON_SECRET` on Vercel and as a GitHub Actions secret, the same value

## Pro

`/pro` is a desk for space industry teams: a watchlist, a cited constellation tracker, manifest filters with CSV export, local alert rules, and a one page brief. Free during early access. Saved targets stay in the browser. The family site stays account free.

Signed out visitors and people who are not approved see a preview. Full desks open after a passwordless email sign in for an email an admin has approved. Early access notes land as pending.

Set these on Vercel before sign in works. Do not commit the secret values.

- `PRO_SESSION_SECRET`, a long random string that signs the session cookie
- `RESEND_API_KEY` and `RESEND_FROM` on the verified liftoffclub.app sender
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or the Vercel KV pair, for sessions, magic links, and the approval list
- `ADMIN_TOKEN` to unlock `/pro/admin`, and optionally `ADMIN_EMAILS` as a comma-separated list of signed-in admin emails
- `PRO_NOTIFY_EMAIL` if you also want a copy when someone requests early access

## Tests

```bash
npm test
```

Covers pass prediction, visibility, calendar ids, quiet hours, cited figures, mission clock math, photo licenses, phone alert windows, and the case study copy.

## License

MIT. Copyright 2026 Paul Miller.
