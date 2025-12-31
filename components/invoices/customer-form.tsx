'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Customer } from '@/lib/db/types'

type CustomerFormProps = {
  tenantId: string
  customer?: Customer
  onSubmit?: (data: Partial<Customer>) => Promise<void>
  cancelUrl?: string
}

export default function CustomerForm({ tenantId, customer, onSubmit, cancelUrl }: CustomerFormProps) {
  const router = useRouter()
  const isEditMode = !!customer
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address_line1: customer?.address_line1 || '',
    address_line2: customer?.address_line2 || '',
    city: customer?.city || '',
    state_province: customer?.state_province || '',
    postal_code: customer?.postal_code || '',
    country: customer?.country || '',
    tax_id: customer?.tax_id || '',
    notes: customer?.notes || '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    if (!formData.email && !formData.phone) {
      setError('At least one contact method (email or phone) is required')
      return
    }

    setLoading(true)

    if (onSubmit && isEditMode) {
      try {
        await onSubmit(formData)
      } catch (err) {
        if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
          throw err
        }
        setError(err instanceof Error ? err.message : 'Failed to update customer')
        setLoading(false)
      }
      return
    }

    // Create customer via API
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Failed to create customer')
      setLoading(false)
      return
    }

    router.push(`/customers/${result.customer.id}`)
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
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        * At least one contact method (email or phone) is required
      </p>

      <div>
        <label htmlFor="address_line1" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Address Line 1
        </label>
        <input
          id="address_line1"
          type="text"
          value={formData.address_line1}
          onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="address_line2" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Address Line 2
        </label>
        <input
          id="address_line2"
          type="text"
          value={formData.address_line2}
          onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            City
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="state_province" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            State/Province
          </label>
          <input
            id="state_province"
            type="text"
            value={formData.state_province}
            onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Postal Code
          </label>
          <input
            id="postal_code"
            type="text"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Country
        </label>
        <input
          id="country"
          type="text"
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          placeholder="ISO 3166-1 alpha-2 (e.g., US, GB)"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="tax_id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tax ID
        </label>
        <input
          id="tax_id"
          type="text"
          value={formData.tax_id}
          onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
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
          {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Customer' : 'Create Customer'}
        </button>
        <Link
          href={cancelUrl || '/customers'}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

