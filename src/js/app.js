// src/js/app.js - Updated with plugin system
// Import dependencies with ES module syntax
import { setupForms } from './ui/components/forms.js';
import { initializeRouter } from './router.js';
import { endpointManager } from './services/sparql/endpoints.js'; // Import singleton
import { state } from './core/state.js';
import { ErrorHandler } from './core/errors.js';
import { rdfModel } from './services/rdf/rdf-model.js';
import { initializeNotifications } from './ui/components/notifications.js';
import { initializeSettingsView } from './ui/views/settings.js';
import { VIEWS } from './core/views.js';

// Import Plugin System
import { pluginManager } from './core/plugin-manager.js';
import { YasguiPlugin, WikiPlugin } from './plugins/index.js';

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

// Also reinitialize endpoints when visibility changes (for page revisits)
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    console.log('Page visibility changed to visible, reinitializing endpoints');
    try {
      // Reinitialize endpoints to force reload from config
      await endpointManager.initialize();
    } catch (error) {
      ErrorHandler.handle(error);
    }
  }
});

/**
 * Initialize the application
 */
async function initializeApp() {
  console.log('Initializing application...');

  try {
    // Set up the application structure
    setupViews();
    setupNavigation();
    setupHamburgerMenu();
    setupResponsiveNavigation();

    // Initialize notifications system
    initializeNotifications();

    // Initialize UI components
    setupForms();

    // Initialize view-specific components
    initializeSettingsView();

    // Initialize routing
    initializeRouter();

    // Initialize services - use the singleton instance
    await endpointManager.initialize();

    // Initialize plugins
    await initializePlugins();

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
 * Initialize and register plugins
 */
async function initializePlugins() {
  try {
    console.log('Initializing plugins...');

    // Register YASGUI plugin
    const yasguiPlugin = new YasguiPlugin();
    pluginManager.register(VIEWS.YASGUI, yasguiPlugin);

    // Register Wiki plugin
    const wikiPlugin = new WikiPlugin();
    pluginManager.register(VIEWS.WIKI, wikiPlugin);

    // Initialize all plugins
    await pluginManager.initializeAll();

    console.log('Plugins initialized successfully');
  } catch (error) {
    console.error('Error initializing plugins:', error);
    ErrorHandler.handle(error);
  }
}

/**
 * Set up application views
 */
function setupViews() {
  const main = document.querySelector('main');
  if (!main) {
    throw new Error('Main element not found');
  }

  // Create any missing view containers
  Object.values(VIEWS).forEach(viewId => {
    if (typeof viewId !== 'string' || !viewId.endsWith('-view')) {
      throw new Error(`Invalid view ID format: ${viewId}`);
    }

    if (!document.getElementById(viewId)) {
      const view = document.createElement('div');
      view.id = viewId;
      view.classList.add('view', 'hidden');
      main.appendChild(view);
    }

    // Ensure each view has a plugin section
    const view = document.getElementById(viewId);
    if (!view.querySelector('.plugins-section')) {
      const pluginsSection = document.createElement('div');
      pluginsSection.className = 'plugins-section';
      view.appendChild(pluginsSection);
    }
  });

  // Prepare YASGUI view
  const yasguiView = document.getElementById(VIEWS.YASGUI);
  if (yasguiView) {
    // Clear existing content (will be replaced by plugin)
    const existingContent = yasguiView.querySelector('#yasgui-container');
    if (existingContent) {
      existingContent.remove();
    }

    // Update structure
    if (!yasguiView.querySelector('h2')) {
      yasguiView.innerHTML = `
        <h2>SPARQL Query Editor</h2>
        <div class="plugins-section"></div>
      `;
    }
  }

  // Prepare Wiki view
  const wikiView = document.getElementById(VIEWS.WIKI);
  if (wikiView) {
    // Clear existing content (will be replaced by plugin)
    const existingContent = wikiView.querySelector('.wiki-editor, .wiki-entries');
    if (existingContent) {
      existingContent.remove();
    }

    // Update structure
    if (!wikiView.querySelector('h2')) {
      wikiView.innerHTML = `
        <h2>Wiki</h2>
        <div class="plugins-section"></div>
      `;
    }
  }

  // Add profile view content if it doesn't exist
  const profileView = document.getElementById(VIEWS.PROFILE);
  if (profileView && profileView.children.length === 0) {
    profileView.innerHTML = `
      <h2>Profile</h2>
      <form id="profile-form" class="form-group">
        <div class="form-field">
          <label for="profile-name">Name</label>
          <input type="text" id="profile-name" name="name">
        </div>
        <div class="form-field">
          <label for="profile-email">Email</label>
          <input type="email" id="profile-email" name="email">
        </div>
        <div class="form-field">
          <label for="profile-bio">Bio</label>
          <textarea id="profile-bio" name="bio"></textarea>
        </div>
        <button type="submit">Save Profile</button>
      </form>
    `;
  }

  // Add storage section to settings view if it doesn't exist
  const settingsView = document.getElementById(VIEWS.SETTINGS);
  if (settingsView && !settingsView.querySelector('.storage-section')) {
    const storageSection = document.createElement('div');
    storageSection.className = 'settings-section storage-section';
    storageSection.innerHTML = `
      <h3>Storage</h3>
      <div id="storage-usage">Calculating storage usage...</div>
    `;
    settingsView.appendChild(storageSection);
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
  // Setup hamburger menu toggle
  const hamburgerButton = document.querySelector('.hamburger-button');
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  const nav = document.querySelector('nav');

  if (hamburgerButton && hamburgerMenu && nav) {
    hamburgerButton.addEventListener('click', () => {
      hamburgerMenu.classList.toggle('active');
      nav.classList.toggle('visible');
    });

    // Close menu when clicking on a link
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburgerMenu.classList.remove('active');
        nav.classList.remove('visible');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!hamburgerMenu.contains(event.target) && !nav.contains(event.target)) {
        hamburgerMenu.classList.remove('active');
        nav.classList.remove('visible');
      }
    });
  }

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

    // Add CSS if not already present
    if (!document.getElementById('hamburger-style')) {
      const style = document.createElement('style');
      style.id = 'hamburger-style';
      style.textContent = `
        .hamburger-menu {
          display: none;
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
          .hamburger-menu {
            display: block;
            position: relative;
            z-index: 100;
          }
          
          .hamburger-button {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 24px;
            padding: 0;
            width: 30px;
          }
          
          .hamburger-button span {
            background-color: var(--text-color);
            border-radius: 3px;
            display: block;
            height: 3px;
            transition: all 0.3s ease;
            width: 100%;
          }
          
          .hamburger-menu.active .hamburger-button span:nth-child(1) {
            transform: translateY(10px) rotate(45deg);
          }
          
          .hamburger-menu.active .hamburger-button span:nth-child(2) {
            opacity: 0;
          }
          
          .hamburger-menu.active .hamburger-button span:nth-child(3) {
            transform: translateY(-10px) rotate(-45deg);
          }
          
          nav {
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: none;
            flex-direction: column;
            gap: 0;
            left: 0;
            position: absolute;
            top: 100%;
            width: 100%;
          }
          
          nav.visible {
            display: flex;
          }
          
          nav a {
            border-bottom: 1px solid #eee;
            padding: 1rem;
            text-align: center;
          }
        }
      `;
      document.head.appendChild(style);
    }
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
  // Check if this is a PWA launch with share data
  if (window.launchQueue) {
    window.launchQueue.setConsumer(async params => {
      if (params.files && params.files.length) {
        // Handle shared files
        const file = params.files[0];
        // Depending on the file type, process accordingly
        if (file.type.includes('text')) {
          const text = await file.text();
          // Pre-fill the post form
          const contentField = document.getElementById('content-field');
          if (contentField) {
            contentField.value = text;
          }
        }
      } else if (params.data && params.data.url) {
        // Handle shared URL
        const form = document.getElementById('post-form');
        const typeSelector = form.querySelector('[name="post-type"]');
        if (typeSelector) {
          typeSelector.value = 'link';
          updateFormFields(form, 'link');

          const urlField = form.querySelector('[name="url"]');
          if (urlField) {
            urlField.value = params.data.url;
          }

          if (params.data.title) {
            const titleField = form.querySelector('[name="title"]');
            if (titleField) {
              titleField.value = params.data.title;
            }
          }

          if (params.data.text) {
            const contentField = form.querySelector('[name="content"]');
            if (contentField) {
              contentField.value = params.data.text;
            }
          }
        }
      }

      // Switch to post view
      window.location.hash = 'post';
    });
  }

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
          // Make sure form fields are updated for link type
          if (typeof updateFormFields === 'function') {
            updateFormFields(form, 'link');
          }

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

// Add plugin-specific CSS
function addPluginStyles() {
  if (!document.getElementById('plugin-styles')) {
    const style = document.createElement('style');
    style.id = 'plugin-styles';
    style.textContent = `
      .plugins-section {
        width: 100%;
      }
      
      .plugin-container {
        width: 100%;
        margin-bottom: 1.5rem;
      }
      
      /* Wiki Plugin Styles */
      .wiki-plugin {
        width: 100%;
      }
      
      .wiki-editor {
        background: var(--card-background);
        padding: var(--spacing-lg);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
        margin-bottom: var(--spacing-lg);
      }
      
      .editor-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 10px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
        padding: 5px;
      }
      
      .toolbar-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: none;
        background: transparent;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .toolbar-button:hover {
        background: #e0e0e0;
      }
      
      .toolbar-button i {
        font-size: 20px;
        color: #555;
      }
      
      .wiki-preview {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
      }
      
      .entries-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .entry-item {
        padding: 15px;
        margin-bottom: 15px;
        border: 1px solid #eee;
        border-radius: 4px;
        background: white;
      }
      
      .entry-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }
      
      .entry-actions button {
        padding: 5px 10px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .entry-detail {
        padding: 20px;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      /* YASGUI Plugin Styles */
      .yasgui-wrapper {
        min-height: 500px;
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }
}

// Call this function at application start
addPluginStyles();