// src/ui/notifications/notifications.js
import { eventBus, EVENTS } from '../../core/events/event-bus.js'
import { store } from '../../core/state/index.js'
import { showNotification as showNotificationAction, hideNotification } from '../../core/state/actions.js'
import { getNotifications } from '../../core/state/selectors.js'

let notificationsContainer

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

  store.subscribe(renderNotifications)

  eventBus.on(EVENTS.NOTIFICATION_SHOW, handleNotificationEvent)

  window.showNotification = showNotification
}

function handleNotificationEvent(notification) {
  showNotification(
    notification.message,
    notification.type,
    notification.duration
  )
}

export function showNotification(message, type = 'info', duration = 5000) {
  const id = Date.now()

  // Check if store.dispatch is a function before calling it
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
    // Fallback to direct DOM manipulation
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

function renderNotifications() {
  try {
    const notifications = getNotifications(store.getState())

    const existingElements = notificationsContainer.querySelectorAll('.notification')
    const existingIds = new Set()

    existingElements.forEach(element => {
      const id = parseInt(element.dataset.id, 10)
      existingIds.add(id)

      if (!notifications.find(n => n.id === id)) {
        element.classList.add('fade-out')
        setTimeout(() => element.remove(), 300)
      }
    })

    notifications.forEach(notification => {
      if (!existingIds.has(notification.id)) {
        createNotificationElement(notification)
      }
    })
  } catch (error) {
    console.error('Error rendering notifications:', error)
  }
}

function createNotificationElement(notification) {
  const element = document.createElement('div')
  element.className = `notification ${notification.type}`
  element.dataset.id = notification.id
  element.textContent = notification.message

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

export const showSuccess = (msg, duration) => showNotification(msg, 'success', duration)
export const showError = (msg, duration) => showNotification(msg, 'error', duration)
export const showInfo = (msg, duration) => showNotification(msg, 'info', duration)
export const showWarning = (msg, duration) => showNotification(msg, 'warning', duration)