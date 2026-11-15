const RAD = Math.PI / 180
const DEG = 180 / Math.PI

function wrap360(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

function wrapPi(radians: number): number {
  const tau = Math.PI * 2
  const value = ((radians % tau) + tau) % tau
  return value > Math.PI ? value - tau : value
}

/**
 * Approximate solar elevation and azimuth.
 * Azimuth is degrees from north toward east. Good to about a degree, which is
 * enough to tell day, twilight, and night for a family visibility grade.
 */
export function sunPosition(latDeg: number, lonDeg: number, date: Date): { elevation: number; azimuth: number } {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5
  const n = jd - 2_451_545.0
  const meanLongitude = wrap360(280.46 + 0.9856474 * n)
  const meanAnomaly = wrap360(357.528 + 0.9856003 * n) * RAD
  const ecliptic = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD
  const obliquity = (23.439 - 0.0000004 * n) * RAD

  const sinLambda = Math.sin(ecliptic)
  const cosLambda = Math.cos(ecliptic)
  const rightAscension = Math.atan2(Math.cos(obliquity) * sinLambda, cosLambda)
  const declination = Math.asin(Math.sin(obliquity) * sinLambda)

  const gmst = wrap360(280.46061837 + 360.98564736629 * n)
  const hourAngle = wrapPi(wrap360(gmst + lonDeg) * RAD - rightAscension)
  const latitude = latDeg * RAD
  const sinElevation =
    Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle)
  const elevation = Math.asin(Math.min(1, Math.max(-1, sinElevation))) * DEG
  const y = -Math.sin(hourAngle)
  const x = Math.tan(declination) * Math.cos(latitude) - Math.sin(latitude) * Math.cos(hourAngle)
  const azimuth = wrap360(Math.atan2(y, x) * DEG)
  return { elevation, azimuth }
}

/** Unit vector from Earth toward the Sun in an equatorial frame, for a simple eclipse test. */
export function sunEciUnit(date: Date): { x: number; y: number; z: number } {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5
  const n = jd - 2_451_545.0
  const meanAnomaly = wrap360(357.528 + 0.9856003 * n) * RAD
  const lambda =
    wrap360(280.46 + 0.9856474 * n) * RAD + (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD
  const obliquity = (23.439 - 0.0000004 * n) * RAD
  const x = Math.cos(lambda)
  const y = Math.cos(obliquity) * Math.sin(lambda)
  const z = Math.sin(obliquity) * Math.sin(lambda)
  const mag = Math.hypot(x, y, z) || 1
  return { x: x / mag, y: y / mag, z: z / mag }
}

/**
 * Cylindrical Earth-shadow test. `satKm` is the satellite position in the same
 * equatorial frame as `sunUnit`. A thin slice of atmosphere is included so we
 * do not call a satellite "lit" when it is grazing the night side.
 */
export function satelliteInSunlight(
  satKm: { x: number; y: number; z: number },
  sunUnit: { x: number; y: number; z: number },
): boolean {
  const along = satKm.x * sunUnit.x + satKm.y * sunUnit.y + satKm.z * sunUnit.z
  if (along >= 0) return true
  const radius2 = satKm.x ** 2 + satKm.y ** 2 + satKm.z ** 2
  const perpendicular2 = radius2 - along * along
  const shadowKm = 6371 + 50
  return perpendicular2 > shadowKm * shadowKm
}
