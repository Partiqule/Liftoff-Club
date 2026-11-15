import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminDesk } from '@/components/pro/admin-desk'
import { accessStatus } from '@/lib/pro/access-store'
import { listSignups } from '@/lib/pro/signups'
import { readViewer } from '@/lib/pro/viewer'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const viewer = await readViewer()
  if (!process.env.ADMIN_TOKEN?.trim() && !process.env.ADMIN_EMAILS?.trim() && !process.env.PRO_NOTIFY_EMAIL?.trim()) notFound()
  const rows = viewer.admin
    ? await Promise.all(
        (await listSignups()).map(async (row) => ({
          email: row.email,
          name: row.name,
          company: row.company,
          role: row.role,
          createdAt: row.createdAt,
          status: (await accessStatus(row.email)) ?? 'pending',
        })),
      )
    : []
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Admin</p>
      <h1>Early access</h1>
      <p className="lede">Every sign up is listed here. A new request is approved on its own and the sign in link goes out with the note. Revoke closes a desk. The family site stays account free.</p>
      {viewer.admin ? null : <p className="note">Enter the admin token, or sign in with an email on the admin list.</p>}
      <AdminDesk rows={rows} />
    </main>
  )
}
