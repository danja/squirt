import { state } from '../../core/state.js';
import { ErrorHandler } from '../../core/errors.js';

// Simple non-custom element implementation for better compatibility
export function setupEndpointsList() {
    const container = document.getElementById('endpoints-list');
    if (!container) return;
    
    // Initial render
    renderEndpointsList(container);
    
    // Subscribe to state changes
    state.subscribe('endpoints', () => renderEndpointsList(container));
    
    // Set up event delegation
    container.addEventListener('click', async (e) => {
        // Find the closest endpoint item
        const item = e.target.closest('.endpoint-item');
        if (!item) return;
        
        const url = item.dataset.url;
        
        try {
            // Handle check button
            if (e.target.matches('.check-endpoint')) {
                await checkEndpoint(url, item);
            }
            // Handle remove button
            else if (e.target.matches('.remove-endpoint')) {
                if (confirm('Are you sure you want to remove this endpoint?')) {
                    removeEndpoint(url);
                    // Show temporary notification
                    showNotification('Endpoint removed', 'info');
                }
            }
            // Handle edit button
            else if (e.target.matches('.edit-endpoint')) {
                toggleEditMode(item);
            }
            // Handle save button
            else if (e.target.matches('.save-endpoint')) {
                saveEndpointChanges(item);
            }
        } catch (error) {
            ErrorHandler.handle(error);
            showNotification('Operation failed: ' + error.message, 'error');
        }
    });
}

function renderEndpointsList(container) {
    const endpoints = state.get('endpoints') || [];
    
    if (endpoints.length === 0) {
        container.innerHTML = '<p>No endpoints configured yet.</p>';
        return;
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
    `).join('');
}

async function checkEndpoint(url, item) {
    const statusIndicator = item.querySelector('.endpoint-status');
    
    // Set checking status
    statusIndicator.className = 'endpoint-status checking';
    
    try {
        // Import endpointManager here to avoid circular dependencies
        const { EndpointManager } = await import('../../services/sparql/endpoints.js');
        const endpointManager = new EndpointManager();
        
        // Find the endpoint in the state
        const endpoints = state.get('endpoints');
        const endpoint = endpoints.find(e => e.url === url);
        
        if (!endpoint) {
            throw new Error('Endpoint not found');
        }
        
        // Check the endpoint
        const status = await endpointManager.checkEndpoint(url, endpoint.credentials);
        
        // Update the endpoint status
        endpointManager.updateEndpoint(url, { 
            status: status ? 'active' : 'inactive',
            lastChecked: new Date().toISOString()
        });
        
        // Show notification
        showNotification(
            `Endpoint is ${status ? 'active' : 'inactive'}`, 
            status ? 'success' : 'error'
        );
    } catch (error) {
        console.error('Error checking endpoint:', error);
        statusIndicator.className = 'endpoint-status error';
        throw error;
    }
}

function removeEndpoint(url) {
    // Import endpointManager here to avoid circular dependencies
    import('../../services/sparql/endpoints.js').then(({ EndpointManager }) => {
        const endpointManager = new EndpointManager();
        endpointManager.removeEndpoint(url);
    });
}

function toggleEditMode(item) {
    const editForm = item.querySelector('.endpoint-edit-form');
    const saveButton = item.querySelector('.save-endpoint');
    const editButton = item.querySelector('.edit-endpoint');
    
    if (editForm.style.display === 'none') {
        // Show edit form
        editForm.style.display = 'block';
        saveButton.style.display = 'inline-block';
        editButton.style.display = 'none';
    } else {
        // Hide edit form
        editForm.style.display = 'none';
        saveButton.style.display = 'none';
        editButton.style.display = 'inline-block';
    }
}

function saveEndpointChanges(item) {
    const url = item.dataset.url;
    const label = item.querySelector('.edit-label').value;
    const type = item.querySelector('.edit-type').value;
    
    // Import endpointManager here to avoid circular dependencies
    import('../../services/sparql/endpoints.js').then(({ EndpointManager }) => {
        const endpointManager = new EndpointManager();
        endpointManager.updateEndpoint(url, { label, type });
        
        // Hide edit form
        toggleEditMode(item);
        
        // Show notification
        showNotification('Endpoint updated successfully', 'success');
    });
}

// Make this available globally for other components to use
window.updateEndpointsList = function() {
    const container = document.getElementById('endpoints-list');
    if (container) {
        renderEndpointsList(container);
    }
};

function showNotification(message, type = 'info') {
    // Use global notification function if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback to console
    console.log(`${type.toUpperCase()}: ${message}`);
}
