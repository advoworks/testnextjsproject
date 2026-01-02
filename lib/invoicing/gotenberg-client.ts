/**
 * Gotenberg client for converting HTML to PDF
 */

// Hardcoded Gotenberg URL as per requirements
const GOTENBERG_URL = 'http://gotenberg-csk8sc0g48ck0gwcs4kkc448:3000'

/**
 * Converts HTML string to PDF using Gotenberg
 * 
 * @param html - The HTML string to convert
 * @returns Promise<Buffer> - The PDF buffer
 */
export async function convertHTMLToPDF(html: string): Promise<Buffer> {

  // Create FormData for Gotenberg API
  // In Node.js, we need to use the form-data library or create multipart/form-data manually
  // For simplicity, we'll use the built-in FormData (available in Node.js 18+)
  const formData = new FormData()
  const htmlBlob = new Blob([html], { type: 'text/html' })
  formData.append('files', htmlBlob, 'index.html')

  try {
    const response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gotenberg conversion failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)
    return pdfBuffer
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert HTML to PDF: ${error.message}`)
    }
    throw new Error('Failed to convert HTML to PDF: Unknown error')
  }
}

