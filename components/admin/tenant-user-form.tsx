'use client'

import { useState } from 'react'

type TenantUserFormProps = {
  onSubmit: (data: { fullName: string; email: string; password: string; mobileNumber?: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
  tenantEmail?: string
}

export default function TenantUserForm({
  onSubmit,
  onCancel,
  loading = false,
  tenantEmail,
}: TenantUserFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: tenantEmail || '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
  })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Full name, email, and password are required')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      await onSubmit({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        mobileNumber: formData.mobileNumber || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Full Name *
        </label>
        <input
          id="fullName"
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password *
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={6}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Confirm Password *
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          minLength={6}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="mobileNumber" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Mobile Number
        </label>
        <input
          id="mobileNumber"
          type="tel"
          value={formData.mobileNumber}
          onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
          placeholder="+1234567890"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Optional: Used for WhatsApp verification (format: +1234567890)
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

