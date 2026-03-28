import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  Home, FileText, PlusCircle, BarChart, LogOut,
  FolderKanban, Users, ListTodo, ChevronLeft, ChevronRight,
  Building, History, Zap, Bell, RefreshCw
} from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner';
import { fetchActiveSystemNotifications } from '../../services/notificationService';
import { apiRequest } from '../../services/apiService';
import { parseISO } from 'date-fns';

function EndUserLayout({ onLogout, activeMenuItem, customerName, customerId, headerTitle, subscriptionStatus, subscriptionEndDate, userPermissions, hasCustodyModule, hasIssuanceModule }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [newRequestCount, setNewRequestCount] = useState(0);
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

  // Fetch UserNotification records (issuance, maintenance, etc.)
  useEffect(() => {
    const fetchUserNotifs = () => {
      apiRequest('/notifications/', 'GET').then(data => setUserNotifications(data || [])).catch(() => {});
      apiRequest('/notifications/unread-count', 'GET').then(data => setUnreadCount(data?.count || 0)).catch(() => {});
    };
    fetchUserNotifs();
    const interval = setInterval(fetchUserNotifs, 30000); // Poll every 30s
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

  return (
    <div className="relative flex h-screen bg-[#f8fafc] overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* BACKGROUND BLOBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}></div>
      <div className="hidden lg:block fixed top-1/4 left-10 w-32 h-32 bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full opacity-10 animate-float pointer-events-none"></div>
      <div className="hidden lg:block fixed bottom-1/3 right-12 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-10 animate-float-delayed pointer-events-none"></div>

      {/* SIDEBAR — Dark Navy matching pre-login header */}
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-72'
          } flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-10`}
        style={{ backgroundColor: '#1e2a4a', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Decorative circle inside sidebar */}
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

        {/* Logo area — vertical stack layout */}
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
          <Link
            to="/end-user/dashboard"
            title={isCollapsed ? "Dashboard" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-dashboard'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-dashboard'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Dashboard</span>}
          </Link>

          <Link
            to="/end-user/action-center"
            title={isCollapsed ? "Action Center" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-action-center'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-action-center'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <ListTodo className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Action Center</span>}
          </Link>

          {/* LG Custody - only if plan includes custody module */}
          {hasCustodyModule && (
            <>
              {!isCollapsed && (
                <div className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>LG Custody</p>
                </div>
              )}
              <Link
                to="/end-user/lg-records/new"
                title={isCollapsed ? "Record New LG" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-record-new-lg'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'end-user-record-new-lg'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <PlusCircle className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Record New LG</span>}
              </Link>

              <Link
                to="/end-user/lg-records"
                title={isCollapsed ? "Manage LG Records" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-manage-lg-records'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'end-user-manage-lg-records'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <FolderKanban className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Manage LG Records</span>}
              </Link>

              <Link
                to="/end-user/pending-approvals"
                title={isCollapsed ? "Withdraw Request" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-pending-approvals'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'end-user-pending-approvals'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <FileText className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Withdraw Request</span>}
              </Link>

              <Link
                to="/end-user/internal-owners"
                title={isCollapsed ? "Manage Internal Owners" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-internal-owners'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'end-user-internal-owners'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <Users className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Internal Owners</span>}
              </Link>
            </>
          )}

          {/* Quotations - TEMP: only for customer_id 1 until module is complete */}
          {(customerId === 1 || customerId === "1") && (
            <>
              {!isCollapsed && (
                <div className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Quotations</p>
                </div>
              )}
              <Link
                to="/end-user/quotations/active"
                title={isCollapsed ? "Active Quotations" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-quotations-active'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'end-user-quotations-active'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <Building className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Active Quotations</span>}
              </Link>

              <Link
                to="/end-user/quotations/history"
                title={isCollapsed ? "Quotation History" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-quotations-history'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'end-user-quotations-history'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <History className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Quotation History</span>}
              </Link>
            </>
          )}

          {/* LG Issuance - only if plan includes issuance module */}
          {hasIssuanceModule && (
            <>
              {!isCollapsed && (
                <div className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>LG Issuance</p>
                </div>
              )}
              <Link
                to="/end-user/issuance/requests"
                title={isCollapsed ? "Issuance Requests" : ""}
                className={`relative flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-requests'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'issuance-requests'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <Zap className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="ml-3 flex-1 flex items-center justify-between">
                    Issuance Requests
                    {newRequestCount > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                        {newRequestCount > 99 ? '99+' : newRequestCount}
                      </span>
                    )}
                  </span>
                )}
                {isCollapsed && newRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {newRequestCount > 9 ? '9+' : newRequestCount}
                  </span>
                )}
              </Link>
              <Link
                to="/end-user/issuance/issued-lgs"
                title={isCollapsed ? "Issued LGs" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-issued-lgs'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'issuance-issued-lgs'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <FileText className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Issued LGs</span>}
              </Link>
              <Link
                to="/end-user/issuance/reconciliation"
                title={isCollapsed ? "Pos. Reconciliation" : ""}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'issuance-reconciliation'
                  ? 'font-semibold'
                  : 'hover:bg-white/[0.07]'
                  }`}
                style={activeMenuItem === 'issuance-reconciliation'
                  ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                  : { color: '#cbd5e1' }}
              >
                <RefreshCw className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="ml-3">Pos. Reconciliation</span>}
              </Link>
            </>
          )}

          {!isCollapsed && (
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.6)' }}>Analytics</p>
            </div>
          )}
          <Link
            to="/end-user/reports"
            title={isCollapsed ? "Reports" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-reports'
              ? 'font-semibold'
              : 'hover:bg-white/[0.07]'
              }`}
            style={activeMenuItem === 'end-user-reports'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
              : { color: '#cbd5e1' }}
          >
            <BarChart className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Reports</span>}
          </Link>
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative z-10">
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

        <div className="p-8">
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

export default EndUserLayout;