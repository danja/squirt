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

  /**
   * Get user-friendly error message
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return this.userMessage || this.message;
  }

  /**
   * Set user-friendly error message
   * @param {string} message - User-friendly message
   * @returns {AppError} The error instance for chaining
   */
  setUserMessage(message) {
    this.userMessage = message;
    return this;
  }

  /**
   * Convert error to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);

    // Set default user message if not provided in details
    if (!this.userMessage) {
      this.userMessage = 'Network error. Please check your connection and try again.';
    }
  }
}

/**
 * SPARQL endpoint errors
 */
export class SparqlError extends AppError {
  constructor(message, details = {}) {
    super(message, 'SPARQL_ERROR', details);

    // Set default user message if not provided in details
    if (!this.userMessage) {
      this.userMessage = 'There was an error with the SPARQL endpoint. Please try again later.';
    }
  }
}

/**
 * Data validation errors
 */
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);

    // Set default user message if not provided in details
    if (!this.userMessage) {
      this.userMessage = 'Invalid data provided. Please check your input and try again.';
    }
  }
}

/**
 * Storage errors (localStorage, etc.)
 */
export class StorageError extends AppError {
  constructor(message, details = {}) {
    super(message, 'STORAGE_ERROR', details);

    if (!this.userMessage) {
      this.userMessage = 'Error storing or retrieving data. Please check your browser settings.';
    }
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends AppError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_ERROR', details);

    if (!this.userMessage) {
      this.userMessage = 'Application configuration error. Please contact support.';
    }
  }
}

/**
 * RDF-specific errors
 */
export class RDFError extends AppError {
  constructor(message, details = {}) {
    super(message, 'RDF_ERROR', details);

    if (!this.userMessage) {
      this.userMessage = 'Error processing RDF data. Please try again.';
    }
  }
}

/**
 * UI-related errors
 */
export class UIError extends AppError {
  constructor(message, details = {}) {
    super(message, 'UI_ERROR', details);

    if (!this.userMessage) {
      this.userMessage = 'User interface error. Please refresh the page and try again.';
    }
  }
}