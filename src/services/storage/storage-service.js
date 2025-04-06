// src/services/storage/storage-service.js
import { StorageError } from '../../core/errors/error-types.js';

/**
 * Simple localStorage wrapper
 */
class StorageService {
  constructor(prefix = 'squirt_') {
    this.prefix = prefix;
  }

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {*} Stored value or null if not found
   */
  getItem(key) {
    try {
      const value = localStorage.getItem(`${this.prefix}${key}`);
      if (value === null) return null;

      try {
        // Attempt to parse as JSON
        return JSON.parse(value);
      } catch (e) {
        // Return as-is if not JSON
        return value;
      }
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      throw new StorageError(`Failed to get item "${key}" from localStorage`);
    }
  }

  /**
   * Store item in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  setItem(key, value) {
    try {
      const serializedValue = typeof value === 'string'
        ? value
        : JSON.stringify(value);

      localStorage.setItem(`${this.prefix}${key}`, serializedValue);
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw new StorageError(`Failed to set item "${key}" in localStorage`);
    }
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw new StorageError(`Failed to remove item "${key}" from localStorage`);
    }
  }
}

// Create and export singleton instance
export const storageService = new StorageService();

// Factory function for creating new instances
export function createStorageService(prefix) {
  return new StorageService(prefix);
}