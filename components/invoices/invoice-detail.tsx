'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, InvoiceLineItem, Customer, CreditNote, Receipt } from '@/lib/db/types'
import { formatCurrency } from '@/lib/utils/locale'
import InvoiceActions from './invoice-actions'

type InvoiceDetailProps = {
  invoice: Invoice & {
    line_items?: InvoiceLineItem[]
    customer?: Customer
    credit_notes?: CreditNote[]
    receipts?: Receipt[]
  }
}

const statusColors: Record<Invoice['status'], string> = {
  draft: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  issued: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  voided: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this draft invoice?')) {
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)

    if (error) {
      alert(`Failed to delete invoice: ${error.message}`)
      setLoading(false)
      return
    }

    router.push('/invoices')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Invoice {invoice.invoice_number || 'Draft'}
          </h1>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusColors[invoice.status]}`}
          >
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>
        <InvoiceActions invoice={invoice} />
      </div>

      {invoice.status === 'voided' && invoice.void_reason && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Voided: {invoice.void_reason}
          </p>
          {invoice.voided_at && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">
              Voided on {formatDate(invoice.voided_at)}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Invoice Details</h2>
          <dl className="mt-4 space-y-2">
            <div>
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Invoice Number</dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {invoice.invoice_number || 'Draft'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Invoice Date</dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {formatDate(invoice.invoice_date)}
              </dd>
            </div>
            {invoice.due_date && (
              <div>
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Due Date</dt>
                <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDate(invoice.due_date)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Currency</dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{invoice.currency}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Bill To</h2>
          {invoice.customer && (
            <div className="mt-4 text-sm">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{invoice.customer.name}</p>
              {invoice.customer.address_line1 && (
                <p className="text-zinc-600 dark:text-zinc-400">{invoice.customer.address_line1}</p>
              )}
              {invoice.customer.address_line2 && (
                <p className="text-zinc-600 dark:text-zinc-400">{invoice.customer.address_line2}</p>
              )}
              {(invoice.customer.city || invoice.customer.state_province) && (
                <p className="text-zinc-600 dark:text-zinc-400">
                  {[invoice.customer.city, invoice.customer.state_province, invoice.customer.postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {invoice.customer.country && (
                <p className="text-zinc-600 dark:text-zinc-400">{invoice.customer.country}</p>
              )}
              {invoice.customer.tax_id && (
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">Tax ID: {invoice.customer.tax_id}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Line Items</h2>
        </div>
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Quantity
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Unit Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {invoice.line_items && invoice.line_items.length > 0 ? (
              invoice.line_items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                    {item.description}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {item.quantity}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(item.unit_price, invoice.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(item.line_total, invoice.currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No line items
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Subtotal
              </td>
              <td className="px-6 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </td>
            </tr>
            {invoice.tax_amount > 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Tax
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(invoice.tax_amount, invoice.currency)}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="px-6 py-4 text-right text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Total
              </td>
              <td className="px-6 py-4 text-right text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(invoice.total_amount, invoice.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.terms && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Payment Terms</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line">{invoice.terms}</p>
        </div>
      )}

      {invoice.notes && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}

      {invoice.credit_notes && invoice.credit_notes.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Credit Notes</h2>
          <div className="mt-4 space-y-2">
            {invoice.credit_notes.map((cn) => (
              <div key={cn.id} className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <div>
                  <Link
                    href={`/credit-notes/${cn.id}`}
                    className="text-sm font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    {cn.credit_note_number}
                  </Link>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{cn.reason}</p>
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(cn.amount, invoice.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.receipts && invoice.receipts.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Receipts</h2>
          <div className="mt-4 space-y-2">
            {invoice.receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <div>
                  <Link
                    href={`/receipts/${receipt.id}`}
                    className="text-sm font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    {receipt.receipt_number}
                  </Link>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {formatDate(receipt.payment_date)} - {receipt.payment_method || 'N/A'}
                  </p>
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(receipt.amount, invoice.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Link Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">PDF Document</h2>
        <div className="mt-4">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              invoice.pdf_url
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-zinc-600 hover:bg-zinc-700'
            }`}
          >
            <span>📄</span>
            {invoice.pdf_url ? 'View PDF' : 'Generate PDF'}
          </a>
          {!invoice.pdf_url && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              PDF will be generated on-demand and cached for future access
            </p>
          )}
        </div>
      </div>

      {invoice.status === 'draft' && (
        <div className="flex gap-4">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {loading ? 'Deleting...' : 'Delete Draft'}
          </button>
        </div>
      )}
    </div>
  )
}

