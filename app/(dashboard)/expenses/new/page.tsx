import { requireTenantUser } from '@/lib/auth/utils'
import ExpenseForm from '@/components/expenses/expense-form'

export default async function NewExpensePage() {
  const tenantUser = await requireTenantUser()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          New Expense
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Record a new business expense
        </p>
      </div>

      <ExpenseForm tenantId={tenantUser.tenant_id} />
    </div>
  )
}

