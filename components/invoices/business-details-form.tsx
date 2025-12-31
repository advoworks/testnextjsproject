'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { TenantBusinessDetails } from '@/lib/db/types'

type BusinessDetailsFormProps = {
  tenantId: string
  businessDetails?: TenantBusinessDetails
}

export default function BusinessDetailsForm({ tenantId, businessDetails }: BusinessDetailsFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    business_name: businessDetails?.business_name || '',
    address_line1: businessDetails?.address_line1 || '',
    address_line2: businessDetails?.address_line2 || '',
    city: businessDetails?.city || '',
    state_province: businessDetails?.state_province || '',
    postal_code: businessDetails?.postal_code || '',
    country: businessDetails?.country || '',
    phone: businessDetails?.phone || '',
    email: businessDetails?.email || '',
    website: businessDetails?.website || '',
    tax_id: businessDetails?.tax_id || '',
    registration_number: businessDetails?.registration_number || '',
    bank_name: businessDetails?.bank_name || '',
    bank_account_number: businessDetails?.bank_account_number || '',
    bank_routing_number: businessDetails?.bank_routing_number || '',
    notes: businessDetails?.notes || '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.business_name.trim()) {
      setError('Business name is required')
      return
    }

    setLoading(true)

    // Create FormData for file upload
    const formDataToSend = new FormData()
    formDataToSend.append('business_name', formData.business_name)
    if (logoFile) {
      formDataToSend.append('logo', logoFile)
    }
    formDataToSend.append('address_line1', formData.address_line1 || '')
    formDataToSend.append('address_line2', formData.address_line2 || '')
    formDataToSend.append('city', formData.city || '')
    formDataToSend.append('state_province', formData.state_province || '')
    formDataToSend.append('postal_code', formData.postal_code || '')
    formDataToSend.append('country', formData.country || '')
    formDataToSend.append('phone', formData.phone || '')
    formDataToSend.append('email', formData.email || '')
    formDataToSend.append('website', formData.website || '')
    formDataToSend.append('tax_id', formData.tax_id || '')
    formDataToSend.append('registration_number', formData.registration_number || '')
    formDataToSend.append('bank_name', formData.bank_name || '')
    formDataToSend.append('bank_account_number', formData.bank_account_number || '')
    formDataToSend.append('bank_routing_number', formData.bank_routing_number || '')
    formDataToSend.append('notes', formData.notes || '')

    const response = await fetch('/api/business-details', {
      method: 'PUT',
      body: formDataToSend,
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Failed to update business details')
      setLoading(false)
      return
    }

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
        <label htmlFor="business_name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Business Name *
        </label>
        <input
          id="business_name"
          type="text"
          value={formData.business_name}
          onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Logo
        </label>
        <input
          id="logo"
          type="file"
          accept="image/*"
          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
        />
      </div>

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
          Terms & Conditions / Footer Text
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          placeholder="Terms and conditions or footer text to appear on invoices"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? 'Saving...' : 'Save Business Details'}
        </button>
      </div>
    </form>
  )
}

