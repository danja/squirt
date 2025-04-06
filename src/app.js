// src/app.js
import { eventBus, EVENTS } from './core/events/event-bus.js';
import { errorHandler } from './core/errors/index.js';
import { store } from './core/state/index.js';
import { createStorageService, storageService } from './services/storage/storage-service.js';
import { createSparqlService } from './services/sparql/sparql-service.js';
import { createEndpointsService } from './services/endpoints/endpoints-service.js';
import { createRDFService } from './services/rdf/rdf-service.js';
import { initRouter } from './ui/router.js';
import { initNotifications } from './ui/notifications/notifications.js';

// Import CSS
import './css/styles.css';
import './css/form-styles.css';
import './css/yasgui-styles.css';
import './css/layout-fixes.css';
import './css/mobile-fixes.css';

// Services container
const services = {};

/**
 * Initialize the application
 */
export async function initializeApp() {
  try {
    console.log('Initializing application...');

    // Load configuration
    const config = await loadConfig();

    // Initialize services
    await initializeServices(config);

    // Initialize UI
    initializeUI();

    // Register service worker for PWA support
    registerServiceWorker();

    console.log('Application initialized successfully');
    eventBus.emit(EVENTS.APP_INITIALIZED);

    return { success: true };
  } catch (error) {
    errorHandler.handle(error, {
      showToUser: true,
      context: 'Application initialization'
    });

    return {
      success: false,
      error
    };
  }
}

/**
 * Load application configuration
 */
async function loadConfig() {
  try {
    // Try to load from config.json
    const response = await fetch('./config.json');

    if (response.ok) {
      return await response.json();
    }

    console.warn('Could not load config.json, using default configuration');
    return getDefaultConfig();
  } catch (error) {
    console.warn('Error loading configuration:', error);
    return getDefaultConfig();
  }
}

/**
 * Get default configuration
 */
function getDefaultConfig() {
  return {
    endpoints: [
      {
        name: 'Local Query',
        type: 'query',
        url: 'http://localhost:4030/semem/query',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      },
      {
        name: 'Local Update',
        type: 'update',
        url: 'http://localhost:4030/semem/update',
        credentials: {
          user: 'admin',
          password: 'admin123'
        }
      }
    ]
  };
}

/**
 * Initialize all services
 */
async function initializeServices(config) {
  // Create storage service
  services.storage = storageService;

  // Create endpoints service
  services.endpoints = createEndpointsService(
    services.storage,
    config,
    testEndpoint
  );

  // Initialize endpoints
  await services.endpoints.initialize();

  // Create SPARQL service
  services.sparql = createSparqlService(
    (type) => services.endpoints.getActiveEndpoint(type)
  );

  // Create RDF service
  services.rdf = createRDFService(
    services.storage,
    services.sparql
  );

  // Make services globally available (for debugging and components)
  window.services = services;
}

/**
 * Test an endpoint
 */
async function testEndpoint(url, credentials) {
  if (!services.sparql) {
    // Create temporary SPARQL service if not available yet
    const tempService = createSparqlService(() => null);
    return tempService.testEndpoint(url, credentials);
  }

  return services.sparql.testEndpoint(url, credentials);
}

/**
 * Initialize UI components
 */
function initializeUI() {
  // Initialize router
  initRouter();

  // Initialize notifications system
  initNotifications();

  // Set up UI event listeners
  setupEventListeners();

  // Register UI components that need services
  registerUIComponents();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Listen for window visibility changes (for page revisits)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      console.log('Page visibility changed to visible, checking endpoints');
      if (services.endpoints) {
        services.endpoints.checkEndpointsHealth();
      }
    }
  });

  // Setup hamburger menu toggle
  const hamburgerButton = document.querySelector('.hamburger-button');
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  const nav = document.querySelector('nav');

  if (hamburgerButton && hamburgerMenu && nav) {
    hamburgerButton.addEventListener('click', () => {
      hamburgerMenu.classList.toggle('active');
      nav.classList.toggle('visible');
    });
  }
}

/**
 * Register UI components that need services
 */
function registerUIComponents() {
  // Components will be registered when their views are initialized
  // This happens through the router
}

/**
 * Register service worker for PWA support
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for testing
export { initializeApp, services };