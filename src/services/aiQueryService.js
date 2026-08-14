// frontend/src/services/aiQueryService.js
import apiClient from './apiClient';

/**
 * Sends a query or card_id request to the 4-Level Treasury AI Assistant endpoint.
 * @param {string} question 
 * @param {string|null} cardId 
 * @returns {Promise<Object>} Response data from server
 */
export const sendAIQuery = async (question = '', cardId = null) => {
  try {
    const payload = {};
    if (cardId) payload.card_id = cardId;
    if (question) payload.question = question;

    const response = await apiClient.post('/ai-query-assistant/chat', payload);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      success: false,
      error: error.message || 'Network error occurred while contacting AI Assistant.'
    };
  }
};
