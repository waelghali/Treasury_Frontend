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

/**
 * Opens a blank browser tab synchronously within a user click gesture so modern
 * popup blockers (Chrome/Edge/Safari) don't block it after an async API call.
 *
 * Usage:
 *   const tab = openPendingTab('Generating letter...');
 *   try {
 *     const blob = await apiRequest(...);
 *     tab.setBlob(blob); // or tab.setUrl(url) / tab.setHtml(html)
 *   } catch (err) {
 *     tab.close();
 *   }
 */
export const openPendingTab = (title = 'Loading document...') => {
  const safeTitle = String(title).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  let win = null;
  try {
    win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${safeTitle}</title></head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#334155;">
  <div style="text-align:center;">
    <div style="font-size:15px;font-weight:600;margin-bottom:6px;">${safeTitle}</div>
    <div style="font-size:13px;color:#64748b;">Please wait a moment...</div>
  </div>
</body>
</html>`);
      win.document.close();
    }
  } catch (err) {
    console.warn('openPendingTab failed:', err);
  }

  const close = () => {
    try {
      if (win && !win.closed) win.close();
    } catch {}
  };

  const setUrl = (url) => {
    if (!url || typeof url !== 'string') {
      close();
      return false;
    }
    const targetUrl = resolveBackendUrl(url.trim());
    if (win && !win.closed) {
      win.location.href = targetUrl;
      return true;
    }
    return !!window.open(targetUrl, '_blank');
  };

  const setBlob = (blob) => {
    if (!blob) {
      close();
      return null;
    }
    const blobUrl = window.URL.createObjectURL(blob);
    if (win && !win.closed) {
      win.location.href = blobUrl;
    } else {
      window.open(blobUrl, '_blank');
    }
    return blobUrl;
  };

  const setHtml = (html) => {
    if (!html) {
      close();
      return false;
    }
    if (win && !win.closed) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      return true;
    }
    return false;
  };

  return {
    win,
    isBlocked: !win,
    setUrl,
    setBlob,
    setHtml,
    close,
  };
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
