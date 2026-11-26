export function PageSkeleton({ label }: { label: string }) {
  return (
    <main id="content" className="wrap page" aria-busy="true" aria-label={label}>
      <span className="bone bone-short" />
      <span className="bone bone-title" />
      <span className="bone" />
      <span className="bone" />
      <span className="bone bone-short" />
    </main>
  )
}
