export function FigureLine({ text }: { text: string }) {
  const match = text.match(/^(\d[\d,.]*)(?:\s+(.+))?$/)
  if (match) {
    return (
      <span className="pro-figure">
        <span className="pro-figure-num">{match[1]}</span>
        {match[2] ? <span className="pro-figure-unit">{match[2]}</span> : null}
      </span>
    )
  }
  return <span className={text.includes(' MT') ? 'pro-time' : undefined}>{text}</span>
}
