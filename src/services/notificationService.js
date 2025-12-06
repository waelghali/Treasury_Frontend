// frontend/src/services/notificationService.js
import apiClient from './apiClient'; 

/**
 * Fetches all active system notifications relevant to the End User.
 * This includes global notifications and those targeted at the user's customer.
 * @returns {Array} An array of active system notification objects.
 */
export const fetchActiveSystemNotifications = async () => {
    try {
        const response = await apiClient.get('/end-user/system-notifications/');
        return response.data;
    } catch (error) {
        console.error('Error fetching end user system notifications:', error);
        // It's safe to return an empty array on error, as notifications are not critical to page functionality.
        return [];
    }
};

/**
 * Fetches all active system notifications relevant to the Corporate Admin user.
 * This includes global notifications and those targeted at the admin's customer.
 * @returns {Array} An array of active system notification objects.
 */
export const fetchActiveCorporateAdminNotifications = async () => {
    try {
        const response = await apiClient.get('/corporate-admin/system-notifications/'); // Targets Corporate Admin endpoint
        return response.data;
    } catch (error) {
        console.error('Error fetching Corporate Admin system notifications:', error);
        return [];
    }
};

/**
 * Sends a POST request to log that a user has viewed a notification.
 * This is separate from the acknowledgment (dismissal).
 * @param {number} notificationId The ID of the notification being viewed.
 */
export const logNotificationView = async (notificationId) => { 
    try {
        // Targets the new backend view logging endpoint for end users (assuming CA uses a similar structure or separate endpoint)
        const response = await apiClient.post(`/end-user/system-notifications/${notificationId}/view`); 
        return response.data;
    } catch (error) {
        console.error(`Error logging view for notification ${notificationId}:`, error);
        // Do not block the user, just log the error
    }
};

/**
 * Sends a POST request to explicitly acknowledge a notification.
 * This increments the view count and triggers dismissal logic on the backend.
 * @param {number} notificationId The ID of the notification being acknowledged.
 * @returns {Promise<object>} The response data, usually a status object.
 */
export const acknowledgeSystemNotification = async (notificationId) => {
    try {
        // Updated endpoint: /acknowledge
        const response = await apiClient.post(`/end-user/system-notifications/${notificationId}/acknowledge`); 
        return response.data;
    } catch (error) {
        console.error(`Error acknowledging notification ${notificationId}:`, error);
        throw error; // Propagate the error
    }
};