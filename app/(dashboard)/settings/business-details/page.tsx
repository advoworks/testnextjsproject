import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import BusinessDetailsForm from '@/components/invoices/business-details-form'

export default async function BusinessDetailsPage() {
  const tenantUser = await requireTenantUser()
  const supabase = await createClient()

  const { data: businessDetails } = await supabase
    .from('tenant_business_details')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Business Details
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Configure your business information for invoices
        </p>
      </div>

      <BusinessDetailsForm tenantId={tenantUser.tenant_id} businessDetails={businessDetails || undefined} />
    </div>
  )
}

