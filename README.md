# Expense Tracker - MVP

A simple expense management web application for small businesses with multi-tenant support, built with Next.js and Supabase.

## Features

- **Multi-tenant Architecture**: Each business (tenant) has isolated data
- **Expense Management**: Create, view, edit, and delete expenses
- **Receipt Upload**: Upload and attach receipt photos to expenses
- **Team Collaboration**: Multiple users per tenant can track expenses
- **Admin Dashboard**: Manage tenants and monitor system activity
- **API Routes**: RESTful APIs ready for N8N WhatsApp integration

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage

## Prerequisites

- Node.js 18+
- npm or yarn
- Self-hosted Supabase instance

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up the database**:
   - Apply migrations using Supabase CLI:
     ```bash
     supabase db push
     ```
   - Or manually run the migration from `supabase/migrations/20240101000000_initial_schema.sql` in your Supabase SQL editor
   - This will create all necessary tables, indexes, and RLS policies

4. **Set up Supabase Storage**:
   - Create a storage bucket named `receipts` in Supabase
   - Set up storage policies for tenant isolation:
   ```sql
   -- Allow tenants to upload to their own folder
   CREATE POLICY "Tenants can upload receipts"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'receipts' AND
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM tenants
       WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
     )
   );

   -- Allow tenants to view their own receipts
   CREATE POLICY "Tenants can view receipts"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'receipts' AND
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM tenants
       WHERE id IN (SELECT tenant_id FROM tenant_users WHERE id = auth.uid())
     )
   );
   ```

5. **Create an admin user** (optional):
   - Sign up a user through Supabase Auth
   - Insert the user ID into the `admin_users` table:
   ```sql
   INSERT INTO admin_users (id, email, full_name)
   VALUES ('user-uuid-here', 'admin@example.com', 'Admin User');
   ```

6. **Run the development server**:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
app/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Tenant dashboard pages
│   ├── admin/           # Admin dashboard pages
│   ├── api/             # API routes for N8N
│   └── page.tsx         # Landing page
├── lib/
│   ├── supabase/        # Supabase client utilities
│   ├── auth/            # Authentication utilities
│   └── db/              # Database schema and types
└── components/
    ├── auth/            # Authentication components
    ├── expenses/        # Expense components
    ├── dashboard/       # Dashboard components
    └── admin/           # Admin components
```

## API Routes (for N8N Integration)

All API routes require authentication via Supabase session tokens (JWT):

- `GET /api/expenses` - List all expenses for the authenticated tenant
- `POST /api/expenses` - Create a new expense
- `GET /api/expenses/[id]` - Get expense details
- `PUT /api/expenses/[id]` - Update an expense
- `DELETE /api/expenses/[id]` - Delete an expense
- `POST /api/expenses/[id]/receipt` - Upload a receipt for an expense

### Example API Usage

```bash
# Get expenses (requires Authorization header with Supabase JWT)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/expenses

# Create expense
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Office supplies","amount":50.00,"expense_date":"2024-01-15"}' \
  http://localhost:3000/api/expenses
```

## Database Schema

- `tenants` - Business/organization profiles
- `tenant_users` - Users belonging to tenants
- `admin_users` - Admin user accounts
- `expenses` - Expense records

All tables have Row Level Security (RLS) enabled for proper tenant isolation.

## License

Private - All rights reserved
