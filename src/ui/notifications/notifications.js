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

  // Find or create notifications container
  if (!notificationsContainer) {
    notificationsContainer = document.querySelector('.notifications-container')

    if (!notificationsContainer) {
      notificationsContainer = document.createElement('div')
      notificationsContainer.className = 'notifications-container'
      document.body.appendChild(notificationsContainer)
    }
  }

  // Subscribe to store changes to render notifications
  store.subscribe(renderNotifications)

  // Subscribe to notification show events
  eventBus.on(EVENTS.NOTIFICATION_SHOW, handleNotificationEvent)

  // Create global notification function
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
 * @param {string} type - Notification type ('info', 'success', 'error', 'warning')
 * @param {number} duration - Duration in ms (0 for persistent)
 * @returns {number} Notification ID
 */
export function showNotification(message, type = 'info', duration = 5000) {
  const id = Date.now()

  // Add notification to store
  store.dispatch(showNotificationAction({
    id,
    message,
    type,
    duration,
    timestamp: new Date().toISOString()
  }))

  // Set timeout to auto-hide notification
  if (duration > 0) {
    setTimeout(() => {
      store.dispatch(hideNotification(id))
    }, duration)
  }

  return id
}

/**
 * Hide a notification by ID
 * @param {number} id - Notification ID
 */
export function hideNotificationById(id) {
  store.dispatch(hideNotification(id))
}

/**
 * Render notifications from store
 */
function renderNotifications() {
  const notifications = getNotifications(store.getState())

  // Find existing notification elements
  const existingElements = notificationsContainer.querySelectorAll('.notification')
  const existingIds = new Set()

  existingElements.forEach(element => {
    const id = parseInt(element.dataset.id, 10)
    existingIds.add(id)

    // Remove elements that are no longer in the store
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
}

/**
 * Create a notification DOM element
 * @param {Object} notification - Notification data
 * @returns {HTMLElement} Notification element
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

  // Add to container
  notificationsContainer.appendChild(element)

  return element
}

// Helper functions for common notification types
export const showSuccess = (msg, duration) => showNotification(msg, 'success', duration)
export const showError = (msg, duration) => showNotification(msg, 'error', duration)
export const showInfo = (msg, duration) => showNotification(msg, 'info', duration)
export const showWarning = (msg, duration) => showNotification(msg, 'warning', duration)