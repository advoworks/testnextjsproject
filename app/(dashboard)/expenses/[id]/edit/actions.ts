'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Expense } from '@/lib/db/types'

export async function updateExpense(
  data: Omit<Expense, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'> & {
    expenseId: string
  }
) {
  if (!data.expenseId) {
    throw new Error('expenseId is required')
  }

  const supabase = await createClient()
  const { expenseId, ...updateData } = data
  const { error: updateError } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', expenseId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  redirect(`/expenses/${expenseId}`)
}
