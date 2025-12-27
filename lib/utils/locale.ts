/**
 * Gets the effective country for a tenant user.
 * Returns tenant_user.country if set, otherwise falls back to tenant.country.
 * If neither is set, returns null.
 */
export function getEffectiveCountry(
  tenantUserCountry: string | null,
  tenantCountry: string | null
): string | null {
  return tenantUserCountry || tenantCountry || null
}

/**
 * Gets the effective timezone for a tenant user.
 * Returns tenant_user.timezone if set, otherwise falls back to tenant.timezone.
 * If neither is set, returns 'UTC' as default.
 */
export function getEffectiveTimezone(
  tenantUserTimezone: string | null,
  tenantTimezone: string | null
): string {
  return tenantUserTimezone || tenantTimezone || 'UTC'
}

/**
 * Gets the effective currency for a tenant user.
 * Returns tenant_user.currency if set, otherwise falls back to tenant.currency.
 * If neither is set, returns 'USD' as default.
 */
export function getEffectiveCurrency(
  tenantUserCurrency: string | null,
  tenantCurrency: string | null
): string {
  return tenantUserCurrency || tenantCurrency || 'USD'
}

/**
 * Validates an IANA timezone string.
 * Returns true if valid, false otherwise.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Validates an ISO 3166-1 alpha-2 country code.
 * Returns true if valid, false otherwise.
 */
export function isValidCountryCode(country: string): boolean {
  return /^[A-Z]{2}$/.test(country)
}

/**
 * Validates an ISO 4217 currency code.
 * Returns true if valid, false otherwise.
 */
export function isValidCurrencyCode(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency)
}

/**
 * Formats a date/time in the user's timezone.
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone string
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: timezone,
  }).format(dateObj)
}

/**
 * Formats a currency amount in the user's currency.
 * @param amount - Numeric amount
 * @param currency - ISO 4217 currency code
 * @param locale - Locale string (defaults to 'en-US')
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Gets the UTC offset for a timezone in hours.
 * Returns a string like "+8", "-5", or "+0" for UTC.
 * Accounts for daylight saving time by calculating the current offset.
 */
function getTimezoneOffset(timezone: string): string {
  if (timezone === 'UTC') {
    return '+0'
  }

  try {
    const now = new Date()
    // Get the same moment in both UTC and the target timezone
    // Using formatToParts to get precise hour values
    const utcParts = new Intl.DateTimeFormat('en', {
      timeZone: 'UTC',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(now)
    
    const tzParts = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).formatToParts(now)
    
    const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0', 10)
    const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0', 10)
    
    // Also get minutes to be more precise
    const utcMinute = parseInt(utcParts.find(p => p.type === 'minute')?.value || '0', 10)
    const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0', 10)
    
    // Calculate offset in hours (accounting for minutes)
    let offsetHours = tzHour - utcHour
    const offsetMinutes = tzMinute - utcMinute
    
    // Adjust for minute differences
    if (offsetMinutes >= 30) offsetHours += 1
    if (offsetMinutes <= -30) offsetHours -= 1
    
    // Handle day boundaries (e.g., UTC+14 or UTC-12)
    if (offsetHours > 12) offsetHours -= 24
    if (offsetHours < -12) offsetHours += 24
    
    // Format with sign
    const sign = offsetHours >= 0 ? '+' : ''
    return `${sign}${offsetHours}`
  } catch {
    // If calculation fails, return empty string (will show without offset)
    return ''
  }
}

/**
 * Base timezone definitions (without offsets).
 */
const TIMEZONE_BASE = [
  { value: 'America/New_York', name: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', name: 'Central Time (US & Canada)' },
  { value: 'America/Denver', name: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', name: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', name: 'London' },
  { value: 'Europe/Paris', name: 'Paris' },
  { value: 'Europe/Berlin', name: 'Berlin' },
  { value: 'Asia/Singapore', name: 'Singapore' },
  { value: 'Asia/Tokyo', name: 'Tokyo' },
  { value: 'Asia/Hong_Kong', name: 'Hong Kong' },
  { value: 'Australia/Sydney', name: 'Sydney' },
  { value: 'UTC', name: 'UTC' },
] as const

/**
 * Common timezone options for dropdowns/selects.
 * Returns timezones with current UTC offsets calculated dynamically.
 * This accounts for daylight saving time changes.
 */
export function getCommonTimezones() {
  return TIMEZONE_BASE.map((tz) => ({
    value: tz.value,
    label: tz.value === 'UTC' 
      ? 'UTC (UTC+0)' 
      : `${tz.name} (UTC${getTimezoneOffset(tz.value)})`
  }))
}

/**
 * Common timezone options (static, for backwards compatibility).
 * Note: This doesn't include offsets. Use getCommonTimezones() for offsets.
 */
export const COMMON_TIMEZONES = TIMEZONE_BASE.map((tz) => ({
  value: tz.value,
  label: tz.name
}))

/**
 * Common currency options for dropdowns/selects.
 */
export const COMMON_CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'HKD', label: 'Hong Kong Dollar (HKD)' },
  { value: 'CNY', label: 'Chinese Yuan (CNY)' },
] as const

/**
 * Common country options for dropdowns/selects (ISO 3166-1 alpha-2).
 */
export const COMMON_COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'CN', label: 'China' },
] as const
