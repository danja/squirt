// src/services/storage/storage-service.js
import { StorageError } from '../../core/errors/error-types.js';

/**
 * Interface for storage services
 */
export class StorageService {
  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {*} Stored value or null if not found
   */
  getItem(key) {
    throw new Error('Method not implemented');
  }

  /**
   * Store item in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  setItem(key, value) {
    throw new Error('Method not implemented');
  }// src/services/storage/storage-service.js
import { StorageError } from '../../core/errors/error-types.js';

/**
 * Interface for storage services
 */
export class StorageService {
  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {*} Stored value or null if not found
   */
  getItem(key) {
    throw new Error('Method not implemented');
  }

  /**
   * Store item in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  setItem(key, value) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Remove item from storage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Clear all items from storage
   */
  clear() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get all keys in storage
   * @returns {Array<string>} Array of keys
   */
  keys() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if key exists in storage
   * @param {string} key - Storage key
   * @returns {boolean} True if key exists
   */
  has(key) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get storage usage size in bytes
   * @returns {number} Size in bytes
   */
  getSize() {
    throw new Error('Method not implemented');
  }
}

/**
 * Local storage implementation
 */
export class LocalStorageService extends StorageService {
  constructor(prefix = 'squirt_') {
    super();
    this.prefix = prefix;
  }
  
  /**
   * Create prefixed key
   * @param {string} key - Original key
   * @returns {string} Prefixed key
   * @private
   */
  _getKey(key) {
    return `${this.prefix}${key}`;
  }
  
  getItem(key) {
    try {
      const value = localStorage.getItem(this._getKey(key));
      if (value === null) return null;
      
      try {
        // Attempt to parse as JSON
        return JSON.parse(value);
      } catch (e) {
        // Return as-is if not JSON
        return value;
      }
    } catch (error) {
      throw new StorageError(`Failed to get item "${key}" from localStorage`, {
        originalError: error,
        key
      });
    }
  }
  
  setItem(key, value) {
    try {
      const serializedValue = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
        
      localStorage.setItem(this._getKey(key), serializedValue);
    } catch (error) {
      throw new StorageError(`Failed to set item "${key}" in localStorage`, {
        originalError: error,
        key,
        value
      });
    }
  }
  
  removeItem(key) {
    try {
      localStorage.removeItem(this._getKey(key));
    } catch (error) {
      throw new StorageError(`Failed to remove item "${key}" from localStorage`, {
        originalError: error,
        key
      });
    }
  }
  
  clear() {
    try {
      // Only clear keys with our prefix
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      throw new StorageError('Failed to clear localStorage', {
        originalError: error
      });
    }
  }
  
  keys() {
    try {
      const keys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      
      return keys;
    } catch (error) {
      throw new StorageError('Failed to get keys from localStorage', {
        originalError: error
      });
    }
  }
  
  has(key) {
    return localStorage.getItem(this._getKey(key)) !== null;
  }
  
  getSize() {
    try {
      let total = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          total += key.length + localStorage.getItem(key).length;
        }
      }
      
      // Size in bytes (approximate - 2 bytes per character in UTF-16)
      return total * 2;
    } catch (error) {
      throw new StorageError('Failed to calculate localStorage size', {
        originalError: error
      });
    }
  }
}

/**
 * In-memory storage implementation (for testing or environments without localStorage)
 */
export class MemoryStorageService extends StorageService {
  constructor() {
    super();
    this.storage = new Map();
  }
  
  getItem(key) {
    return this.storage.has(key) ? this.storage.get(key) : null;
  }
  
  setItem(key, value) {
    this.storage.set(key, value);
  }
  
  removeItem(key) {
    this.storage.delete(key);
  }
  
  clear() {
    this.storage.clear();
  }
  
  keys() {
    return Array.from(this.storage.keys());
  }
  
  has(key) {
    return this.storage.has(key);
  }
  
  getSize() {
    let size = 0;
    
    this.storage.forEach((value, key) => {
      // Estimate size by converting to JSON string
      const jsonValue = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
        
      size += key.length + jsonValue.length;
    });
    
    // Size in bytes (approximate - 2 bytes per character in UTF-16)
    return size * 2;
  }
}

// Factory function to create the appropriate storage service
export function createStorageService() {
  try {
    // Check if localStorage is available
    if (typeof localStorage !== 'undefined') {
      // Test if we can use it
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      
      return new LocalStorageService();
    }
  } catch (e) {
    console.warn('localStorage not available, falling back to memory storage');
  }
  
  // Fall back to memory storage
  return new MemoryStorageService();
}

// Export default instance
export const storageService = createStorageService();