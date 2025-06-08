import { eventBus, EVENTS } from 'evb'
import { errorHandler } from '../../core/errors/index.js'
import { store } from '../../core/state/index.js'
import { setEndpoints, addEndpoint, removeEndpoint, updateEndpoint } from '../../core/state/actions.js'
import { getEndpoints } from '../../core/state/selectors.js'
import { showNotification } from '../notifications/notifications.js'
import { RDFModel } from '../../domain/rdf/model.js'
import pluginConfig from '../../plugins.config.json' with { type: 'json' }
import { renderNavTabs } from '../router.js'
import { pluginManager } from '../../core/plugin-manager.js'

/**
 * Initialize the Settings view
 * @returns {Object} View handler with update and cleanup methods
 */
export function initView() {
    try {
        console.log('Initializing Settings view')

        const view = document.getElementById('settings-view')
        if (!view) {
            throw new Error('Settings view element not found')
        }

        // Setup endpoints list with defaults
        setupEndpointsList()

        // Setup plugins list
        setupPluginsList()

        // Setup theme selector
        setupThemeSelector()

        // Setup storage management
        setupStorageManagement()

        return {
            update() {
                console.log('Updating Settings view')
                renderEndpointsList()
                updateStorageUsage()
            },

            cleanup() {
                console.log('Cleaning up Settings view')
                // Remove event listeners if needed
            }
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing Settings view'
        })

        return {}
    }
}

/**
 * Set up the endpoints list
 */
function setupEndpointsList() {
    const container = document.getElementById('endpoints-list')
    if (!container) {
        console.warn('Endpoints list container not found')
        return
    }

    // Add default endpoints if none exist
    addDefaultEndpoints()
    
    // Initial render
    renderEndpointsList()

    // Set up endpoint form
    const form = document.getElementById('endpoint-form')
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault()

            const label = document.getElementById('endpoint-label').value
            const url = document.getElementById('endpoint-url').value
            const type = document.querySelector('input[name="endpoint-type"]:checked')?.value || 'query'

            if (!url || !label) {
                showNotification('Both label and URL are required', 'error')
                return
            }

            try {
                // Add new endpoint to store
                store.dispatch(addEndpoint({
                    url,
                    label,
                    type,
                    status: 'unknown',
                    lastChecked: null
                }))

                // Clear form
                form.reset()

                showNotification('Endpoint added successfully', 'success')

                // Trigger endpoint check
                eventBus.emit(EVENTS.ENDPOINT_CHECK_REQUESTED)

            } catch (error) {
                errorHandler.handle(error, {
                    showToUser: true,
                    context: 'Adding endpoint'
                })
            }
        })
    }

    // Set up event delegation for endpoint actions
    container.addEventListener('click', async (e) => {
        const item = e.target.closest('.endpoint-item')
        if (!item) return

        const url = item.dataset.url

        try {
            // Check endpoint
            if (e.target.matches('.check-endpoint')) {
                checkEndpoint(url, item)
            }
            // Remove endpoint
            else if (e.target.matches('.remove-endpoint')) {
                if (confirm('Are you sure you want to remove this endpoint?')) {
                    store.dispatch(removeEndpoint(url))
                    showNotification('Endpoint removed', 'info')
                }
            }
            // Edit endpoint
            else if (e.target.matches('.edit-endpoint')) {
                toggleEditMode(item)
            }
            // Save endpoint changes
            else if (e.target.matches('.save-endpoint')) {
                saveEndpointChanges(item)
            }
        } catch (error) {
            errorHandler.handle(error, {
                showToUser: true,
                context: 'Endpoint action'
            })
        }
    })

    // Subscribe to store changes
    store.subscribe((state) => {
        renderEndpointsList()
    })
}

/**
 * Render the endpoints list
 */
function renderEndpointsList() {
    const container = document.getElementById('endpoints-list')
    if (!container) return

    const endpoints = getEndpoints(store.getState()) || []

    if (endpoints.length === 0) {
        container.innerHTML = '<p>No endpoints configured yet.</p>'
        return
    }

    container.innerHTML = endpoints.map(endpoint => `
        <div class="endpoint-item" data-url="${endpoint.url}">
            <div class="endpoint-info">
                <div class="endpoint-header">
                    <div class="endpoint-status ${endpoint.status || 'unknown'}"></div>
                    <div class="endpoint-details">
                        <span class="endpoint-label">${endpoint.label}</span>
                        <span class="endpoint-type">(${endpoint.type})</span>
                    </div>
                </div>
                <div class="endpoint-url">${endpoint.url}</div>
                <div class="endpoint-edit-form" style="display: none;">
                    <div class="form-field">
                        <label for="edit-label-${encodeURIComponent(endpoint.url)}">Label</label>
                        <input type="text" class="edit-label" id="edit-label-${encodeURIComponent(endpoint.url)}" value="${endpoint.label}">
                    </div>
                    <div class="form-field">
                        <label for="edit-type-${encodeURIComponent(endpoint.url)}">Type</label>
                        <select class="edit-type" id="edit-type-${encodeURIComponent(endpoint.url)}">
                            <option value="query" ${endpoint.type === 'query' ? 'selected' : ''}>Query</option>
                            <option value="update" ${endpoint.type === 'update' ? 'selected' : ''}>Update</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="endpoint-actions">
                <button class="check-endpoint">Check</button>
                <button class="edit-endpoint">Edit</button>
                <button class="save-endpoint" style="display: none;">Save</button>
                <button class="remove-endpoint">Remove</button>
            </div>
        </div>
    `).join('')
}

/**
 * Check an endpoint's status
 * @param {string} url - Endpoint URL
 * @param {HTMLElement} item - Endpoint DOM element
 */
async function checkEndpoint(url, item) {
    const statusIndicator = item.querySelector('.endpoint-status')

    // Set status to checking
    statusIndicator.className = 'endpoint-status checking'

    // Dispatch check event
    eventBus.emit(EVENTS.ENDPOINT_CHECK_REQUESTED, { url })

    showNotification('Checking endpoint...', 'info')
}

/**
 * Toggle endpoint edit mode
 * @param {HTMLElement} item - Endpoint DOM element
 */
function toggleEditMode(item) {
    const editForm = item.querySelector('.endpoint-edit-form')
    const saveButton = item.querySelector('.save-endpoint')
    const editButton = item.querySelector('.edit-endpoint')

    if (editForm.style.display === 'none') {
        // Show edit form
        editForm.style.display = 'block'
        saveButton.style.display = 'inline-block'
        editButton.style.display = 'none'
    } else {
        // Hide edit form
        editForm.style.display = 'none'
        saveButton.style.display = 'none'
        editButton.style.display = 'inline-block'
    }
}

/**
 * Save endpoint changes
 * @param {HTMLElement} item - Endpoint DOM element
 */
function saveEndpointChanges(item) {
    const url = item.dataset.url
    const label = item.querySelector('.edit-label').value
    const type = item.querySelector('.edit-type').value

    // Update endpoint in store
    store.dispatch(updateEndpoint({
        url,
        updates: { label, type }
    }))

    // Hide edit form
    toggleEditMode(item)

    showNotification('Endpoint updated successfully', 'success')
}

/**
 * Add default endpoints if none exist
 */
function addDefaultEndpoints() {
    const currentEndpoints = getEndpoints(store.getState()) || []
    
    if (currentEndpoints.length === 0) {
        console.log('Adding default SPARQL endpoints')
        
        const defaultEndpoints = [
            {
                url: 'https://fuseki.hyperdata.it/squirt/query',
                label: 'Hyperdata Query Endpoint',
                type: 'query',
                status: 'unknown',
                lastChecked: null
            },
            {
                url: 'https://fuseki.hyperdata.it/squirt/update',
                label: 'Hyperdata Update Endpoint', 
                type: 'update',
                status: 'unknown',
                lastChecked: null
            }
        ]
        
        // Add each default endpoint
        defaultEndpoints.forEach(endpoint => {
            store.dispatch(addEndpoint(endpoint))
        })
        
        showNotification('Default SPARQL endpoints added', 'info')
    }
}

/**
 * Set up the plugins list
 */
function setupPluginsList() {
    const container = document.getElementById('plugins-list')
    if (!container) return

    // Load plugin config from localStorage if available, else from config file
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

    // Get currently loaded plugins and their main tab contributions
    const loadedPlugins = Array.from(pluginManager.plugins.keys())
    const tabContributions = pluginManager.getMainTabContributions()
    
    // Build plugin info with current state
    const pluginInfo = plugins.map(plugin => {
        const isLoaded = loadedPlugins.includes(plugin.id)
        const contributions = tabContributions.filter(tab => tab.pluginId === plugin.id)
        
        return {
            ...plugin,
            isLoaded,
            contributions: contributions.map(tab => tab.label).join(', ') || 'None'
        }
    })

    // Render plugin information and controls
    container.innerHTML = `
        <div class="plugins-grid">
            ${pluginInfo.map(plugin => `
                <div class="plugin-card ${plugin.enabled ? 'enabled' : 'disabled'}">
                    <div class="plugin-header">
                        <h4>${plugin.name || plugin.id}</h4>
                        <div class="plugin-status">
                            <span class="status-badge ${plugin.isLoaded ? 'loaded' : 'not-loaded'}">
                                ${plugin.isLoaded ? 'Loaded' : 'Not Loaded'}
                            </span>
                        </div>
                    </div>
                    <div class="plugin-details">
                        <p><strong>ID:</strong> ${plugin.id}</p>
                        <p><strong>Version:</strong> ${plugin.version || 'Unknown'}</p>
                        <p><strong>Main Tabs:</strong> ${plugin.contributions}</p>
                        <p><strong>Description:</strong> ${plugin.description || 'No description available'}</p>
                    </div>
                    <div class="plugin-controls">
                        <label class="plugin-toggle-label">
                            <input type="checkbox" class="plugin-toggle" data-plugin-id="${plugin.id}" ${plugin.enabled ? 'checked' : ''}>
                            <span class="toggle-switch"></span>
                            Enable Plugin
                        </label>
                    </div>
                </div>
            `).join('')}
        </div>
        ${pluginInfo.length === 0 ? '<p class="no-plugins">No plugins configured.</p>' : ''}
    `

    // Handle form submit
    const form = document.getElementById('plugins-form')
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault()
            // Read checked state
            const toggles = container.querySelectorAll('.plugin-toggle')
            const updated = plugins.map(p => {
                const toggle = Array.from(toggles).find(t => t.dataset.pluginId === p.id)
                return { ...p, enabled: toggle ? toggle.checked : p.enabled }
            })
            // Save to localStorage
            localStorage.setItem('squirt.plugins', JSON.stringify(updated))
            renderNavTabs() // Update navigation tabs
            showNotification('Plugin settings saved. Please reload the app to apply changes.', 'success')
        })
    }
    
    // Handle reload page button
    const reloadBtn = document.getElementById('reload-page')
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            if (confirm('Reload the page to apply plugin changes?')) {
                window.location.reload()
            }
        })
    }
}

/**
 * Setup theme selector
 */
function setupThemeSelector() {
    const themeSelector = document.getElementById('theme-selector')
    if (!themeSelector) return

    // Get current theme from localStorage or default to light
    const currentTheme = localStorage.getItem('squirt_theme') || 'light'

    // Set selector value
    themeSelector.value = currentTheme

    // Apply current theme to document
    document.documentElement.setAttribute('data-theme', currentTheme)

    // Listen for changes
    themeSelector.addEventListener('change', () => {
        const theme = themeSelector.value
        localStorage.setItem('squirt_theme', theme)
        document.documentElement.setAttribute('data-theme', theme)
        showNotification(`Theme changed to ${theme}`, 'info')
    })
}

/**
 * Setup storage management
 */
function setupStorageManagement() {
    const storageSection = document.querySelector('.storage-section')
    if (!storageSection) return

    // Create storage usage display
    updateStorageUsage()

    // Set up export button
    const exportBtn = document.getElementById('export-data')
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData)
    }

    // Set up import button
    const importBtn = document.getElementById('import-data')
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            // Create file input
            const fileInput = document.createElement('input')
            fileInput.type = 'file'
            fileInput.accept = '.ttl,.json'
            fileInput.style.display = 'none'
            document.body.appendChild(fileInput)

            // Listen for file selection
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0]
                if (file) {
                    importData(file)
                }
                document.body.removeChild(fileInput)
            })

            // Open file dialog
            fileInput.click()
        })
    }

    // Set up clear button
    const clearBtn = document.getElementById('clear-data')
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                clearAllData()
            }
        })
    }
}

/**
 * Export data to a file
 */
async function exportData() {
    try {
        // Get RDF dataset
        const dataset = RDFModel.dataset

        if (!dataset || dataset.size === 0) {
            showNotification('No data to export', 'warning')
            return
        }

        // Convert to Turtle
        const turtle = dataset.toString()

        // Create blob and download
        const blob = new Blob([turtle], { type: 'text/turtle' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const date = new Date().toISOString().split('T')[0]
        a.href = url
        a.download = `squirt_export_${date}.ttl`
        a.style.display = 'none'

        // Trigger download
        document.body.appendChild(a)
        a.click()

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }, 100)

        showNotification('Data exported successfully', 'success')
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Exporting data'
        })
    }
}

/**
 * Import data from a file
 * @param {File} file - File to import
 */
async function importData(file) {
    try {
        const reader = new FileReader()

        reader.onload = async (e) => {
            try {
                const content = e.target.result

                // Try to parse as N3/Turtle
                try {
                    const parser = new N3Parser()
                    const dataset = await parser.parse(content)

                    // Merge with existing dataset
                    const currentDataset = RDFModel.dataset || rdf.dataset()
                    dataset.forEach(quad => {
                        currentDataset.add(quad)
                    })

                    // Update model
                    RDFModel.dataset = currentDataset

                    showNotification('Data imported successfully', 'success')

                    // Update storage usage
                    updateStorageUsage()
                } catch (parseError) {
                    console.error('Error parsing imported data:', parseError)
                    showNotification('Invalid data format', 'error')
                }
            } catch (processError) {
                errorHandler.handle(processError, {
                    showToUser: true,
                    context: 'Processing imported data'
                })
            }
        }

        reader.onerror = () => {
            showNotification('Failed to read file', 'error')
        }

        reader.readAsText(file)
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Importing data'
        })
    }
}

/**
 * Clear all data
 */
function clearAllData() {
    try {
        // Clear RDF dataset
        RDFModel.dataset = rdf.dataset()

        // Preserve theme and endpoint settings
        const themeSettings = localStorage.getItem('squirt_theme')
        const endpointSettings = JSON.stringify(getEndpoints(store.getState()))

        // Clear localStorage
        localStorage.clear()

        // Restore settings
        if (themeSettings) {
            localStorage.setItem('squirt_theme', themeSettings)
        }

        // Restore endpoints
        if (endpointSettings) {
            localStorage.setItem('squirt_endpoints', endpointSettings)
        }

        showNotification('All data has been cleared', 'success')

        // Update storage usage
        updateStorageUsage()
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Clearing data'
        })
    }
}

/**
 * Update storage usage display
 */
function updateStorageUsage() {
    // Find or create storage usage element
    let usageElement = document.getElementById('storage-usage')
    if (!usageElement) {
        usageElement = document.createElement('div')
        usageElement.id = 'storage-usage'
        document.querySelector('.storage-section')?.appendChild(usageElement)
    }

    // Calculate localStorage usage
    let total = 0
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length * 2 // UTF-16 = 2 bytes per character
        }
    }

    // Format size
    let size
    if (total < 1024) {
        size = `${total} bytes`
    } else if (total < 1024 * 1024) {
        size = `${(total / 1024).toFixed(2)} KB`
    } else {
        size = `${(total / (1024 * 1024)).toFixed(2)} MB`
    }

    // Update the display
    usageElement.textContent = `Storage used: ${size}`
}