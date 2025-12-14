import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant user
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!tenantUser && !adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { path } = await params
  const filePath = path.join('/')

  // Verify the file path belongs to the tenant (if not admin)
  if (!adminUser && tenantUser) {
    const pathParts = filePath.split('/')
    const tenantIdFromPath = pathParts[0]
    
    if (tenantIdFromPath !== tenantUser.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Generate signed URL for the file (valid for 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(filePath, 3600)

  if (signedUrlError || !signedUrlData) {
    return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
  }

  // Redirect to the signed URL
  return NextResponse.redirect(signedUrlData.signedUrl)
}
