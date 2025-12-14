import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/utils'
import AdminNav from '@/components/admin/nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await requireAdmin()

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav adminUser={adminUser} />
      <main className="flex-1">{children}</main>
    </div>
  )
}

