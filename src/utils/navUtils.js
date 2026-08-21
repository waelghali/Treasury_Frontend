// frontend/src/utils/navUtils.js

/**
 * Smart Link & Download Navigator Utility
 * Cleanly distinguishes between external URLs, file downloads, blob URLs, 
 * and internal in-app routes to ensure optimal user experience.
 */

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
    window.open(trimmed, '_blank', 'noopener,noreferrer');
  } else if (typeof navigate === 'function') {
    navigate(trimmed, options);
  } else if (typeof window !== 'undefined') {
    window.location.href = trimmed;
  }
};

export const openInNewTab = (url) => {
  if (!url || typeof url !== 'string') return;
  window.open(url.trim(), '_blank', 'noopener,noreferrer');
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
