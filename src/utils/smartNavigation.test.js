import {
  SHORT_BREAK_THRESHOLD_MS,
  ORIENTATION_WINDOW_MS,
  normalizeToHub,
  recordSettledHub,
  resolvePostLoginTarget,
  getActiveOrientation,
  trackAuthenticatedRoute,
  recordExpiredSessionBeforeClear,
  recordExplicitLogoutMeta,
  recordIdleLogoutMeta,
  buildUnauthenticatedLoginTarget,
} from './smartNavigation';

const FULL_MODULES = {
  hasCustodyModule: true,
  hasIssuanceModule: true,
  hasQuotationModule: true,
  hasReconciliationModule: true,
};

describe('smartNavigation adaptive post-login routing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test('cold start requires ~4 consistent logins before overriding role default, and fires toast only on shift', () => {
    const userId = '42';
    const role = 'corporate_admin';
    const defaultPath = '/corporate-admin/dashboard';

    // Logins 1..4: lands on default, user navigates to Quotations and settles there
    for (let i = 1; i <= 4; i += 1) {
      const res = resolvePostLoginTarget({
        userId,
        role,
        moduleState: FULL_MODULES,
        defaultPath,
      });
      expect(res.path).toBe(defaultPath);
      expect(res.changedHubLabel).toBeNull();
      expect(getActiveOrientation(userId)).not.toBeNull();

      // User settles on Quotations
      recordSettledHub(userId, '/corporate-admin/quotations');
      // Orientation window closes immediately after settling
      expect(getActiveOrientation(userId)).toBeNull();
    }

    // Login 5: Habit has formed -> redirects straight to Quotations & triggers one-time shift toast
    const fifthLogin = resolvePostLoginTarget({
      userId,
      role,
      moduleState: FULL_MODULES,
      defaultPath,
    });
    expect(fifthLogin.path).toBe('/corporate-admin/quotations');
    expect(fifthLogin.changedHubLabel).toBe('Quotation Control');

    recordSettledHub(userId, '/corporate-admin/quotations');

    // Login 6: Continues routing to Quotations silently (no duplicate toast)
    const sixthLogin = resolvePostLoginTarget({
      userId,
      role,
      moduleState: FULL_MODULES,
      defaultPath,
    });
    expect(sixthLogin.path).toBe('/corporate-admin/quotations');
    expect(sixthLogin.changedHubLabel).toBeNull();
  });

  test('adapts dynamically in ~5 logins even after 100+ logins on a previous workspace, while ignoring 1-2 detours', () => {
    const userId = '77';
    const role = 'corporate_admin';
    const defaultPath = '/corporate-admin/dashboard';

    // 100 historical sessions settled on All LG Records (steady-state score cap ~6.67)
    for (let i = 0; i < 100; i += 1) {
      recordSettledHub(userId, '/corporate-admin/lg-records');
    }

    const established = resolvePostLoginTarget({
      userId,
      role,
      moduleState: FULL_MODULES,
      defaultPath,
    });
    expect(established.path).toBe('/corporate-admin/lg-records');

    // Two off-pattern detours to Reports should NOT hijack the user's landing page
    recordSettledHub(userId, '/corporate-admin/reports');
    recordSettledHub(userId, '/corporate-admin/reports');
    const afterTwoDetours = resolvePostLoginTarget({
      userId,
      role,
      moduleState: FULL_MODULES,
      defaultPath,
    });
    expect(afterTwoDetours.path).toBe('/corporate-admin/lg-records');
    expect(afterTwoDetours.changedHubLabel).toBeNull();

    // Now user's focus genuinely shifts to Statement Reconciliation for 5 consecutive logins
    for (let i = 1; i <= 5; i += 1) {
      recordSettledHub(userId, '/corporate-admin/reconciliation');
    }

    const shifted = resolvePostLoginTarget({
      userId,
      role,
      moduleState: FULL_MODULES,
      defaultPath,
    });
    expect(shifted.path).toBe('/corporate-admin/reconciliation');
    expect(shifted.changedHubLabel).toBe('Statement Reconciliation');
  });

  test('resumes exact interrupted page on short idle break (<= 15m), uses Smart Habit on longer break (> 15m)', () => {
    const userId = '101';
    const role = 'end_user';
    const defaultPath = '/end-user/action-center';

    for (let i = 0; i < 5; i += 1) {
      recordSettledHub(userId, '/end-user/quotations/active');
    }

    const now = 1_800_000_000_000;

    // 1. Short break (8 minutes after session timeout) -> resumes exact detail page
    const eightMinAgo = now - 8 * 60 * 1000;
    const shortBreakRes = resolvePostLoginTarget({
      userId,
      role,
      moduleState: FULL_MODULES,
      defaultPath,
      search: `?next=${encodeURIComponent('/end-user/lg-records/412')}&idle=${eightMinAgo}`,
      now,
    });
    expect(shortBreakRes.path).toBe('/end-user/lg-records/412');
    expect(shortBreakRes.reason).toBe('short_idle_resume');
    expect(getActiveOrientation(userId, now)).toBeNull();

    // 2. Longer break (20 minutes after session timeout) -> ignores stale URL and goes to Smart Habit page
    const twentyMinAgo = now - (SHORT_BREAK_THRESHOLD_MS + 5 * 60 * 1000);
    const longBreakRes = resolvePostLoginTarget({
      userId,
      role,
      moduleState: FULL_MODULES,
      defaultPath,
      search: `?next=${encodeURIComponent('/end-user/lg-records/412')}&idle=${twentyMinAgo}`,
      now,
    });
    expect(longBreakRes.path).toBe('/end-user/quotations/active');
    expect(longBreakRes.reason).toBe('smart_habit');
    expect(getActiveOrientation(userId, now)).not.toBeNull();
  });

  test('distinguishes overnight restored tabs from intentional deep links and enforces multi-user isolation', () => {
    const now = 1_800_000_000_000;
    const yesterday = now - 14 * 60 * 60 * 1000;

    // User A was viewing audit logs yesterday when closing browser
    trackAuthenticatedRoute('/corporate-admin/audit-logs', 'userA');
    recordExpiredSessionBeforeClear(yesterday, 'userA');

    // Case 1: Browser restores the same stale tab -> attaches &idle=<yesterday>
    const restoredLoginUrl = buildUnauthenticatedLoginTarget('/corporate-admin/audit-logs');
    expect(restoredLoginUrl).toBe(`/login?next=${encodeURIComponent('/corporate-admin/audit-logs')}&idle=${yesterday}`);

    // Case 2: If User A instead clicked a fresh email link to a different page -> honors as deep link (no &idle)
    trackAuthenticatedRoute('/corporate-admin/audit-logs', 'userA');
    recordExpiredSessionBeforeClear(yesterday, 'userA');
    const freshEmailLoginUrl = buildUnauthenticatedLoginTarget('/corporate-admin/approval-requests?req=88');
    expect(freshEmailLoginUrl).toBe(`/login?next=${encodeURIComponent('/corporate-admin/approval-requests?req=88')}`);

    const deepLinkRes = resolvePostLoginTarget({
      userId: 'userA',
      role: 'corporate_admin',
      moduleState: FULL_MODULES,
      defaultPath: '/corporate-admin/dashboard',
      search: `?next=${encodeURIComponent('/corporate-admin/approval-requests?req=88')}`,
      now,
    });
    expect(deepLinkRes.path).toBe('/corporate-admin/approval-requests?req=88');
    expect(deepLinkRes.reason).toBe('deep_link');

    // Case 3: User A timed out 2 minutes ago, but User B logs in on the same computer -> never leaks User A's URL
    const twoMinAgo = now - 2 * 60 * 1000;
    trackAuthenticatedRoute('/corporate-admin/lg-records/999', 'userA');
    recordExpiredSessionBeforeClear(twoMinAgo, 'userA');
    const userBRes = resolvePostLoginTarget({
      userId: 'userB',
      role: 'corporate_admin',
      moduleState: FULL_MODULES,
      defaultPath: '/corporate-admin/dashboard',
      search: `?next=${encodeURIComponent('/corporate-admin/lg-records/999')}&idle=${twoMinAgo}`,
      now,
    });
    expect(userBRes.path).toBe('/corporate-admin/dashboard');
  });

  test('normalizes detail routes, excludes setup/admin pages, and skips disabled modules', () => {
    expect(normalizeToHub('/corporate-admin/lg-records/512', 'corporate_admin', FULL_MODULES)).toEqual({
      path: '/corporate-admin/lg-records',
      label: 'All LG Records',
    });
    expect(normalizeToHub('/end-user/quotations/results/19', 'end_user', FULL_MODULES)).toEqual({
      path: '/end-user/quotations/history',
      label: 'Quotation History',
    });
    expect(normalizeToHub('/end-user/reconciliation/workspace/21', 'end_user', FULL_MODULES)).toEqual({
      path: '/end-user/reconciliation',
      label: 'Bank Reconciliation',
    });
    expect(normalizeToHub('/corporate-admin/issuance/request-new', 'corporate_admin', FULL_MODULES)).toEqual({
      path: '/corporate-admin/issuance/requests',
      label: 'Requests Inbox',
    });

    expect(normalizeToHub('/corporate-admin/activity', 'corporate_admin', FULL_MODULES)).toEqual({
      path: '/corporate-admin/activity',
      label: 'Activity & Controls',
    });
    expect(normalizeToHub('/checker/activity', 'checker', FULL_MODULES)).toEqual({
      path: '/checker/activity',
      label: 'Activity & Controls',
    });

    // Setup/utility routes must never become habitual home pages
    expect(normalizeToHub('/corporate-admin/users', 'corporate_admin', FULL_MODULES)).toBeNull();
    expect(normalizeToHub('/corporate-admin/module-configs', 'corporate_admin', FULL_MODULES)).toBeNull();
    expect(normalizeToHub('/corporate-admin/reconciliation/rules', 'corporate_admin', FULL_MODULES)).toBeNull();
    expect(normalizeToHub('/end-user/internal-owners', 'end_user', FULL_MODULES)).toBeNull();

    // Disabled module fallback
    const userId = '55';
    for (let i = 0; i < 5; i += 1) {
      recordSettledHub(userId, '/corporate-admin/quotations');
    }
    const disabledModuleRes = resolvePostLoginTarget({
      userId,
      role: 'corporate_admin',
      moduleState: { ...FULL_MODULES, hasQuotationModule: false },
      defaultPath: '/corporate-admin/dashboard',
    });
    expect(disabledModuleRes.path).toBe('/corporate-admin/dashboard');

    // Orientation window auto-expires after 2 minutes
    const start = 1_000_000;
    resolvePostLoginTarget({
      userId,
      role: 'corporate_admin',
      moduleState: FULL_MODULES,
      defaultPath: '/corporate-admin/dashboard',
      now: start,
    });
    expect(getActiveOrientation(userId, start + ORIENTATION_WINDOW_MS + 1)).toBeNull();
  });

  test('explicit Sign Out clears stale next-page across sibling tabs and browser URL-bar autocomplete, while preserving multi-tab idle timestamps', () => {
    const expiredTs = 1_795_000_000_000;

    // 1. Explicit Sign Out on /corporate-admin/activity -> browser URL-bar autocomplete to /corporate-admin/activity goes cleanly to /login
    recordExplicitLogoutMeta('/corporate-admin/activity', '42');
    window.sessionStorage.clear(); // Simulate new tab / sibling tab
    expect(buildUnauthenticatedLoginTarget('/corporate-admin/activity')).toBe('/login');

    // Genuine email deep link with query or different page still works after Sign Out
    expect(buildUnauthenticatedLoginTarget('/corporate-admin/approval-requests?req=12')).toBe(
      `/login?next=${encodeURIComponent('/corporate-admin/approval-requests?req=12')}`
    );

    // 2. Multi-tab Idle Expiry -> Tab 1 records idle meta, Tab 2 (empty sessionStorage) still attaches &idle=<expiredTs>
    window.sessionStorage.clear();
    recordIdleLogoutMeta('/corporate-admin/dashboard', expiredTs, '42');
    window.sessionStorage.clear(); // Simulate Tab 2 having its own empty sessionStorage
    window.sessionStorage.setItem('grow_tab_last_auth_path', '/corporate-admin/activity');
    expect(buildUnauthenticatedLoginTarget('/corporate-admin/activity')).toBe(
      `/login?next=${encodeURIComponent('/corporate-admin/activity')}&idle=${expiredTs}`
    );
  });
});
