'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Expense } from '@/lib/db/types'

type ExpenseFormProps = {
  tenantId: string
  expense?: Expense
  onSubmit?: (data: Omit<Expense, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'> & { expenseId?: string }) => Promise<void>
  cancelUrl?: string
}

export default function ExpenseForm({ tenantId, expense, onSubmit, cancelUrl }: ExpenseFormProps) {
  const router = useRouter()
  const isEditMode = !!expense
  const [formData, setFormData] = useState({
    description: expense?.description || '',
    amount: expense?.amount.toString() || '',
    expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Get receipt URL - handle both file paths and old public URLs
  function getReceiptUrl(receiptUrl: string): string {
    // If it's already a path (new format), use API route
    if (!receiptUrl.startsWith('http')) {
      return `/api/receipts/${receiptUrl}`
    }
    
    // If it's an old public URL, extract the path
    // Format: https://[project].supabase.co/storage/v1/object/public/receipts/[path]
    const match = receiptUrl.match(/\/storage\/v1\/object\/public\/receipts\/(.+)$/)
    if (match) {
      return `/api/receipts/${match[1]}`
    }
    
    // Fallback: try to extract path from URL
    const urlParts = receiptUrl.split('/receipts/')
    if (urlParts.length > 1) {
      return `/api/receipts/${urlParts[1]}`
    }
    
    // If we can't parse it, return the original (might be a signed URL)
    return receiptUrl
  }

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        expense_date: expense.expense_date,
      })
    }
  }, [expense])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.description || !formData.amount) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    const supabase = createClient()

    let receiptUrl: string | null = expense?.receipt_url || null

    // Upload receipt if a new file is provided
    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${tenantId}/receipts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile)

      if (uploadError) {
        setError('Failed to upload receipt. Please try again.')
        setLoading(false)
        return
      }

      // Store the file path instead of public URL (bucket is private)
      // We'll use an API route to serve the file securely
      receiptUrl = filePath
    }

    // If using server action (edit mode)
    if (onSubmit && isEditMode) {
      try {
        await onSubmit({
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: formData.expense_date,
          receipt_url: receiptUrl,
          expenseId: expense.id,
        })
      } catch (err) {
        // Re-throw redirect errors - they're used by Next.js for navigation
        if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
          throw err
        }
        setError(err instanceof Error ? err.message : 'Failed to update expense')
        setLoading(false)
      }
      return
    }

    // Create expense (create mode)
    const { data: newExpense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        tenant_id: tenantId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        receipt_url: receiptUrl,
      })
      .select()
      .single()

    if (expenseError || !newExpense) {
      setError('Failed to create expense. Please try again.')
      setLoading(false)
      return
    }

    router.push(`/expenses/${newExpense.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description *
        </label>
        <input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Amount *
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="expense_date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Date *
          </label>
          <input
            id="expense_date"
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="receipt" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Receipt (optional)
        </label>
        {expense?.receipt_url && (
          <div className="mb-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Current receipt:</p>
            <a
              href={getReceiptUrl(expense.receipt_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              View current receipt →
            </a>
          </div>
        )}
        <input
          id="receipt"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
        />
        {isEditMode && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Leave empty to keep current receipt, or upload a new one to replace it
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Expense' : 'Create Expense'}
        </button>
        <Link
          href={cancelUrl || '/expenses'}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

