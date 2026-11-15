export function stampTone(abbrev: string, name: string): 'go' | 'wait' | 'fly' | 'done' | 'bad' {
  const text = `${abbrev} ${name}`.toLowerCase()
  if (text.includes('fail') || text.includes('partial')) return 'bad'
  if (text.includes('success')) return 'done'
  if (text.includes('flight')) return 'fly'
  if (text.includes('go')) return 'go'
  return 'wait'
}

export function StatusStamp({ abbrev, name }: { abbrev: string; name: string }) {
  const tone = stampTone(abbrev, name)
  return (
    <span className={`light light-${tone === 'go' || tone === 'fly' ? 'strong' : tone === 'bad' ? 'fade' : 'mid'}`} title={name}>
      {name}
    </span>
  )
}
