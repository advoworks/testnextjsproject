'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Invoice } from '@/lib/db/types'

type InvoiceActionsProps = {
  invoice: Invoice
}

export default function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleAction(action: string, data?: any) {
    setLoading(true)
    setActionError(null)

    const supabase = createClient()
    let response

    try {
      switch (action) {
        case 'issue':
          response = await fetch(`/api/invoices/${invoice.id}/issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          break
        case 'send':
          const deliveryChannel = prompt('Delivery channel (email/whatsapp/download):')
          const recipient = prompt('Recipient (email or phone):')
          if (!deliveryChannel || !recipient) {
            setLoading(false)
            return
          }
          response = await fetch(`/api/invoices/${invoice.id}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_channel: deliveryChannel, recipient }),
          })
          break
        case 'void':
          const voidReason = prompt('Void reason:')
          if (!voidReason) {
            setLoading(false)
            return
          }
          response = await fetch(`/api/invoices/${invoice.id}/void`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ void_reason: voidReason }),
          })
          break
        case 'mark-paid':
          response = await fetch(`/api/invoices/${invoice.id}/mark-paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          break
        default:
          setLoading(false)
          return
      }

      const result = await response.json()

      if (!response.ok) {
        setActionError(result.error || 'Action failed')
        setLoading(false)
        return
      }

      router.refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actionError && (
        <div className="w-full rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {actionError}
        </div>
      )}

      {invoice.status === 'draft' && (
        <>
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Edit
          </Link>
          <button
            onClick={() => handleAction('issue')}
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? 'Issuing...' : 'Issue'}
          </button>
        </>
      )}

      {invoice.status === 'issued' && (
        <>
          <button
            onClick={() => handleAction('send')}
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={() => handleAction('void')}
            disabled={loading}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {loading ? 'Voiding...' : 'Void'}
          </button>
        </>
      )}

      {invoice.status === 'sent' && (
        <>
          <button
            onClick={() => handleAction('mark-paid')}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Marking...' : 'Mark Paid'}
          </button>
          <Link
            href={`/credit-notes/new?invoice_id=${invoice.id}`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Create Credit Note
          </Link>
        </>
      )}

      {invoice.status === 'paid' && (
        <>
          <Link
            href={`/receipts/new?invoice_id=${invoice.id}`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Create Receipt
          </Link>
          <Link
            href={`/credit-notes/new?invoice_id=${invoice.id}`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Create Credit Note
          </Link>
        </>
      )}

      {(invoice.status === 'issued' || invoice.status === 'sent' || invoice.status === 'paid' || invoice.status === 'voided') && (
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          View PDF
        </a>
      )}
    </div>
  )
}

