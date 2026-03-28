import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  Home, Users, FolderKanban, LogOut, Settings, FileText,
  BarChart, Hourglass, ClipboardList, DatabaseZap, Send, Building, Shield,
  ChevronLeft, ChevronRight, FileCheck, Settings2, Download, LayoutTemplate, TrendingUp, CreditCard, BarChart3, Bell, Upload, RefreshCw
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
  isChecker = false
}) {
  const [pendingCount, setPendingCount] = useState(getInitialCount());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [userNotifications, setUserNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const bellRef = useRef(null);

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
    return {
      position: 'fixed',
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left - 240,
      width: 288,
      maxHeight: 'min(20rem, 50vh)',
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

  // Fetch UserNotification records (issuance, maintenance, etc.)
  useEffect(() => {
    const fetchUserNotifs = () => {
      apiRequest('/notifications/', 'GET').then(data => setUserNotifications(data || [])).catch(() => {});
      apiRequest('/notifications/unread-count', 'GET').then(data => setUnreadCount(data?.count || 0)).catch(() => {});
    };
    fetchUserNotifs();
    const interval = setInterval(fetchUserNotifs, 30000);
    return () => clearInterval(interval);
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

      // Custody approvals — only for corporate admin (checkers get 403)
      if (!isChecker) {
        try {
          const data = await apiRequest('/corporate-admin/approval-requests/', 'GET');
          count += data.filter(req => req.status === 'PENDING' && req.maker_user?.email !== currentUserEmail).length;
        } catch (e) { /* no custody module */ }
      }
      // Issuance approvals
      try {
        const issuanceData = await apiRequest('/issuance/my-pending-approvals', 'GET');
        count += (Array.isArray(issuanceData) ? issuanceData : []).filter(req => req.status === 'PENDING_APPROVAL' && req.requestor_email !== currentUserEmail).length;
      } catch (e) { /* no issuance module */ }
      // Discrepancy reviews
      try {
        const lgData = await apiRequest('/issuance/issued-lgs', 'GET');
        count += (Array.isArray(lgData) ? lgData : []).filter(lg => lg.verification_status === 'DISCREPANCY').length;
      } catch (e) { /* no issuance module */ }
      setPendingCount(count);
      localStorage.setItem('sidebar_pending_count', count.toString());
    } catch (err) {
      console.error("Failed to fetch pending count", err);
    }
  }, [isChecker]);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 300000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return (
    <div className="relative flex h-screen bg-[#f8fafc] overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* BACKGROUND BLOBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>

      <aside
        className={`${isCollapsed ? 'w-20' : 'w-72'
          } flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-10`}
        style={{ backgroundColor: '#1e2a4a', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.04] bg-white -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-[0.03] bg-blue-400 -ml-16 -mb-16 pointer-events-none" />

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-12 rounded-full p-2 shadow-md z-50 transition-colors border"
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
          {/* Overview */}
          {!isChecker && (
            <div className="pb-2">
              {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Overview</p></div>}
              <Link to={`${basePath}/dashboard`} title={isCollapsed ? 'Dashboard' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'corporate-admin-dashboard' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'corporate-admin-dashboard' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <Home className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Dashboard</span>}
              </Link>
            </div>
          )}

          {/* Approval Center — visible to corporate admin AND checker */}
          <div className="pb-2">
            {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Approvals</p></div>}
            <Link to={`${basePath}/approval-requests`} title={isCollapsed ? 'Approval Center' : ''}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'approval-center-page' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
              style={activeMenuItem === 'approval-center-page' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
            >
              <div className={`flex items-center ${isCollapsed ? 'mx-auto' : ''}`}>
                <Shield className={`h-5 w-5 flex-shrink-0`} />
                {!isCollapsed && <span className="ml-3">Approval Center</span>}
              </div>
              {!isCollapsed && pendingCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
          </div>

          {/* Issuance — full section for corporate admin, only Issued LGs for checker */}
          {hasIssuanceModule && (
            <div className="pb-2">
              {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Issuance</p></div>}
              {!isChecker && (
                <>
                  <Link to={`${basePath}/issuance/requests`} title={isCollapsed ? 'Requests Inbox' : ''}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-requests' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                    style={activeMenuItem === 'issuance-requests' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                  >
                    <Send className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                    {!isCollapsed && <span className="ml-3">Requests Inbox</span>}
                  </Link>
                  <Link to={`${basePath}/issuance/facilities`} title={isCollapsed ? 'Bank Facilities' : ''}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-facilities' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                    style={activeMenuItem === 'issuance-facilities' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                  >
                    <Building className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                    {!isCollapsed && <span className="ml-3">Bank Facilities</span>}
                  </Link>
                  <Link to={`${basePath}/issuance/bank-accounts`} title={isCollapsed ? 'Bank Accounts' : ''}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-bank-accounts' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                    style={activeMenuItem === 'issuance-bank-accounts' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                  >
                    <CreditCard className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                    {!isCollapsed && <span className="ml-3">Bank Accounts</span>}
                  </Link>
                </>
              )}
              <Link to={`${basePath}/issuance/issued-lgs`} title={isCollapsed ? 'Issued LGs' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-issued-lgs' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'issuance-issued-lgs' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <FileText className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Issued LGs</span>}
              </Link>
              {!isChecker && (
                <Link to={`${basePath}/issuance/owner-management`} title={isCollapsed ? 'Owner Management' : ''}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-owner-management' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                  style={activeMenuItem === 'issuance-owner-management' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                >
                  <Users className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                  {!isCollapsed && <span className="ml-3">Owner Management</span>}
                </Link>
              )}
              {!isChecker && (
                <Link to={`${basePath}/issuance/reconciliation`} title={isCollapsed ? 'Position Reconciliation' : ''}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-reconciliation' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                  style={activeMenuItem === 'issuance-reconciliation' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                >
                  <RefreshCw className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                  {!isCollapsed && <span className="ml-3">Position Reconciliation</span>}
                </Link>
              )}
              {!isChecker && (
                <Link to={`${basePath}/issuance/migration-hub`} title={isCollapsed ? 'Issuance Migration' : ''}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-migration-hub' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                  style={activeMenuItem === 'issuance-migration-hub' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                >
                  <Upload className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                  {!isCollapsed && <span className="ml-3">Migration Hub</span>}
                </Link>
              )}
            </div>
          )}

          {/* LG Custody */}
          {hasCustodyModule && !isChecker && (
            <div className="pb-2">
              {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>LG Custody</p></div>}
              <Link to="/corporate-admin/lg-records" title={isCollapsed ? 'All LG Records' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'lg-records' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'lg-records' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <FolderKanban className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">All LG Records</span>}
              </Link>

              <Link to="/corporate-admin/action-center" title={isCollapsed ? 'Action Center' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'action-center' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'action-center' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <ClipboardList className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Action Center</span>}
              </Link>
            </div>
          )}

          {/* Bank Reconciliation */}
          {!isChecker && (customerId === 1 || customerId === "1") && (
            <div className="pb-2">
              {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Bank Reconciliation</p></div>}
              <Link to="/corporate-admin/reconciliation" title={isCollapsed ? 'Statement Dash' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'reconciliation-dashboard' || activeMenuItem?.includes('workspace') ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'reconciliation-dashboard' || activeMenuItem?.includes('workspace') ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <FileCheck className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Statement Dash</span>}
              </Link>
              <Link to="/corporate-admin/reconciliation/rules" title={isCollapsed ? 'Rules Engine' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'reconciliation-rules' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'reconciliation-rules' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <Settings2 className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Rules Engine</span>}
              </Link>
              <Link to="/corporate-admin/reconciliation/export" title={isCollapsed ? 'Accounting Export' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'reconciliation-export' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'reconciliation-export' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <Download className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Accounting Export</span>}
              </Link>
            </div>
          )}

          {/* Quotations */}
          {!isChecker && (customerId === 1 || customerId === "1") && (
            <div className="pb-2">
              {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Quotations</p></div>}
              <Link to="/corporate-admin/quotations" title={isCollapsed ? 'Quotation Control' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'quotation-control' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'quotation-control' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <TrendingUp className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Quotation Control</span>}
              </Link>
            </div>
          )}

          {/* Configuration */}
          {!isExpired && !isChecker && (
            <div className="pb-2">
              {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Configuration</p></div>}
              <Link to="/corporate-admin/users" title={isCollapsed ? 'User Management' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'user-management' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'user-management' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <Users className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">User Management</span>}
              </Link>
              <Link to="/corporate-admin/module-configs" title={isCollapsed ? 'Settings' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'module-configs' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'module-configs' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <Settings className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Settings</span>}
              </Link>
              {hasIssuanceModule && (
                <Link to="/corporate-admin/issuance/form-config" title={isCollapsed ? 'Issuance Form Config' : ''}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-form-config' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                  style={activeMenuItem === 'issuance-form-config' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                >
                  <LayoutTemplate className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                  {!isCollapsed && <span className="ml-3">Issuance Form Config</span>}
                </Link>
              )}
              {hasCustodyModule && (
                <Link to="/corporate-admin/lg-categories" title={isCollapsed ? 'LG Categories' : ''}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'lg-categories' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                  style={activeMenuItem === 'lg-categories' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                >
                  <FileText className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                  {!isCollapsed && <span className="ml-3">LG Categories</span>}
                </Link>
              )}
            </div>
          )}

          {/* System */}
          {!isChecker && (
            <div className="pb-2">
              {!isCollapsed && <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>System</p></div>}
              <Link to="/corporate-admin/audit-logs" title={isCollapsed ? 'Audit Logs' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'audit-logs' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'audit-logs' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <FileText className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Audit Logs</span>}
              </Link>
              <Link to="/corporate-admin/reports" title={isCollapsed ? 'Reports' : ''}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'reports' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                style={activeMenuItem === 'reports' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
              >
                <BarChart className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="ml-3">Reports</span>}
              </Link>
              {hasCustodyModule && (
                <Link to="/corporate-admin/migration-hub" title={isCollapsed ? 'Migration Hub' : ''}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'migration-hub' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
                  style={activeMenuItem === 'migration-hub' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
                >
                  <DatabaseZap className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                  {!isCollapsed && <span className="ml-3">Migration Hub</span>}
                </Link>
              )}
            </div>
          )}
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

      {/* Notification Dropdown — rendered outside sidebar to avoid clipping */}
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

      <main className="flex-1 overflow-y-auto relative z-10">
        {(isGrace || isExpired) && (
          <div className="sticky top-0 z-20">
            <SubscriptionBanner
              subscriptionEndDate={subscriptionEndDate}
              isExpired={isExpired}
              growthRatio={growthRatio}
            />
          </div>
        )}

        <div className="p-8">
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
            <Outlet />
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(40px) scale(1); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
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