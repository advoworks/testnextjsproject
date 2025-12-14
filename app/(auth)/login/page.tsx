import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/login-form'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Check if user is an admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (adminUser && !adminError) {
      redirect('/admin/dashboard')
      return
    }

    // Check if user is a tenant user and if tenant is active
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('*, tenant:tenants(is_active)')
      .eq('id', user.id)
      .maybeSingle()

    if (tenantUser) {
      if (tenantUser.tenant && !tenantUser.tenant.is_active) {
        // Tenant is deactivated - show login form with error
        // (We'll handle this in the form component)
      } else {
        redirect('/expenses')
      }
      return
    }

    // If no admin or tenant user found, show login form
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to your account to continue
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}