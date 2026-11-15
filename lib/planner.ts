import { compass8, heightPhrase } from '@/lib/geo'
import type { PassGrade, SeeVerdict, SkyPass } from '@/lib/types'

export function gradePass(input: {
  kind: 'iss' | 'starlink'
  maxElevation: number
  sunElevation: number
  illuminated: boolean
  setsInShadow: boolean
}): { grade: PassGrade; gradeLabel: string; gradeReason: string } {
  const dark = input.sunElevation <= -6
  const civil = input.sunElevation <= 0
  const high = input.maxElevation
  const fade = input.setsInShadow ? ' It may fade before it reaches the far side of the sky.' : ''

  if (!input.illuminated) {
    return {
      grade: 'poor',
      gradeLabel: 'In shadow',
      gradeReason: 'The satellite is in Earth’s shadow, so the Sun is not lighting it up. You will not see a shine.',
    }
  }
  if (!civil) {
    return {
      grade: 'poor',
      gradeLabel: 'Daylight',
      gradeReason: 'The sky is too bright. Daylight hides satellites.',
    }
  }

  if (input.kind === 'starlink') {
    if (dark && high >= 55) {
      return {
        grade: 'good',
        gradeLabel: 'Dim but high',
        gradeReason: `A high pass in a dark sky. Starlink is usually a faint steady dot, not a flare, and much dimmer than the space station.${fade}`,
      }
    }
    if ((dark && high >= 25) || (civil && high >= 40)) {
      return {
        grade: 'fair',
        gradeLabel: 'Faint',
        gradeReason: `You are looking for a dim steady mover, not a blinking plane. Easy to miss.${fade}`,
      }
    }
    return {
      grade: 'poor',
      gradeLabel: 'Too faint',
      gradeReason: 'This Starlink pass is low or the sky is bright. Skip it unless you already know the trick.',
    }
  }

  if (dark && high >= 45) {
    return {
      grade: 'great',
      gradeLabel: 'Easy to see',
      gradeReason: `A high pass in a dark sky. It looks like a bright star that walks and does not blink.${fade}`,
    }
  }
  if (dark && high >= 20) {
    return {
      grade: 'good',
      gradeLabel: 'Should show',
      gradeReason: `Bright enough for a backyard, if the clouds cooperate.${fade}`,
    }
  }
  if (high >= 15) {
    return {
      grade: 'fair',
      gradeLabel: 'Low or bright sky',
      gradeReason: `It is either low or the sky is not fully dark. Look early and give your eyes a minute.${fade}`,
    }
  }
  return {
    grade: 'poor',
    gradeLabel: 'Too low',
    gradeReason: 'It barely clears the horizon. Trees and houses will win.',
  }
}

export type FamilyPlan = {
  when: string
  where: string
  bring: string[]
  kid: string
  adult: string
}

export function planForPass(pass: SkyPass, place: string, clock: string): FamilyPlan {
  const direction = compass8(pass.riseAzimuth)
  const peakDirection = compass8(pass.peakAzimuth)
  const height = heightPhrase(pass.maxElevation)
  const who = pass.kind === 'iss' ? 'the space station' : pass.name
  return {
    when: `Head outside about 5 minutes before ${clock}. Let everyone’s eyes adjust before it starts.`,
    where: `From ${place}, face ${direction}. It climbs and is highest ${peakDirection}, ${height}.`,
    bring: [
      'A jacket and something to sit on',
      'A red flashlight, or a phone with the screen almost off',
      pass.kind === 'iss' ? 'No binoculars needed. It is brighter than most stars.' : 'Patience. Starlink is a faint steady dot.',
    ],
    kid: pass.kind === 'iss'
      ? `${who[0].toUpperCase()}${who.slice(1)} will look like a bright star walking ${direction}. It does not blink. Planes blink.`
      : `${pass.name} is a dim dot that moves in a straight line. If it blinks, it is probably a plane.`,
    adult: `${pass.gradeReason} Rise azimuth is about ${Math.round(pass.riseAzimuth)}°. Highest elevation is about ${Math.round(pass.maxElevation)}°. Times can be off by a couple of minutes.`,
  }
}

export function planForLaunch(verdict: SeeVerdict, place: string, clock: string | null): FamilyPlan | null {
  if (verdict.grade === 'too-far' || verdict.grade === 'unknown') return null
  const when = clock
    ? `Be outside 15 minutes before ${clock}. Launches slip, so keep the broadcast on.`
    : 'The clock is not firm. Check again the day of, and keep the broadcast on.'
  return {
    when,
    where: verdict.direction
      ? `From ${place}, look ${verdict.direction}, starting low.`
      : `From ${place}, you need a clear view of the sky.`,
    bring: [
      'Jackets, a blanket, snacks',
      'The broadcast on a phone, volume up, screen dim',
      'Patience for holds. Rockets wait.',
    ],
    kid: verdict.summary,
    adult: verdict.detail,
  }
}

const GRADE_RANK: Record<PassGrade, number> = { great: 0, good: 1, fair: 2, poor: 3 }

export function bestPasses(passes: SkyPass[], kind: 'iss' | 'starlink', limit: number): SkyPass[] {
  return passes
    .filter((pass) => pass.kind === kind)
    .slice()
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .filter((pass, _, all) => {
      if (kind === 'iss') return true
      if (pass.grade === 'poor') return false
      return all.length < 80
    })
    .sort((a, b) => {
      if (kind === 'iss') return Date.parse(a.start) - Date.parse(b.start)
      const grade = GRADE_RANK[a.grade] - GRADE_RANK[b.grade]
      if (grade !== 0) return grade
      return b.maxElevation - a.maxElevation
    })
    .slice(0, limit)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

export function leadPass(passes: SkyPass[], nowMs: number): SkyPass | null {
  const soon = nowMs + 36 * 60 * 60 * 1000
  const iss = passes.filter((pass) => pass.kind === 'iss' && Date.parse(pass.start) < soon && pass.grade !== 'poor')
  if (iss.length > 0) {
    return iss.sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || Date.parse(a.start) - Date.parse(b.start))[0]
  }
  const anyIss = passes.filter((pass) => pass.kind === 'iss' && Date.parse(pass.start) < soon)
  if (anyIss.length > 0) return anyIss.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]
  const star = passes.filter((pass) => pass.kind === 'starlink' && pass.grade !== 'poor' && Date.parse(pass.start) < soon)
  if (star.length > 0) {
    return star.sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || b.maxElevation - a.maxElevation)[0]
  }
  return null
}
