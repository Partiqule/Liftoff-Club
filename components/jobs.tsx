import Link from 'next/link'
import { GlossaryText } from '@/components/glossary-text'
import { roleLabel } from '@/lib/manifest'
import type { Launch } from '@/lib/types'

export function JobsCorner({ launch }: { launch: Launch }) {
  return (
    <section>
      <p className="kicker">Space jobs corner</p>
      <h2>Who is on this flight</h2>
      <p className="lede when-kid">Every company we can name, in plain words, plus a careers page when we have a real one.</p>
      <p className="lede when-adult">Careers links are public pages we know. If we do not have one, we do not invent it.</p>
      <ul className="jobs">
        {launch.manifest.map((item) => {
          const role = roleLabel(item.role)
          return (
            <li key={item.id}>
              <p className="meta">
                <span className="when-kid">{role.kid}</span>
                <span className="when-adult">{role.adult}</span>
                {item.count && item.count > 1 ? ` · ${item.count}` : ''}
                {item.kind ? ` · ${item.kind}` : ''}
              </p>
              <h3>
                <Link href={`/companies/${item.companySlug}`}>{item.company}</Link>
              </h3>
              {item.name.toLowerCase() !== item.company.toLowerCase() ? <p className="meta">{item.name}</p> : null}
              <p className="when-kid">
                <GlossaryText text={item.kidBrief} />
              </p>
              <p className="when-adult">
                <GlossaryText text={item.brief} />
              </p>
              <div className="job-links">
                {item.careersUrl ? (
                  <a href={item.careersUrl} rel="noreferrer">
                    Careers
                  </a>
                ) : (
                  <span className="meta">No public careers page on file</span>
                )}
                {item.siteUrl ? (
                  <a href={item.siteUrl} rel="noreferrer">
                    Company site
                  </a>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
