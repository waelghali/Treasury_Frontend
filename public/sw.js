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

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options).catch((err) => {
        console.warn('[SW] showNotification error with full options, retrying basic:', err);
        return self.registration.showNotification(title, {
          body: options.body,
          data: options.data,
        });
      }),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((c) => {
            try {
              c.postMessage({ type: 'PUSH_NOTIFICATION_RECEIVED', data });
            } catch (e) { /* ignore */ }
          });
        })
        .catch(() => {}),
    ])
  );
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
  // Self-healing background token rotation (APNs / FCM key rotation).
  // Re-subscribes using the existing applicationServerKey and rotates the endpoint on the server.
  event.waitUntil((async () => {
    try {
      const oldSub = event.oldSubscription;
      let newSub = event.newSubscription;
      if (!newSub && oldSub && oldSub.options) {
        newSub = await self.registration.pushManager.subscribe(oldSub.options);
      }
      if (newSub && oldSub && oldSub.endpoint) {
        const json = newSub.toJSON();
        if (json && json.endpoint && json.keys && json.keys.p256dh && json.keys.auth) {
          await fetch('/api/v1/notifications/push/rotate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              old_endpoint: oldSub.endpoint,
              new_endpoint: json.endpoint,
              keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            }),
          });
        }
      }
    } catch (err) {
      console.warn('[SW] Background pushsubscriptionchange rotation failed:', err);
    }
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    all.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }));
  })());
});
