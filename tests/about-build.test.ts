import { describe, expect, it } from 'vitest'
import { BUILD_STORY } from '@/lib/about-build'

describe('build case study', () => {
  it('covers the story a recruiter needs, without invented counts', () => {
    const text = BUILD_STORY.flatMap((section) => [section.title, ...section.paragraphs, ...(section.points ?? [])]).join('\n')
    expect(BUILD_STORY.map((section) => section.id)).toEqual(['why', 'who', 'data', 'architecture', 'design', 'next'])
    for (const phrase of ['Launch Library 2', 'CelesTrak', 'Natural Earth', 'Gloock', 'Inclusive Sans', 'Barlow', 'clock is not set', 'approximate']) {
      expect(text).toContain(phrase)
    }
    expect(text).not.toMatch(/\b\d{2,}\s+(users|families|customers|launches a day)\b/i)
    expect(text.toLowerCase()).not.toContain('walk')
  })
})
