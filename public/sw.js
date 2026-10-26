/* Grow Treasury service worker (Notifications Q2 - PWA shell).
 *
 * Scope: push display + notification click routing ONLY.
 * Deliberately NO fetch handler and NO caching: the app must always load
 * fresh from the network (financial data, no stale shells).
 *
 * Rules (see docs/QUOTATION_SYSTEM_ROADMAP.md section 11.0):
 *  - Every push MUST show a notification. Silent pushes make Safari/Chrome
 *    revoke the subscription.
 *  - No timers here: the browser kills an idle worker after ~30s. Timing
 *    lives on the server (TTL / expires_at).
 *  - Payload text is already redacted by the server (RFQ ref + action only).
 */

const DEFAULT_ICON = '/icons/icon-192.png';
const DEFAULT_BADGE = '/icons/badge-96.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function sameOriginPath(url) {
  // Only allow in-app navigation; anything else falls back to the app root.
  try {
    const u = new URL(url || '/app', self.location.origin);
    if (u.origin !== self.location.origin) return '/app';
    return u.pathname + u.search + u.hash;
  } catch (e) {
    return '/app';
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Grow Treasury', body: event.data ? event.data.text() : '' };
  }

  const expired = data.expires_at && Date.parse(data.expires_at) < Date.now();
  const title = expired ? 'Grow Treasury' : (data.title || 'Grow Treasury');
  const options = {
    body: expired ? 'An alert expired before it arrived. Open Grow to review.' : (data.body || ''),
    icon: data.icon || DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    timestamp: Date.now(),
    data: { url: sameOriginPath(expired ? '/app' : data.url) },
  };

  // Always show something (see rules above), even for expired payloads.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = sameOriginPath(event.notification.data && event.notification.data.url);

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) {
          try { await client.navigate(target); } catch (e) { /* cross-state; fall through */ }
        }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Q3 will re-subscribe and POST the new subscription to the backend.
  // Until then, tell open tabs so they can refresh on next load.
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    all.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }));
  })());
});
