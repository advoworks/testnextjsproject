# N8N Expense API Integration Guide

## Overview

The expense API routes now support authentication via **Service Role Key** for N8N workflows. This allows N8N to perform expense operations (create, read, update, delete) without managing JWT tokens.

## How It Works

### Authentication Flow

1. **Service Role Key** (for N8N):
   - Pass `Authorization: Bearer <SERVICE_ROLE_KEY>` header
   - **Must include `tenant_id` in request body** (service role key doesn't identify a tenant)

2. **Cookie-based Auth** (for browser):
   - Uses existing session cookies
   - `tenant_id` is automatically determined from authenticated user

## Available Expense API Routes

### 1. Create Expense

**Endpoint:** `POST /api/expenses`

**Headers:**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json
```

**Request Body (Service Role Key):**
```json
{
  "tenant_id": "uuid-of-tenant",
  "description": "Office supplies",
  "amount": 50.00,
  "expense_date": "2024-01-15",
  "receipt_url": "optional-receipt-url",
  "created_by": "optional-tenant-user-id"
}
```

**Request Body (Cookie Auth - Browser):**
```json
{
  "description": "Office supplies",
  "amount": 50.00,
  "expense_date": "2024-01-15",
  "receipt_url": "optional-receipt-url"
}
```
Note: `tenant_id` and `created_by` are automatically set from authenticated user.

**Success Response (201):**
```json
{
  "expense": {
    "id": "uuid",
    "tenant_id": "uuid",
    "description": "Office supplies",
    "amount": 50.00,
    "expense_date": "2024-01-15",
    "receipt_url": null,
    "created_by": "uuid",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### 2. List Expenses

**Endpoint:** `GET /api/expenses`

**Headers (Service Role Key):**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
```

**Query Parameters (Service Role Key):**
```
?tenant_id=uuid-of-tenant
```

**Example:**
```
GET /api/expenses?tenant_id=123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <SERVICE_ROLE_KEY>
```

**Success Response (200):**
```json
{
  "expenses": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "description": "Office supplies",
      "amount": 50.00,
      "expense_date": "2024-01-15",
      ...
    }
  ]
}
```

---

### 3. Get Expense Details

**Endpoint:** `GET /api/expenses/[id]`

**Headers (Service Role Key):**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
```

**Query Parameters (Service Role Key):**
```
?tenant_id=uuid-of-tenant
```

**Example:**
```
GET /api/expenses/123e4567-e89b-12d3-a456-426614174000?tenant_id=tenant-uuid
Authorization: Bearer <SERVICE_ROLE_KEY>
```

**Success Response (200):**
```json
{
  "expense": {
    "id": "uuid",
    "tenant_id": "uuid",
    "description": "Office supplies",
    "amount": 50.00,
    ...
  }
}
```

---

### 4. Update Expense

**Endpoint:** `PUT /api/expenses/[id]`

**Headers:**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json
```

**Request Body (Service Role Key):**
```json
{
  "tenant_id": "uuid-of-tenant",
  "description": "Updated description",
  "amount": 75.00,
  "expense_date": "2024-01-16",
  "receipt_url": "optional-receipt-url"
}
```

**Success Response (200):**
```json
{
  "expense": {
    "id": "uuid",
    ...
  }
}
```

---

### 5. Delete Expense

**Endpoint:** `DELETE /api/expenses/[id]`

**Headers (Service Role Key):**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
```

**Query Parameters (Service Role Key):**
```
?tenant_id=uuid-of-tenant
```

**Example:**
```
DELETE /api/expenses/123e4567-e89b-12d3-a456-426614174000?tenant_id=tenant-uuid
Authorization: Bearer <SERVICE_ROLE_KEY>
```

**Success Response (200):**
```json
{
  "success": true
}
```

## N8N Workflow Example

### Complete Flow: Verify User → Create Expense

```
1. WhatsApp Trigger
   ↓
2. Code Node: Verify WhatsApp User
   - Query tenant_users table using mobile_number
   - Extract tenant_id and user_id
   ↓
3. HTTP Request: Create Expense
   - Method: POST
   - URL: http://your-domain:3000/api/expenses
   - Headers:
     - Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
     - Content-Type: application/json
   - Body:
     {
       "tenant_id": "{{ $json.tenant_id }}",
       "description": "{{ $json.description }}",
       "amount": {{ $json.amount }},
       "expense_date": "{{ $json.expense_date }}",
       "created_by": "{{ $json.user_id }}"
     }
```

## Important Notes

### Service Role Key Requirements

When using service role key authentication:
- ✅ **Always include `tenant_id` in request body** (for POST/PUT)
- ✅ **Always include `tenant_id` in query params** (for GET/DELETE)
- ✅ Service role key bypasses RLS (has full access)
- ⚠️ You're responsible for ensuring `tenant_id` is correct

### Cookie-based Auth (Browser)

When using cookie-based authentication:
- ✅ `tenant_id` is automatically determined from authenticated user
- ✅ RLS policies apply (user can only access their tenant's expenses)
- ✅ `created_by` is automatically set to authenticated user id

## Error Responses

**401 Unauthorized:**
```json
{ "error": "Unauthorized" }
```
- Missing or invalid Authorization header

**400 Bad Request:**
```json
{ "error": "tenant_id is required when using service role key authentication" }
```
- Service role key used but `tenant_id` not provided

**403 Forbidden:**
```json
{ "error": "Tenant is not active" }
```
- Tenant exists but is deactivated

**404 Not Found:**
```json
{ "error": "Expense not found" }
```
- Expense doesn't exist or doesn't belong to the specified tenant

## Security Considerations

1. **Service Role Key Security:**
   - Never expose in client-side code
   - Store securely in N8N environment variables
   - Rotate if compromised

2. **Tenant ID Validation:**
   - Always verify `tenant_id` matches the WhatsApp user's tenant
   - Don't trust user-provided `tenant_id` without verification

3. **Rate Limiting:**
   - Consider adding rate limiting to expense routes
   - Monitor for unusual activity

## Testing with cURL

```bash
# Create Expense (Service Role Key)
curl -X POST http://your-domain:3000/api/expenses \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant-uuid",
    "description": "Test expense",
    "amount": 25.50,
    "expense_date": "2024-01-15"
  }'

# List Expenses (Service Role Key)
curl "http://your-domain:3000/api/expenses?tenant_id=tenant-uuid" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Get Expense (Service Role Key)
curl "http://your-domain:3000/api/expenses/expense-uuid?tenant_id=tenant-uuid" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```
