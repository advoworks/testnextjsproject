/**
 * Gotenberg client for converting HTML to PDF
 */

// Get Gotenberg URL from environment variable, with fallback to hardcoded value
// In production, set GOTENBERG_URL environment variable to your Gotenberg service URL
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg-csk8sc0g48ck0gwcs4kkc448:3000'

// Get Gotenberg Basic Auth credentials from environment variables
// These are required if Gotenberg is configured with --api-enable-basic-auth
const GOTENBERG_USERNAME = process.env.GOTENBERG_USERNAME
const GOTENBERG_PASSWORD = process.env.GOTENBERG_PASSWORD

/**
 * Converts HTML string to PDF using Gotenberg
 * 
 * @param html - The HTML string to convert
 * @returns Promise<Buffer> - The PDF buffer
 */
export async function convertHTMLToPDF(html: string): Promise<Buffer> {
  // Validate Gotenberg URL is configured
  if (!GOTENBERG_URL) {
    throw new Error('GOTENBERG_URL environment variable is not set. Please configure it in your environment variables.')
  }

  // Create FormData for Gotenberg API
  // In Node.js, we need to use the form-data library or create multipart/form-data manually
  // For simplicity, we'll use the built-in FormData (available in Node.js 18+)
  const formData = new FormData()
  const htmlBlob = new Blob([html], { type: 'text/html' })
  formData.append('files', htmlBlob, 'index.html')

  const endpoint = `${GOTENBERG_URL}/forms/chromium/convert/html`

  // Prepare headers with Basic Auth if credentials are provided
  const headers: HeadersInit = {}
  
  if (GOTENBERG_USERNAME && GOTENBERG_PASSWORD) {
    // Create Basic Auth header: base64 encode "username:password"
    const credentials = Buffer.from(`${GOTENBERG_USERNAME}:${GOTENBERG_PASSWORD}`).toString('base64')
    headers['Authorization'] = `Basic ${credentials}`
  }

  // Add timeout to prevent hanging requests
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Gotenberg conversion failed: ${response.status} ${response.statusText} - ${errorText}. ` +
        `Endpoint: ${endpoint}`
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)
    return pdfBuffer
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.name === 'AbortError') {
        throw new Error(
          `Gotenberg request timed out after 30 seconds. ` +
          `Please check if Gotenberg is running and accessible at: ${endpoint}`
        )
      }
      
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error(
          `Cannot connect to Gotenberg service at ${endpoint}. ` +
          `Please verify: 1) Gotenberg is running, 2) GOTENBERG_URL environment variable is set correctly, ` +
          `3) The service is accessible from this server. ` +
          `Current GOTENBERG_URL: ${GOTENBERG_URL}`
        )
      }
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error(
          `Gotenberg authentication failed. ` +
          `Please set GOTENBERG_USERNAME and GOTENBERG_PASSWORD environment variables. ` +
          `Gotenberg is configured with basic auth enabled.`
        )
      }
      
      throw new Error(`Failed to convert HTML to PDF: ${error.message}`)
    }
    throw new Error('Failed to convert HTML to PDF: Unknown error')
  }
}

