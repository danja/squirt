// src/js/app.js
// Import core dependencies
import { setupForms } from './ui/components/forms.js';
import { initializeRouter } from './router.js';
import { endpointManager } from './services/sparql/endpoints.js';
import { state } from './core/state.js';
import { ErrorHandler } from './core/errors.js';
import { initializeNotifications } from './ui/components/notifications.js';
import { initializeSettingsView } from './ui/views/settings.js';
import { VIEWS } from './core/views.js';
import { pluginManager } from './core/plugin-manager.js';

// Import CSS
import '../css/styles.css';
import '../css/form-styles.css';
import '../css/yasgui-styles.css';
import '../css/layout-fixes.css';
import '../css/mobile-fixes.css';
import '../css/plugin-styles.css';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeApp();
  } catch (error) {
    ErrorHandler.handle(error);
  }
});

/**
 * Initialize the application
 */
async function initializeApp() {
  console.log('Initializing application...');

  try {
    // Set up the application structure
    setupStructure();
    setupNavigation();
    setupHamburgerMenu();
    setupResponsiveNavigation();

    // Initialize notifications system
    initializeNotifications();

    // Initialize UI components
    setupForms();

    // Initialize the plugin manager
    initializePluginSystem();

    // Register plugins
    registerPlugins();

    // Initialize view-specific components
    initializeSettingsView();

    // Initialize routing
    initializeRouter();

    // Initialize services
    await endpointManager.initialize();

    // Register service worker for PWA support
    registerServiceWorker();

    // Check for share target (for mobile devices)
    checkForShareTarget();

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
    ErrorHandler.handle(error);
  }
}

/**
 * Set up the application structure
 */
function setupStructure() {
  const main = document.querySelector('main');
  if (!main) {
    throw new Error('Main element not found');
  }

  // Create any missing view containers
  Object.values(VIEWS).forEach(viewId => {
    if (!document.getElementById(viewId)) {
      const view = document.createElement('div');
      view.id = viewId;
      view.classList.add('view', 'hidden');
      main.appendChild(view);
    }
  });

  // Create plugin containers in each view that needs plugins
  const pluginViews = {
    'wiki-view': 'Wiki',
    'yasgui-view': 'SPARQL Query Editor'
  };

  Object.entries(pluginViews).forEach(([viewId, title]) => {
    const view = document.getElementById(viewId);
    if (view) {
      // Clear existing content for plugin views
      view.innerHTML = '';

      // Create a title and plugin container
      const heading = document.createElement('h2');
      heading.textContent = title;
      view.appendChild(heading);

      const pluginContainer = document.createElement('div');
      pluginContainer.id = `plugin-container-${viewId}`;
      pluginContainer.className = 'plugin-container';
      view.appendChild(pluginContainer);

      console.log(`Created plugin container for ${viewId}`);
    }
  });
}

/**
 * Initialize plugin system
 */
function initializePluginSystem() {
  // Initialize the plugin manager with the main content area
  const mainElement = document.querySelector('main');
  if (!mainElement) {
    throw new Error('Main element not found');
  }

  pluginManager.initialize(mainElement);
}

/**
 * Register application plugins
 */
function registerPlugins() {
  console.log('Registering plugins...');

  // Register YASGUI plugin
  pluginManager.register('yasgui', 'yasgui-view', {
    title: 'SPARQL Query Editor',
    loader: () => {
      console.log('Dynamically loading YASGUI plugin...');
      return import(/* webpackChunkName: "yasgui-plugin" */ './plugins/yasgui-plugin.js');
    }
  });

  // Register Wiki plugin
  pluginManager.register('wiki', 'wiki-view', {
    title: 'Wiki Editor',
    loader: () => {
      console.log('Dynamically loading Wiki plugin...');
      return import(/* webpackChunkName: "wiki-plugin" */ './plugins/wiki-plugin.js');
    }
  });

  // Manually trigger loading of plugin if we're already on that view
  const currentView = state.get('currentView');
  if (currentView && pluginManager.viewMap[currentView]) {
    setTimeout(() => {
      console.log(`Initializing plugin for current view: ${currentView}`);
      pluginManager.loadPlugin(pluginManager.viewMap[currentView]);
    }, 100);
  }
}

/**
 * Set up navigation links
 */
function setupNavigation() {
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = e.target.getAttribute('data-view');
      if (viewId) {
        window.location.hash = viewId.replace('-view', '');

        // If we have a hamburger menu, close it when navigating
        const menu = document.querySelector('.hamburger-menu');
        if (menu && menu.classList.contains('active')) {
          menu.classList.remove('active');
          document.querySelector('nav').classList.remove('visible');
        }
      }
    });
  });
}

/**
 * Setup responsive navigation for mobile and desktop
 */
function setupResponsiveNavigation() {
  // Active nav highlighting
  function setActiveNavItem(viewId) {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Add setActiveNavItem when route changes
  document.addEventListener('routeChange', (e) => {
    if (e.detail && e.detail.to) {
      setActiveNavItem(e.detail.to);
    }
  });

  // Initial active state based on current view
  const currentView = window.location.hash.slice(1) || 'post';
  setActiveNavItem(`${currentView}-view`);

  // Add theme detection code
  function setThemeBasedOnPreference() {
    const savedTheme = localStorage.getItem('squirt_theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (savedTheme === 'system' || !savedTheme) {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }

      // Listen for system preference changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        const theme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
      });
    }
  }

  // Initialize theme
  setThemeBasedOnPreference();

  // Add theme selector functionality
  const themeSelector = document.getElementById('theme-selector');
  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      localStorage.setItem('squirt_theme', selectedTheme);

      if (selectedTheme === 'system') {
        setThemeBasedOnPreference();
      } else {
        document.documentElement.setAttribute('data-theme', selectedTheme);
      }
    });
  }
}

/**
 * Set up hamburger menu for mobile devices
 */
function setupHamburgerMenu() {
  // Check if hamburger button already exists
  if (document.querySelector('.hamburger-button')) return;

  // Create hamburger button
  const hamburgerButton = document.createElement('button');
  hamburgerButton.className = 'hamburger-button';
  hamburgerButton.setAttribute('aria-label', 'Menu');
  hamburgerButton.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  // Add button to header
  const header = document.querySelector('header');
  if (header) {
    // Add menu wrapper with class for styling
    const menuWrapper = document.createElement('div');
    menuWrapper.className = 'hamburger-menu';
    menuWrapper.appendChild(hamburgerButton);
    header.appendChild(menuWrapper);

    // Add toggle functionality
    hamburgerButton.addEventListener('click', () => {
      menuWrapper.classList.toggle('active');
      document.querySelector('nav').classList.toggle('visible');
    });
  }
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

/**
 * Check if the app was launched from a share target
 */
function checkForShareTarget() {
  // Check URL parameters for shared content
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('text') || urlParams.has('url') || urlParams.has('title')) {
    const form = document.getElementById('post-form');
    if (form) {
      // If there's a URL, use the link post type
      if (urlParams.has('url')) {
        const typeSelector = form.querySelector('[name="post-type"]');
        if (typeSelector) {
          typeSelector.value = 'link';

          // Set the URL field
          setTimeout(() => {
            const urlField = form.querySelector('[name="url"]');
            if (urlField) {
              urlField.value = urlParams.get('url');
            }
          }, 100);
        }
      }

      // Set the title if provided
      if (urlParams.has('title')) {
        setTimeout(() => {
          const titleField = form.querySelector('[name="title"]');
          if (titleField) {
            titleField.value = urlParams.get('title');
          }
        }, 100);
      }

      // Set the content field if provided
      if (urlParams.has('text')) {
        setTimeout(() => {
          const contentField = form.querySelector('[name="content"]');
          if (contentField) {
            contentField.value = urlParams.get('text');
          }
        }, 100);
      }

      // Switch to post view
      window.location.hash = 'post';
    }
  }
}