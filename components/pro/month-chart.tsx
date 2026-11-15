const LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export function MonthChart({ counts, label }: { counts: number[]; label: string }) {
  const max = Math.max(1, ...counts)
  const total = counts.reduce((sum, value) => sum + value, 0)
  return (
    <figure className="pro-chart">
      <svg viewBox="0 0 240 80" role="img" aria-label={`${label}. ${total} flights this year.`}>
        {counts.map((value, index) => {
          const height = value === 0 ? 0 : Math.max(4, (value / max) * 58)
          return <rect key={LABELS[index]} x={index * 20 + 3} y={64 - height} width={12} height={height} fill="currentColor" />
        })}
      </svg>
      <div className="pro-chart-labels" aria-hidden="true">
        {LABELS.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
      <figcaption className="meta">{total === 0 ? 'No flights in the public record for these months.' : `${total} flights in this chart.`}</figcaption>
    </figure>
  )
}
