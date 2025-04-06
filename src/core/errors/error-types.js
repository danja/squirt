// src/core/errors/error-types.js
/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
  }
}

/**
 * SPARQL endpoint errors
 */
export class SparqlError extends AppError {
  constructor(message, details = {}) {
    super(message, 'SPARQL_ERROR', details);
  }
}

/**
 * Storage errors (localStorage, etc.)
 */
export class StorageError extends AppError {
  constructor(message, details = {}) {
    super(message, 'STORAGE_ERROR', details);
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends AppError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_ERROR', details);
  }
}

/**
 * RDF-specific errors
 */
export class RDFError extends AppError {
  constructor(message, details = {}) {
    super(message, 'RDF_ERROR', details);
  }
}

// src/core/errors/error-handler.js
import { eventBus, EVENTS } from '../events/event-bus.js';

/**
 * Simple error handler for the application
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
  }

  /**
   * Handle an error
   * @param {Error} error - The error to handle
   * @param {Object} options - Options for handling
   * @returns {Error} - The handled error
   */
  handle(error, options = {}) {
    const { showToUser = true, rethrow = false } = options;

    // Log to console
    console.error('Error:', error);

    // Add to log
    this.errorLog.unshift({
      error,
      timestamp: new Date()
    });

    // Emit error event
    eventBus.emit(EVENTS.ERROR_OCCURRED, error);

    // Show to user if needed
    if (showToUser && typeof window.showNotification === 'function') {
      window.showNotification(
        error.message || 'An unexpected error occurred',
        'error'
      );
    }

    // Rethrow if needed
    if (rethrow) {
      throw error;
    }

    return error;
  }
}

export const errorHandler = new ErrorHandler();

// src/core/errors/index.js
export * from './error-types.js';
