'use client'

import { useState } from 'react'
import { useZonedText } from '@/components/use-zone'
import { shareLaunchText } from '@/lib/share-text'

export function ShareLaunch({ name, net, url }: { name: string; net: string | null; url: string }) {
  const [note, setNote] = useState<string | null>(null)
  const zoned = useZonedText()
  const when = net ? zoned(net) : 'Clock not set'

  async function onShare() {
    const text = shareLaunchText(name, when)
    setNote(null)
    try {
      const native = window.Capacitor?.isNativePlatform?.() ?? false
      if (native) {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
        const { Share } = await import('@capacitor/share')
        await Share.share({ title: name, text, url, dialogTitle: 'Share this launch' })
        return
      }
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: name, text, url })
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setNote('Link copied.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNote('Share did not open.')
    }
  }

  return (
    <p className="day-link">
      <button className="btn" type="button" onClick={() => void onShare()}>
        Share this launch
      </button>
      {note ? <span className="meta"> {note}</span> : null}
    </p>
  )
}
