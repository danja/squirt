// src/core/errors/error-handler.js
import { eventBus, EVENTS } from '../events/event-bus.js'
import * as ErrorTypes from './error-types.js'

/**
 * Centralized error handler for the application
 */
export class ErrorHandler {
  constructor(eventBus) {
    this.eventBus = eventBus
    this.errorLog = []
    this.maxLogSize = 50 // Limit error log size
  }

  /**
   * Handle an error by logging it and optionally showing to user
   * @param {Error} error - The error to handle
   * @param {Object} options - Handling options
   * @param {boolean} options.showToUser - Whether to show the error to the user
   * @param {boolean} options.rethrow - Whether to rethrow the error after handling
   * @param {string} options.context - Additional context for the error
   * @returns {Error} The handled error
   */
  handle(error, options = {}) {
    const {
      showToUser = true,
      rethrow = false,
      context = null
    } = options

    // Ensure it's an AppError
    const appError = this.normalizeError(error, context)

    // Log the error
    this.logError(appError)

    // Emit error event
    this.eventBus.emit(EVENTS.ERROR_OCCURRED, appError)

    // Show to user if required
    if (showToUser) {
      this.showToUser(appError)
    }

    // Rethrow if required
    if (rethrow) {
      throw appError
    }

    return appError
  }

  /**
   * Convert any error to an AppError
   * @param {Error} error - The error to normalize
   * @param {string} context - Additional context
   * @returns {AppError} Normalized AppError
   */
  normalizeError(error, context = null) {
    // Already an AppError, just add context if needed
    if (error instanceof ErrorTypes.AppError) {
      if (context && !error.details.context) {
        error.details.context = context
      }
      return error
    }

    // Create appropriate AppError type based on error properties
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

    // Generic AppError for unknown error types
    return new ErrorTypes.AppError(
      error.message,
      'UNKNOWN_ERROR',
      {
        originalError: error,
        stack: error.stack,
        context
      }
    )
  }

  /**
   * Log error to internal log and console
   * @param {AppError} error - The error to log
   */
  logError(error) {
    // Log to console
    console.error('Error:', error)

    // Add to internal log with timestamp
    this.errorLog.unshift({
      error,
      timestamp: new Date()
    })

    // Trim log if it gets too large
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // Optionally send to analytics or monitoring service
    this.reportToAnalytics(error)
  }

  /**
   * Show error to user
   * @param {AppError} error - The error to show
   */
  showToUser(error) {
    const message = error.getUserMessage()

    // Emit notification event
    this.eventBus.emit(EVENTS.NOTIFICATION_SHOW, {
      type: 'error',
      message,
      duration: 5000
    })
  }

  /**
   * Report error to analytics service
   * @param {AppError} error - The error to report
   */
  reportToAnalytics(error) {
    // This would be implemented to send to a real analytics service
    // For now, just store in window.errorAnalytics if available
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
   * Get the error log
   * @returns {Array} Error log
   */
  getErrorLog() {
    return [...this.errorLog]
  }

  /**
   * Clear the error log
   */
  clearErrorLog() {
    this.errorLog = []
  }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler(eventBus)

// Helper function to create and handle an error in one step
export function createAndHandleError(message, userMessage, code = 'APP_ERROR', options = {}) {
  const error = new ErrorTypes.AppError(message, code)

  if (userMessage) {
    error.setUserMessage(userMessage)
  }

  return errorHandler.handle(error, options)
}

// src/core/errors/index.js
export * from './error-types.js'
export {
  ErrorHandler,
  errorHandler,
  createAndHandleError
} from './error-handler.js'
