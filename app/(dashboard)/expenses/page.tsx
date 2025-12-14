import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/auth/utils'
import Link from 'next/link'
import ExpenseList from '@/components/expenses/expense-list'

export default async function ExpensesPage() {
  const tenantUser = await requireTenantUser()
  const supabase = await createClient()

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, amount, description, expense_date, receipt_url')
    .eq('tenant_id', tenantUser.tenant_id)
    .order('expense_date', { ascending: false })

  if (error) {
    console.error('Error fetching expenses:', error)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Expenses
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Track and manage your business expenses
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Expense
        </Link>
      </div>

      <ExpenseList expenses={expenses || []} />
    </div>
  )
}

