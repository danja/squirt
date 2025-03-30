import { state } from '../../core/state.js';
import { setupEndpointsList } from '../components/endpoints-list.js';
import { showNotification, initializeNotifications } from '../components/notifications.js';
import { rdfModel } from '../../services/rdf/rdf-model.js';

/**
 * Initialize the settings view
 */
export function initializeSettingsView() {
    const view = document.getElementById('settings-view');
    if (!view) {
        console.warn('Settings view not found');
        return;
    }
    
    // Setup components
    setupEndpointsList();
    initializeNotifications();
    
    // Setup theme selector if it exists
    setupThemeSelector();
    
    // Setup storage management
    setupStorageManagement();
}

/**
 * Setup theme selector component
 */
function setupThemeSelector() {
    const themeSelector = document.getElementById('theme-selector');
    if (!themeSelector) return;
    
    // Get current theme from localStorage or use default
    const currentTheme = localStorage.getItem('squirt_theme') || 'light';
    
    // Set initial value
    themeSelector.value = currentTheme;
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Listen for changes
    themeSelector.addEventListener('change', () => {
        const theme = themeSelector.value;
        localStorage.setItem('squirt_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        showNotification(`Theme changed to ${theme}`, 'info');
    });
}

/**
 * Setup storage management section
 */
function setupStorageManagement() {
    const storageSection = document.querySelector('.storage-section');
    if (!storageSection) return;
    
    // Create export button if it doesn't exist
    if (!document.getElementById('export-data')) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'export-data';
        exportBtn.textContent = 'Export Data';
        exportBtn.addEventListener('click', exportData);
        storageSection.appendChild(exportBtn);
    }
    
    // Create import button if it doesn't exist
    if (!document.getElementById('import-data')) {
        const importBtn = document.createElement('button');
        importBtn.id = 'import-data';
        importBtn.textContent = 'Import Data';
        importBtn.addEventListener('click', () => {
            // Create a hidden file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.ttl,.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // Listen for file selection
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    importData(file);
                }
                document.body.removeChild(fileInput);
            });
            
            // Trigger file dialog
            fileInput.click();
        });
        storageSection.appendChild(importBtn);
    }
    
    // Create clear data button if it doesn't exist
    if (!document.getElementById('clear-data')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clear-data';
        clearBtn.className = 'danger';
        clearBtn.textContent = 'Clear All Data';
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                clearAllData();
            }
        });
        storageSection.appendChild(clearBtn);
    }
    
    // Add storage usage info
    updateStorageUsage();
}

/**
 * Export all application data
 */
async function exportData() {
    try {
        // Get RDF dataset
        const dataset = state.get('rdfDataset');
        
        if (!dataset || dataset.size === 0) {
            showNotification('No data to export', 'warning');
            return;
        }
        
        // Convert to Turtle format
        const turtle = dataset.toString();
        
        // Create a download link
        const blob = new Blob([turtle], { type: 'text/turtle' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `squirt_export_${date}.ttl`;
        a.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showNotification('Data exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Failed to export data', 'error');
    }
}

/**
 * Import data from file
 * @param {File} file - The file to import
 */
async function importData(file) {
    try {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                
                // Try to parse as Turtle
                try {
                    const dataset = await rdfModel.parseFromString(content);
                    
                    // Merge with existing dataset
                    const currentDataset = state.get('rdfDataset');
                    dataset.forEach(quad => {
                        currentDataset.add(quad);
                    });
                    
                    // Update state
                    state.update('rdfDataset', currentDataset);
                    
                    // Save to cache
                    rdfModel.saveToCache(currentDataset);
                    
                    showNotification('Data imported successfully', 'success');
                } catch (parseError) {
                    console.error('Error parsing imported data:', parseError);
                    showNotification('Invalid data format', 'error');
                }
            } catch (processError) {
                console.error('Error processing imported data:', processError);
                showNotification('Failed to import data', 'error');
            }
        };
        
        reader.onerror = () => {
            showNotification('Failed to read file', 'error');
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Error importing data:', error);
        showNotification('Failed to import data', 'error');
    }
}

/**
 * Clear all application data
 */
function clearAllData() {
    try {
        // Clear RDF dataset
        state.update('rdfDataset', rdfModel.createEmptyDataset());
        
        // Clear localStorage except for settings
        const themeSettings = localStorage.getItem('squirt_theme');
        const endpointSettings = localStorage.getItem('squirt_endpoints');
        
        localStorage.clear();
        
        // Restore settings
        if (themeSettings) {
            localStorage.setItem('squirt_theme', themeSettings);
        }
        
        if (endpointSettings) {
            localStorage.setItem('squirt_endpoints', endpointSettings);
        }
        
        showNotification('All data has been cleared', 'success');
        
        // Update storage usage display
        updateStorageUsage();
    } catch (error) {
        console.error('Error clearing data:', error);
        showNotification('Failed to clear data', 'error');
    }
}

/**
 * Update the storage usage display
 */
function updateStorageUsage() {
    // Create or get storage usage element
    let usageElement = document.getElementById('storage-usage');
    if (!usageElement) {
        usageElement = document.createElement('div');
        usageElement.id = 'storage-usage';
        document.querySelector('.storage-section')?.appendChild(usageElement);
    }
    
    // Calculate localStorage usage
    let total = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length * 2; // Approximate size in bytes
        }
    }
    
    // Format size
    let size;
    if (total < 1024) {
        size = `${total} bytes`;
    } else if (total < 1024 * 1024) {
        size = `${(total / 1024).toFixed(2)} KB`;
    } else {
        size = `${(total / (1024 * 1024)).toFixed(2)} MB`;
    }
    
    // Update display
    usageElement.textContent = `Storage used: ${size}`;
}