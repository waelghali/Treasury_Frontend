// src/services/dealerPushService.js
/**
 * Public Web Push service for bank dealers (Notifications N7a & N7b).
 * Connects directly to the unauthenticated public quotation endpoints.
 */

import apiClient from './apiClient';

export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIosDevice() {
    const ua = window.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function getNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission;
    }
    return 'default';
}

export function isPermissionDenied() {
    return getNotificationPermission() === 'denied';
}

export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function getDealerVapidPublicKey() {
    try {
        const res = await apiClient.get('/public-quotation/push/public-key');
        return res.data?.public_key || null;
    } catch (e) {
        console.warn('Could not fetch dealer VAPID public key:', e);
        return null;
    }
}

export async function getExistingSubscription() {
    if (!isPushSupported()) return null;
    try {
        const reg = await navigator.serviceWorker.ready;
        return await reg.pushManager.getSubscription();
    } catch {
        return null;
    }
}

export async function getDealerPushStatus(endpoint, token = null, email = null) {
    if (!endpoint) return { is_active: false };
    try {
        const res = await apiClient.post('/public-quotation/push/status', {
            endpoint,
            token,
            email
        });
        return res.data || { is_active: false };
    } catch {
        return { is_active: false };
    }
}

export async function subscribeDealerPush({ token, email, deviceLabel = null }) {
    if (!isPushSupported()) {
        throw new Error('Web Push notifications are not supported in this browser.');
    }

    const publicKey = await getDealerVapidPublicKey();
    if (!publicKey) {
        throw new Error('Mobile alerts are not enabled on this server.');
    }

    if (getNotificationPermission() === 'denied') {
        const err = new Error('Notification permission is blocked in your browser settings. Please allow notifications for this site in your browser settings.');
        err.code = 'PERMISSION_DENIED';
        throw err;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        const err = new Error('Notification permission was denied. Please allow notifications in your browser settings.');
        err.code = 'PERMISSION_DENIED';
        throw err;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
    }

    const json = sub.toJSON();
    const platform = isIosDevice() ? 'ios' : (/Android/.test(navigator.userAgent) ? 'android' : 'desktop');
    const label = deviceLabel || (isIosDevice() ? 'iPhone / iPad' : (platform === 'android' ? 'Android Device' : 'Desktop Browser'));

    const res = await apiClient.post('/public-quotation/push/subscribe', {
        token,
        email: email.trim().toLowerCase(),
        endpoint: sub.endpoint,
        keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth
        },
        device_label: label,
        platform
    });

    return res.data;
}

export async function unsubscribeDealerPush(endpoint, token = null) {
    if (!endpoint) return;
    try {
        await apiClient.post('/public-quotation/push/unsubscribe', { endpoint, token });
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            await sub.unsubscribe();
        }
    } catch (e) {
        console.warn('Dealer push unsubscribe error:', e);
    }
}

export async function getStandingSetup(setupToken) {
    const res = await apiClient.get(`/public-quotation/dealer-alerts/setup/${setupToken}`);
    return res.data;
}

export async function subscribeStandingSetup(setupToken, deviceLabel = null) {
    if (!isPushSupported()) {
        throw new Error('Web Push notifications are not supported in this browser.');
    }

    const publicKey = await getDealerVapidPublicKey();
    if (!publicKey) {
        throw new Error('Mobile alerts are not enabled on this server.');
    }

    if (getNotificationPermission() === 'denied') {
        const err = new Error('Notification permission is blocked in your browser settings. Please allow notifications for this site in your browser settings.');
        err.code = 'PERMISSION_DENIED';
        throw err;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        const err = new Error('Notification permission was denied. Please allow notifications in your browser settings.');
        err.code = 'PERMISSION_DENIED';
        throw err;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
    }

    const json = sub.toJSON();
    const platform = isIosDevice() ? 'ios' : (/Android/.test(navigator.userAgent) ? 'android' : 'desktop');
    const label = deviceLabel || (isIosDevice() ? 'iPhone / iPad' : (platform === 'android' ? 'Android Device' : 'Desktop Browser'));

    const res = await apiClient.post(`/public-quotation/dealer-alerts/setup/${setupToken}/subscribe`, {
        endpoint: sub.endpoint,
        keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth
        },
        device_label: label,
        platform
    });

    return res.data;
}

export async function optOutStandingSetup(setupToken) {
    const res = await apiClient.post(`/public-quotation/dealer-alerts/setup/${setupToken}/opt-out`);
    return res.data;
}
