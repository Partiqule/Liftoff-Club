'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ children, labelledBy, onClose }: { children: ReactNode; labelledBy: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || node.open) return
    node.showModal()
  }, [])
  return (
    <dialog ref={ref} className="pro-dialog" aria-labelledby={labelledBy} onClose={onClose}>
      {children}
    </dialog>
  )
}
