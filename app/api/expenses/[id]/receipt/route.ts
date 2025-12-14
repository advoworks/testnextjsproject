import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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

  if (!tenantUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify expense belongs to tenant
  const { data: existingExpense } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  if (!existingExpense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${tenantUser.tenant_id}/receipts/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Store the file path instead of public URL (bucket is private)
  // We'll use an API route to serve the file securely
  const receiptUrl = filePath

  // Update expense with receipt path
  const { data: expense, error: updateError } = await supabase
    .from('expenses')
    .update({ receipt_url: receiptUrl })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ expense }, { status: 200 })
}

