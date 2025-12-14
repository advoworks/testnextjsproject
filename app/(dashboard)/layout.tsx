import { redirect } from 'next/navigation'
import { requireTenantUser } from '@/lib/auth/utils'
import DashboardNav from '@/components/dashboard/nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenantUser = await requireTenantUser()

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav tenantUser={tenantUser} />
      <main className="flex-1">{children}</main>
    </div>
  )
}

