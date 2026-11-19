// frontend/src/utils/publicTelemetry.js
import { API_BASE_URL } from '../services/apiService';

export const PUBLIC_SESSION_ID_KEY = 'grow_public_expert_session_v1';
const PUBLIC_VISITOR_ID_KEY = 'grow_public_visitor_v1';
const PUBLIC_ATTRIBUTION_KEY = 'grow_public_ref_v1';

const recentPageViewGuard = new Map();

export function getOrCreatePublicSessionId() {
  if (typeof window === 'undefined') return 'ssr-anon';
  try {
    let existing = window.sessionStorage.getItem(PUBLIC_SESSION_ID_KEY);
    if (!existing) {
      const rand = Math.random().toString(36).slice(2, 10);
      existing = `pub_${Date.now().toString(36)}_${rand}`;
      window.sessionStorage.setItem(PUBLIC_SESSION_ID_KEY, existing);
    }
    return existing;
  } catch {
    return `pub_${Date.now().toString(36)}`;
  }
}

export function getOrCreatePublicVisitorId() {
  if (typeof window === 'undefined') return 'ssr-vis';
  try {
    let existing = window.localStorage.getItem(PUBLIC_VISITOR_ID_KEY);
    if (!existing) {
      const rand = Math.random().toString(36).slice(2, 11);
      existing = `vis_${Date.now().toString(36)}_${rand}`;
      window.localStorage.setItem(PUBLIC_VISITOR_ID_KEY, existing);
    }
    return existing;
  } catch {
    return getOrCreatePublicSessionId();
  }
}

function resolveAttributionOnce() {
  if (typeof window === 'undefined') {
    return { source: 'Direct', campaign: '' };
  }
  try {
    const cached = window.sessionStorage.getItem(PUBLIC_ATTRIBUTION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.source) return parsed;
    }
  } catch {
    // ignore
  }

  let source = 'Direct';
  let campaign = '';

  try {
    const params = new URLSearchParams(window.location.search || '');
    const utmSource = (params.get('utm_source') || '').trim();
    const utmMedium = (params.get('utm_medium') || '').trim();
    campaign = (params.get('utm_campaign') || '').trim();

    if (utmSource) {
      const low = utmSource.toLowerCase();
      if (low.includes('linkedin')) source = 'LinkedIn';
      else if (low.includes('whatsapp') || low === 'wa') source = 'WhatsApp';
      else if (low.includes('google')) source = utmMedium === 'cpc' ? 'Google Ads' : 'Google';
      else if (low.includes('facebook') || low.includes('meta') || low.includes('ig')) source = 'Facebook / Meta';
      else if (low.includes('email') || low.includes('newsletter')) source = 'Email';
      else source = utmSource.slice(0, 40);
    } else if (typeof document !== 'undefined' && document.referrer) {
      const refUrl = new URL(document.referrer);
      const host = (refUrl.hostname || '').toLowerCase().replace(/^www\./, '');
      const myHost = (window.location.hostname || '').toLowerCase().replace(/^www\./, '');
      if (host && host !== myHost && host !== 'localhost' && host !== '127.0.0.1') {
        if (host.includes('linkedin')) source = 'LinkedIn';
        else if (host.includes('google')) source = 'Google Search';
        else if (host.includes('bing')) source = 'Bing Search';
        else if (host.includes('whatsapp') || host.includes('wa.me')) source = 'WhatsApp';
        else if (host.includes('facebook') || host.includes('instagram') || host.includes('fb.')) source = 'Facebook / Meta';
        else if (host.includes('t.co') || host.includes('twitter') || host.includes('x.com')) source = 'X / Twitter';
        else if (host.includes('youtube')) source = 'YouTube';
        else source = host.slice(0, 50);
      }
    }
  } catch {
    source = 'Direct';
  }

  const attribution = { source, campaign };
  try {
    window.sessionStorage.setItem(PUBLIC_ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // ignore
  }
  return attribution;
}

function detectDeviceType() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth || 1280;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function isLocalhostRuntime() {
  if (typeof window === 'undefined' || !window.location) return false;
  const host = (window.location.hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.local')
  );
}

export function trackPublicEvent(eventType, options = {}) {
  if (typeof window === 'undefined') return;
  if (isLocalhostRuntime()) {
    try {
      const allowLocalDebug = window.localStorage.getItem('grow_debug_public_telemetry') === 'true';
      const targetsProdApi = String(API_BASE_URL || '').toLowerCase().includes('growbusinessdevelopment.com');
      if (!allowLocalDebug || targetsProdApi) {
        return;
      }
    } catch {
      return;
    }
  }
  try {
    const sessionId = getOrCreatePublicSessionId();
    const visitorId = getOrCreatePublicVisitorId();
    const path = options.path || `${window.location.pathname || '/'}`;
    const page = options.page || '';
    const lang = options.lang || 'en';
    const metadata = options.metadata || {};

    if (eventType === 'page_view') {
      if (recentPageViewGuard.size > 200) {
        recentPageViewGuard.clear();
      }
      const guardKey = `${sessionId}:${page}:${path}`;
      const prevTs = recentPageViewGuard.get(guardKey) || 0;
      const now = Date.now();
      if (now - prevTs < 4000) {
        return;
      }
      recentPageViewGuard.set(guardKey, now);
    }

    const { source, campaign } = resolveAttributionOnce();

    const body = JSON.stringify({
      event_type: eventType,
      session_id: sessionId,
      visitor_id: visitorId,
      page,
      path,
      referrer_source: source,
      utm_campaign: campaign,
      device_type: detectDeviceType(),
      lang,
      metadata,
    });

    fetch(`${API_BASE_URL}/public-demo/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never interrupt public page UX
  }
}
