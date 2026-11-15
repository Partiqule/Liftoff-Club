export function stampTone(abbrev: string, name: string): 'go' | 'wait' | 'fly' | 'done' | 'bad' {
  const text = `${abbrev} ${name}`.toLowerCase()
  if (text.includes('fail') || text.includes('partial')) return 'bad'
  if (text.includes('success')) return 'done'
  if (text.includes('flight')) return 'fly'
  if (text.includes('go')) return 'go'
  return 'wait'
}

/** Feed statuses are often one word that looks like a button. Say what they mean. */
export function statusWords(name: string): string {
  const text = name.trim().toLowerCase()
  if (text === 'go' || text === 'go for launch') return 'Ready to fly'
  if (text.includes('success')) return 'It flew'
  if (text.includes('fail') || text.includes('partial')) return 'Did not fully fly'
  if (text.includes('hold')) return 'Holding on the pad'
  if (text.includes('tbd') || text.includes('to be determined')) return 'Time still moving'
  return name
}

export function StatusStamp({ abbrev, name }: { abbrev: string; name: string }) {
  const tone = stampTone(abbrev, name)
  const words = statusWords(name)
  return (
    <span className={`light light-${tone === 'go' || tone === 'fly' ? 'strong' : tone === 'bad' ? 'fade' : 'mid'}`} title={name === words ? undefined : name}>
      {words}
    </span>
  )
}
