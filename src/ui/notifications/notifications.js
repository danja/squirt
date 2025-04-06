// src/ui/notifications/notifications.js
import { eventBus, EVENTS } from '../../core/events/event-bus.js';
import { store } from '../../core/state/index.js';
import { showNotification as showNotificationAction, hideNotification } from '../../core/state/actions.js';
import { getNotifications } from '../../core/state/selectors.js';

let notificationsContainer;

/**
 * Initialize the notifications system
 */
export function initNotifications() {
  console.log('Initializing notifications system');
  
  // Create container if it doesn't exist
  if (!notificationsContainer) {
    notificationsContainer = document.querySelector('.notifications-container');
    
    if (!notificationsContainer) {
      notificationsContainer = document.createElement('div');
      notificationsContainer.className = 'notifications-container';
      document.body.appendChild(notificationsContainer);
    }
  }
  
  // Subscribe to state changes
  store.subscribe(renderNotifications);
  
  // Subscribe to notification events
  eventBus.on(EVENTS.NOTIFICATION_SHOW, handleNotificationEvent);
  
  // Add global function for components to use
  window.showNotification = showNotification;
}

/**
 * Handle notification events
 * @param {Object} notification - Notification data
 */
function handleNotificationEvent(notification) {
  showNotification(
    notification.message,
    notification.type,
    notification.duration
  );
}

/**
 * Show a notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
 * @param {number} duration - How long to show in ms (0 for permanent)
 */
export function showNotification(message, type = 'info', duration = 5000) {
  const id = Date.now();
  
  // Add to state
  store.dispatch(showNotificationAction({
    id,
    message,
    type,
    duration,
    timestamp: new Date().toISOString()
  }));
  
  // Set timeout to remove if duration is specified
  if (duration > 0) {
    setTimeout(() => {
      store.dispatch(hideNotification(id));
    }, duration);
  }
  
  return id;
}

/**
 * Hide a notification
 * @param {number} id - Notification ID
 */
export function hideNotificationById(id) {
  store.dispatch(hideNotification(id));
}

/**
 * Render notifications from state
 */
function renderNotifications() {
  const notifications = getNotifications(store.getState());
  
  // Clear existing DOM notifications
  const existingElements = notificationsContainer.querySelectorAll('.notification');
  const existingIds = new Set();
  
  existingElements.forEach(element => {
    const id = parseInt(element.dataset.id, 10);
    existingIds.add(id);
    
    // If notification is no longer in state, remove it with animation
    if (!notifications.find(n => n.id === id)) {
      element.classList.add('fade-out');
      setTimeout(() => element.remove(), 300);
    }
  });
  
  // Add new notifications
  notifications.forEach(notification => {
    if (!existingIds.has(notification.id)) {
      createNotificationElement(notification);
    }
  });
}

/**
 * Create a notification DOM element
 * @param {Object} notification - Notification data
 */
function createNotificationElement(notification) {
  const element = document.createElement('div');
  element.className = `notification ${notification.type}`;
  element.dataset.id = notification.id;
  element.textContent = notification.message;
  
  // Add close button if duration is 0 (permanent)
  if (notification.duration === 0) {
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      hideNotificationById(notification.id);
    });
    element.appendChild(closeButton);
  }
  
  // Add to container
  notificationsContainer.appendChild(element);
  
  return element;
}

// Export convenience methods
export const showSuccess = (msg, duration) => showNotification(msg, 'success', duration);
export const showError = (msg, duration) => showNotification(msg, 'error', duration);
export const showInfo = (msg, duration) => showNotification(msg, 'info', duration);
export const showWarning = (msg, duration) => showNotification(msg, 'warning', duration);
