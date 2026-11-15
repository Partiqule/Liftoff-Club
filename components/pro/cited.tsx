import { FigureLine } from '@/components/pro/figure-line'
import { CATALOG_LAG_NOTE } from '@/lib/pro/history'
import type { TrackerCell } from '@/lib/pro/tracker'

export function Cited({ cell }: { cell: TrackerCell }) {
  return (
    <span className="pro-cell">
      <FigureLine text={cell.text} />
      {cell.note === CATALOG_LAG_NOTE ? <span className="pro-flag">{cell.note}</span> : null}
      {cell.sourceUrl && cell.asOf ? (
        <a className="pro-cite" href={cell.sourceUrl} title={cell.note && cell.note !== CATALOG_LAG_NOTE ? cell.note : undefined}>
          <span>{cell.sourceTitle}</span>
          <span className="pro-asof">as of {cell.asOf}</span>
        </a>
      ) : null}
    </span>
  )
}
