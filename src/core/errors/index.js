import { eventBus, EVENTS } from '../events/event-bus.js'
import * as ErrorTypes from './error-types.js'

// Add ValidationError if not present in error-types.js
if (!ErrorTypes.ValidationError) {
    ErrorTypes.ValidationError = class ValidationError extends ErrorTypes.AppError {
        constructor(message, details = {}) {
            super(message, 'VALIDATION_ERROR', details)
        }
    }
}

/**
 * Central error handler for the application
 */
class ErrorHandler {
    constructor(eventBus) {
        this.eventBus = eventBus
        this.errorLog = []
        this.maxLogSize = 50
    }

    /**
     * Handle an error
     * @param {Error} error - Error object to handle
     * @param {Object} options - Handler options
     * @param {boolean} options.showToUser - Whether to show error to user
     * @param {boolean} options.rethrow - Whether to rethrow the error
     * @param {string} options.context - Error context
     * @returns {AppError} Normalized error
     */
    handle(error, options = {}) {
        const {
            showToUser = true,
            rethrow = false,
            context = null
        } = options

        // Normalize error
        const appError = this.normalizeError(error, context)

        // Log the error
        this.logError(appError)

        // Emit error event
        this.eventBus.emit(EVENTS.ERROR_OCCURRED, appError)

        // Show error to user if requested
        if (showToUser) {
            this.showToUser(appError)
        }

        // Rethrow error if requested
        if (rethrow) {
            throw appError
        }

        return appError
    }

    /**
     * Normalize an error to an AppError type
     * @param {Error} error - Error to normalize
     * @param {string} context - Error context
     * @returns {AppError} Normalized error
     */
    normalizeError(error, context = null) {
        // If already an AppError, just add context if needed
        if (error instanceof ErrorTypes.AppError) {
            if (context && !error.details.context) {
                error.details.context = context
            }
            return error
        }

        // Classify common error types
        if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
            return new ErrorTypes.NetworkError(
                error.message,
                {
                    originalError: error,
                    context
                }
            )
        }

        if (error.name === 'SyntaxError' || error.message.includes('syntax')) {
            return new ErrorTypes.ValidationError(
                error.message,
                {
                    originalError: error,
                    context
                }
            )
        }

        if (error.message.includes('SPARQL') || error.message.includes('endpoint')) {
            return new ErrorTypes.SparqlError(
                error.message,
                {
                    originalError: error,
                    context
                }
            )
        }

        if (error.message.includes('localStorage') || error.message.includes('storage')) {
            return new ErrorTypes.StorageError(
                error.message,
                {
                    originalError: error,
                    context
                }
            )
        }

        // Default to general AppError
        return new ErrorTypes.AppError(
            error.message || 'Unknown error',
            'UNKNOWN_ERROR',
            {
                originalError: error,
                stack: error.stack,
                context
            }
        )
    }

    /**
     * Log an error
     * @param {AppError} error - Error to log
     */
    logError(error) {
        // Log to console
        console.error('Error:', error)

        // Add to internal log
        this.errorLog.unshift({
            error,
            timestamp: new Date()
        })

        // Trim log if needed
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(0, this.maxLogSize)
        }

        // Report to analytics if available
        this.reportToAnalytics(error)
    }

    /**
     * Show error to user
     * @param {AppError} error - Error to show
     */
    showToUser(error) {
        const message = error.message

        // Use notification system to show error
        this.eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
            type: 'error',
            message,
            duration: 5000,
            error
        })
    }

    /**
     * Report error to analytics
     * @param {AppError} error - Error to report
     */
    reportToAnalytics(error) {
        // Check if analytics is available
        if (window.errorAnalytics) {
            window.errorAnalytics.push({
                type: error.name,
                code: error.code,
                message: error.message,
                timestamp: new Date().toISOString()
            })
        }
    }

    /**
     * Get error log
     * @returns {Array} Error log
     */
    getErrorLog() {
        return [...this.errorLog]
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = []
    }
}

// Create singleton instance
export const errorHandler = new ErrorHandler(eventBus)

/**
 * Create and handle an error
 * @param {string} message - Error message
 * @param {string} userMessage - User-friendly message
 * @param {string} code - Error code
 * @param {Object} options - Handler options
 * @returns {AppError} Handled error
 */
export function createAndHandleError(message, userMessage, code = 'APP_ERROR', options = {}) {
    const error = new ErrorTypes.AppError(message, code)

    if (userMessage) {
        error.userMessage = userMessage
    }

    return errorHandler.handle(error, options)
}

// Export error types
export * from './error-types.js'