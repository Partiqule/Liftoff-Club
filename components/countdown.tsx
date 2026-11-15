'use client'

import { useEffect, useState } from 'react'
import { countdownParts } from '@/lib/time'

export function Countdown({
  net,
  size = 'md',
  className = '',
}: {
  net: string | null
  size?: 'md' | 'lg' | 'xl'
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())
  const [spoken, setSpoken] = useState('')
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])
  useEffect(() => {
    const update = () => setSpoken(countdownParts(net, Date.now()).spoken)
    update()
    const tick = window.setInterval(update, 30_000)
    return () => window.clearInterval(tick)
  }, [net])
  const parts = countdownParts(net, now)
  const word =
    parts.mode === 'down' ? 'until liftoff' : parts.mode === 'up' ? 'since liftoff' : parts.mode === 'done' ? 'already flown' : 'time open'
  return (
    <div className={`count count-${size} ${className}`.trim()}>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
      <p className="count-word" aria-hidden="true">
        {word}
      </p>
      <p className={size === 'xl' ? 'day-count' : undefined} aria-hidden="true" suppressHydrationWarning>
        <span className={size === 'xl' ? 'day-clock count-digits' : 'count-digits'} suppressHydrationWarning>
          {parts.digits}
        </span>
      </p>
    </div>
  )
}

