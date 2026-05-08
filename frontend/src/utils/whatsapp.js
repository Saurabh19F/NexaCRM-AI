const BASE     = import.meta.env.VITE_WA_API_BASE    || 'https://aiadrika.in/api'
const INSTANCE = import.meta.env.VITE_WA_INSTANCE_ID || ''
const TOKEN    = import.meta.env.VITE_WA_ACCESS_TOKEN || ''

/** Send a WhatsApp text message */
export async function sendWhatsApp(number, message) {
  if (!INSTANCE || !TOKEN) throw new Error('WhatsApp credentials not set in .env')
  const clean = String(number).replace(/\D/g, '')
  if (!clean) throw new Error('Invalid phone number')
  const url = `${BASE}/send?number=${clean}&type=text&message=${encodeURIComponent(message)}&instance_id=${INSTANCE}&access_token=${TOKEN}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.status === 'error') throw new Error(data.message || `WhatsApp API error ${res.status}`)
  return data
}

/**
 * Fetch incoming messages — NOTE: aiadrika.in does not expose a browser-accessible
 * inbox endpoint (CORS / 500). Incoming messages are delivered via webhook to a backend.
 * This function is a no-op stub so the UI degrades gracefully.
 */
export async function fetchWhatsAppMessages(_number) {
  // Return empty — browser cannot poll aiadrika.in inbox due to CORS + missing endpoint.
  // Wire up a backend webhook receiver to push incoming messages into this app.
  return []
}

export const WA_CONFIGURED = !!(INSTANCE && TOKEN)
export const WA_INSTANCE   = INSTANCE
export const WA_TOKEN      = TOKEN
export const WA_BASE       = BASE
