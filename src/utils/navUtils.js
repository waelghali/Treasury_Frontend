// frontend/src/utils/navUtils.js

/**
 * Smart Link & Download Navigator Utility
 * Cleanly distinguishes between external URLs, file downloads, blob URLs, 
 * and internal in-app routes to ensure optimal user experience.
 */

export const resolveBackendUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }

  // If it's a relative backend endpoint (e.g., /api/v1/documents/download...)
  const rawApiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
  const backendHost = rawApiBase.replace(/\/api\/v1\/?$/, '');

  if (trimmed.startsWith('/api/')) {
    return `${backendHost}${trimmed}`;
  }
  return `${rawApiBase.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
};

export const isExternalOrFileUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.includes('/view-letter') ||
    trimmed.includes('/download')
  );
};

export const openOrNavigate = (url, navigate, options = {}) => {
  if (!url || typeof url !== 'string') return;
  const trimmed = url.trim();

  if (isExternalOrFileUrl(trimmed)) {
    const targetUrl = resolveBackendUrl(trimmed);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  } else if (typeof navigate === 'function') {
    navigate(trimmed, options);
  } else if (typeof window !== 'undefined') {
    window.location.href = trimmed;
  }
};

export const openInNewTab = (url) => {
  if (!url || typeof url !== 'string') return;
  const targetUrl = resolveBackendUrl(url.trim());
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
};

export const downloadBlobFile = (blob, fileName = 'document.pdf') => {
  if (!blob) return;
  try {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Failed to trigger blob download:', err);
  }
};
