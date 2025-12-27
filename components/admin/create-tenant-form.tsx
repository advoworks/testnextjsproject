'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TenantForm from './tenant-form'
import TenantUserForm from './tenant-user-form'

export default function CreateTenantForm() {
  const router = useRouter()
  const [step, setStep] = useState<'tenant' | 'user'>('tenant')
  const [tenantData, setTenantData] = useState<any>(null)
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTenantSubmit(data: any) {
    setLoading(true)
    setError(null)

    // Create tenant via API route (server-side with proper auth)
    const response = await fetch('/api/admin/create-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        country: data.country || null,
        timezone: data.timezone || null,
        currency: data.currency || null,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Failed to create tenant. Please try again.')
      setLoading(false)
      return
    }

    setTenantData(data)
    setCreatedTenantId(result.tenant.id)
    setStep('user')
    setLoading(false)
  }

  async function handleUserSubmit(data: { fullName: string; email: string; password: string; mobileNumber?: string; country?: string; timezone?: string; currency?: string }) {
    if (!createdTenantId) return

    setLoading(true)
    setError(null)

    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        tenantId: createdTenantId,
        mobileNumber: data.mobileNumber,
        country: data.country || null,
        timezone: data.timezone || null,
        currency: data.currency || null,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Failed to create user')
      setLoading(false)
      return
    }

    router.push(`/admin/tenants/${createdTenantId}`)
    router.refresh()
  }

  if (step === 'user') {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Step 2: Create Initial User
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create the first user for {tenantData?.name}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <TenantUserForm
          onSubmit={handleUserSubmit}
          onCancel={() => setStep('tenant')}
          loading={loading}
          tenantEmail={tenantData?.email}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Step 1: Tenant Information
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter the tenant business information
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <TenantForm
        onSubmit={handleTenantSubmit}
        onCancel={() => router.push('/admin/tenants')}
        loading={loading}
      />
    </div>
  )
}

