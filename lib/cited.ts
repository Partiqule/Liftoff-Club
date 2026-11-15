export type CitedFigure = {
  label: string
  value: number
  unit: string
  sourceUrl: string
  sourceTitle: string
  asOf: string
  /** True only when the live in orbit count is the same population as this figure. */
  compareToInOrbit: boolean
  note: string | null
}

const AS_OF = /^\d{4}-\d{2}-\d{2}$/

/** A hand entered number is usable only with an https source and an as of date. */
export function citedProblems(figure: CitedFigure): string[] {
  const problems: string[] = []
  if (!figure.label.trim()) problems.push('missing label')
  if (!Number.isFinite(figure.value) || figure.value < 0) problems.push('missing number')
  if (!figure.unit.trim()) problems.push('missing unit')
  if (!figure.sourceUrl.startsWith('https://')) problems.push('source must be https')
  if (!figure.sourceTitle.trim()) problems.push('missing source title')
  if (!AS_OF.test(figure.asOf)) problems.push('as of date must be YYYY-MM-DD')
  return problems
}

export function assertCited(figure: CitedFigure, name: string): void {
  const problems = citedProblems(figure)
  if (problems.length > 0) throw new Error(`${name}: ${problems.join(', ')}`)
}
