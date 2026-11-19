// frontend/src/utils/smartNavigation.js
import { safeLocalStorage, safeSessionStorage } from './safeStorage';

/**
 * Lightweight, zero-backend Adaptive Post-Login Navigation Utility.
 *
 * - Learns which canonical workspace hub a user settles on right after login
 *   using Exponentially Weighted Moving Average (EWMA) scores in localStorage.
 * - Adapts to attitude shifts in ~4-5 logins while ignoring 1-2 off-pattern detours.
 * - Avoids feedback-loop lock-in by crediting the *settled* hub (15s active dwell),
 *   not pages the user immediately bounces away from.
 * - Resumes the exact interrupted page after short idle timeouts (<= 15 min),
 *   and uses the Smart Habit hub after longer breaks (> 15 min).
 */

export const SHORT_BREAK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes after session expiry
export const ORIENTATION_WINDOW_MS = 2 * 60 * 1000;     // Observe only first <= 2 min post-login
export const SETTLE_DWELL_MS = 15 * 1000;               // 15s visible dwell = settled destination
export const DECAY_FACTOR = 0.85;                       // Recency decay (~4-5 logins to flip)
export const MIN_CONFIDENCE_SCORE = 2.7;                // ~4 consistent logins on cold start
const MIN_PRUNE_SCORE = 0.05;

const SMART_NAV_PREFIX = 'grow_smart_nav_';
const LAST_SESSION_ROUTE_KEY = 'grow_last_session_route';
const IDLE_LOGOUT_META_KEY = 'grow_idle_logout_meta';
const LAST_LOGOUT_META_KEY = 'grow_last_logout_meta';
const TAB_LAST_AUTH_PATH_KEY = 'grow_tab_last_auth_path';
const ORIENTATION_KEY = 'grow_post_login_orientation';

const cleanPathname = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const withoutQuery = rawPath.split('?')[0].split('#')[0];
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery;
};

/**
 * Maps a raw pathname to a canonical operational Workspace Hub `{ path, label }`
 * if eligible for the user's current role and enabled tenant modules.
 * Returns `null` for utility, setup, admin-config, or transient routes.
 */
export const normalizeToHub = (rawPath, role, moduleState = {}) => {
  const pathname = cleanPathname(rawPath);
  if (!pathname || !role) return null;

  const custody = Boolean(moduleState?.hasCustodyModule);
  const issuance = Boolean(moduleState?.hasIssuanceModule);
  const quotation = moduleState?.hasQuotationModule !== undefined ? Boolean(moduleState.hasQuotationModule) : true;
  const reconciliation = moduleState?.hasReconciliationModule !== undefined ? Boolean(moduleState.hasReconciliationModule) : true;
  const isQuotationOnly = !custody && !issuance && quotation;

  if (role === 'system_owner') {
    if (pathname.startsWith('/system-owner/dashboard')) {
      return { path: '/system-owner/dashboard', label: 'Executive Dashboard' };
    }
    if (pathname.startsWith('/system-owner/customers/trial-registrations')) {
      return { path: '/system-owner/customers/trial-registrations', label: 'Trial Registrations' };
    }
    if (pathname === '/system-owner/customers' || /^\/system-owner\/customers\/[^/]+\/details$/.test(pathname)) {
      return { path: '/system-owner/customers', label: 'Customer Tenants' };
    }
    if (pathname.startsWith('/system-owner/quotations-telemetry')) {
      return { path: '/system-owner/quotations-telemetry', label: 'Quotation Telemetry' };
    }
    if (pathname.startsWith('/system-owner/live-ranking')) {
      return { path: '/system-owner/live-ranking', label: 'Live Ranking Matrix' };
    }
    if (pathname.startsWith('/system-owner/campaigns')) {
      return { path: '/system-owner/campaigns', label: 'Partner Campaigns' };
    }
    if (pathname.startsWith('/system-owner/feedback')) {
      return { path: '/system-owner/feedback', label: 'User Feedback' };
    }
    if (pathname.startsWith('/system-owner/reports')) {
      return { path: '/system-owner/reports', label: 'Platform Analytics' };
    }
    if (pathname.startsWith('/system-owner/audit-logs')) {
      return { path: '/system-owner/audit-logs', label: 'Audit Logs' };
    }
    return null;
  }

  if (role === 'corporate_admin') {
    if (pathname.startsWith('/corporate-admin/dashboard')) {
      return isQuotationOnly ? null : { path: '/corporate-admin/dashboard', label: 'Dashboard' };
    }
    if (pathname.startsWith('/corporate-admin/action-center')) {
      return (custody || issuance) ? { path: '/corporate-admin/action-center', label: 'Action Center' } : null;
    }
    if (pathname.startsWith('/corporate-admin/activity')) {
      return { path: '/corporate-admin/activity', label: 'Activity & Controls' };
    }
    if (pathname.startsWith('/corporate-admin/approval-requests')) {
      return { path: '/corporate-admin/approval-requests', label: 'Approval Center' };
    }
    if (pathname.startsWith('/corporate-admin/approval-inbox')) {
      return issuance ? { path: '/corporate-admin/approval-inbox', label: 'Issuance Approvals' } : null;
    }
    if (pathname.startsWith('/corporate-admin/lg-records') || pathname.startsWith('/corporate-admin/expiring-lgs')) {
      return custody ? { path: '/corporate-admin/lg-records', label: 'All LG Records' } : null;
    }
    if (
      pathname.startsWith('/corporate-admin/issuance/requests') ||
      pathname.startsWith('/corporate-admin/issuance/request-new')
    ) {
      return issuance ? { path: '/corporate-admin/issuance/requests', label: 'Requests Inbox' } : null;
    }
    if (pathname.startsWith('/corporate-admin/issuance/issued-lgs')) {
      return issuance ? { path: '/corporate-admin/issuance/issued-lgs', label: 'Issued LGs' } : null;
    }
    if (pathname.startsWith('/corporate-admin/issuance/facilities')) {
      return issuance ? { path: '/corporate-admin/issuance/facilities', label: 'Bank Facilities' } : null;
    }
    if (pathname.startsWith('/corporate-admin/issuance/bank-accounts')) {
      return issuance ? { path: '/corporate-admin/issuance/bank-accounts', label: 'Bank Accounts' } : null;
    }
    if (pathname.startsWith('/corporate-admin/issuance/owner-management')) {
      return issuance ? { path: '/corporate-admin/issuance/owner-management', label: 'Owner Management' } : null;
    }
    if (pathname.startsWith('/corporate-admin/issuance/reconciliation')) {
      return issuance ? { path: '/corporate-admin/issuance/reconciliation', label: 'Position Reconciliation' } : null;
    }
    if (pathname.startsWith('/corporate-admin/quotations')) {
      return quotation ? { path: '/corporate-admin/quotations', label: 'Quotation Control' } : null;
    }
    if (
      pathname === '/corporate-admin/reconciliation' ||
      pathname.startsWith('/corporate-admin/reconciliation/dashboard') ||
      pathname.startsWith('/corporate-admin/reconciliation/workspace') ||
      pathname.startsWith('/corporate-admin/reconciliation/export')
    ) {
      return reconciliation ? { path: '/corporate-admin/reconciliation', label: 'Statement Reconciliation' } : null;
    }
    if (pathname === '/corporate-admin/inbox') {
      return { path: '/corporate-admin/inbox', label: 'Smart Inbox' };
    }
    if (pathname.startsWith('/corporate-admin/reports')) {
      return { path: '/corporate-admin/reports', label: 'Reports' };
    }
    return null;
  }

  if (role === 'checker') {
    if (pathname.startsWith('/checker/approval-requests')) {
      return { path: '/checker/approval-requests', label: 'Approval Center' };
    }
    if (pathname.startsWith('/checker/activity')) {
      return { path: '/checker/activity', label: 'Activity & Controls' };
    }
    if (pathname.startsWith('/checker/issuance/issued-lgs')) {
      return issuance ? { path: '/checker/issuance/issued-lgs', label: 'Issued LGs' } : null;
    }
    return null;
  }

  if (role === 'end_user') {
    if (pathname.startsWith('/end-user/dashboard')) {
      return isQuotationOnly ? null : { path: '/end-user/dashboard', label: 'Dashboard' };
    }
    if (pathname.startsWith('/end-user/action-center')) {
      return isQuotationOnly ? null : { path: '/end-user/action-center', label: 'Action Center' };
    }
    if (pathname === '/end-user/inbox') {
      return { path: '/end-user/inbox', label: 'Smart Inbox' };
    }
    if (pathname.startsWith('/end-user/lg-records') || pathname.startsWith('/end-user/expiring-lgs')) {
      return custody ? { path: '/end-user/lg-records', label: 'Manage LG Records' } : null;
    }
    if (pathname.startsWith('/end-user/pending-approvals')) {
      return custody ? { path: '/end-user/pending-approvals', label: 'Withdraw Requests' } : null;
    }
    if (pathname.startsWith('/end-user/quotations/active') || pathname.startsWith('/end-user/quotations/new')) {
      return quotation ? { path: '/end-user/quotations/active', label: 'New & Active Quotations' } : null;
    }
    if (
      pathname.startsWith('/end-user/quotations/history') ||
      pathname.startsWith('/end-user/quotations/dashboard') ||
      pathname.startsWith('/end-user/quotations/results')
    ) {
      return quotation ? { path: '/end-user/quotations/history', label: 'Quotation History' } : null;
    }
    if (
      pathname.startsWith('/end-user/issuance/requests') ||
      pathname.startsWith('/end-user/issuance/request-new')
    ) {
      return issuance ? { path: '/end-user/issuance/requests', label: 'Issuance Requests' } : null;
    }
    if (pathname.startsWith('/end-user/issuance/issued-lgs')) {
      return issuance ? { path: '/end-user/issuance/issued-lgs', label: 'Issued LGs' } : null;
    }
    if (pathname.startsWith('/end-user/issuance/reconciliation')) {
      return issuance ? { path: '/end-user/issuance/reconciliation', label: 'Position Reconciliation' } : null;
    }
    if (
      pathname === '/end-user/reconciliation' ||
      pathname.startsWith('/end-user/reconciliation/dashboard') ||
      pathname.startsWith('/end-user/reconciliation/workspace') ||
      pathname.startsWith('/end-user/reconciliation/export')
    ) {
      return reconciliation ? { path: '/end-user/reconciliation', label: 'Bank Reconciliation' } : null;
    }
    if (pathname.startsWith('/end-user/reports')) {
      return { path: '/end-user/reports', label: 'Reports' };
    }
    return null;
  }

  if (role === 'viewer') {
    if (pathname.startsWith('/end-user/dashboard') || pathname.startsWith('/viewer/dashboard')) {
      return { path: '/end-user/dashboard', label: 'Dashboard' };
    }
    if (pathname.startsWith('/end-user/lg-records') || pathname.startsWith('/viewer/lg-records')) {
      return custody ? { path: '/end-user/lg-records', label: 'LG Records' } : null;
    }
    return null;
  }

  return null;
};

export const isNextPathAllowedForRole = (nextPath, role) => {
  if (!nextPath || typeof nextPath !== 'string' || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return false;
  }
  if (nextPath.startsWith('/login') || nextPath === '/app') return false;
  if (role === 'system_owner') return nextPath.startsWith('/system-owner');
  if (role === 'corporate_admin') {
    return nextPath.startsWith('/corporate-admin') || nextPath.startsWith('/lg-records') || nextPath.startsWith('/issuance');
  }
  if (role === 'checker') return nextPath.startsWith('/checker');
  if (role === 'end_user' || role === 'viewer') {
    return nextPath.startsWith('/end-user') || nextPath.startsWith('/lg-records') || nextPath.startsWith('/issuance');
  }
  return false;
};

/**
 * Tracks the last authenticated in-app route so restored overnight tabs can be
 * distinguished from fresh external deep links (email/push notifications).
 */
export const trackAuthenticatedRoute = (fullPath, userId) => {
  if (!fullPath || fullPath.startsWith('/login')) return;
  safeLocalStorage.setJSON(LAST_SESSION_ROUTE_KEY, {
    path: fullPath,
    userId: userId ? String(userId) : null,
    updatedAt: Date.now(),
  });
  safeSessionStorage.setItem(TAB_LAST_AUTH_PATH_KEY, fullPath);
  safeLocalStorage.removeItem(LAST_LOGOUT_META_KEY);
};

export const clearTrackedAuthenticatedRoute = () => {
  safeLocalStorage.removeItem(LAST_SESSION_ROUTE_KEY);
  safeSessionStorage.removeItem(IDLE_LOGOUT_META_KEY);
  safeSessionStorage.removeItem(ORIENTATION_KEY);
  safeSessionStorage.removeItem(TAB_LAST_AUTH_PATH_KEY);
};

export const getLastLogoutMeta = () => {
  const shared = safeLocalStorage.getJSON(LAST_LOGOUT_META_KEY, null);
  if (shared && typeof shared === 'object') return shared;
  const legacyTab = safeSessionStorage.getJSON(IDLE_LOGOUT_META_KEY, null);
  if (legacyTab && typeof legacyTab === 'object') {
    return { type: 'idle', ...legacyTab };
  }
  return null;
};

/**
 * Called during explicit "Sign Out" (`preserveNext: false`) so all tabs and subsequent
 * browser URL-bar autocompletes know the user intentionally ended their session.
 */
export const recordExplicitLogoutMeta = (currentPath = null, userId = null) => {
  const cleanCurrent =
    currentPath && currentPath !== '/' && currentPath !== '/app' && !currentPath.startsWith('/login')
      ? currentPath
      : null;
  safeLocalStorage.setJSON(LAST_LOGOUT_META_KEY, {
    type: 'explicit',
    stalePath: cleanCurrent,
    userId: userId ? String(userId) : null,
    recordedAt: Date.now(),
  });
  clearTrackedAuthenticatedRoute();
};

/**
 * Called during active idle/401 logout (`preserveNext: true`) right before redirecting to `/login`.
 */
export const recordIdleLogoutMeta = (currentPath, expiredAt = 0, userId = null) => {
  const safeExp = Number.isFinite(Number(expiredAt)) ? Number(expiredAt) : 0;
  const payload = {
    type: 'idle',
    expiredAt: safeExp,
    stalePath: currentPath || null,
    userId: userId ? String(userId) : null,
    recordedAt: Date.now(),
  };
  safeLocalStorage.setJSON(LAST_LOGOUT_META_KEY, payload);
  safeSessionStorage.setJSON(IDLE_LOGOUT_META_KEY, payload);
  safeLocalStorage.removeItem(LAST_SESSION_ROUTE_KEY);
};

/**
 * Called when App mounts on a restored tab and discovers an already-expired token/session
 * right before `setAuthToken(null)` clears storage.
 */
export const recordExpiredSessionBeforeClear = (expiredAt, fallbackUserId = null) => {
  const lastRoute = safeLocalStorage.getJSON(LAST_SESSION_ROUTE_KEY, null);
  const resolvedUserId = fallbackUserId || lastRoute?.userId || null;
  recordIdleLogoutMeta(lastRoute?.path || null, expiredAt, resolvedUserId);
};

/**
 * Builds the `/login` redirect URL inside `AuthWrapper`.
 * - Explicit Sign Out on a leftover tab or autocompleted stale URL -> clean `/login` (no `?next=`).
 * - Idle / expired session (same tab, sibling tab, restored tab, or autocompleted stale URL) -> `&idle=<ts>`.
 * - Fresh external deep link (email CTA, push notification, shared specific URL) -> `?next=<url>`.
 */
export const buildUnauthenticatedLoginTarget = (currentFullUrl) => {
  if (!currentFullUrl || currentFullUrl === '/' || currentFullUrl === '/app' || currentFullUrl.startsWith('/login')) {
    return '/login';
  }

  const logoutMeta = getLastLogoutMeta();
  const tabLastAuthPath = safeSessionStorage.getItem(TAB_LAST_AUTH_PATH_KEY);
  const isLeftoverTab = Boolean(tabLastAuthPath && tabLastAuthPath === currentFullUrl);
  const matchesStaleLogoutPath = Boolean(
    logoutMeta?.stalePath && cleanPathname(logoutMeta.stalePath) === cleanPathname(currentFullUrl)
  );
  const hasExplicitQuery = currentFullUrl.includes('?');

  if (logoutMeta?.type === 'explicit' && (isLeftoverTab || (matchesStaleLogoutPath && !hasExplicitQuery))) {
    safeSessionStorage.removeItem(TAB_LAST_AUTH_PATH_KEY);
    return '/login';
  }

  if (logoutMeta?.type === 'idle' && (isLeftoverTab || (matchesStaleLogoutPath && !hasExplicitQuery))) {
    const expTs = Number.isFinite(Number(logoutMeta.expiredAt)) ? Number(logoutMeta.expiredAt) : 0;
    return `/login?next=${encodeURIComponent(currentFullUrl)}&idle=${expTs}`;
  }

  if (isLeftoverTab) {
    return `/login?next=${encodeURIComponent(currentFullUrl)}&idle=0`;
  }

  return `/login?next=${encodeURIComponent(currentFullUrl)}`;
};

export const beginPostLoginOrientation = (userId, now = Date.now()) => {
  if (!userId) return;
  safeSessionStorage.setJSON(ORIENTATION_KEY, {
    userId: String(userId),
    loginAt: now,
  });
};

export const clearPostLoginOrientation = () => {
  safeSessionStorage.removeItem(ORIENTATION_KEY);
};

export const getActiveOrientation = (userId, now = Date.now()) => {
  if (!userId) return null;
  const data = safeSessionStorage.getJSON(ORIENTATION_KEY, null);
  if (!data || String(data.userId) !== String(userId) || !Number.isFinite(data.loginAt)) {
    return null;
  }
  if (now - data.loginAt > ORIENTATION_WINDOW_MS) {
    safeSessionStorage.removeItem(ORIENTATION_KEY);
    return null;
  }
  return data;
};

const getUserPrefsKey = (userId) => `${SMART_NAV_PREFIX}${String(userId)}`;

export const getSmartNavPrefs = (userId) => {
  if (!userId) return { scores: {}, activeHub: null };
  const raw = safeLocalStorage.getJSON(getUserPrefsKey(userId), null);
  if (!raw || typeof raw !== 'object') {
    return { scores: {}, activeHub: null };
  }
  return {
    scores: raw.scores && typeof raw.scores === 'object' ? { ...raw.scores } : {},
    activeHub: typeof raw.activeHub === 'string' ? raw.activeHub : null,
  };
};

/**
 * Records a settled workspace hub once per login session using EWMA decay.
 * Automatically closes the orientation window so zero further timers run in this session.
 */
export const recordSettledHub = (userId, hubPath, now = Date.now()) => {
  clearPostLoginOrientation();
  if (!userId || !hubPath) return null;

  const prefs = getSmartNavPrefs(userId);
  const nextScores = {};

  Object.entries(prefs.scores).forEach(([path, score]) => {
    const val = Number(score);
    if (Number.isFinite(val) && val > 0) {
      const decayed = +(val * DECAY_FACTOR).toFixed(4);
      if (decayed >= MIN_PRUNE_SCORE) {
        nextScores[path] = decayed;
      }
    }
  });

  nextScores[hubPath] = +((nextScores[hubPath] || 0) + 1).toFixed(4);

  const updated = {
    scores: nextScores,
    activeHub: prefs.activeHub,
    updatedAt: now,
  };
  safeLocalStorage.setJSON(getUserPrefsKey(userId), updated);
  return updated;
};

/**
 * Resolves the post-login destination and whether to display a subtle shift notification.
 */
export const resolvePostLoginTarget = ({
  userId,
  role,
  moduleState,
  defaultPath,
  search = '',
  now = Date.now(),
}) => {
  const idleMeta = getLastLogoutMeta();
  safeSessionStorage.removeItem(IDLE_LOGOUT_META_KEY);
  safeLocalStorage.removeItem(LAST_LOGOUT_META_KEY);
  safeSessionStorage.removeItem(TAB_LAST_AUTH_PATH_KEY);

  try {
    const params = new URLSearchParams(search || '');
    const next = params.get('next');
    const idleParam = params.get('idle');

    if (isNextPathAllowedForRole(next, role)) {
      if (idleParam !== null && idleParam !== '') {
        const idleTs = Number(idleParam);
        const sameUser = !idleMeta?.userId || !userId || String(idleMeta.userId) === String(userId);
        const breakMs = Number.isFinite(idleTs) && idleTs > 0 ? now - idleTs : Infinity;

        if (sameUser && breakMs >= 0 && breakMs <= SHORT_BREAK_THRESHOLD_MS) {
          // Short break (<= 15 min after timeout): resume interrupted page without altering habit scores
          clearPostLoginOrientation();
          return { path: next, changedHubLabel: null, reason: 'short_idle_resume' };
        }
        // Longer break (> 15 min) or different user: ignore stale page and fall through to Smart Habit
      } else {
        // Explicit deep link (email, push notification, shared URL): honor target without altering habit scores
        clearPostLoginOrientation();
        return { path: next, changedHubLabel: null, reason: 'deep_link' };
      }
    }
  } catch {
    // Ignore malformed query parameters and fall back safely
  }

  if (!userId) {
    return { path: defaultPath, changedHubLabel: null, reason: 'default' };
  }

  beginPostLoginOrientation(userId, now);

  const prefs = getSmartNavPrefs(userId);
  const rankedCandidates = Object.entries(prefs.scores)
    .map(([path, score]) => ({ path, score: Number(score) || 0 }))
    .filter((entry) => entry.score >= MIN_CONFIDENCE_SCORE)
    .sort((a, b) => b.score - a.score);

  let winningHub = null;
  for (const candidate of rankedCandidates) {
    const normalized = normalizeToHub(candidate.path, role, moduleState);
    if (normalized && normalized.path === candidate.path) {
      winningHub = normalized;
      break;
    }
  }

  const targetPath = winningHub ? winningHub.path : defaultPath;
  const previousEffectivePath = prefs.activeHub || defaultPath;
  let changedHubLabel = null;

  if (targetPath !== previousEffectivePath) {
    const targetHubInfo = winningHub || normalizeToHub(targetPath, role, moduleState);
    changedHubLabel = targetHubInfo?.label || null;
    safeLocalStorage.setJSON(getUserPrefsKey(userId), {
      ...prefs,
      activeHub: targetPath,
      updatedAt: now,
    });
  } else if (winningHub && prefs.activeHub !== targetPath) {
    // Habit matches defaultPath: record activeHub silently without showing a change toast
    safeLocalStorage.setJSON(getUserPrefsKey(userId), {
      ...prefs,
      activeHub: targetPath,
      updatedAt: now,
    });
  }

  return {
    path: targetPath,
    changedHubLabel,
    reason: winningHub ? 'smart_habit' : 'default',
  };
};
