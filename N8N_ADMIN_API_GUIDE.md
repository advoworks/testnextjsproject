# N8N Admin API Integration Guide

## Overview

The admin API routes support authentication via **Service Role Key** for N8N workflows. This allows N8N to perform admin operations (create tenants, create users) without managing JWT tokens.

## How It Works

### Flow Diagram

```
N8N Workflow
    ↓
HTTP Request with Authorization: Bearer <SERVICE_ROLE_KEY>
    ↓
Next.js API Route (/api/admin/*)
    ↓
requireAdminForApi() validates service role key
    ↓
If valid → Creates admin Supabase client (bypasses RLS)
    ↓
Performs admin operation
    ↓
Returns JSON response
```

### Step-by-Step Process

1. **N8N sends HTTP request**
   - Method: POST
   - URL: `https://your-domain.com/api/admin/create-tenant` (or `/api/admin/create-user`)
   - Headers:
     - `Authorization: Bearer <YOUR_SERVICE_ROLE_KEY>`
     - `Content-Type: application/json`
   - Body: JSON with required fields

2. **API Route validates authentication**
   - Extracts `Authorization` header
   - Compares provided key with `SUPABASE_SERVICE_ROLE_KEY` environment variable
   - If match → Creates admin Supabase client (bypasses RLS)
   - If no match → Falls back to cookie-based auth (for browser requests)

3. **Admin operation executes**
   - Uses admin Supabase client
   - Bypasses Row Level Security (RLS)
   - Performs the requested operation

4. **Response returned**
   - Success: JSON with operation result
   - Error: JSON with error message and status code

## Available Admin API Routes

### 1. Create Tenant

**Endpoint:** `POST /api/admin/create-tenant`

**Headers:**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "email": "contact@acme.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "tenant": {
    "id": "uuid-here",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "is_active": true
  }
}
```

**Error Response (400/401/403/500):**
```json
{
  "error": "Error message here"
}
```

---

### 2. Create Tenant User

**Endpoint:** `POST /api/admin/create-user`

**Headers:**
```
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@acme.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "tenantId": "tenant-uuid-here"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "userId": "user-uuid-here"
}
```

**Error Response (400/401/403/500):**
```json
{
  "error": "Error message here"
}
```

## N8N Setup Instructions

### Step 1: Get Your Service Role Key

1. In Coolify, go to your Supabase service
2. Find the environment variable: `SERVICE_SUPABASESERVICE_KEY`
3. Copy this value (it's a JWT token)

**⚠️ Security Note:** This key has full admin access. Store it securely in N8N credentials, never expose it publicly.

### Step 2: Configure N8N HTTP Request Node

1. **Add HTTP Request Node** to your N8N workflow

2. **Configure the node:**
   - **Method:** `POST`
   - **URL:** `https://your-nextjs-domain.com/api/admin/create-tenant`
   - **Authentication:** None (we'll add header manually)
   - **Send Headers:** Yes
   - **Header Parameters:**
     ```
     Name: Authorization
     Value: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
     ```
     ```
     Name: Content-Type
     Value: application/json
     ```
   - **Send Body:** Yes
   - **Body Content Type:** JSON
   - **JSON Body:** 
     ```json
     {
       "name": "{{ $json.tenantName }}",
       "email": "{{ $json.tenantEmail }}"
     }
     ```

### Step 3: Store Service Role Key in N8N

**Option A: Environment Variable (Recommended)**
1. In N8N settings, go to Environment Variables
2. Add: `SUPABASE_SERVICE_ROLE_KEY` = `<your-service-role-key>`
3. Use in HTTP node: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`

**Option B: N8N Credentials**
1. Create a new credential type (if needed)
2. Store the service role key securely
3. Reference it in your HTTP node

### Step 4: Test the Integration

#### Test 1: Create Tenant

**N8N Workflow:**
```
1. Manual Trigger (for testing)
2. HTTP Request Node
   - URL: https://your-domain.com/api/admin/create-tenant
   - Method: POST
   - Headers:
     - Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
     - Content-Type: application/json
   - Body:
     {
       "name": "Test Tenant",
       "email": "test@example.com"
     }
3. Check Response
```

**Expected Result:**
- Status: 200
- Response contains `{ "success": true, "tenant": {...} }`

#### Test 2: Create User

**N8N Workflow:**
```
1. Manual Trigger
2. HTTP Request Node
   - URL: https://your-domain.com/api/admin/create-user
   - Method: POST
   - Headers:
     - Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
     - Content-Type: application/json
   - Body:
     {
       "email": "newuser@test.com",
       "password": "SecurePass123!",
       "fullName": "Test User",
       "tenantId": "{{ $json.tenantId }}"
     }
3. Check Response
```

**Expected Result:**
- Status: 200
- Response contains `{ "success": true, "userId": "..." }`

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{ "error": "Unauthorized" }
```
- **Cause:** Missing or invalid Authorization header
- **Fix:** Check that service role key is correct and header format is `Bearer <key>`

**403 Forbidden:**
```json
{ "error": "Forbidden: Admin access required" }
```
- **Cause:** Service role key doesn't match or cookie-based auth failed
- **Fix:** Verify `SUPABASE_SERVICE_ROLE_KEY` environment variable in Next.js app

**400 Bad Request:**
```json
{ "error": "Name and email are required" }
```
- **Cause:** Missing required fields in request body
- **Fix:** Check request body includes all required fields

**500 Internal Server Error:**
```json
{ "error": "Failed to create tenant" }
```
- **Cause:** Database error or validation failure
- **Fix:** Check Supabase logs, verify tenant email is unique

## Security Considerations

1. **Service Role Key Security:**
   - Never commit to git
   - Store in N8N environment variables or secure credentials
   - Rotate if compromised

2. **Network Security:**
   - Use HTTPS for all API calls
   - Consider IP whitelisting if possible

3. **Rate Limiting:**
   - Consider adding rate limiting to admin routes
   - Monitor for unusual activity

4. **Audit Logging:**
   - Log all admin operations
   - Track which N8N workflow performed which action

## Testing with cURL

For quick testing outside N8N:

```bash
# Create Tenant
curl -X POST https://your-domain.com/api/admin/create-tenant \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "test@company.com"
  }'

# Create User
curl -X POST https://your-domain.com/api/admin/create-user \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@company.com",
    "password": "SecurePass123!",
    "fullName": "John Doe",
    "tenantId": "tenant-uuid-here"
  }'
```

## Troubleshooting

### Issue: 401 Unauthorized
- ✅ Check Authorization header format: `Bearer <key>` (with space)
- ✅ Verify service role key is correct
- ✅ Check Next.js environment variable `SUPABASE_SERVICE_ROLE_KEY` is set

### Issue: 403 Forbidden
- ✅ Verify service role key matches exactly (no extra spaces)
- ✅ Check that Next.js app has access to the environment variable

### Issue: CORS Errors
- ✅ Ensure N8N and Next.js are on same domain or CORS is configured
- ✅ Check Next.js middleware allows the request

### Issue: Connection Refused
- ✅ Verify Next.js app is running and accessible
- ✅ Check URL is correct (including https://)
- ✅ Verify firewall/network settings

## Next Steps

After testing admin routes, you may want to:
1. Add more admin operations (list tenants, update tenant, etc.)
2. Implement tenant-specific operations with JWT tokens
3. Add request validation and sanitization
4. Implement audit logging for admin operations
