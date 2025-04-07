import { eventBus, EVENTS } from './core/events/event-bus.js'
import { errorHandler } from './core/errors/index.js'
import { store } from './core/state/index.js'
import { storageService } from './services/storage/storage-service.js'
import { initRouter } from './ui/router.js'
import { initNotifications } from './ui/notifications/notifications.js'
import { pluginManager } from './core/plugin-manager.js'
import { initializeEndpointIndicator } from './ui/components/endpoint-indicator.js'

// Import styles
import './css/styles.css'
import './css/form-styles.css'
import './css/yasgui-styles.css'
import './css/layout-fixes.css'
import './css/mobile-fixes.css'
import './css/plugin-styles.css'

// Export namespaces for global usage
export const namespaces = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  dc: 'http://purl.org/dc/terms/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  squirt: 'http://purl.org/stuff/squirt/'
}

// Export services for global usage
export const services = {
  storage: storageService
}

/**
 * Initialize the application
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeApp() {
  try {
    console.log('Initializing application...')

    // Make services globally available
    window.services = services

    // Initialize UI components
    initNotifications()
    initRouter()

    // Initialize plugins
    await pluginManager.initializeAll()

    // Setup notifications
    setupNotifications()

    // Initialize endpoint status indicator
    initializeEndpointIndicator()

    // Setup mobile menu
    setupHamburgerMenu()

    // Register service worker for PWA functionality
    registerServiceWorker()

    console.log('Application initialized successfully')
    eventBus.emit(EVENTS.APP_INITIALIZED)

    return { success: true }
  } catch (error) {
    errorHandler.handle(error)
    return { success: false, error }
  }
}

/**
 * Setup global notification handling
 */
function setupNotifications() {
  // Find or create notifications container
  let container = document.querySelector('.notifications-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'notifications-container'
    document.body.appendChild(container)
  }

  // Create global showNotification function
  window.showNotification = (message, type = 'info', duration = 5000) => {
    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.textContent = message

    container.appendChild(notification)

    if (duration > 0) {
      setTimeout(() => {
        notification.classList.add('fade-out')
        setTimeout(() => notification.remove(), 300)
      }, duration)
    }

    return notification
  }

  // Subscribe to notification events
  eventBus.on(EVENTS.NOTIFICATION_SHOW, (data) => {
    window.showNotification(data.message, data.type, data.duration)
  })
}

/**
 * Setup hamburger menu for mobile navigation
 */
function setupHamburgerMenu() {
  const hamburgerButton = document.querySelector('.hamburger-button')
  const hamburgerMenu = document.querySelector('.hamburger-menu')
  const nav = document.querySelector('nav')

  if (hamburgerButton && nav) {
    hamburgerButton.addEventListener('click', () => {
      nav.classList.toggle('visible')
      if (hamburgerMenu) {
        hamburgerMenu.classList.toggle('active')
      }
    })
  }
}

/**
 * Register service worker for PWA functionality
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope)

          // Register background sync if available
          if ('SyncManager' in window) {
            registration.sync.register('sync-posts')
              .then(() => console.log('Background sync registered'))
              .catch(error => console.error('Background sync registration failed:', error))
          }

          // Register push notifications if available
          if ('PushManager' in window) {
            askNotificationPermission()
          }
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error)
        })
    })
  }
}

/**
 * Request notification permission for push notifications
 */
function askNotificationPermission() {
  // Check if permission already granted
  if (Notification.permission === 'granted') {
    console.log('Notification permission already granted')
    return
  }

  // Don't ask again if denied
  if (Notification.permission === 'denied') {
    console.warn('Notification permission was previously denied')
    return
  }

  // Ask permission after user interaction (required by browsers)
  document.addEventListener('click', function askPermission() {
    Notification.requestPermission()
      .then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted')
          // Remove listener after permission granted
          document.removeEventListener('click', askPermission)
        }
      })
  }, { once: false })
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeApp()
})