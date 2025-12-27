export type Tenant = {
  id: string
  name: string
  email: string
  country: string | null
  timezone: string | null
  currency: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export type AdminUser = {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export type TenantUser = {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: string
  mobile_number: string | null
  country: string | null
  timezone: string | null
  currency: string | null
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  tenant_id: string
  amount: number
  description: string
  expense_date: string
  receipt_url: string | null
  currency: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

