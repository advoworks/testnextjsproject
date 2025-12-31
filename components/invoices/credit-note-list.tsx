'use client'

import Link from 'next/link'
import type { CreditNote } from '@/lib/db/types'
import { formatCurrency } from '@/lib/utils/locale'

type CreditNoteListProps = {
  creditNotes: CreditNote[]
  currency?: string
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CreditNoteList({ creditNotes, currency = 'USD' }: CreditNoteListProps) {
  if (creditNotes.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">No credit notes yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Credit Note #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Reason
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
          {creditNotes.map((creditNote) => (
            <tr key={creditNote.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className="whitespace-nowrap px-6 py-4">
                <Link
                  href={`/credit-notes/${creditNote.id}`}
                  className="text-sm font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                >
                  {creditNote.credit_note_number}
                </Link>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                {formatDate(creditNote.credit_note_date)}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                {creditNote.reason}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {formatCurrency(creditNote.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

