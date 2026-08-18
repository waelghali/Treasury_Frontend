// frontend/src/services/aiQueryService.js
import apiClient from './apiClient';

/**
 * Sends a query or card_id request to the 4-Level Treasury AI Assistant endpoint.
 * Supports both object payload ({ question, cardId }) and positional arguments (question, cardId).
 * @param {string|Object} questionOrPayload 
 * @param {string|null} maybeCardId 
 * @returns {Promise<Object>} Response data from server
 */
export const sendAIQuery = async (questionOrPayload = '', maybeCardId = null) => {
  try {
    let question = '';
    let cardId = null;

    if (typeof questionOrPayload === 'object' && questionOrPayload !== null) {
      question = questionOrPayload.question || '';
      cardId = questionOrPayload.cardId || questionOrPayload.card_id || null;
    } else {
      question = questionOrPayload || '';
      cardId = maybeCardId || null;
    }

    const payload = {};
    if (cardId) payload.card_id = cardId;
    if (question) payload.question = typeof question === 'string' ? question : String(question);

    const response = await apiClient.post('/ai-query-assistant/chat', payload);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const data = error.response.data;
      if (typeof data.detail === 'string') {
        return { success: false, error: data.detail };
      }
      return data;
    }
    return {
      success: false,
      error: error.message || 'Network error occurred while contacting AI Assistant.'
    };
  }
};
