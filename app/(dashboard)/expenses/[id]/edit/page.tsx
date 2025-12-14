import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import { notFound } from 'next/navigation'
import ExpenseForm from '@/components/expenses/expense-form'
import { updateExpense } from './actions'

export default async function EditExpensePage({
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Edit Expense
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Update expense information
        </p>
      </div>

      <ExpenseForm
        expense={expense}
        tenantId={tenantUser.tenant_id}
        onSubmit={updateExpense}
        cancelUrl={`/expenses/${id}`}
      />
    </div>
  )
}
