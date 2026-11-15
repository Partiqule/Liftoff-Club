export type AccessDesk = 'company' | 'sales'

export type AccessRequest = {
  name: string
  email: string
  organization: string
  desk: AccessDesk
  note: string
}

/** A mail note. Nothing here is stored. */
export function accessNote(input: AccessRequest): string {
  const desk = input.desk === 'sales' ? 'Sales desk' : 'Company desk'
  return [
    'Liftoff Club Pro, early access',
    `Name: ${clean(input.name)}`,
    `Email: ${clean(input.email)}`,
    `Organization: ${clean(input.organization)}`,
    `Desk: ${desk}`,
    `Note: ${clean(input.note)}`,
    'Pilot pricing on request.',
    'This note was composed in the browser and was not saved on a server.',
  ].join('\n')
}

export function accessMailto(input: AccessRequest): string {
  const subject = encodeURIComponent('Liftoff Club Pro early access')
  const body = encodeURIComponent(accessNote(input))
  return `mailto:?subject=${subject}&body=${body}`
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500)
}
