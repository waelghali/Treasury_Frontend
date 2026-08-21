// frontend/src/utils/sanitize.js

/**
 * Safe String & Input Sanitizer Utility
 * Strips XSS and dangerous script payloads while fully preserving Arabic characters, 
 * punctuation, currency symbols, and numeric values.
 */

export const sanitizeString = (input) => {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return String(input);

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
    .replace(/javascript:/gi, '') // Strip inline javascript pseudoprotocol
    .replace(/onerror\s*=/gi, '') // Strip inline event handlers
    .replace(/onload\s*=/gi, '')
    .replace(/onclick\s*=/gi, '');
};

export const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  // Truncate overly long queries to avoid ReDoS or memory issues
  const trimmed = query.trim().slice(0, 200);
  // Strip control characters while keeping Arabic, Latin, Numbers, and common search punctuation
  return trimmed.replace(/[\x00-\x1F\x7F]/g, '');
};

export const formatMaskedIban = (iban) => {
  if (!iban || typeof iban !== 'string') return '';
  const clean = iban.replace(/\s+/g, '');
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} **** **** ${clean.slice(-4)}`;
};
