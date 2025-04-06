// src/js/ui/components/endpoint-indicator.js
import { state } from '../../core/state.js';

/**
 * Manages the endpoint status indicator in the header
 */
export class EndpointStatusIndicator {
  constructor() {
    // Bind methods to preserve 'this' context
    this.handleEndpointChange = this.handleEndpointChange.bind(this);
    this.handleStatusChangeEvent = this.handleStatusChangeEvent.bind(this);
    this.handleStatusCheckedEvent = this.handleStatusCheckedEvent.bind(this);
    
    this.indicator = document.getElementById('endpoint-status-indicator');
    
    if (!this.indicator) {
      console.error('Endpoint status indicator element not found');
      return;
    }
    
    // Initialize the indicator content
    this.statusLight = this.indicator.querySelector('.status-light');
    
    // Initialize status
    this.updateStatus('checking', 'Checking endpoint status...');
    
    // Subscribe to endpoint changes
    state.subscribe('endpoints', this.handleEndpointChange);
    
    // Listen for endpoint status events
    document.addEventListener('endpointStatusChanged', this.handleStatusChangeEvent);
    document.addEventListener('endpointsStatusChecked', this.handleStatusCheckedEvent);
    
    // Add click handler to force endpoint check
    this.indicator.addEventListener('click', () => {
      this.updateStatus('checking', 'Checking endpoints...');
      
      // Dispatch an event to request endpoint check
      try {
        const event = new CustomEvent('checkEndpointsRequest');
        document.dispatchEvent(event);
      } catch (error) {
        console.error('Error dispatching endpoint check request:', error);
      }
    });
  }
  
  /**
   * Handle endpoint state changes
   */
  handleEndpointChange(endpoints) {
    try {
      if (!endpoints || endpoints.length === 0) {
        this.updateStatus('inactive', 'No endpoints configured');
        return;
      }
      
      const activeEndpoint = endpoints.find(e => e.status === 'active');
      if (activeEndpoint) {
        this.updateStatus('active', `SPARQL endpoint available: ${activeEndpoint.url}`);
      } else if (endpoints.some(e => e.status === 'checking')) {
        this.updateStatus('checking', 'Checking endpoints...');
      } else {
        this.updateStatus('inactive', 'No available endpoints');
      }
    } catch (error) {
      console.error('Error handling endpoint change:', error);
    }
  }
  
  /**
   * Handle endpoint status change event
   */
  handleStatusChangeEvent(e) {
    try {
      if (e.detail) {
        const { status, url, label } = e.detail;
        
        if (status === 'active') {
          this.updateStatus('active', `SPARQL endpoint available: ${url}`);
        }
      }
    } catch (error) {
      console.error('Error handling status change event:', error);
    }
  }
  
  /**
   * Handle endpoints status checked event
   */
  handleStatusCheckedEvent(e) {
    try {
      if (e.detail && e.detail.anyActive) {
        // Find which endpoint is active
        const endpoints = state.get('endpoints') || [];
        const activeEndpoint = endpoints.find(e => e.status === 'active');
        
        if (activeEndpoint) {
          this.updateStatus('active', `SPARQL endpoint available: ${activeEndpoint.url}`);
        } else {
          this.updateStatus('active', 'SPARQL endpoint is available');
        }
      } else {
        this.updateStatus('inactive', 'No available endpoints');
      }
    } catch (error) {
      console.error('Error handling status checked event:', error);
    }
  }
  
  /**
   * Update the visual status of the indicator
   * @param {string} status - The status: 'active', 'inactive', or 'checking'
   * @param {string} [message] - Optional tooltip message
   */
  updateStatus(status, message = '') {
    try {
      if (!this.statusLight) return;
      
      // Remove all status classes
      this.statusLight.classList.remove('active', 'inactive', 'checking');
      
      // Add the appropriate class
      this.statusLight.classList.add(status);
      
      // Update tooltip
      this.indicator.title = message || status;
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }
}

/**
 * Initialize the endpoint status indicator
 */
export function initializeEndpointIndicator() {
  try {
    return new EndpointStatusIndicator();
  } catch (error) {
    console.error('Error initializing endpoint indicator:', error);
    return null;
  }
}