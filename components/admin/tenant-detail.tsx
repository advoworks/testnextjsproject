import Link from 'next/link'
import type { Tenant, TenantUser } from '@/lib/db/types'
import ActivateTenantButton from './activate-tenant-button'

type TenantDetailProps = {
  tenant: Tenant
  users: TenantUser[]
}

export default function TenantDetail({ tenant, users }: TenantDetailProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {tenant.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Created on {formatDate(tenant.created_at)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            tenant.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          {tenant.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="flex gap-4">
        <Link
          href={`/admin/tenants/${tenant.id}/edit`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Edit Tenant
        </Link>
        <ActivateTenantButton tenantId={tenant.id} isActive={tenant.is_active} />
        <Link
          href="/admin/tenants"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to Tenants
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Email</h2>
        <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{tenant.email}</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Users</h2>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {users.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
              No users found
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {user.full_name || user.email}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</div>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    {user.role}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

