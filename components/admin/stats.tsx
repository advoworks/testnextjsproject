type AdminStatsProps = {
  totalTenants: number
  activeTenants: number
}

export default function AdminStats({ totalTenants, activeTenants }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Tenants</div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {totalTenants}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Active Tenants</div>
        <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {activeTenants}
        </div>
      </div>
    </div>
  )
}

