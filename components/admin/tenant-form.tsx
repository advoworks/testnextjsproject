'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tenant } from '@/lib/db/types'

type TenantFormProps = {
  tenant?: Tenant
  onSubmit: (data: Omit<Tenant, 'id' | 'created_at' | 'updated_at'> & { tenantId?: string }) => Promise<void>
  onCancel?: () => void
  cancelUrl?: string
  loading?: boolean
}

export default function TenantForm({
  tenant,
  onSubmit,
  onCancel,
  cancelUrl,
  loading = false,
}: TenantFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    is_active: tenant?.is_active ?? true,
  })
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    if (onCancel) {
      onCancel()
    } else if (cancelUrl) {
      router.push(cancelUrl)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.email) {
      setError('Name and email are required')
      return
    }

    try {
      await onSubmit({ ...formData, tenantId: tenant?.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tenant')
    }
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
          Business Name *
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

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email *
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>


      {tenant && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active</span>
          </label>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? 'Saving...' : tenant ? 'Update Tenant' : 'Create Tenant'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

