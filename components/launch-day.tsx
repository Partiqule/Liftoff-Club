'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Countdown } from '@/components/countdown'
import { Jellyfish } from '@/components/jellyfish'
import { Logo } from '@/components/logo'
import { stageScript } from '@/lib/stages'
import type { Launch } from '@/lib/types'

export function LaunchDayScreen({ launch }: { launch: Launch }) {
  const [now, setNow] = useState(() => Date.now())
  const [full, setFull] = useState(false)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const script = stageScript(launch, now)
  const current = script.steps.find((step) => step.state === 'now')
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const node = document.querySelector('.day-steps li[data-state="now"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [current?.abbrev, current?.offsetSec])

  return (
    <section className="day-screen">
      <Jellyfish size="day" />
      <svg className="day-arc" viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="dayglow" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#6d628c" stopOpacity="0" />
            <stop offset="0.45" stopColor="#c5d2e2" stopOpacity="0.7" />
            <stop offset="1" stopColor="#f3d7b0" />
          </linearGradient>
        </defs>
        <path d="M30 560C280 560 460 80 970 120" />
        <circle cx="970" cy="120" r="5" fill="#f3d7b0" />
      </svg>
      <div className="day-top">
        <Link className="brand" href={`/launches/${launch.id}`}>
          <Logo size={48} />
          <span className="meta">Back to the mission</span>
        </Link>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => {
            const root = document.documentElement
            if (!document.fullscreenElement) {
              void root.requestFullscreen?.().then(() => setFull(true)).catch(() => setFull(false))
            } else {
              void document.exitFullscreen?.().then(() => setFull(false))
            }
          }}
        >
          {full ? 'Exit full screen' : 'Fill the screen'}
        </button>
      </div>
      <div className="day-main">
        <p className="kicker">{launch.provider.name}</p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>{launch.name}</h1>
        <Countdown net={launch.net} size="xl" />
        <p className="day-stage when-kid">{script.kid}</p>
        <p className="day-stage when-adult">{script.adult}</p>
        {launch.webcastUrl ? (
          <p>
            <a className="btn" href={launch.webcastUrl}>
              Watch the broadcast
            </a>
          </p>
        ) : null}
      </div>
      <aside className="day-side">
        <p className="kicker">What is happening</p>
        {script.steps.length === 0 ? <p>Waiting on a published clock.</p> : null}
        <ol className="day-steps">
          {script.steps.map((step) => (
            <li key={`${step.abbrev}-${step.offsetSec}`} data-state={step.state}>
              {formatOffset(step.offsetSec)} {step.abbrev}
            </li>
          ))}
        </ol>
      </aside>
      <div className="day-foot">
        <p className="meta">{launch.padLocation ?? launch.padName}</p>
        <p className="meta">Stage lines follow the public timeline when we have one. Otherwise they are a typical clock, not a promise.</p>
      </div>
    </section>
  )
}

function formatOffset(seconds: number): string {
  const abs = Math.abs(Math.round(seconds))
  const minutes = Math.floor(abs / 60)
  const remain = abs % 60
  const relation = seconds < 0 ? 'before' : seconds > 0 ? 'after' : 'liftoff'
  let span = `${remain}s`
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    span = mins ? `${hours}h ${mins}m` : `${hours}h`
  } else if (minutes > 0 && remain === 0) span = `${minutes}m`
  else if (minutes > 0) span = `${minutes}m ${remain}s`
  return relation === 'liftoff' ? 'Liftoff' : `${span} ${relation}`
}
