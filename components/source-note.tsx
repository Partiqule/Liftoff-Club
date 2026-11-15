import type { LaunchBoard } from '@/lib/types'

export function SourceNote({ board }: { board: LaunchBoard }) {
  if (!board.notice) return null
  return (
    <p className="banner" role="status">
      {board.notice}
    </p>
  )
}
