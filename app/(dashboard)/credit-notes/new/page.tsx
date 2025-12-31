import { requireTenantUser } from '@/lib/auth/utils'
import CreditNoteForm from '@/components/invoices/credit-note-form'

export default async function NewCreditNotePage() {
  await requireTenantUser()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Create Credit Note
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create a credit note to reverse an invoice
        </p>
      </div>

      <CreditNoteForm />
    </div>
  )
}

