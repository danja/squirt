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
    
    // Find plugin class by id
    const pluginClass = Object.values(availablePlugins).find(
      Plugin => {
        try {
          // Create a temporary instance to check the id
          const tempInstance = new Plugin()
          return tempInstance.id === id
        } catch (error) {
          console.warn(`Error checking plugin ${Plugin.name}:`, error)
          return false
        }
      }
    )
    
    if (pluginClass) {
      try {
        const pluginInstance = new pluginClass()
        
        // For plugins that provide main tabs, register them differently
        const mainTabContributions = pluginInstance.getMainTabContributions()
        if (mainTabContributions.length > 0) {
          // Register plugin without a specific view since it contributes to main tabs
          pluginManager.register(null, pluginInstance, {
            providesMainTabs: true
          })
          console.log(`Registered main tab provider plugin: ${id}`)
        } else {
          // Traditional plugin registration for a specific view
          pluginManager.register(`${id}-view`, pluginInstance, {})
          console.log(`Registered view plugin: ${id}`)
        }
      } catch (error) {
        console.error(`Failed to register plugin ${id}:`, error)
      }
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

    // Register enabled plugins before initializing
    registerEnabledPlugins()

    // Initialize plugins
    await pluginManager.initializeAll()

    // Initialize router AFTER plugins are ready (needed for plugin tab contributions)
    initRouter()

    // Initialize endpoint indicator
    initializeEndpointIndicator()

    // Setup hamburger menu
    setupHamburgerMenu()

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
 * Directly populate post form fields with shared data
 */
function populatePostForm(data) {
  console.log('Directly populating post form with:', data)
  
  const urlInput = document.getElementById('url')
  const titleInput = document.getElementById('title')
  const contentInput = document.getElementById('content')
  const postTypeSelect = document.getElementById('post-type')

  if (data.url && urlInput) {
    urlInput.value = data.url
    console.log('Set URL field to:', data.url)
    if (postTypeSelect && postTypeSelect.value !== 'link') {
      postTypeSelect.value = 'link'
      postTypeSelect.dispatchEvent(new Event('change'))
      console.log('Switched to link post type')
    }
  }
  if (data.title && titleInput) {
    titleInput.value = data.title
    console.log('Set title field to:', data.title)
  }
  if (data.text && contentInput && !data.url) {
    contentInput.value = data.text
    console.log('Set content field to:', data.text)
    if (postTypeSelect && postTypeSelect.value !== 'entry') {
      postTypeSelect.value = 'entry'
      postTypeSelect.dispatchEvent(new Event('change'))
      console.log('Switched to entry post type')
    }
  }
}

/**
 * Register service worker for PWA functionality
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
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
  if (window.location.pathname.endsWith('/share-target')) {
    const params = new URLSearchParams(window.location.search)
    const sharedUrl = params.get('url')
    const sharedTitle = params.get('title')
    const sharedText = params.get('text')

    if (sharedUrl || sharedTitle || sharedText) {
      console.log('Share target received:', { url: sharedUrl, title: sharedTitle, text: sharedText })
      
      // Store shared data for later use
      sessionStorage.setItem('sharedData', JSON.stringify({
        url: sharedUrl,
        title: sharedTitle,
        text: sharedText
      }))

      // Redirect to the main app post view
      window.location.replace('/#post')
      return // Don't initialize the app on the share-target page itself
    }
  }

  // Register service worker for PWA
  registerServiceWorker()

  // Initialize the app normally
  initializeApp().then(() => {
    // Function to check and emit shared data
    const checkAndEmitSharedData = () => {
      const sharedData = sessionStorage.getItem('sharedData')
      if (sharedData) {
        try {
          const data = JSON.parse(sharedData)
          console.log('Found stored shared data:', data)
          sessionStorage.removeItem('sharedData') // Clean up
          
          // Emit the share event with increased delay to ensure views are ready
          setTimeout(() => {
            console.log('Emitting stored share data:', data)
            eventBus.emit(EVENTS.SHARE_RECEIVED, data)
            
            // Also directly populate form fields as fallback
            populatePostForm(data)
          }, 500)
        } catch (error) {
          console.error('Error parsing shared data:', error)
        }
      }
    }

    // Check immediately after app init
    checkAndEmitSharedData()
    
    // Also listen for hash changes to handle cases where the post view loads after the check
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#post') {
        setTimeout(() => {
          checkAndEmitSharedData()
          // Also try direct form population as backup
          const sharedData = sessionStorage.getItem('sharedData')
          if (sharedData) {
            try {
              const data = JSON.parse(sharedData)
              sessionStorage.removeItem('sharedData')
              setTimeout(() => populatePostForm(data), 200)
            } catch (error) {
              console.error('Error in hash change handler:', error)
            }
          }
        }, 200)
      }
    })
  })
})