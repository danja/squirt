// src/app.js - Complete source with updated initialization
import { eventBus, EVENTS } from 'evb'
import { errorHandler } from './core/errors/index.js'
import { store } from './core/state/index.js'
import { storageService } from './services/storage/storage-service.js'
import { initRouter } from './ui/router.js'
import { initNotifications } from './ui/notifications/notifications.js'
import { pluginManager } from './core/plugin-manager.js'
import { initializeEndpointIndicator } from './ui/components/endpoint-indicator.js'
import pluginConfig from './plugins.config.json' with { type: 'json' }
import * as availablePlugins from './plugins/index.js'

// Import CSS files
import './css/styles.css'
import './css/form-styles.css'
import './css/yasgui-styles.css'
import './css/layout-fixes.css'
import './css/mobile-fixes.css'
import './css/plugin-styles.css'

// Define namespaces
export const namespaces = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  dc: 'http://purl.org/dc/terms/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  squirt: 'http://purl.org/stuff/squirt/'
}

// Export services for global use
export const services = {
  storage: storageService
}

/**
 * Register enabled plugins from config
 */
function registerEnabledPlugins() {
  if (!pluginConfig.plugins || !Array.isArray(pluginConfig.plugins)) return
  pluginConfig.plugins.forEach(({ id, enabled }) => {
    if (!enabled) return
    // Find plugin class by id (assume class name is PascalCase, e.g. YasguiPlugin)
    const pluginClass = Object.values(availablePlugins).find(
      Plugin => Plugin && new Plugin().id === id
    )
    if (pluginClass) {
      // Register plugin for a view (use id as viewId for now, or map as needed)
      pluginManager.register(id, new pluginClass(), {})
    } else {
      console.warn(`Plugin with id '${id}' not found in available plugins.`)
    }
  })
}

/**
 * Initialize the application
 * @returns {Promise<Object>} Result of initialization
 */
export async function initializeApp() {
  try {
    console.log('Initializing application...')

    // Make services globally available
    window.services = services

    // Initialize endpoints service
    import('./services/sparql/sparql.js').then(({ testEndpoint }) => {
      import('./services/endpoints/endpoints-service.js').then(({ createEndpointsService }) => {
        const endpointsService = createEndpointsService(services.storage, testEndpoint)
        services.endpoints = endpointsService

        // Initialize endpoints
        endpointsService.initialize().then(() => {
          console.log('Endpoints service initialized')
        }).catch(err => {
          console.error('Failed to initialize endpoints service:', err)
        })
      })
    })

    // Initialize UI components
    initNotifications()
    initRouter()

    // Register enabled plugins before initializing
    registerEnabledPlugins()

    // Initialize plugins
    await pluginManager.initializeAll()

    // Initialize endpoint indicator
    initializeEndpointIndicator()

    // Setup hamburger menu
    setupHamburgerMenu()

    // Register service worker
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
 * Register service worker for offline functionality
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
              .catch(error => {
                // Check for permission errors specifically
                if (error.name === 'NotAllowedError') {
                  console.warn('Background sync requires HTTPS in production. This error is expected during development.', error)
                } else {
                  console.error('Background sync registration failed:', error)
                }
              })
          } else {
            console.log('Background sync not supported in this browser')
          }

          // Setup push notifications if available
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
 * Request notification permission
 */
function askNotificationPermission() {
  // Skip if already granted
  if (Notification.permission === 'granted') {
    console.log('Notification permission already granted')
    return
  }

  // Warn if previously denied
  if (Notification.permission === 'denied') {
    console.warn('Notification permission was previously denied')
    return
  }

  // Ask on user interaction
  document.addEventListener('click', function askPermission() {
    Notification.requestPermission()
      .then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted')
          document.removeEventListener('click', askPermission)
        }
      })
  }, { once: false })
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check for share target request before initializing the app
  if (window.location.pathname === '/share-target') {
    const params = new URLSearchParams(window.location.search)
    const sharedUrl = params.get('url')
    const sharedTitle = params.get('title')
    const sharedText = params.get('text')

    if (sharedUrl || sharedTitle || sharedText) {
      // Emit an event with the shared data
      eventBus.emit(EVENTS.SHARE_RECEIVED, {
        url: sharedUrl,
        title: sharedTitle,
        text: sharedText
      })

      // Redirect to the main app view (hash router will take over)
      window.location.replace('/')
      return // Don't initialize the app on the share-target page itself
    }
  }

  // Initialize the app normally
  initializeApp()
})