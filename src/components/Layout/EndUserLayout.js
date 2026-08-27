import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Home, FileText, PlusCircle, BarChart, LogOut,
  FolderKanban, Users, ListTodo, ChevronLeft, ChevronRight,
  Building, History, Zap, Bell, RefreshCw, Menu, X,
  AlertCircle, TrendingUp, Inbox
} from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner';
import { fetchActiveSystemNotifications } from '../../services/notificationService';
import { apiRequest } from '../../services/apiService';
import { parseISO } from 'date-fns';

function EndUserLayout({ onLogout, activeMenuItem, customerName, customerId, headerTitle, subscriptionStatus, subscriptionEndDate, userPermissions, hasCustodyModule, hasIssuanceModule, hasQuotationModule = true, hasReconciliationModule = true }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [newRequestCount, setNewRequestCount] = useState(0);
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

  useEffect(() => {
    async function loadNotifications() {
      try {
        const activeNotifs = await fetchActiveSystemNotifications();
        setNotifications(activeNotifs);
      } catch (error) {
        console.error('Failed to load end-user notifications:', error);
      } finally {
        setIsLoading(false);
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

  // Fetch count of issuance requests pending end-user action (approved, awaiting execution)
  useEffect(() => {
    if (!hasIssuanceModule) return;
    apiRequest('/issuance/requests/', 'GET')
      .then(data => {
        const actionable = (data || []).filter(r =>
          r.status === 'APPROVED_INTERNAL' || r.status === 'FACILITY_RESERVED'
        );
        setNewRequestCount(actionable.length);
      })
      .catch(() => setNewRequestCount(0));
  }, [hasIssuanceModule]);

  const isExpired = subscriptionStatus === 'expired';
  const isGracePeriod = subscriptionStatus === 'grace';

  // Calculate growthRatio with precision to ensure it grows bigger over time
  const growthRatio = useMemo(() => {
    if (!subscriptionEndDate) return 0;

    const endDate = typeof subscriptionEndDate === 'string'
      ? parseISO(subscriptionEndDate)
      : new Date(subscriptionEndDate);
    const today = new Date();

    // Difference in decimal days
    const diffMs = endDate.getTime() - today.getTime();
    const daysRemaining = diffMs / (1000 * 60 * 60 * 24);

    if (isExpired || isGracePeriod) {
      // During grace period, grow from 0.5 to 1.0
      const graceDaysElapsed = Math.abs(daysRemaining);
      return Math.min(0.5 + (graceDaysElapsed / 30) * 0.5, 1.0);
    } else {
      // Within 30 days of expiry, grow from 0 to 0.5
      if (daysRemaining > 30) return 0;
      if (daysRemaining <= 0) return 0.5;
      return (30 - daysRemaining) / 30 * 0.5;
    }
  }, [subscriptionEndDate, isExpired, isGracePeriod]);

  // Reusable Nav Links for both Desktop Sidebar and Mobile Drawer
  const renderNavLinks = (isDrawer = false) => (
    <>
      <Link
        to="/end-user/dashboard"
        title={isCollapsed && !isDrawer ? "Dashboard" : ""}
        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-dashboard'
          ? 'font-semibold'
          : 'hover:bg-white/[0.07]'
          }`}
        style={activeMenuItem === 'end-user-dashboard'
          ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
          : { color: '#cbd5e1' }}
      >
        <Home className="h-5 w-5 flex-shrink-0" />
        {(!isCollapsed || isDrawer) && <span className="ml-3">Dashboard</span>}
      </Link>

      <Link
        to="/end-user/action-center"
        title={isCollapsed && !isDrawer ? "Action Center" : ""}
        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-action-center'
          ? 'font-semibold'
          : 'hover:bg-white/[0.07]'
          }`}
        style={activeMenuItem === 'end-user-action-center'
          ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
          : { color: '#cbd5e1' }}
      >
        <ListTodo className="h-5 w-5 flex-shrink-0" />
        {(!isCollapsed || isDrawer) && <span className="ml-3">Action Center</span>}
      </Link>

      <Link
        to="/end-user/inbox"
        title={isCollapsed && !isDrawer ? "Smart Inbox" : ""}
        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'smart-inbox'
          ? 'font-semibold'
          : 'hover:bg-white/[0.07]'
          }`}
        style={activeMenuItem === 'smart-inbox'
          ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
          : { color: '#cbd5e1' }}
      >
        <Inbox className="h-5 w-5 flex-shrink-0" />
        {(!isCollapsed || isDrawer) && <span className="ml-3">Smart Inbox</span>}
      </Link>

      {/* LG Custody - only if plan includes custody module */}
      {hasCustodyModule && (
        <>
          {(!isCollapsed || isDrawer) && (
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>LG Custody</p>
            </div>
          )}
          <Link
            to="/end-user/lg-records/new"
            title={isCollapsed && !isDrawer ? "Record New LG" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-record-new-lg'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-record-new-lg'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <PlusCircle className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Record New LG</span>}
          </Link>
          <Link
            to="/end-user/lg-records"
            title={isCollapsed && !isDrawer ? "Manage LG Records" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-manage-lg-records' || activeMenuItem === 'end-user-lg-records'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-manage-lg-records' || activeMenuItem === 'end-user-lg-records'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <FileText className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Manage LG Records</span>}
          </Link>
          <Link
            to="/end-user/pending-approvals"
            title={isCollapsed && !isDrawer ? "Withdraw Request" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-pending-approvals'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-pending-approvals'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Withdraw Request</span>}
          </Link>
          <Link
            to="/end-user/internal-owners"
            title={isCollapsed && !isDrawer ? "Manage Internal Owners" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-internal-owners'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-internal-owners'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Manage Internal Owners</span>}
          </Link>
        </>
      )}

      {/* Quotation Module */}
      {hasQuotationModule && (
        <>
          {(!isCollapsed || isDrawer) && (
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Quotations</p>
            </div>
          )}
          <Link
            to="/end-user/quotations/active"
            title={isCollapsed && !isDrawer ? "Active Quotations" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-quotations-active' || activeMenuItem === 'end-user-quotations-new'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-quotations-active' || activeMenuItem === 'end-user-quotations-new'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <TrendingUp className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Active Quotations</span>}
          </Link>
          <Link
            to="/end-user/quotations/history"
            title={isCollapsed && !isDrawer ? "Quotation History" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-quotations-history' || activeMenuItem === 'end-user-quotations-dashboard'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-quotations-history' || activeMenuItem === 'end-user-quotations-dashboard'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <History className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Quotation History</span>}
          </Link>
        </>
      )}

      {/* LG Issuance */}
      {hasIssuanceModule && (
        <>
          {(!isCollapsed || isDrawer) && (
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>LG Issuance</p>
            </div>
          )}
          <Link
            to="/end-user/issuance/requests"
            title={isCollapsed && !isDrawer ? "Issuance Requests" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm relative ${activeMenuItem === 'issuance-requests'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'issuance-requests'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <Zap className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && (
              <span className="ml-3 flex-1 flex items-center justify-between">
                Issuance Requests
                {newRequestCount > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                    {newRequestCount > 99 ? '99+' : newRequestCount}
                  </span>
                )}
              </span>
            )}
            {isCollapsed && !isDrawer && newRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                {newRequestCount > 9 ? '9+' : newRequestCount}
              </span>
            )}
          </Link>
          <Link
            to="/end-user/issuance/issued-lgs"
            title={isCollapsed && !isDrawer ? "Issued LGs" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-issued-lgs'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'issuance-issued-lgs'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <FileText className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Issued LGs</span>}
          </Link>
          <Link
            to="/end-user/issuance/reconciliation"
            title={isCollapsed && !isDrawer ? "Pos. Reconciliation" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-reconciliation'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'issuance-reconciliation'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <RefreshCw className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isDrawer) && <span className="ml-3">Pos. Reconciliation</span>}
          </Link>
        </>
      )}

      {(!isCollapsed || isDrawer) && (
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Analytics</p>
        </div>
      )}
      <Link
        to="/end-user/reports"
        title={isCollapsed && !isDrawer ? "Reports" : ""}
        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-reports'
          ? 'font-semibold'
          : 'hover:bg-white/[0.07]'
          }`}
        style={activeMenuItem === 'end-user-reports'
          ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
          : { color: '#cbd5e1' }}
      >
        <BarChart className="h-5 w-5 flex-shrink-0" />
        {(!isCollapsed || isDrawer) && <span className="ml-3">Reports</span>}
      </Link>
    </>
  );

  return (
    <div className="relative flex flex-col md:flex-row h-screen bg-[#f8fafc] overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* BACKGROUND BLOBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}></div>
      <div className="hidden lg:block fixed top-1/4 left-10 w-32 h-32 bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full opacity-10 animate-float pointer-events-none"></div>
      <div className="hidden lg:block fixed bottom-1/3 right-12 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-10 animate-float-delayed pointer-events-none"></div>

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
          <Link to="/end-user/dashboard" className="flex items-center space-x-2">
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
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-white text-[10px] font-bold bg-blue-600">
            EU
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
                  <span className="text-xs text-blue-400 block font-normal leading-none">Treasury Platform</span>
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
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  EU
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-semibold text-white truncate">End User</p>
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
        {/* Decorative circle inside sidebar */}
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

        {/* Navigation */}
        <nav className="flex-grow p-3 space-y-1 overflow-y-auto relative z-10 dark-sidebar-nav">
          {renderNavLinks(false)}
        </nav>

        {/* User info & Logout */}
        <div className="p-4 flex-shrink-0 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'ml-2'}`}>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#2563eb' }}>
              EU
            </span>
            {!isCollapsed && (
              <>
                <div className="ml-3 overflow-hidden flex-1">
                  <p className="text-sm font-semibold text-white truncate">End User</p>
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
            title={isCollapsed ? "Sign Out" : ""}
            className="w-full flex items-center justify-center p-2 rounded-lg transition-colors duration-200"
            style={{ color: '#f87171' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
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
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col min-w-0">
        {/* Banner area becomes sticky to ensure visibility as it grows */}
        {(isGracePeriod || isExpired) && (
          <div className="sticky top-0 z-20">
            <SubscriptionBanner
              subscriptionEndDate={subscriptionEndDate}
              isExpired={isExpired}
              growthRatio={growthRatio}
            />
          </div>
        )}

        <div className="p-3.5 sm:p-5 md:p-8 flex-1">
          {!isLoading && notifications.length > 0 && (
            <div className="mb-4">
              <NotificationBanner notifications={notifications} />
            </div>
          )}

          {isExpired ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border border-red-200 shadow-sm text-center px-4">
              <h2 className="text-xl font-bold text-gray-800">Account Restricted</h2>
              <p className="text-gray-600">Your subscription has expired. Please contact your administrator to restore access.</p>
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
        .dark-sidebar-nav::-webkit-scrollbar { width: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.45); border-radius: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.65); }
      `}} />
    </div>
  );
}

export default EndUserLayout;