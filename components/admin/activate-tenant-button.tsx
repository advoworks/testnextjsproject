'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type ActivateTenantButtonProps = {
  tenantId: string
  isActive: boolean
}

export default function ActivateTenantButton({ tenantId, isActive }: ActivateTenantButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    if (!confirm(`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this tenant?`)) {
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ is_active: !isActive })
      .eq('id', tenantId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
            : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
        }`}
      >
        {loading ? 'Updating...' : isActive ? 'Deactivate Tenant' : 'Activate Tenant'}
      </button>
    </div>
  )
}

