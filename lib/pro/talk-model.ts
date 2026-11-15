import { talkStaysInside, type BriefFact } from '@/lib/pro/brief'

const cache = new Map<string, string[]>()

/**
 * Optional rewrite. With no EXPLAINER_API_KEY, the sourced lines are returned.
 * A model reply that adds a number is discarded.
 */
export async function maybeRewriteTalk(facts: BriefFact[], fallback: string[]): Promise<{ lines: string[]; source: 'template' | 'model' }> {
  const apiKey = process.env.EXPLAINER_API_KEY?.trim()
  if (!apiKey || facts.length === 0) return { lines: fallback, source: 'template' }
  const cacheKey = JSON.stringify(facts)
  const cached = cache.get(cacheKey)
  if (cached) return { lines: cached, source: 'model' }
  try {
    const base = (process.env.EXPLAINER_API_BASE?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
    const model = process.env.EXPLAINER_MODEL?.trim() || 'gpt-4o-mini'
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You write a short talk track for a space sales conversation. Return JSON {"lines": string[]}. Use only the facts in the user payload. Do not add numbers, dates, companies, or claims. Keep each line under 240 characters. Four lines at most.',
          },
          { role: 'user', content: JSON.stringify({ facts, fallback }) },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return { lines: fallback, source: 'template' }
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = body.choices?.[0]?.message?.content
    if (!content) return { lines: fallback, source: 'template' }
    const parsed = JSON.parse(content) as { lines?: unknown }
    if (!Array.isArray(parsed.lines)) return { lines: fallback, source: 'template' }
    const lines = parsed.lines.filter((line): line is string => typeof line === 'string' && line.trim().length > 20).map((line) => line.trim()).slice(0, 4)
    if (lines.length === 0 || !talkStaysInside(lines, facts)) return { lines: fallback, source: 'template' }
    cache.set(cacheKey, lines)
    return { lines, source: 'model' }
  } catch {
    return { lines: fallback, source: 'template' }
  }
}
