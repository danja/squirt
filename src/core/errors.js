/**
 * Custom application error class with additional details
 */
export class AppError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
    }
}

/**
 * SPARQL-specific error class
 */
export class SparqlError extends AppError {
    constructor(message, details = {}) {
        super(message, 'SPARQL_ERROR', details);
        this.name = 'SparqlError';
    }
}

/**
 * Network error class
 */
export class NetworkError extends AppError {
    constructor(message, details = {}) {
        super(message, 'NETWORK_ERROR', details);
        this.name = 'NetworkError';
    }
}

/**
 * Error handler for centralized error management
 */
export const ErrorHandler = {
    /**
     * Handle an error by logging it and optionally displaying a user-friendly message
     * @param {Error} error - The error to handle
     * @param {boolean} showToUser - Whether to show the error to the user
     */
    handle(error, showToUser = true) {
        console.error('Error:', error);
        
        // Determine if error should be shown to user
        if (showToUser) {
            // Use notification system if available
            if (typeof window.showNotification === 'function') {
                window.showNotification(this.getUserFriendlyMessage(error), 'error');
            } else {
                console.warn(this.getUserFriendlyMessage(error));
            }
        }
        
        // Track error for analytics
        this.trackError(error);
    },

    /**
     * Get a user-friendly error message
     * @param {Error} error - The error object
     * @returns {string} A user-friendly error message
     */
    getUserFriendlyMessage(error) {
        // Handle specific error types
        if (error instanceof SparqlError) {
            return 'SPARQL endpoint error. Please check your endpoint settings.';
        }
        
        if (error instanceof NetworkError) {
            return 'Network error. Please check your connection and try again.';
        }
        
        if (error instanceof AppError) {
            return error.message;
        }
        
        // Generic error checking by name/message
        if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        }
        
        if (error.name === 'SyntaxError' || error.message.includes('syntax')) {
            return 'There was a syntax error in the request. Please try again.';
        }
        
        if (error.message.includes('endpoint') || error.message.includes('SPARQL')) {
            return 'SPARQL endpoint error. Please check your endpoint settings.';
        }
        
        // For security, don't expose detailed error messages to the user
        return error.userMessage || 'An error occurred. Please try again.';
    },
    
    /**
     * Track errors for analytics
     * @param {Error} error - The error to track
     */
    trackError(error) {
        // Basic implementation - can be expanded to send to a real analytics service
        if (window.errorLog === undefined) {
            window.errorLog = [];
        }
        
        window.errorLog.push({
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            type: error.name
        });
    },
    
    /**
     * Create a custom error with a user-friendly message
     * @param {string} message - Technical error message
     * @param {string} userMessage - User-friendly error message
     * @param {string} code - Error code
     * @returns {AppError} Custom error object
     */
    createError(message, userMessage, code = 'APP_ERROR') {
        const error = new AppError(message, code);
        error.userMessage = userMessage;
        return error;
    }
};
