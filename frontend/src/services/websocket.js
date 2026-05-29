/**
 * WebSocket service using STOMP over SockJS
 * Connects to Spring Boot WebSocket endpoint for real-time notifications
 */
import SockJS from 'sockjs-client'
import StompModule from 'stompjs/lib/stomp.js'
import { useAuthStore } from '../store/authStore'

const Stomp = StompModule?.Stomp ?? StompModule
const isLikelyJwt = (token) =>
  typeof token === 'string' &&
  token.split('.').length === 3 &&
  !token.includes(' ')

let stompClient = null
const subscriptions = new Map()
let reconnectTimer = null
let destroyed = false

export function connectWebSocket(onNotification) {
  destroyed = false
  try {
    const socket = new SockJS(import.meta.env.VITE_WS_URL ?? 'http://localhost:8080/ws')
    stompClient = Stomp.over(socket)

    // Silence STOMP debug logs in production
    stompClient.debug = import.meta.env.DEV ? console.log : () => {}

    const token = useAuthStore.getState().token
    const connectHeaders = isLikelyJwt(token) ? { Authorization: `Bearer ${token}` } : {}

    stompClient.connect(
      connectHeaders,
      () => {
        console.info('WebSocket connected')

        const sub1 = stompClient.subscribe('/user/queue/notifications', (msg) => {
          const notification = JSON.parse(msg.body)
          onNotification(notification)
        })

        const sub2 = stompClient.subscribe('/topic/notifications', (msg) => {
          const notification = JSON.parse(msg.body)
          onNotification(notification)
        })

        subscriptions.set('notifications', sub1)
        subscriptions.set('broadcast', sub2)
      },
      (error) => {
        console.error('WebSocket error:', error)
        if (!destroyed) {
          reconnectTimer = setTimeout(() => connectWebSocket(onNotification), 5000)
        }
      }
    )
  } catch (err) {
    console.error('WebSocket connection failed:', err)
  }
}

export function disconnectWebSocket() {
  destroyed = true
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  subscriptions.forEach((sub) => sub.unsubscribe())
  subscriptions.clear()
  if (stompClient?.connected) {
    stompClient.disconnect(() => console.info('WebSocket disconnected'))
  }
  stompClient = null
}

export function sendMessage(destination, body) {
  if (stompClient?.connected) {
    stompClient.send(destination, {}, JSON.stringify(body))
  }
}
