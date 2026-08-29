import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Home, Users, FolderKanban, LogOut, Settings, FileText,
  BarChart, Hourglass, ClipboardList, DatabaseZap, Send, Building, Shield,
  ChevronLeft, ChevronRight, ChevronDown, FileCheck, Settings2, Download, LayoutTemplate, TrendingUp, CreditCard, BarChart3, Bell, Upload, RefreshCw,
  Menu, X, ListTodo, Layers, Sliders, FileSpreadsheet, BarChart2, Inbox, Calendar
} from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner';
import { apiRequest } from '../../services/apiService';
import { fetchActiveSystemNotifications } from '../../services/notificationService';
import { parseISO } from 'date-fns';

const getInitialCount = () => {
  try {
    const saved = localStorage.getItem('sidebar_pending_count');
    return saved ? parseInt(saved, 10) : 0;
  } catch { return 0; }
};

function CorporateAdminLayout({
  activeMenuItem,
  onLogout,
  customerName,
  customerId,
  subscriptionStatus,
  subscriptionEndDate,
  hasCustodyModule,
  hasIssuanceModule,
  hasQuotationModule = true,
  hasReconciliationModule = true,
  isChecker = false
}) {
  const [pendingCount, setPendingCount] = useState(getInitialCount());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [userNotifications, setUserNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const bellRef = useRef(null);
  const location = useLocation();

  // Auto-close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!showNotifDropdown) return;
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifDropdown]);

  // Get bell button position for fixed dropdown
  const getDropdownStyle = () => {
    if (!bellRef.current) return {};
    const rect = bellRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;
    return {
      position: 'fixed',
      top: isMobile ? rect.bottom + 8 : 'auto',
      bottom: isMobile ? 'auto' : window.innerHeight - rect.top + 8,
      left: isMobile ? Math.max(12, rect.right - 280) : rect.left - 240,
      width: 288,
      maxHeight: 'min(20rem, 60vh)',
      zIndex: 9999,
    };
  };

  const basePath = isChecker ? '/checker' : '/corporate-admin';

  const isExpired = subscriptionStatus === 'expired';
  const isGrace = subscriptionStatus === 'grace';

  // Memoized Growth logic to ensure it recalculates correctly
  const growthRatio = useMemo(() => {
    if (!subscriptionEndDate) return 0;
    const endDate = typeof subscriptionEndDate === 'string' ? parseISO(subscriptionEndDate) : new Date(subscriptionEndDate);
    const today = new Date();
    const diffMs = endDate.getTime() - today.getTime();
    const daysRemaining = diffMs / (1000 * 60 * 60 * 24);

    if (isExpired || isGrace) {
      const graceDaysElapsed = Math.abs(daysRemaining);
      return Math.min(0.5 + (graceDaysElapsed / 30) * 0.5, 1.0);
    } else {
      if (daysRemaining > 30) return 0;
      if (daysRemaining <= 0) return 0.5;
      return (30 - daysRemaining) / 30 * 0.5;
    }
  }, [subscriptionEndDate, isExpired, isGrace]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const activeNotifs = await fetchActiveSystemNotifications();
        setNotifications(activeNotifs);
      } catch (error) {
        console.error('Failed to load corporate notifications:', error);
      } finally {
        setIsLoadingNotifs(false);
      }
    }
    loadNotifications();
  }, []);

  // Fetch UserNotification records efficiently (every 5 minutes)
  useEffect(() => {
    let timer = null;

    const fetchUserNotifs = () => {
      if (document.hidden) return;
      apiRequest('/notifications/', 'GET')
        .then(data => {
          const list = data || [];
          setUserNotifications(list);
          setUnreadCount(list.filter(n => !n.is_read).length);
        })
        .catch((err) => {
          // If token expired / unauthorized, stop polling
          if (err?.status === 401 || err?.detail?.includes('token') || err?.detail?.includes('credentials')) {
            if (timer) clearInterval(timer);
          }
        });
    };

    fetchUserNotifs();
    timer = setInterval(fetchUserNotifs, 300000); // 5 minutes

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const markNotifRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, 'PATCH');
      setUserNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', 'PATCH');
      setUserNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const fetchPendingCount = useCallback(async () => {
    try {
      let count = 0;
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const currentUserEmail = currentUser?.email || localStorage.getItem('userEmail');

      if (!isChecker) {
        try {
          const data = await apiRequest('/corporate-admin/approval-requests/', 'GET');
          count += data.filter(req => req.status === 'PENDING' && req.maker_user?.email !== currentUserEmail).length;
        } catch (e) { }
      }
      try {
        const issuanceData = await apiRequest('/issuance/my-pending-approvals', 'GET');
        count += (Array.isArray(issuanceData) ? issuanceData : []).filter(req => req.status === 'PENDING_APPROVAL' && req.requestor_email !== currentUserEmail).length;
      } catch (e) { }
      try {
        const lgData = await apiRequest('/issuance/issued-lgs', 'GET');
        count += (Array.isArray(lgData) ? lgData : []).filter(lg => lg.verification_status === 'DISCREPANCY').length;
      } catch (e) { }
      setPendingCount(count);
      localStorage.setItem('sidebar_pending_count', count.toString());
    } catch (err) {
      console.error("Failed to fetch pending count", err);
    }
  }, [isChecker]);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  // Accordion Expanded State
  const [expandedSections, setExpandedSections] = useState({
    issuance: false,
    custody: false,
    reconciliation: false,
    admin: false,
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand active module on navigation
  useEffect(() => {
    const path = location.pathname;
    const item = activeMenuItem || '';

    if (item.startsWith('issuance') || path.includes('/issuance')) {
      setExpandedSections(prev => ({ ...prev, issuance: true }));
    } else if (item === 'lg-records' || item === 'lg-categories' || path.includes('/lg-records') || path.includes('/lg-categories')) {
      setExpandedSections(prev => ({ ...prev, custody: true }));
    } else if (item.includes('reconciliation') || path.includes('/reconciliation')) {
      setExpandedSections(prev => ({ ...prev, reconciliation: true }));
    } else if (['user-management', 'module-configs', 'smart-inbox', 'audit-logs', 'reports'].includes(item) || path.includes('/users') || path.includes('/module-configs') || path.includes('/inbox') || path.includes('/audit-logs') || path.includes('/reports')) {
      setExpandedSections(prev => ({ ...prev, admin: true }));
    }
  }, [location.pathname, activeMenuItem]);

  // Reusable Nav Links (Collapsible Accordion Model)
  const renderNavLinks = (isDrawer = false) => {
    const isExpandedMode = !isCollapsed || isDrawer;

    const isIssuanceActive = activeMenuItem?.startsWith('issuance') || location.pathname.includes('/issuance');
    const isCustodyActive = activeMenuItem === 'lg-records' || activeMenuItem === 'lg-categories' || (activeMenuItem === 'migration-hub' && !hasIssuanceModule);
    const isReconActive = activeMenuItem?.includes('reconciliation') || location.pathname.includes('/reconciliation');
    const isAdminActive = ['user-management', 'module-configs', 'smart-inbox', 'audit-logs', 'reports'].includes(activeMenuItem) || ['/users', '/module-configs', '/inbox', '/audit-logs', '/reports'].some(p => location.pathname.includes(p));

    return (
      <div className="space-y-1">
        {/* --- CORE WORKSPACE --- */}
        {!isChecker && (
          <Link
            to={`${basePath}/dashboard`}
            title={!isExpandedMode ? 'Dashboard' : ''}
            className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
              activeMenuItem === 'corporate-admin-dashboard'
                ? 'font-semibold bg-blue-500/15 text-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.07]'
            }`}
          >
            <Home className={`h-5 w-5 flex-shrink-0 ${!isExpandedMode ? 'mx-auto' : ''}`} />
            {isExpandedMode && <span className="ml-3">Dashboard</span>}
          </Link>
        )}

        {/* Approval Center */}
        <Link
          to={`${basePath}/approval-requests`}
          title={!isExpandedMode ? 'Approval Center' : ''}
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
            activeMenuItem === 'approval-center-page'
              ? 'font-semibold bg-blue-500/15 text-blue-400'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.07]'
          }`}
        >
          <div className={`flex items-center ${!isExpandedMode ? 'mx-auto' : ''}`}>
            <Shield className="h-5 w-5 flex-shrink-0" />
            {isExpandedMode && <span className="ml-3">Approval Center</span>}
          </div>
          {isExpandedMode && pendingCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </Link>

        {/* Action Center (Expiries, Claims & Renewals for both Issuance & Custody) */}
        {(hasCustodyModule || hasIssuanceModule) && (
          <Link
            to="/corporate-admin/action-center"
            title={!isExpandedMode ? 'Action Center' : ''}
            className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
              activeMenuItem === 'action-center'
                ? 'font-semibold bg-blue-500/15 text-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.07]'
            }`}
          >
            <ListTodo className={`h-5 w-5 flex-shrink-0 text-amber-400 ${!isExpandedMode ? 'mx-auto' : ''}`} />
            {isExpandedMode && <span className="ml-3">Action Center</span>}
          </Link>
        )}

        {/* Divider */}
        {isExpandedMode && <div className="pt-2 pb-1 px-3"><hr className="border-white/10" /></div>}

        {/* --- ACCORDION 1: LG ISSUANCE --- */}
        {hasIssuanceModule && (
          <div>
            {isExpandedMode ? (
              <button
                type="button"
                onClick={() => toggleSection('issuance')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm select-none ${
                  isIssuanceActive
                    ? 'text-blue-400 font-semibold bg-white/[0.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center">
                  <Send className="h-5 w-5 flex-shrink-0 text-indigo-400" />
                  <span className="ml-3 font-semibold text-xs tracking-wide uppercase text-slate-200">LG Issuance</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    expandedSections.issuance ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <Link
                to={`${basePath}/issuance/requests`}
                title="LG Issuance"
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                  isIssuanceActive ? 'font-semibold bg-blue-500/15 text-blue-400' : 'text-slate-300 hover:bg-white/[0.07]'
                }`}
              >
                <Send className="h-5 w-5 flex-shrink-0 mx-auto text-indigo-400" />
              </Link>
            )}

            {isExpandedMode && expandedSections.issuance && (
              <div className="mt-1 ml-4 pl-3 border-l border-indigo-500/30 space-y-0.5 animate-fadeIn">
                <Link
                  to={`${basePath}/issuance/requests`}
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'issuance-requests'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Requests Inbox</span>
                </Link>
                <Link
                  to={`${basePath}/issuance/issued-lgs`}
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'issuance-issued-lgs'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Issued LGs</span>
                </Link>
                {!isChecker && (
                  <>
                    <Link
                      to={`${basePath}/issuance/facilities`}
                      className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        activeMenuItem === 'issuance-facilities'
                          ? 'font-bold text-blue-400 bg-blue-500/15'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>Bank Facilities</span>
                    </Link>
                    <Link
                      to={`${basePath}/issuance/bank-accounts`}
                      className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        activeMenuItem === 'issuance-bank-accounts'
                          ? 'font-bold text-blue-400 bg-blue-500/15'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>Bank Accounts</span>
                    </Link>
                    <Link
                      to={`${basePath}/issuance/owner-management`}
                      className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        activeMenuItem === 'issuance-owner-management'
                          ? 'font-bold text-blue-400 bg-blue-500/15'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>Owner Management</span>
                    </Link>
                    <Link
                      to={`${basePath}/issuance/reconciliation`}
                      className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        activeMenuItem === 'issuance-reconciliation'
                          ? 'font-bold text-blue-400 bg-blue-500/15'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>Position Reconciliation</span>
                    </Link>
                    <Link
                      to="/corporate-admin/issuance/form-config"
                      className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        activeMenuItem === 'issuance-form-config'
                          ? 'font-bold text-blue-400 bg-blue-500/15'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>Form Configuration</span>
                    </Link>
                    <Link
                      to={`${basePath}/issuance/migration-hub`}
                      className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        activeMenuItem === 'issuance-migration-hub'
                          ? 'font-bold text-blue-400 bg-blue-500/15'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>Migration Hub</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- ACCORDION 2: LG CUSTODY --- */}
        {hasCustodyModule && (
          <div>
            {isExpandedMode ? (
              <button
                type="button"
                onClick={() => toggleSection('custody')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm select-none ${
                  isCustodyActive
                    ? 'text-blue-400 font-semibold bg-white/[0.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span className="ml-3 font-semibold text-xs tracking-wide uppercase text-slate-200">LG Custody</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    expandedSections.custody ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <Link
                to="/corporate-admin/lg-records"
                title="LG Custody"
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                  isCustodyActive ? 'font-semibold bg-blue-500/15 text-blue-400' : 'text-slate-300 hover:bg-white/[0.07]'
                }`}
              >
                <FileText className="h-5 w-5 flex-shrink-0 mx-auto text-emerald-400" />
              </Link>
            )}

            {isExpandedMode && expandedSections.custody && (
              <div className="mt-1 ml-4 pl-3 border-l border-emerald-500/30 space-y-0.5 animate-fadeIn">
                <Link
                  to="/corporate-admin/lg-records"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'lg-records'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>All LG Records</span>
                </Link>
                {!isChecker && (
                  <Link
                    to="/corporate-admin/lg-categories"
                    className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      activeMenuItem === 'lg-categories'
                        ? 'font-bold text-blue-400 bg-blue-500/15'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>LG Categories</span>
                  </Link>
                )}
                {!isChecker && !hasIssuanceModule && (
                  <Link
                    to="/corporate-admin/migration-hub"
                    className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      activeMenuItem === 'migration-hub'
                        ? 'font-bold text-blue-400 bg-blue-500/15'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>Migration Hub</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- ACCORDION 3: BANK RECONCILIATION --- */}
        {hasReconciliationModule && !isChecker && (
          <div>
            {isExpandedMode ? (
              <button
                type="button"
                onClick={() => toggleSection('reconciliation')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm select-none ${
                  isReconActive
                    ? 'text-blue-400 font-semibold bg-white/[0.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center">
                  <Layers className="h-5 w-5 flex-shrink-0 text-cyan-400" />
                  <span className="ml-3 font-semibold text-xs tracking-wide uppercase text-slate-200">Reconciliation</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    expandedSections.reconciliation ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <Link
                to="/corporate-admin/reconciliation"
                title="Bank Reconciliation"
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                  isReconActive ? 'font-semibold bg-blue-500/15 text-blue-400' : 'text-slate-300 hover:bg-white/[0.07]'
                }`}
              >
                <Layers className="h-5 w-5 flex-shrink-0 mx-auto text-cyan-400" />
              </Link>
            )}

            {isExpandedMode && expandedSections.reconciliation && (
              <div className="mt-1 ml-4 pl-3 border-l border-cyan-500/30 space-y-0.5 animate-fadeIn">
                <Link
                  to="/corporate-admin/reconciliation"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'reconciliation-dashboard' || activeMenuItem?.includes('workspace')
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Statement Dash</span>
                </Link>
                <Link
                  to="/corporate-admin/reconciliation/rules"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'reconciliation-rules'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Rules Engine</span>
                </Link>
                <Link
                  to="/corporate-admin/reconciliation/export"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'reconciliation-export'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Accounting Export</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* --- QUOTATION CONTROL --- */}
        {hasQuotationModule && !isChecker && (
          <Link
            to="/corporate-admin/quotations"
            title={!isExpandedMode ? 'RFQ Quotations' : ''}
            className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
              activeMenuItem === 'quotation-control'
                ? 'font-semibold bg-blue-500/15 text-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.07]'
            }`}
          >
            <BarChart2 className={`h-5 w-5 flex-shrink-0 text-amber-400 ${!isExpandedMode ? 'mx-auto' : ''}`} />
            {isExpandedMode && <span className="ml-3">RFQ Quotations</span>}
          </Link>
        )}

        {/* --- ACCORDION 4: ADMINISTRATION & SETUP --- */}
        {!isChecker && (
          <div>
            {isExpandedMode ? (
              <button
                type="button"
                onClick={() => toggleSection('admin')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm select-none ${
                  isAdminActive
                    ? 'text-blue-400 font-semibold bg-white/[0.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center">
                  <Settings className="h-5 w-5 flex-shrink-0 text-slate-400" />
                  <span className="ml-3 font-semibold text-xs tracking-wide uppercase text-slate-200">Administration</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    expandedSections.admin ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <Link
                to="/corporate-admin/module-configs"
                title="Administration"
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                  isAdminActive ? 'font-semibold bg-blue-500/15 text-blue-400' : 'text-slate-300 hover:bg-white/[0.07]'
                }`}
              >
                <Settings className="h-5 w-5 flex-shrink-0 mx-auto text-slate-400" />
              </Link>
            )}

            {isExpandedMode && expandedSections.admin && (
              <div className="mt-1 ml-4 pl-3 border-l border-slate-500/30 space-y-0.5 animate-fadeIn">
                <Link
                  to="/corporate-admin/users"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'user-management'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>User Management</span>
                </Link>
                <Link
                  to="/corporate-admin/module-configs"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'module-configs'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Settings</span>
                </Link>
                <Link
                  to="/corporate-admin/inbox"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'smart-inbox'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Smart Inbox</span>
                </Link>
                <Link
                  to="/corporate-admin/reports"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'reports'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Reports & Analytics</span>
                </Link>
                <Link
                  to="/corporate-admin/audit-logs"
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    activeMenuItem === 'audit-logs'
                      ? 'font-bold text-blue-400 bg-blue-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Audit Logs</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex flex-col md:flex-row h-screen bg-[#f8fafc] overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* BACKGROUND BLOBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>

      {/* MOBILE TOPBAR (Visible only on screens < md) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1e2a4a] text-white border-b border-white/10 relative z-20 flex-shrink-0 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 transition-colors focus:outline-none"
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6 text-blue-300" />
          </button>
          <Link to={`${basePath}/dashboard`} className="flex items-center space-x-2">
            <img src="/Grow logo Leaf Only NoBG.svg" alt="Logo" className="w-7 h-auto" />
            <span className="font-bold text-base tracking-tight text-white">Grow <span className="text-blue-400 text-xs font-normal">Treasury</span></span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <button
            ref={bellRef}
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {(notifications.length + unreadCount) > 0 && (
              <span className="absolute top-0 right-0 inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                {(notifications.length + unreadCount) > 9 ? '9+' : (notifications.length + unreadCount)}
              </span>
            )}
          </button>
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-white text-[10px] font-bold bg-indigo-600">
            {isChecker ? 'CK' : 'CA'}
          </span>
        </div>
      </header>

      {/* MOBILE SLIDE-OUT DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] bg-[#1e2a4a] text-white flex flex-col h-full z-50 shadow-2xl border-r border-white/10 animate-slide-in-left">
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <img src="/Grow logo Leaf Only NoBG.svg" alt="Logo" className="w-8 h-auto" />
                <div>
                  <span className="font-bold text-lg text-white">Grow</span>
                  <span className="text-xs text-blue-400 block font-normal leading-none">{isChecker ? 'Checker Portal' : 'Corporate Admin'}</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto dark-sidebar-nav">
              {renderNavLinks(true)}
            </nav>

            <div className="p-4 border-t border-white/10 flex flex-col gap-3 flex-shrink-0 bg-[#16203a]">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {isChecker ? 'CK' : 'CA'}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-semibold text-white truncate">{isChecker ? 'Checker' : 'Corporate Admin'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{customerName || 'My Organization'}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center py-2 px-3 rounded-lg text-red-400 hover:bg-white/5 transition-colors text-sm font-medium border border-red-500/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR (Visible only on screens >= md) */}
      <aside
        className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-72'
          } flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-10`}
        style={{ backgroundColor: '#1e2a4a', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.04] bg-white -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-[0.03] bg-blue-400 -ml-16 -mb-16 pointer-events-none" />

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-12 rounded-full p-2 shadow-md z-50 transition-colors border hidden md:block"
          style={{ backgroundColor: '#1e2a4a', borderColor: 'rgba(255,255,255,0.15)', color: '#93bbfc' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.borderColor = '#60a5fa'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#93bbfc'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Logo area */}
        <div className="py-5 px-4 flex-shrink-0 flex flex-col items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src="/Grow logo Leaf Only NoBG.svg" alt="Logo" style={{ width: isCollapsed ? '36px' : '120px', height: 'auto', transition: 'width 0.3s ease' }} />
          {!isCollapsed && (
            <div className="mt-2 text-center">
              <span className="text-xl font-bold text-white tracking-tight">Grow</span>
              <span className="text-sm font-medium ml-1.5" style={{ color: '#60a5fa' }}>Treasury</span>
            </div>
          )}
        </div>

        <nav className="flex-grow p-3 space-y-1 overflow-y-auto relative z-10 dark-sidebar-nav">
          {renderNavLinks(false)}
        </nav>

        {/* User info & Logout */}
        <div className="p-4 flex-shrink-0 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'ml-2'}`}>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#2563eb' }}>
              {isChecker ? 'CH' : 'CA'}
            </span>
            {!isCollapsed && (
              <>
                <div className="ml-3 overflow-hidden flex-1">
                  <p className="text-sm font-semibold text-white truncate">{isChecker ? 'Checker' : 'Corporate Admin'}</p>
                  <p className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{customerName || 'My Organization'}</p>
                </div>
                {/* Notification Bell */}
                <div className="relative ml-2">
                  <button
                    ref={bellRef}
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="relative p-1.5 rounded-lg transition-colors"
                    style={{ color: '#94a3b8' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    title="Notifications"
                  >
                    <Bell className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
                    {(notifications.length + unreadCount) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                        {(notifications.length + unreadCount) > 9 ? '9+' : (notifications.length + unreadCount)}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onLogout}
            title={isCollapsed ? 'Sign Out' : ''}
            className="w-full flex items-center justify-center p-2 rounded-lg transition-colors duration-200"
            style={{ color: '#f87171' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? '' : ''}`} />
            {!isCollapsed && <span className="ml-2 text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Notification Dropdown */}
      {showNotifDropdown && (
        <div ref={notifRef} className="overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200" style={getDropdownStyle()}>
          <div className="p-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-700 uppercase">Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Mark all read</button>
            )}
          </div>
          {(userNotifications.length === 0 && notifications.length === 0) ? (
            <div className="p-4 text-center text-sm text-gray-400">No notifications</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {userNotifications.map((n) => (
                <div key={`u-${n.id}`}
                  onClick={() => { if (!n.is_read) markNotifRead(n.id); if (n.link) window.location.href = n.link; }}
                  className={`px-3 py-2.5 transition-colors cursor-pointer ${n.is_read ? 'hover:bg-gray-50' : 'bg-blue-50/60 hover:bg-blue-50'}`}>
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.module?.toLowerCase()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.map((n, i) => (
                <div key={`s-${n.id || i}`} className="px-3 py-2.5 hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message || n.content}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">system</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 pb-24 overflow-y-auto relative z-10 flex flex-col min-w-0">
        {(isGrace || isExpired) && (
          <div className="sticky top-0 z-20">
            <SubscriptionBanner
              subscriptionEndDate={subscriptionEndDate}
              isExpired={isExpired}
              growthRatio={growthRatio}
            />
          </div>
        )}

        <div className="p-3.5 sm:p-5 md:p-8 flex-1">
          {!isLoadingNotifs && notifications.length > 0 && (
            <div className="mb-4">
              <NotificationBanner notifications={notifications} />
            </div>
          )}

          {isExpired ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border border-red-200 shadow-sm text-center px-4">
              <h2 className="text-xl font-bold text-gray-800">Account Restricted</h2>
              <p className="text-gray-600">Your subscription has expired. Please renew to restore full access.</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(40px) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in-left { animation: slide-in-left 0.3s ease-out; }
        /* Dark sidebar scrollbar */
        .dark-sidebar-nav::-webkit-scrollbar { width: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.45); border-radius: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.65); }
      `}} />
    </div>
  );
}

export default CorporateAdminLayout;