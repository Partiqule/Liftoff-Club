import { compass8, formatMiles, haversineKm, initialBearingDeg, kmToMiles } from '@/lib/geo'
import { sunPosition } from '@/lib/solar'
import type { Launch, SeeVerdict } from '@/lib/types'

const PLUME = /falcon|starship|sls|vulcan|ariane|new glenn|long march|cz-|h3|gslv|lvm/i

function loose(launch: Pick<Launch, 'precision' | 'net' | 'windowEnd'>): boolean {
  const precision = (launch.precision ?? '').toLowerCase()
  if (!launch.net || /day|month|year|quarter|week/.test(precision)) return true
  return false
}

/**
 * A family-sized guess, not a line-of-sight study.
 * Close pads can be seen in daylight. Twilight Falcon and Starship plumes
 * are sometimes visible a few hundred miles away. Beyond that we say so.
 */
export function seeLaunch(
  launch: Pick<Launch, 'name' | 'rocketName' | 'provider' | 'padLat' | 'padLon' | 'padName' | 'precision' | 'net' | 'windowEnd'>,
  observer: { lat: number; lon: number; label?: string } | null,
  when = new Date(),
): SeeVerdict {
  const place = observer?.label ?? 'your town'
  if (!observer) {
    return {
      grade: 'unknown',
      miles: null,
      kilometers: null,
      direction: null,
      summary: 'Add your town and we will say if this rocket can show up in your sky.',
      detail: 'Distance and daylight both matter. The app keeps the town on this device.',
    }
  }
  if (launch.padLat == null || launch.padLon == null) {
    return {
      grade: 'unknown',
      miles: null,
      kilometers: null,
      direction: null,
      summary: 'This pad did not come with a map point, so we will not guess.',
      detail: 'Without coordinates, a visibility call would be a story. The broadcast is the sure view.',
    }
  }

  const kilometers = haversineKm(observer, { lat: launch.padLat, lon: launch.padLon })
  const miles = kmToMiles(kilometers)
  const direction = compass8(initialBearingDeg(observer, { lat: launch.padLat, lon: launch.padLon }))
  const milesLabel = formatMiles(miles)
  const vehicle = `${launch.rocketName} ${launch.name} ${launch.provider.name}`
  const bigPlume = PLUME.test(vehicle)
  const eventTime = launch.net ? new Date(launch.net) : when
  const sun = sunPosition(observer.lat, observer.lon, Number.isNaN(eventTime.getTime()) ? when : eventTime)
  const night = sun.elevation <= -6
  const twilight = sun.elevation > -18 && sun.elevation < 6
  const day = sun.elevation >= 6
  const clockNote = loose(launch) ? ' The clock is still loose, so daylight is a guess.' : ''

  if (miles <= 20) {
    return {
      grade: 'likely',
      miles,
      kilometers,
      direction,
      summary: `You are close. Face ${direction}. If clouds stay out of the way, you can see this one leave.`,
      detail: `The pad is about ${milesLabel} miles ${direction}. That is close enough for the climb itself, day or night. Sound arrives later than the light.${clockNote}`,
    }
  }
  if (miles <= 70 && !day) {
    return {
      grade: 'likely',
      miles,
      kilometers,
      direction,
      summary: `A night launch this close is usually visible. Look ${direction}, low at first.`,
      detail: `About ${milesLabel} miles ${direction}, and the Sun is down where you are. You are looking for a moving bright point and then a glowing trail.${clockNote}`,
    }
  }
  if (miles <= 70 && day) {
    return {
      grade: 'maybe',
      miles,
      kilometers,
      direction,
      summary: `It is daytime. You might see a white trail if you look ${direction} and the sky is clear.`,
      detail: `About ${milesLabel} miles ${direction}. Daylight hides the flame. A contrail is the realistic hope, not the rocket body.${clockNote}`,
    }
  }
  if (miles <= 280 && night && bigPlume) {
    return {
      grade: 'maybe',
      miles,
      kilometers,
      direction,
      summary: `You will not see the pad. You might see the high bright trail. Look ${direction}.`,
      detail: `About ${milesLabel} miles ${direction}. A large rocket at night can be visible well after it leaves the pad, as a moving point and sometimes a glowing cloud. It is common to miss it.${clockNote}`,
    }
  }
  if (miles <= 450 && twilight && bigPlume) {
    return {
      grade: 'maybe',
      miles,
      kilometers,
      direction,
      summary: `Twilight launches of big rockets sometimes make a glowing cloud people see from far away. Look ${direction}. It is never a promise.`,
      detail: `About ${milesLabel} miles ${direction}. Falcon 9 and a few other large rockets can throw a sunlit plume, the “jellyfish,” during twilight. Clouds and the exact path decide. Most families still watch the broadcast.${clockNote}`,
    }
  }
  if (miles <= 140) {
    return {
      grade: 'unlikely',
      miles,
      kilometers,
      direction,
      summary: `Probably not from ${place}. The pad is ${milesLabel} miles ${direction}, and the lighting is against a casual look.`,
      detail: `At this distance, in this light, do not plan the evening around seeing the rocket. A very clear horizon toward ${direction} is the only reason to step outside.${clockNote}`,
    }
  }
  return {
    grade: 'too-far',
    miles,
    kilometers,
    direction,
    summary: `You will not see this rocket from ${place}. It is about ${milesLabel} miles ${direction}. The broadcast is the view.`,
    detail: `That is too far for the flame and, for almost every launch, too far for the high-altitude plume. Dim the lights and watch together anyway.${clockNote}`,
  }
}
