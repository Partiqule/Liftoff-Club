import 'server-only'

import { getConstellationCards } from '@/lib/constellations'
import { getLaunches } from '@/lib/launches'
import { getConstellationHistory } from '@/lib/pro/history-feed'
import { boardDay, constellationRefs, watchChoices } from '@/lib/pro/options'
import { sourceFromProfile, trackerRows } from '@/lib/pro/tracker'

export async function loadProBoard() {
  const board = await getLaunches()
  const cards = await getConstellationCards(board.launches)
  const sources = cards.map((card) => sourceFromProfile(card.profile, card.counts, card.fetchedAt))
  const day = boardDay(board.fetchedAt)
  const now = Date.now()
  const history = await getConstellationHistory(now)
  return {
    board,
    sources,
    rows: trackerRows(sources, board.launches, day, now, history),
    choices: watchChoices(board.launches),
    refs: constellationRefs(),
    day,
    now,
  }
}
