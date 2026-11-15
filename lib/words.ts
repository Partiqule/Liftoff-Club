import { getTerm } from '@/lib/glossary'

export const WORDS_KEY = 'liftoff-club-words-v1'

/** Most recently opened term first. Unknown ids are ignored. */
export function rememberWord(current: string[], id: string): string[] {
  if (!getTerm(id)) return current
  return [id, ...current.filter((item) => item !== id)].slice(0, 48)
}

export function readWordIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const ids = parsed.filter((item): item is string => typeof item === 'string' && Boolean(getTerm(item)))
    return [...new Set(ids)].slice(0, 48)
  } catch {
    return []
  }
}
