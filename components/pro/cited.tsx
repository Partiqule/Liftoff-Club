import { FigureLine } from '@/components/pro/figure-line'
import { CATALOG_LAG_NOTE } from '@/lib/pro/history'
import { ORBIT_ABOVE_PLAN_NOTE, type TrackerCell } from '@/lib/pro/tracker'

function visibleNote(note: string | null): note is string {
  if (!note) return false
  return note === CATALOG_LAG_NOTE || note.includes(ORBIT_ABOVE_PLAN_NOTE)
}

export function Cited({ cell }: { cell: TrackerCell }) {
  const title = cell.note && !visibleNote(cell.note) ? cell.note : undefined
  return (
    <span className="pro-cell">
      <FigureLine text={cell.text} />
      {visibleNote(cell.note) ? <span className="pro-flag">{cell.note}</span> : null}
      {cell.sourceUrl && cell.asOf ? (
        <a className="pro-cite" href={cell.sourceUrl} title={title}>
          <span>{cell.sourceTitle}</span>
          <span className="pro-asof">as of {cell.asOf}</span>
        </a>
      ) : null}
    </span>
  )
}
