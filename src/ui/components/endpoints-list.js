// import { state } from '../../core/state.js'; // Remove legacy state
import { store } from '../../core/state/index.js' // Import Redux store
import { getEndpoints } from '../../core/state/selectors.js' // Import selectors
import * as actions from '../../core/state/actions.js' // Import actions
import { eventBus, EVENTS } from 'evb' // Import event bus

// import { ErrorHandler } from '../../core/errors.js'; // Remove old error handler
import { errorHandler } from '../../core/errors/index.js' // Use new handler if needed

// Simple non-custom element implementation for better compatibility
export function setupEndpointsList() {
    const container = document.getElementById('endpoints-list')
    if (!container) {
        console.warn('Endpoints list container not found.')
        return
    }

    // Initial render
    renderEndpointsList(container)

    // Subscribe to Redux store changes
    // Unsubscribe function could be stored if the component needs cleanup
    const unsubscribe = store.subscribe(() => renderEndpointsList(container))

    // Set up event delegation
    container.addEventListener('click', async (e) => {
        // Find the closest endpoint item
        const item = e.target.closest('.endpoint-item')
        if (!item) return

        const url = item.dataset.url
        if (!url) return // Should not happen if data-url is always set

        try {
            // Handle check button
            if (e.target.matches('.check-endpoint')) {
                // Get credentials from current state for this endpoint
                const endpoints = getEndpoints(store.getState())
                const endpoint = endpoints.find(e => e.url === url)
                const credentials = endpoint?.credentials

                // Dispatch event to request a check
                console.log(`UI: Emitting check request for ${url}`)
                eventBus.emit(EVENTS.ENDPOINT_CHECK_REQUESTED, { url, credentials })
                // Optionally show immediate feedback
                showNotification(`Status check requested for ${url}`, 'info')
                // Visually indicate checking (will be updated by store subscription)
                const statusIndicator = item.querySelector('.endpoint-status')
                if (statusIndicator) statusIndicator.className = 'endpoint-status checking'
            }
            // Handle remove button
            else if (e.target.matches('.remove-endpoint')) {
                if (confirm(`Are you sure you want to remove the endpoint: ${url}?`)) {
                    // Dispatch remove action directly
                    store.dispatch(actions.removeEndpoint(url))
                    // TODO: Consider saving to storage (maybe EndpointManager should subscribe and save?)
                    showNotification('Endpoint removed', 'info')
                }
            }
            // Handle edit button
            else if (e.target.matches('.edit-endpoint')) {
                toggleEditMode(item)
            }
            // Handle save button
            else if (e.target.matches('.save-endpoint')) {
                saveEndpointChangesUI(item, url)
            }
        } catch (error) {
            // Use new error handler
            errorHandler.handle(error, { context: 'EndpointsList Click Event', showToUser: true })
            // showNotification('Operation failed: ' + error.message, 'error'); // Redundant
        }
    })

    // Return unsubscribe function for potential cleanup
    return unsubscribe
}

function renderEndpointsList(container) {
    const endpoints = getEndpoints(store.getState()) // Get endpoints via selector

    if (endpoints.length === 0) {
        container.innerHTML = '<p>No endpoints configured yet.</p>'
        return
    }

    // Generate HTML for each endpoint
    container.innerHTML = endpoints.map(endpoint => {
        const encodedUrl = encodeURIComponent(endpoint.url)
        const status = endpoint.status || 'unknown'
        return `
        <div class="endpoint-item" data-url="${endpoint.url}">
            <div class="endpoint-info">
                <div class="endpoint-header">
                    <div class="endpoint-status ${status}" title="Status: ${status}${endpoint.lastChecked ? ` (Checked: ${new Date(endpoint.lastChecked).toLocaleString()})` : ''}"></div>
                    <div class="endpoint-details">
                        <span class="endpoint-label">${endpoint.label}</span>
                        <span class="endpoint-type">(${endpoint.type})</span>
                    </div>
                </div>
                <div class="endpoint-url">${endpoint.url}</div>
                <div class="endpoint-edit-form" style="display: none;">
                    <div class="form-field">
                        <label for="edit-label-${encodedUrl}">Label</label>
                        <input type="text" class="edit-label" id="edit-label-${encodedUrl}" value="${endpoint.label}">
                    </div>
                    <div class="form-field">
                        <label for="edit-type-${encodedUrl}">Type</label>
                        <select class="edit-type" id="edit-type-${encodedUrl}">
                            <option value="query" ${endpoint.type === 'query' ? 'selected' : ''}>Query</option>
                            <option value="update" ${endpoint.type === 'update' ? 'selected' : ''}>Update</option>
                        </select>
                    </div>
                     <div class="form-field">
                         <label for="edit-user-${encodedUrl}">Username (Optional)</label>
                         <input type="text" class="edit-user" id="edit-user-${encodedUrl}" value="${endpoint.credentials?.user || ''}" autocomplete="username">
                     </div>
                      <div class="form-field">
                         <label for="edit-password-${encodedUrl}">Password (Optional)</label>
                         <input type="password" class="edit-password" id="edit-password-${encodedUrl}" value="${endpoint.credentials?.password || ''}" autocomplete="current-password">
                     </div>
                </div>
            </div>
            <div class="endpoint-actions">
                <button class="check-endpoint" title="Check Endpoint Status">Check</button>
                <button class="edit-endpoint" title="Edit Endpoint">Edit</button>
                <button class="save-endpoint" title="Save Changes" style="display: none;">Save</button>
                <button class="remove-endpoint" title="Remove Endpoint">Remove</button>
            </div>
        </div>
    `
    }).join('')
}

function toggleEditMode(item) {
    const editForm = item.querySelector('.endpoint-edit-form')
    const saveButton = item.querySelector('.save-endpoint')
    const editButton = item.querySelector('.edit-endpoint')

    if (!editForm || !saveButton || !editButton) return // Safety check

    const isEditing = editForm.style.display !== 'none'

    editForm.style.display = isEditing ? 'none' : 'block'
    saveButton.style.display = isEditing ? 'none' : 'inline-block'
    editButton.style.display = isEditing ? 'inline-block' : 'none'
}

// Renamed to avoid potential naming conflicts
function saveEndpointChangesUI(item, url) {
    const labelInput = item.querySelector('.edit-label')
    const typeSelect = item.querySelector('.edit-type')
    const userInput = item.querySelector('.edit-user')
    const passwordInput = item.querySelector('.edit-password')

    if (!labelInput || !typeSelect || !userInput || !passwordInput) {
        console.error('Could not find edit form elements for endpoint:', url)
        showNotification('Error saving endpoint: Form elements missing', 'error')
        return
    }

    const updates = {
        label: labelInput.value.trim(),
        type: typeSelect.value,
        // Update credentials only if both user and password have values
        // Or handle removal if fields are empty?
        credentials: (userInput.value && passwordInput.value)
            ? { user: userInput.value, password: passwordInput.value }
            : null // Set credentials to null if either field is empty
    }

    if (!updates.label) {
        showNotification('Endpoint label cannot be empty', 'error')
        return
    }

    // Dispatch update action
    store.dispatch(actions.updateEndpoint({ url, updates }))
    // TODO: Trigger save to storage?

    // Hide edit form
    toggleEditMode(item)

    // Show notification
    showNotification('Endpoint updated successfully', 'success')
}

// Make this available globally for other components to use (Consider alternatives)
// window.updateEndpointsList = function () {
//     const container = document.getElementById('endpoints-list');
//     if (container) {
//         renderEndpointsList(container);
//     }
// };

// Re-rendering is handled by store subscription now.

// This local showNotification might be redundant if event bus handles it.
function showNotification(message, type = 'info') {
    // Use global notification function if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type)
        return
    }

    // Fallback to console
    console.log(`${type.toUpperCase()}: ${message}`)
}
