/**
 * Base error class for all application errors
 * @extends Error
 */
export class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} details - Error details
   */
  constructor(message, code = 'APP_ERROR', details = {}) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.details = details
    this.timestamp = new Date()
    this.userMessage = message // Default user message is same as error message

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Get user-friendly message
   * @returns {string} User-friendly message
   */
  getUserMessage() {
    return this.userMessage || this.message
  }

  /**
   * Set user-friendly message
   * @param {string} message - User-friendly message
   */
  setUserMessage(message) {
    this.userMessage = message
  }
}

/**
 * Network-related error
 * @extends AppError
 */
export class NetworkError extends AppError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details)
    this.setUserMessage('Network error. Please check your connection and try again.')
  }
}

/**
 * SPARQL-related error
 * @extends AppError
 */
export class SparqlError extends AppError {
  constructor(message, details = {}) {
    super(message, 'SPARQL_ERROR', details)
    this.setUserMessage('SPARQL endpoint error. Please check your endpoint settings.')
  }
}

/**
 * Storage-related error
 * @extends AppError
 */
export class StorageError extends AppError {
  constructor(message, details = {}) {
    super(message, 'STORAGE_ERROR', details)
    this.setUserMessage('Storage error. Some data may not be saved.')
  }
}

/**
 * Configuration-related error
 * @extends AppError
 */
export class ConfigError extends AppError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_ERROR', details)
    this.setUserMessage('Configuration error. Please check your application settings.')
  }
}

/**
 * RDF-related error
 * @extends AppError
 */
export class RDFError extends AppError {
  constructor(message, details = {}) {
    super(message, 'RDF_ERROR', details)
    this.setUserMessage('Data processing error. Please try again.')
  }
}

/**
 * Validation-related error
 * @extends AppError
 */
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details)
    this.setUserMessage('Validation error. Please check your input and try again.')
  }
}