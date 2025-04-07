import { eventBus, EVENTS } from '../../core/events/event-bus.js'
import { errorHandler } from '../../core/errors/index.js'
import { store } from '../../core/state/index.js'
import { showNotification } from '../notifications/notifications.js'
import { querySparql } from '../../services/sparql/sparql.js'

/**
 * Initialize the developer view
 * @returns {Object} View controller with update and cleanup methods
 */
export function initView() {
    try {
        console.log('Initializing Developer view')

        const view = document.getElementById('developer-view')
        if (!view) {
            throw new Error('Developer view element not found')
        }

        // Set up SPARQL query functionality
        setupQueryForm()

        return {
            update() {
                console.log('Updating Developer view')
            },

            cleanup() {
                console.log('Cleaning up Developer view')
                // Remove event listeners if needed
            }
        }
    } catch (error) {
        errorHandler.handle(error, {
            showToUser: true,
            context: 'Initializing Developer view'
        })

        return {}
    }
}

/**
 * Set up SPARQL query form
 */
function setupQueryForm() {
    const queryForm = document.getElementById('sparql-query')
    const runButton = document.getElementById('run-query')
    const resultsContainer = document.getElementById('query-results')

    if (!queryForm || !runButton || !resultsContainer) {
        return
    }

    runButton.addEventListener('click', async () => {
        const query = queryForm.value.trim()
        if (!query) {
            showNotification('Please enter a SPARQL query', 'warning')
            return
        }

        try {
            runButton.disabled = true
            runButton.textContent = 'Running...'
            resultsContainer.innerHTML = '<div class="loading">Running query...</div>'

            const result = await querySparql(query)
            displayResults(result, resultsContainer)

            showNotification('Query executed successfully', 'success')
        } catch (error) {
            errorHandler.handle(error)
            resultsContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`
            showNotification('Query execution failed', 'error')
        } finally {
            runButton.disabled = false
            runButton.textContent = 'Run Query'
        }
    })
}

/**
 * Display SPARQL query results
 * @param {Object} result - SPARQL query result
 * @param {HTMLElement} container - Results container element
 */
function displayResults(result, container) {
    if (!result || !result.results || !result.results.bindings) {
        container.innerHTML = '<div class="no-results">No results returned</div>'
        return
    }

    const bindings = result.results.bindings
    const vars = result.head.vars

    if (bindings.length === 0) {
        container.innerHTML = '<div class="no-results">No results returned</div>'
        return
    }

    let html = '<table class="results-table"><thead><tr>'
    vars.forEach(varName => {
        html += `<th>${varName}</th>`
    })
    html += '</tr></thead><tbody>'

    bindings.forEach(binding => {
        html += '<tr>'
        vars.forEach(varName => {
            const value = binding[varName] ? binding[varName].value : ''
            html += `<td>${value}</td>`
        })
        html += '</tr>'
    })

    html += '</tbody></table>'
    container.innerHTML = html
}