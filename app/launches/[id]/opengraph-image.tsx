import { getLaunch } from '@/lib/launches'
import { cardSize, launchCard } from '@/lib/launch-card'

export const size = cardSize
export const contentType = 'image/png'
export const alt = 'A Liftoff Club launch card'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const launch = await getLaunch(id)
  return launchCard({
    name: launch?.name ?? 'Launch',
    rocketName: launch?.rocketName ?? 'Rocket',
    net: launch?.net ?? null,
    precision: launch?.precision ?? null,
    statusName: launch?.statusName,
  })
}
