'use client'

import Link from 'next/link'
import type { Customer } from '@/lib/db/types'

type CustomerListProps = {
  customers: Customer[]
}

export default function CustomerList({ customers }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">
          No customers yet. Create your first customer to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              City
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className="whitespace-nowrap px-6 py-4">
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-sm font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                >
                  {customer.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                {customer.email || '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                {customer.phone || '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                {customer.city || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

