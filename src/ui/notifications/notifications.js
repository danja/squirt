// src/ui/notifications/notifications.js - Updated to use Redux-style store instead of deprecated StateManager
import { eventBus, EVENTS } from '../../core/events/event-bus.js'
import { store } from '../../core/state/index.js'
import { showNotification as showNotificationAction, hideNotification } from '../../core/state/actions.js'
import { getNotifications } from '../../core/state/selectors.js'

let notificationsContainer

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
 * Handle notification events
 * @param {Object} notification - Notification data
 */
function handleNotificationEvent(notification) {
  showNotification(
    notification.message,
    notification.type,
    notification.duration
  )
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
  const element = document.createElement('div')
  element.className = `notification ${notification.type}`
  element.dataset.id = notification.id
  element.textContent = notification.message

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

  notificationsContainer.appendChild(element)

  return element
}

// Convenience notification methods
export const showSuccess = (msg, duration) => showNotification(msg, 'success', duration)
export const showError = (msg, duration) => showNotification(msg, 'error', duration)
export const showInfo = (msg, duration) => showNotification(msg, 'info', duration)
export const showWarning = (msg, duration) => showNotification(msg, 'warning', duration)