'use client'

export function openAccessDialog() {
  window.dispatchEvent(new Event('liftoff-open-access'))
}

export function OpenAccessButton({ label = 'Request early access' }: { label?: string }) {
  return (
    <button className="btn" type="button" onClick={openAccessDialog}>
      {label}
    </button>
  )
}
