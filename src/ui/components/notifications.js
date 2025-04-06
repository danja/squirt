/**
 * Notifications system for the application
 */

let notificationsContainer;

/**
 * Initialize the notifications system
 */
export function initializeNotifications() {
    console.log('Initializing notifications system');
    
    // Create container if it doesn't exist
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
        
        // Add styles if not already in the document
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notifications-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 300px;
                }
                
                .notification {
                    padding: 10px 15px;
                    border-radius: 4px;
                    color: white;
                    animation: notification-slide-in 0.3s ease-out;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    position: relative;
                    overflow: hidden;
                }
                
                .notification::before {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.5);
                    animation: notification-timer 5s linear forwards;
                }
                
                .notification.success {
                    background-color: var(--success-color, #48bb78);
                }
                
                .notification.error {
                    background-color: var(--error-color, #f56565);
                }
                
                .notification.info {
                    background-color: var(--primary-color, #4299e1);
                }
                
                .notification.warning {
                    background-color: #ed8936;
                }
                
                .notification.fade-out {
                    opacity: 0;
                    transform: translateX(100%);
                    transition: opacity 0.3s, transform 0.3s;
                }
                
                @keyframes notification-slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes notification-timer {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Make showNotification globally available
    window.showNotification = showNotification;
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info, warning)
 * @param {number} duration - How long to show the notification in ms
 */
export function showNotification(message, type = 'info', duration = 5000) {
    // Create the notification container if it doesn't exist
    if (!notificationsContainer) {
        initializeNotifications();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to container
    notificationsContainer.appendChild(notification);
    
    // Set up removal after duration
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, duration);
    
    return notification;
}

/**
 * Show an error notification
 * @param {string} message - The error message
 * @param {number} duration - How long to show the notification in ms
 */
export function showError(message, duration = 5000) {
    return showNotification(message, 'error', duration);
}

/**
 * Show a success notification
 * @param {string} message - The success message
 * @param {number} duration - How long to show the notification in ms
 */
export function showSuccess(message, duration = 5000) {
    return showNotification(message, 'success', duration);
}

/**
 * Show an info notification
 * @param {string} message - The info message
 * @param {number} duration - How long to show the notification in ms
 */
export function showInfo(message, duration = 5000) {
    return showNotification(message, 'info', duration);
}

/**
 * Show a warning notification
 * @param {string} message - The warning message
 * @param {number} duration - How long to show the notification in ms
 */
export function showWarning(message, duration = 5000) {
    return showNotification(message, 'warning', duration);
}