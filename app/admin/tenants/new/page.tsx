import { requireAdmin } from '@/lib/auth/utils'
import CreateTenantForm from '@/components/admin/create-tenant-form'

export default async function NewTenantPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          New Tenant
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create a new tenant and initial user
        </p>
      </div>

      <CreateTenantForm />
    </div>
  )
}

