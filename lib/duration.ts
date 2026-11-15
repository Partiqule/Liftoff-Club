const DURATION = /^(-)?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/

/** Parse the small ISO-8601 durations Launch Library uses, such as `-PT38M` or `PT2M26S`. */
export function parseDurationSeconds(value: string | null | undefined): number | null {
  if (!value) return null
  const match = DURATION.exec(value.trim())
  if (!match) return null
  const sign = match[1] ? -1 : 1
  const days = Number(match[2] ?? 0)
  const hours = Number(match[3] ?? 0)
  const minutes = Number(match[4] ?? 0)
  const seconds = Number(match[5] ?? 0)
  if (![days, hours, minutes, seconds].every(Number.isFinite)) return null
  if (days === 0 && hours === 0 && minutes === 0 && seconds === 0 && !match[2] && !value.includes('T') && value !== 'P0D' && !value.endsWith('D')) {
    return null
  }
  return sign * (((days * 24 + hours) * 60 + minutes) * 60 + seconds)
}
