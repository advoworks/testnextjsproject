'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
  
    const supabase = createClient()
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
  
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }
  
    if (!authData.user) {
      setError('Failed to sign in')
      setLoading(false)
      return
    }
  
    // Check if user is an admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (adminUser && !adminError) {
      // Redirect admin to admin dashboard
      router.push('/admin/dashboard')
      router.refresh()
      return
    }

    // Check if user is a tenant user and if tenant is active
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('*, tenant:tenants(is_active)')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (tenantUser) {
      // Check if tenant is active
      if (tenantUser.tenant && !tenantUser.tenant.is_active) {
        setError('Your account has been deactivated. Please contact support.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      // Redirect tenant to dashboard
      router.push('/expenses')
      router.refresh()
      return
    }

    // If user is neither admin nor tenant user
    setError('Account not found. Please contact support.')
    await supabase.auth.signOut()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
          Sign up
        </Link>
      </p>
    </form>
  )
}

