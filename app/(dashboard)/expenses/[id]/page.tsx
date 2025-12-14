import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import { notFound } from 'next/navigation'
import ExpenseDetail from '@/components/expenses/expense-detail'

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const tenantUser = await requireTenantUser()
  const { id } = await params
  const supabase = await createClient()

  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  if (error || !expense) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <ExpenseDetail expense={expense} />
    </div>
  )
}

