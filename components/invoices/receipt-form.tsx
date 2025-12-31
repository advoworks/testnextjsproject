'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Receipt, Invoice } from '@/lib/db/types'

export default function ReceiptForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('invoice_id')
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [formData, setFormData] = useState({
    invoice_id: invoiceId || '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    payment_reference: '',
    amount: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (invoiceId) {
      async function fetchInvoice() {
        const supabase = createClient()
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single()
        if (data) {
          setInvoice(data as Invoice)
          setFormData(prev => ({ 
            ...prev, 
            invoice_id: invoiceId,
            amount: data.total_amount.toString()
          }))
        }
      }
      fetchInvoice()
    }
  }, [invoiceId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.invoice_id || !formData.payment_date || !formData.amount) {
      setError('Invoice ID, payment date, and amount are required')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    setLoading(true)
    const response = await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_id: formData.invoice_id,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method || null,
        payment_reference: formData.payment_reference || null,
        amount,
        notes: formData.notes || null,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Failed to create receipt')
      setLoading(false)
      return
    }

    router.push(`/invoices/${formData.invoice_id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {invoice && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Invoice: {invoice.invoice_number || 'Draft'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total: {invoice.total_amount} {invoice.currency}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="payment_date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Payment Date *
        </label>
        <input
          id="payment_date"
          type="date"
          value={formData.payment_date}
          onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="payment_method" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Payment Method
          </label>
          <input
            id="payment_method"
            type="text"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            placeholder="e.g., bank_transfer, credit_card, cash"
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="payment_reference" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Payment Reference
          </label>
          <input
            id="payment_reference"
            type="text"
            value={formData.payment_reference}
            onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
            placeholder="Transaction ID, check number, etc."
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

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
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? 'Creating...' : 'Create Receipt'}
        </button>
        <Link
          href={invoiceId ? `/invoices/${invoiceId}` : '/invoices'}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

