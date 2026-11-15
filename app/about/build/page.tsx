import type { Metadata } from 'next'
import { BUILD_STORY } from '@/lib/about-build'

export const metadata: Metadata = {
  title: 'How it is built',
  description: 'Why Liftoff Club exists, where the numbers come from, and how the night sky design is put together.',
}

export default function BuildPage() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Case study</p>
      <h1>How Liftoff Club is built</h1>
      <p className="lede">A family launch companion, written so a recruiter can see the choices. The live site is https://liftoffclub.app.</p>
      {BUILD_STORY.map((section) => (
        <section key={section.id} id={section.id}>
          <p className="kicker">{section.kicker}</p>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.points ? (
            <ul>
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </main>
  )
}
