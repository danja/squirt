// src/ui/router.js - Updated to use Redux-style store instead of deprecated StateManager
import { eventBus, EVENTS } from 'evb'
import { errorHandler } from '../core/errors/index.js'
import { store } from '../core/state/index.js'
import { setCurrentView } from '../core/state/actions.js'
import { getCurrentView } from '../core/state/selectors.js'
import { viewPluginMap } from './views/settings-view.js'
import { pluginManager } from '../core/plugin-manager.js'
import pluginConfig from '../plugins.config.json' with { type: 'json' }

// Core View IDs (excluding plugin-contributed tabs)
const CORE_VIEWS = {
    POST: 'post-view',
    WIKI: 'wiki-view',
    CHAT: 'chat-view',
    PROFILE: 'profile-view',
    SETTINGS: 'settings-view'
}

// Core routes map (will be extended with plugin contributions)
const CORE_ROUTE_MAP = {
    'post': CORE_VIEWS.POST,
    'wiki': CORE_VIEWS.WIKI,
    'chat': CORE_VIEWS.CHAT,
    'profile': CORE_VIEWS.PROFILE,
    'settings': CORE_VIEWS.SETTINGS
}

// Tab order configuration - this defines the order of tabs in navigation
const TAB_ORDER = [
    'post',
    'chat', 
    'wiki',
    'draw',    // Plugin-contributed
    'turtle',  // Plugin-contributed
    'sparql',  // Plugin-contributed
    'graph',   // Plugin-contributed (renamed from 'graph' in Atuin to avoid conflicts)
    'profile',
    'settings'
]

// Dynamic VIEWS and ROUTE_MAP - will be populated with plugin contributions
let VIEWS = { ...CORE_VIEWS }
let ROUTE_MAP = { ...CORE_ROUTE_MAP }

// Core view module loaders
const CORE_VIEW_MODULES = {
    [CORE_VIEWS.POST]: () => import('./views/post-view.js'),
    [CORE_VIEWS.WIKI]: () => import('./views/wiki-view.js'),
    [CORE_VIEWS.CHAT]: () => import('./views/chat-view.js'),
    [CORE_VIEWS.PROFILE]: () => import('./views/profile-view.js'),
    [CORE_VIEWS.SETTINGS]: () => import('./views/settings-view.js')
}

// Dynamic VIEW_MODULES - will be populated with core + plugin modules
let VIEW_MODULES = { ...CORE_VIEW_MODULES }

/**
 * Initialize plugin contributions to routing system
 * This should be called after plugins are initialized
 */
function initializePluginContributions() {
    const contributions = pluginManager.getMainTabContributions()
    
    contributions.forEach(tab => {
        // Add to VIEWS
        VIEWS[tab.id.toUpperCase()] = tab.viewId
        
        // Add to ROUTE_MAP  
        ROUTE_MAP[tab.id] = tab.viewId
        
        // Add plugin tab module loader (these don't load traditional view modules)
        VIEW_MODULES[tab.viewId] = () => createPluginTabModule(tab)
    })
    
    console.log('Plugin contributions initialized:', contributions)
}

/**
 * Create a module-like object for plugin tab views
 * @param {Object} tab - Tab contribution object
 * @returns {Promise<Object>} Module with initView function
 */
async function createPluginTabModule(tab) {
    return {
        initView: () => {
            // For plugin tabs, we don't need to do anything here
            // The plugin manager handles activation via route changes
            return {
                update: () => {
                    // Plugin tab views are managed by the plugin manager
                    // This is just a placeholder to satisfy the view system
                }
            }
        }
    }
}

// Store active view handlers
const activeViewHandlers = {}

/**
 * Initialize the router
 */
export function initRouter() {
    // Initialize plugin contributions first
    initializePluginContributions()

    // Listen for hash changes
    window.addEventListener('hashchange', handleRouteChange)

    // Handle initial route
    handleRouteChange()

    // Setup navigation links
    setupNavLinks()
    
    // Re-render navigation with plugin contributions
    renderNavTabs()
}

/**
 * Handle route changes
 */
function handleRouteChange() {
    try {
        const hash = window.location.hash.slice(1) || 'post'
        const viewId = ROUTE_MAP[hash] || VIEWS.POST

        const currentView = getCurrentView(store.getState())

        // For plugin tabs, we need to always ensure they're mounted even if view hasn't changed
        const isPluginTab = pluginManager.getPluginTabInfo(viewId)
        
        // Skip if view hasn't changed (unless it's a plugin tab)
        if (currentView === viewId && !isPluginTab) {
            return
        }

        // Create and dispatch route change event
        const event = new CustomEvent('routeChange', {
            detail: {
                from: currentView,
                to: viewId
            },
            cancelable: true
        })

        // If event is cancelled, restore previous route
        if (!document.dispatchEvent(event)) {
            if (currentView) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === currentView)
                if (route) {
                    window.location.hash = route
                }
            }
            return
        }

        // Update state with new view
        store.dispatch(setCurrentView(viewId))

        // Show the selected view FIRST
        showView(viewId)

        // Initialize the view module  
        initializeView(viewId)

        // Update active nav link
        updateActiveNavLink(viewId)

        // Emit view change event
        eventBus.emit(EVENTS.VIEW_CHANGED, {
            from: currentView,
            to: viewId
        })
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Route change'
        })

        // Fallback to post view if error occurs
        if (window.location.hash !== '#post') {
            window.location.hash = 'post'
        }
    }
}

/**
 * Show the selected view, hide others
 * @param {string} viewId - ID of view to show
 */
function showView(viewId) {
    console.log(`[Router] showView called for: ${viewId}`)
    
    // Hide all core views
    Object.values(CORE_VIEWS).forEach(id => {
        const view = document.getElementById(id)
        if (view) {
            const wasHidden = view.classList.contains('hidden')
            view.classList.toggle('hidden', id !== viewId)
            const isHidden = view.classList.contains('hidden')
            if (wasHidden !== isHidden) {
                console.log(`[Router] View ${id}: ${wasHidden ? 'hidden' : 'visible'} -> ${isHidden ? 'hidden' : 'visible'}`)
            }
        }
    })
    
    // Hide all plugin-contributed views  
    const pluginContributions = pluginManager.getMainTabContributions()
    pluginContributions.forEach(tab => {
        const view = document.getElementById(tab.viewId)
        if (view) {
            const wasHidden = view.classList.contains('hidden')
            view.classList.toggle('hidden', tab.viewId !== viewId)
            const isHidden = view.classList.contains('hidden')
            if (wasHidden !== isHidden) {
                console.log(`[Router] Plugin view ${tab.viewId}: ${wasHidden ? 'hidden' : 'visible'} -> ${isHidden ? 'hidden' : 'visible'}`)
            }
            
            // Check if this view has plugin containers
            const containers = view.querySelectorAll('.plugin-tab-container')
            console.log(`[Router] View ${tab.viewId} has ${containers.length} plugin containers`)
            containers.forEach((container, index) => {
                console.log(`[Router] Container ${index} content length: ${container.innerHTML.length}`)
            })
        }
    })
}

/**
 * Initialize or update a view
 * @param {string} viewId - ID of view to initialize
 */
async function initializeView(viewId) {
    try {
        // For plugin tabs, skip view initialization as plugin manager handles it
        const isPluginTab = pluginManager.getPluginTabInfo(viewId)
        if (isPluginTab) {
            console.log(`[Router] Skipping view initialization for plugin tab: ${viewId}`)
            return
        }

        // If view is already initialized, just update it
        if (activeViewHandlers[viewId]) {
            if (typeof activeViewHandlers[viewId].update === 'function') {
                activeViewHandlers[viewId].update()
            }
            return
        }

        // Load the module for this view
        const moduleLoader = VIEW_MODULES[viewId]
        if (!moduleLoader) {
            console.warn(`No module defined for view ${viewId}`)
            return
        }

        // Load and initialize the view
        const module = await moduleLoader()

        if (typeof module.initView === 'function') {
            activeViewHandlers[viewId] = module.initView() || {}
        } else {
            console.warn(`No initView function in module for ${viewId}`)
            activeViewHandlers[viewId] = {}
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: `Initializing view ${viewId}`
        })
    }
}

/**
 * Update the active navigation link
 * @param {string} viewId - ID of active view
 */
function updateActiveNavLink(viewId) {
    document.querySelectorAll('nav a').forEach(link => {
        const linkViewId = link.getAttribute('data-view')
        link.classList.toggle('active', linkViewId === viewId)
    })
}

/**
 * Setup navigation link event handlers
 */
function setupNavLinks() {
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            const viewId = e.target.getAttribute('data-view')
            if (viewId) {
                const route = Object.keys(ROUTE_MAP).find(key => ROUTE_MAP[key] === viewId)
                if (route) {
                    window.location.hash = route
                }

                // Close mobile menu if open
                const menu = document.querySelector('.hamburger-menu')
                if (menu && menu.classList.contains('active')) {
                    menu.classList.remove('active')
                    document.querySelector('nav').classList.remove('visible')
                }
            }
        })
    })
}

function getEnabledPlugins() {
    let plugins = []
    try {
        const stored = localStorage.getItem('squirt.plugins')
        if (stored) {
            plugins = JSON.parse(stored)
        } else {
            plugins = pluginConfig.plugins || []
        }
    } catch (e) {
        plugins = pluginConfig.plugins || []
    }
    return plugins.filter(p => p.enabled)
}

function renderNavTabs() {
    const nav = document.querySelector('nav')
    if (!nav) return
    
    nav.innerHTML = ''
    
    // Build navigation tabs in the specified order
    const allTabs = []
    
    TAB_ORDER.forEach(routeKey => {
        // Check if it's a core tab
        if (CORE_ROUTE_MAP[routeKey]) {
            const viewId = CORE_ROUTE_MAP[routeKey]
            const label = getTabLabel(routeKey)
            allTabs.push({ routeKey, viewId, label, isPlugin: false })
        } else {
            // Check if it's a plugin-contributed tab
            const pluginContributions = pluginManager.getMainTabContributions()
            const pluginTab = pluginContributions.find(tab => tab.id === routeKey)
            if (pluginTab) {
                allTabs.push({ 
                    routeKey: routeKey, 
                    viewId: pluginTab.viewId, 
                    label: pluginTab.label,
                    isPlugin: true,
                    pluginId: pluginTab.pluginId
                })
            }
        }
    })
    
    // Render all tabs
    allTabs.forEach(({ routeKey, viewId, label, isPlugin }) => {
        const a = document.createElement('a')
        a.href = `#${routeKey}`
        a.setAttribute('data-view', viewId)
        a.textContent = label
        
        if (isPlugin) {
            a.classList.add('plugin-tab')
        }
        
        nav.appendChild(a)
    })
    
    console.log('Navigation tabs rendered:', allTabs)
}

/**
 * Get display label for a route key
 * @param {string} routeKey - Route key like 'post', 'turtle', etc.
 * @returns {string} Display label
 */
function getTabLabel(routeKey) {
    const labels = {
        'post': 'Post',
        'chat': 'Chat', 
        'wiki': 'Wiki',
        'turtle': 'Turtle',
        'sparql': 'SPARQL',
        'graph': 'Graph',
        'profile': 'Profile',
        'settings': 'Settings'
    }
    
    return labels[routeKey] || routeKey.charAt(0).toUpperCase() + routeKey.slice(1)
}

// Call renderNavTabs after DOMContentLoaded
if (typeof window !== 'undefined' && window.document) {
    document.addEventListener('DOMContentLoaded', renderNavTabs)
}

export { VIEWS, CORE_VIEWS, ROUTE_MAP, renderNavTabs, initializePluginContributions }