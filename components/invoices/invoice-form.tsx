'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Invoice, InvoiceLineItem, Customer } from '@/lib/db/types'
import { COMMON_CURRENCIES, getEffectiveCurrency } from '@/lib/utils/locale'

type InvoiceFormProps = {
  tenantId: string
  invoice?: Invoice & { line_items?: InvoiceLineItem[]; customer?: Customer }
  onSubmit?: (data: any) => Promise<void>
  cancelUrl?: string
}

type LineItem = {
  description: string
  quantity: string
  unit_price: string
  sort_order: number
}

export default function InvoiceForm({ tenantId, invoice, onSubmit, cancelUrl }: InvoiceFormProps) {
  const router = useRouter()
  const isEditMode = !!invoice
  const [customers, setCustomers] = useState<Customer[]>([])
  const [formData, setFormData] = useState({
    customer_id: invoice?.customer_id || '',
    invoice_date: invoice?.invoice_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    currency: invoice?.currency || '',
    notes: invoice?.notes || '',
    terms: invoice?.terms || '',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.line_items && invoice.line_items.length > 0
      ? invoice.line_items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          unit_price: item.unit_price.toString(),
          sort_order: index,
        }))
      : [{ description: '', quantity: '1', unit_price: '0', sort_order: 0 }]
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch customers
  useEffect(() => {
    async function fetchCustomers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')

      if (error) {
        console.error('Error fetching customers:', error)
      } else {
        setCustomers(data || [])
      }
    }
    fetchCustomers()
  }, [tenantId])

  // Fetch default currency
  useEffect(() => {
    if (!isEditMode && !formData.currency) {
      async function fetchDefaultCurrency() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('currency, tenant:tenants(currency)')
          .eq('id', user.id)
          .single()

        if (tenantUser) {
          let tenantCurrency: string | null = null
          if (tenantUser.tenant) {
            if (Array.isArray(tenantUser.tenant)) {
              tenantCurrency = tenantUser.tenant[0]?.currency || null
            } else {
              tenantCurrency = (tenantUser.tenant as { currency?: string | null })?.currency || null
            }
          }
          const effectiveCurrency = getEffectiveCurrency(tenantUser.currency, tenantCurrency)
          if (effectiveCurrency) {
            setFormData(prev => ({ ...prev, currency: effectiveCurrency }))
          }
        }
      }
      fetchDefaultCurrency()
    }
  }, [isEditMode, formData.currency])

  function addLineItem() {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: '1',
        unit_price: '0',
        sort_order: lineItems.length,
      },
    ])
  }

  function removeLineItem(index: number) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  function calculateSubtotal(): number {
    return lineItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0
      const unitPrice = parseFloat(item.unit_price) || 0
      return sum + quantity * unitPrice
    }, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.customer_id) {
      setError('Please select a customer')
      return
    }

    if (!formData.invoice_date) {
      setError('Invoice date is required')
      return
    }

    if (!formData.currency) {
      setError('Currency is required')
      return
    }

    if (formData.due_date && new Date(formData.due_date) < new Date(formData.invoice_date)) {
      setError('Due date must be greater than or equal to invoice date')
      return
    }

    const validLineItems = lineItems.filter(
      item => item.description.trim() !== '' && parseFloat(item.quantity) > 0
    )

    if (validLineItems.length === 0) {
      setError('At least one line item with description and quantity > 0 is required')
      return
    }

    for (const item of validLineItems) {
      if (!item.description.trim()) {
        setError('All line items must have a description')
        return
      }
      if (parseFloat(item.quantity) <= 0) {
        setError('All line items must have quantity > 0')
        return
      }
      if (parseFloat(item.unit_price) < 0) {
        setError('All line items must have unit price >= 0')
        return
      }
    }

    setLoading(true)

    const processedLineItems = validLineItems.map((item, index) => ({
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit_price: parseFloat(item.unit_price),
      sort_order: index,
    }))

    const payload = {
      customer_id: formData.customer_id,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date || null,
      currency: formData.currency,
      line_items: processedLineItems,
      notes: formData.notes || null,
      terms: formData.terms || null,
    }

    if (onSubmit && isEditMode) {
      try {
        await onSubmit(payload)
      } catch (err) {
        if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
          throw err
        }
        setError(err instanceof Error ? err.message : 'Failed to update invoice')
        setLoading(false)
      }
      return
    }

    // Create invoice via API
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Failed to create invoice')
      setLoading(false)
      return
    }

    router.push(`/invoices/${result.invoice.id}`)
    router.refresh()
  }

  const subtotal = calculateSubtotal()
  const taxAmount = 0 // Placeholder for future tax support
  const total = subtotal + taxAmount

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="customer_id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Customer *
          </label>
          <select
            id="customer_id"
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <Link
            href="/customers"
            className="mt-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Manage customers →
          </Link>
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Currency *
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          >
            <option value="">Select a currency</option>
            {COMMON_CURRENCIES.map((curr) => (
              <option key={curr.value} value={curr.value}>
                {curr.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="invoice_date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Invoice Date *
          </label>
          <input
            id="invoice_date"
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Due Date
          </label>
          <input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            min={formData.invoice_date}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Line Items *
          </label>
          <button
            type="button"
            onClick={addLineItem}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + Add Item
          </button>
        </div>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  min="0"
                  step="0.001"
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unit_price}
                  onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                  min="0"
                  step="0.01"
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <div className="col-span-1 flex items-center justify-end text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {(
                  (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
                ).toFixed(2)}
              </div>
              <div className="col-span-1">
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ml-auto w-64 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formData.currency ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: formData.currency,
            }).format(subtotal) : subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Tax</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formData.currency ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: formData.currency,
            }).format(taxAmount) : taxAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-700">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {formData.currency ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: formData.currency,
            }).format(total) : total.toFixed(2)}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notes (Internal)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="terms" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Payment Terms
        </label>
        <textarea
          id="terms"
          value={formData.terms}
          onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          placeholder="Payment terms to be shown on invoice"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Invoice' : 'Create Invoice'}
        </button>
        <Link
          href={cancelUrl || '/invoices'}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

