// src/services/pushService.js
// Mobile alerts (Web Push) - Notifications Q3.
//
// Rules:
//  * Alerts belong to the person who switched them on in THIS browser.
//  * Explicit "Sign out" turns them off on this device.
//  * A session timeout does NOT turn them off (otherwise an idle phone would
//    stop receiving the alerts it exists for).
//  * If someone else signs in on this browser, the previous owner's alerts are
//    switched off here before anything else happens.
import apiClient from './apiClient';
import { getOrCreateDeviceId } from './apiService';

const OWNER_KEY = 'push_owner_user_id';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

const detectPlatform = () => {
  if (isIos()) return 'ios';
  if (/android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
};

const deviceLabel = () => {
  const ua = navigator.userAgent;
  const os = isIos() ? 'iPhone/iPad' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows'
    : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'Device';
  const browser = /edg\//i.test(ua) ? 'Edge' : /firefox/i.test(ua) ? 'Firefox'
    : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Browser';
  return `${os} - ${browser}`;
};

/**
 * Returns one of:
 *  'unsupported'     - browser cannot do push at all
 *  'needs-install'   - iPhone/iPad: must "Add to Home Screen" first (iOS 16.4+)
 *  'denied'          - user blocked notifications in browser/phone settings
 *  'enabled'         - this device is receiving alerts
 *  'available'       - can be switched on
 */
export const getPushStatus = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? 'enabled' : 'available';
};

const subscriptionBody = (sub) => {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    device_id: getOrCreateDeviceId(),
    device_label: deviceLabel(),
    platform: detectPlatform(),
  };
};

/** Must be called from a user tap (browsers require a gesture for the permission prompt). */
export const enablePush = async (userId) => {
  const { data } = await apiClient.get('/notifications/push/public-key');
  if (!data?.enabled) throw new Error('Mobile alerts are not enabled on this server yet.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed.');

  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    });
  }
  await apiClient.post('/notifications/push/subscribe', subscriptionBody(sub));
  localStorage.setItem(OWNER_KEY, String(userId));
  return true;
};

/**
 * Turns alerts off on this device. Always unsubscribes in the browser (the
 * server then sees the endpoint as gone and cleans up); tells the server too
 * when we still have a session.
 */
export const disablePushOnThisDevice = async ({ notifyServer = true } = {}) => {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    if (notifyServer) {
      try {
        await apiClient.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint });
      } catch (e) {
        console.warn('Push: server unsubscribe failed; browser unsubscribe still applies.', e);
      }
    }
    await sub.unsubscribe();
  } catch (e) {
    console.error('Push: could not disable on this device', e);
  } finally {
    localStorage.removeItem(OWNER_KEY);
  }
};

export const SWITCHED_OWNER_KEY = 'push_switched_owner_notice';

/**
 * Run after login / app start. If this browser's alerts belong to another
 * user, switch them off; if they belong to the current user, refresh the
 * server copy (keys can rotate).
 */
export const syncPushOwnership = async (userId) => {
  try {
    if (!('serviceWorker' in navigator) || !userId) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== String(userId)) {
      await sub.unsubscribe();
      localStorage.removeItem(OWNER_KEY);
      try {
        sessionStorage.setItem(SWITCHED_OWNER_KEY, 'true');
      } catch {}
      return;
    }
    if (owner === String(userId)) {
      await apiClient.post('/notifications/push/subscribe', subscriptionBody(sub));
    }
  } catch (e) {
    console.warn('Push: ownership sync skipped', e);
  }
};

/**
 * Fetch all registered active devices for the current user.
 */
export const listPushDevices = async () => {
  const { data } = await apiClient.get('/notifications/push/devices');
  return data || [];
};

/**
 * Revoke a specific device by its subscription ID.
 */
export const removePushDevice = async (deviceId) => {
  const { data } = await apiClient.delete(`/notifications/push/devices/${deviceId}`);
  return data;
};
