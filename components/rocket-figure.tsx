import Image from 'next/image'
import Link from 'next/link'
import { Trail } from '@/components/trail'
import { findRocketPhoto, rocketId } from '@/lib/rocket-photos'

export function RocketFigure({ rocketName }: { rocketName: string }) {
  const photo = findRocketPhoto(rocketName)
  const href = `/rockets/${rocketId(rocketName)}`
  return (
    <figure className="rocket-figure">
      <Link href={href}>
        {photo ? (
          <Image
            src={photo.file}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes="(max-width: 800px) 92vw, 42rem"
            priority
          />
        ) : (
          <span className="rocket-fallback">
            <Trail span="load" />
          </span>
        )}
      </Link>
      <figcaption className="meta">
        {photo ? (
          <>
            Photo by {photo.author}. {photo.license}. <a href={photo.sourceUrl}>Source</a>
          </>
        ) : (
          <>
            No openly licensed photo is on file. <Link href={href}>This rocket</Link>
          </>
        )}
      </figcaption>
    </figure>
  )
}
