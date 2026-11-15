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
  const visual = size === 'xl' ? parts.digits.replace(/:/g, '∶') : parts.digits
  return (
    <div className={`count count-${size} ${className}`.trim()}>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
      <p className={size === 'xl' ? 'day-count' : undefined} aria-hidden="true" suppressHydrationWarning>
        {parts.mode === 'down' ? <span className="count-mode">T−</span> : null}
        {parts.mode === 'up' ? <span className="count-mode">T+</span> : null}
        {size === 'xl' ? (
          <span className="day-clock">
            <XlDigits digits={parts.digits} />
          </span>
        ) : (
          <span className="count-digits" suppressHydrationWarning>
            {visual}
          </span>
        )}
      </p>
    </div>
  )
}

function XlDigits({ digits }: { digits: string }) {
  const pieces = digits.split(':')
  if (pieces.length === 1) return <span suppressHydrationWarning>{digits}</span>
  return (
    <span suppressHydrationWarning>
      {pieces.map((piece, index) => (
        <span key={`${piece}-${index}`}>
          {index > 0 ? <span className="colon">:</span> : null}
          {piece}
        </span>
      ))}
    </span>
  )
}
