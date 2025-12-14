import { redirect } from 'next/navigation'

// Redirect admin login to regular login page
// The login form will automatically detect admin users and redirect accordingly
export default function AdminLoginPage() {
  redirect('/login')
}

