// src/ui/notifications/notifications.js - Updated to use Redux-style store instead of deprecated StateManager
import { eventBus, EVENTS } from 'evb'
import { store } from '../../core/state/index.js'
import { showNotification as showNotificationAction, hideNotification } from '../../core/state/actions.js'
import { getNotifications } from '../../core/state/selectors.js'

let notificationsContainer
let notificationQueue = []
let isNotificationVisible = false

/**
 * Initialize the notifications system
 */
export function initNotifications() {
  console.log('Initializing notifications system')

  if (!notificationsContainer) {
    notificationsContainer = document.querySelector('.notifications-container')

    if (!notificationsContainer) {
      notificationsContainer = document.createElement('div')
      notificationsContainer.className = 'notifications-container'
      document.body.appendChild(notificationsContainer)
    }
  }

  // Subscribe to state changes to render notifications
  store.subscribe(renderNotifications)

  // Subscribe to notification events
  eventBus.on(EVENTS.NOTIFICATION_SHOW, handleNotificationEvent)

  // Make showNotification available globally
  window.showNotification = showNotification
}

/**
 * Show the next notification in the queue
 */
function showNextNotification() {
  if (isNotificationVisible || notificationQueue.length === 0) {
    return
  }

  const nextNotification = notificationQueue.shift()
  if (!nextNotification || typeof nextNotification.message !== 'string') {
    console.error('Invalid notification data:', nextNotification)
    return
  }

  const { message, type, duration } = nextNotification
  isNotificationVisible = true

  const id = showNotification(message, type, duration)

  // Hide the notification after the duration and show the next one
  setTimeout(() => {
    hideNotificationById(id)
    isNotificationVisible = false
    showNextNotification()
  }, duration)
}

/**
 * Handle notification events with queuing
 * @param {Object} notification - Notification data
 */
function handleNotificationEvent(notification) {
  // Defensive: ignore Redux state change payloads
  if (
    notification &&
    typeof notification === 'object' &&
    'action' in notification &&
    'state' in notification &&
    !('message' in notification)
  ) {
    console.warn('[notifications] Ignoring event bus payload that looks like a Redux state change:', notification)
    return
  }
  if (!notification || typeof notification.message !== 'string' || notification.message.trim() === '') {
    console.error('Invalid notification data received in handleNotificationEvent:', notification)
    return
  }

  notificationQueue.push(notification)
  showNextNotification()
}

/**
 * Show a notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, success, error, warning)
 * @param {number} duration - Duration in milliseconds (0 for persistent)
 * @returns {number} Notification ID
 */
export function showNotification(message, type = 'info', duration = 5000) {
  const id = Date.now()

  // If Redux store is available, use it
  if (typeof store.dispatch === 'function') {
    store.dispatch(showNotificationAction({
      id,
      message,
      type,
      duration,
      timestamp: new Date().toISOString()
    }))
  } else {
    console.warn('store.dispatch is not a function, falling back to direct DOM manipulation')

    const element = createNotificationElement({
      id,
      message,
      type,
      duration
    })

    if (duration > 0) {
      setTimeout(() => {
        element.classList.add('fade-out')
        setTimeout(() => element.remove(), 300)
      }, duration)
    }
  }

  return id
}

/**
 * Hide a notification by ID
 * @param {number} id - Notification ID
 */
export function hideNotificationById(id) {
  if (typeof store.dispatch === 'function') {
    store.dispatch(hideNotification(id))
  } else {
    const element = notificationsContainer.querySelector(`[data-id="${id}"]`)
    if (element) {
      element.classList.add('fade-out')
      setTimeout(() => element.remove(), 300)
    }
  }
}

/**
 * Render notifications from state
 */
function renderNotifications() {
  try {
    const notifications = getNotifications(store.getState())

    const existingElements = notificationsContainer.querySelectorAll('.notification')
    const existingIds = new Set()

    // Track existing notifications
    existingElements.forEach(element => {
      const id = parseInt(element.dataset.id, 10)
      existingIds.add(id)

      // Remove elements that no longer exist in state
      if (!notifications.find(n => n.id === id)) {
        element.classList.add('fade-out')
        setTimeout(() => element.remove(), 300)
      }
    })

    // Add new notifications
    notifications.forEach(notification => {
      if (!existingIds.has(notification.id)) {
        createNotificationElement(notification)
      }
    })
  } catch (error) {
    console.error('Error rendering notifications:', error)
  }
}

/**
 * Create a notification DOM element
 * @param {Object} notification - Notification data
 * @returns {HTMLElement} The notification element
 */
function createNotificationElement(notification) {
  console.debug('Creating notification element with data:', notification)

  const element = document.createElement('div')
  element.className = `notification ${notification.type}`
  element.dataset.id = notification.id

  // Ensure the message is valid
  if (typeof notification.message === 'string' && notification.message.trim() !== '') {
    element.textContent = notification.message
  } else {
    console.warn('Notification message is missing or invalid:', notification)
    element.textContent = 'Notification' // Fallback text
  }

  // Add close button for persistent notifications
  if (notification.duration === 0) {
    const closeButton = document.createElement('button')
    closeButton.className = 'notification-close'
    closeButton.innerHTML = '&times;'
    closeButton.addEventListener('click', () => {
      hideNotificationById(notification.id)
    })
    element.appendChild(closeButton)
  }

  // Append the notification to the container
  const container = document.getElementById('notification-container')
  if (!container) {
    console.error('Notification container not found in the DOM.')
    return element
  }
  container.appendChild(element)

  return element
}

// Convenience notification methods
export const showSuccess = (msg, duration) => showNotification(msg, 'success', duration)
export const showError = (msg, duration) => showNotification(msg, 'error', duration)
export const showInfo = (msg, duration) => showNotification(msg, 'info', duration)
export const showWarning = (msg, duration) => showNotification(msg, 'warning', duration)