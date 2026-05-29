import { commsAPI } from '../services/api'

/** Send a WhatsApp text message */
export async function sendWhatsApp(number, message) {
  const clean = String(number).replace(/\D/g, '')
  if (!clean) throw new Error('Invalid phone number')
  return commsAPI.sendChannel({
    channel: 'whatsapp',
    recipient: clean,
    body: message,
  })
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

export const WA_CONFIGURED = true
