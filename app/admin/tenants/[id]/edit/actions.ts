'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tenant } from '@/lib/db/types'

export async function updateTenant(
  data: Omit<Tenant, 'id' | 'created_at' | 'updated_at'> & { tenantId?: string }
) {
  if (!data.tenantId) {
    throw new Error('tenantId is required')
  }

  const supabase = await createClient()
  const { tenantId, ...updateData } = data
  const { error: updateError } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  redirect(`/admin/tenants/${tenantId}`)
}
