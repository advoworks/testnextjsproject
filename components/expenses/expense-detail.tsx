import Link from 'next/link'
import type { Expense } from '@/lib/db/types'

type ExpenseDetailProps = {
  expense: Expense
}

export default function ExpenseDetail({ expense }: ExpenseDetailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Expense Details
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {formatDate(expense.expense_date)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(expense.amount)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Description</h2>
        <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{expense.description}</p>
      </div>

      {expense.receipt_url && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Receipt</h2>
          <div className="mt-4">
            <a
              href={getReceiptUrl(expense.receipt_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              View Receipt →
            </a>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href={`/expenses/${expense.id}/edit`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Edit Expense
        </Link>
        <Link
          href="/expenses"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to Expenses
        </Link>
      </div>
    </div>
  )
}

