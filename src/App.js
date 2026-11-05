// frontend/src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import LoginPage from './pages/Auth/LoginPage';
import ForcePasswordChangePage from './pages/Auth/ForcePasswordChangePage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import KnowMorePage from './pages/KnowMorePage';
import FreeTrialRegistration from './pages/Public/FreeTrialRegistration';
import PublicIssuancePortal from './pages/Public/PublicIssuancePortal';
import PublicIssuanceForm from './pages/Public/PublicIssuanceForm';
import RequestorDashboard from './pages/Public/RequestorDashboard';
import QuotationBankOfferPage from './pages/Public/QuotationBankOfferPage';
import PublicBankHandshakePage from './pages/Public/PublicBankHandshakePage';
import BankDealerAuthPage from './pages/Public/BankDealerAuthPage';
import BankDealerDeskPage from './pages/Public/BankDealerDeskPage';
import DealerStandingAlertSetupPage from './pages/Public/DealerStandingAlertSetupPage';
import MobilePairAuthPage from './pages/Public/MobilePairAuthPage';
import RenewalPage from './pages/RenewalPage';

import AuthWrapper from './components/AuthWrapper';
import ProtectedLayout from './components/ProtectedLayout';
import LegalArtifactModal from './components/LegalArtifactModal';
import ErrorBoundary from './components/ErrorBoundary';

import SystemOwnerRoutes from './routes/SystemOwnerRoutes.js';
import CorporateAdminRoutes from './routes/CorporateAdminRoutes.js';
import CheckerRoutes from './routes/CheckerRoutes.js';
import EndUserRoutes from './routes/EndUserRoutes.js';

import {
  getAuthToken,
  setAuthToken,
  isTokenValid,
  isSessionIdleExpired,
  getRemainingWarningSeconds,
  subscribeSessionSync,
  resetTokenRefreshTime,
  stopInactivityTracker,
  startSessionTimers,
  clearSessionTimers,
  extendSession,
  logoutUser,
  handleUserActivity,
  WARNING_BUFFER_MS
} from './services/apiService';
import { disablePushOnThisDevice, syncPushOwnership } from './services/pushService';
import { jwtDecode } from 'jwt-decode';

import { ToastContainer, Flip } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ToastAnimations.css';

/**
 * AppContent handles the Routing and Auth State logic.
 * It is wrapped by BrowserRouter in the main App component.
 */
function AppContent({ showSessionModal, onShowSessionWarning, onHideSessionModal }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [_mustAcceptPolicies, setMustAcceptPolicies] = useState(false);
  const [userId, setUserId] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [hasCustodyModule, setHasCustodyModule] = useState(true);
  const [hasIssuanceModule, setHasIssuanceModule] = useState(false);
  const [hasQuotationModule, setHasQuotationModule] = useState(true);
  const [hasReconciliationModule, setHasReconciliationModule] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const isPublicRoute = Boolean(
    location.pathname && (
      location.pathname.startsWith('/public') ||
      location.pathname.includes('/public-quotation') ||
      location.pathname.includes('/public/quotation') ||
      location.pathname.includes('/public-bank-handshake') ||
      location.pathname.includes('/public/bank-handshake') ||
      location.pathname.includes('/public-dealer-handshake') ||
      location.pathname.includes('/public/dealer-handshake') ||
      location.pathname.startsWith('/dealer') ||
      location.pathname.startsWith('/mobile-pair')
    )
  );

  // If user navigates to a public counterparty/quotation page, immediately dismiss session warning and stop corporate trackers
  useEffect(() => {
    if (isPublicRoute) {
      onHideSessionModal();
      stopInactivityTracker();
      clearSessionTimers();
    }
  }, [isPublicRoute, onHideSessionModal]);

  // Ref to track modal state inside event listeners without triggering re-renders
  const modalOpenRef = useRef(showSessionModal);

  useEffect(() => {
    modalOpenRef.current = showSessionModal;
  }, [showSessionModal]);

  const onIdleWarning = useCallback(() => {
    if (isPublicRoute) return;
    onShowSessionWarning();
  }, [isPublicRoute, onShowSessionWarning]);

  const initTrackers = useCallback((state, resetClock = false) => {
    if (isPublicRoute) {
      stopInactivityTracker();
      clearSessionTimers();
      return;
    }
    if (state.isAuthenticated && !state.mustChangePassword && !state.mustAcceptPolicies && state.subscriptionStatus !== 'expired') {
      if (resetClock) {
        resetTokenRefreshTime();
      }
      startSessionTimers(onIdleWarning);
    } else {
      stopInactivityTracker();
      clearSessionTimers();
    }
  }, [isPublicRoute, onIdleWarning]);

  const decodeTokenAndSetState = (token, checkExpiry = true) => {
    if (token) {
      try {
        if (checkExpiry && (!isTokenValid(token) || isSessionIdleExpired())) {
          setAuthToken(null);
          setIsAuthenticated(false);
          setUserRole(null);
          return { isAuthenticated: false };
        }
        const decoded = jwtDecode(token);
        setIsAuthenticated(true);
        setUserRole(decoded.role);
        setMustChangePassword(decoded.must_change_password || false);
        setMustAcceptPolicies(decoded.must_accept_policies || false);
        setUserId(decoded.user_id);
        setCustomerId(decoded.customer_id || null);
        try {
          const userObj = {
            id: decoded.user_id,
            user_id: decoded.user_id,
            email: decoded.email || decoded.sub,
            role: decoded.role,
            customer_id: decoded.customer_id,
            customer_name: decoded.customer_name
          };
          localStorage.setItem('user', JSON.stringify(userObj));
          localStorage.setItem('user_role', decoded.role);
          localStorage.setItem('user_id', String(decoded.user_id));
        } catch (e) {}
        setCustomerName(decoded.customer_name);
        setSubscriptionStatus(decoded.subscription_status || 'active');
        setSubscriptionEndDate(decoded.subscription_end_date || null);
        setUserPermissions(decoded.permissions || []);
        const isSysOwner = decoded.role === 'system_owner';
        const decodedCustody = isSysOwner ? true : (decoded.has_custody_module !== undefined ? Boolean(decoded.has_custody_module) : false);
        const decodedIssuance = isSysOwner ? true : (decoded.has_issuance_module !== undefined ? Boolean(decoded.has_issuance_module) : false);
        const decodedQuotation = isSysOwner ? true : (decoded.has_quotation_module !== undefined ? Boolean(decoded.has_quotation_module) : false);
        const decodedReconciliation = isSysOwner ? true : (decoded.has_reconciliation_module !== undefined ? Boolean(decoded.has_reconciliation_module) : false);
        setHasCustodyModule(decodedCustody);
        setHasIssuanceModule(decodedIssuance);
        setHasQuotationModule(decodedQuotation);
        setHasReconciliationModule(decodedReconciliation);
        return {
          isAuthenticated: true,
          userRole: decoded.role,
          mustChangePassword: decoded.must_change_password || false,
          mustAcceptPolicies: decoded.must_accept_policies || false,
          subscriptionStatus: decoded.subscription_status || 'active',
          hasCustodyModule: decodedCustody,
          hasIssuanceModule: decodedIssuance,
          hasQuotationModule: decodedQuotation,
          hasReconciliationModule: decodedReconciliation
        };
      } catch (error) {
        console.error("App.js: Failed to decode token:", error);
        setAuthToken(null);
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
    }
    return { isAuthenticated: false };
  };

  // Initial Load & Multi-Tab Storage/Broadcast Sync
  useEffect(() => {
    const token = getAuthToken();
    const state = decodeTokenAndSetState(token, true);

    if (state.isAuthenticated && !modalOpenRef.current) initTrackers(state, false);
    if (state.isAuthenticated && state.mustAcceptPolicies) setShowLegalModal(true);

    const handleStorageChange = (event) => {
      if (event.key === 'jwt_token') {
        if (!event.newValue) {
          onHideSessionModal();
          stopInactivityTracker();
          clearSessionTimers();
          setIsAuthenticated(false);
          setUserRole(null);
          return;
        }
        const newState = decodeTokenAndSetState(event.newValue, false);
        if (newState.isAuthenticated && !modalOpenRef.current) initTrackers(newState, false);
      } else if (event.key === 'last_activity_at' && event.newValue) {
        if (modalOpenRef.current) {
          onHideSessionModal();
        }
        if (getAuthToken()) {
          startSessionTimers(onIdleWarning, Number(event.newValue));
        }
      }
    };

    const unsubscribeSync = subscribeSessionSync((data) => {
      if (data.type === 'SESSION_LOGOUT') {
        onHideSessionModal();
        stopInactivityTracker();
        clearSessionTimers();
        setIsAuthenticated(false);
        setUserRole(null);
      } else if (data.type === 'SESSION_EXTENDED' || data.type === 'USER_ACTIVITY') {
        if (modalOpenRef.current) {
          onHideSessionModal();
        }
      }
    });

    window.addEventListener('storage', handleStorageChange);
    setIsLoading(false);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribeSync();
    };
  }, []);

  // Wake-up / Tab Focus Verification (catches laptop sleep or backgrounded tab expiration immediately)
  useEffect(() => {
    if (!isAuthenticated || isPublicRoute) return;

    const verifyActiveSessionOnWake = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const token = getAuthToken();
      if (!token || isSessionIdleExpired() || !isTokenValid(token)) {
        onHideSessionModal();
        setIsAuthenticated(false);
        logoutUser({ preserveNext: true });
      }
    };

    document.addEventListener('visibilitychange', verifyActiveSessionOnWake);
    window.addEventListener('focus', verifyActiveSessionOnWake);
    return () => {
      document.removeEventListener('visibilitychange', verifyActiveSessionOnWake);
      window.removeEventListener('focus', verifyActiveSessionOnWake);
    };
  }, [isAuthenticated, isPublicRoute, onHideSessionModal]);

  // User Activity Tracking
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const resetAction = () => {
      // If warning modal is open, require explicit click on "Stay Logged In"
      if (isAuthenticated && !modalOpenRef.current && !isPublicRoute) {
        handleUserActivity(onIdleWarning);
      }
    };

    if (isAuthenticated && !isPublicRoute) {
      activityEvents.forEach(event => window.addEventListener(event, resetAction, { passive: true }));
    }

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, resetAction));
    };
  }, [isAuthenticated, isPublicRoute, onIdleWarning]);

  const isNextPathAllowedForRole = (nextPath, role) => {
    if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('/login') || nextPath === '/app') return false;
    if (role === 'system_owner') return nextPath.startsWith('/system-owner');
    if (role === 'corporate_admin') return nextPath.startsWith('/corporate-admin') || nextPath.startsWith('/lg-records') || nextPath.startsWith('/issuance');
    if (role === 'checker') return nextPath.startsWith('/checker');
    if (role === 'end_user' || role === 'viewer') return nextPath.startsWith('/end-user') || nextPath.startsWith('/lg-records') || nextPath.startsWith('/issuance');
    return false;
  };

  const getPostLoginTarget = (role, moduleState = null) => {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (isNextPathAllowedForRole(next, role)) {
        return next;
      }
    } catch {}
    return getDefaultRedirectPath(role, moduleState);
  };

  const handleLoginSuccess = (response) => {
    resetTokenRefreshTime();
    setAuthToken(response.access_token);
    const state = decodeTokenAndSetState(response.access_token, false);
    if (state.mustAcceptPolicies) setShowLegalModal(true);
    else if (!state.isAuthenticated) navigate("/login", { replace: true });
    else if (state.mustChangePassword) navigate("/force-password-change", { replace: true });
    else if (state.subscriptionStatus === 'expired') navigate("/renewal", { replace: true });
    else {
      initTrackers(state, true);
      navigate(getPostLoginTarget(state.userRole, state), { replace: true });
    }
  };

  const handleAcceptSuccess = () => {
    resetTokenRefreshTime();
    const state = decodeTokenAndSetState(getAuthToken(), false);
    setShowLegalModal(false);
    if (state.mustChangePassword) navigate("/force-password-change", { replace: true });
    else if (state.subscriptionStatus === 'expired') navigate("/renewal", { replace: true });
    else {
      initTrackers(state, true);
      navigate(getPostLoginTarget(state.userRole, state), { replace: true });
    }
  };

  const handleLogout = async () => {
    // Keep background mobile push alerts active across web session sign-outs
    // so the user continues to receive lock-screen alerts when signed out.
    // Users can explicitly turn off alerts via the Bell menu -> "Turn off".
    logoutUser({ preserveNext: false });
    setIsAuthenticated(false);
    setShowLegalModal(false);
    onHideSessionModal();
    navigate("/login", { replace: true });
  };

  // Mobile alerts belong to whoever enabled them in this browser.
  useEffect(() => {
    if (isAuthenticated && userId) syncPushOwnership(userId);
  }, [isAuthenticated, userId]);

  const getDefaultRedirectPath = (role, moduleState = null) => {
    const custody = moduleState?.hasCustodyModule !== undefined ? moduleState.hasCustodyModule : hasCustodyModule;
    const issuance = moduleState?.hasIssuanceModule !== undefined ? moduleState.hasIssuanceModule : hasIssuanceModule;
    const quotation = moduleState?.hasQuotationModule !== undefined ? moduleState.hasQuotationModule : hasQuotationModule;

    if (role === 'system_owner') return "/system-owner/dashboard";
    if (role === 'corporate_admin') {
      if (!custody && !issuance && quotation) {
        return "/corporate-admin/quotations";
      }
      return "/corporate-admin/dashboard";
    }
    if (role === 'checker') return "/checker/approval-requests";
    if (role === 'end_user' || role === 'viewer') {
      if (!custody && !issuance && quotation) {
        return "/end-user/quotations/active";
      }
      return "/end-user/action-center";
    }
    return "/login";
  };

  const LGRecordsRedirect = () => {
    const { id } = useParams();
    const rolePath = (userRole === 'corporate_admin' || userRole === 'viewer') ? 'corporate-admin' : 'end-user';
    return <Navigate to={`/${rolePath}/lg-records${id ? `/${id}` : ''}`} replace />;
  };

  const renderAppRoutes = () => {
    if (isLoading) return <div className="flex justify-center items-center min-h-screen bg-gray-100"><p>Loading application...</p></div>;
    return (
      <>
        {showLegalModal && <LegalArtifactModal onAcceptSuccess={handleAcceptSuccess} onLogout={handleLogout} />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/know-more" element={<KnowMorePage />} />
          <Route path="/free-trial-register" element={<FreeTrialRegistration />} />
          <Route path="/portal/issuance" element={<PublicIssuancePortal />} />
          <Route path="/public-issuance/dashboard" element={<RequestorDashboard />} />
          <Route path="/public-issuance/form" element={<PublicIssuanceForm />} />
          <Route path="/public-quotation/:token" element={<QuotationBankOfferPage />} />
          <Route path="/public/quotation/:token" element={<QuotationBankOfferPage />} />
          <Route path="/public-bank-handshake/:token" element={<PublicBankHandshakePage />} />
          <Route path="/public/bank-handshake/:token" element={<PublicBankHandshakePage />} />
          <Route path="/public-dealer-handshake/:token" element={<PublicBankHandshakePage />} />
          <Route path="/public/dealer-handshake/:token" element={<PublicBankHandshakePage />} />
          <Route path="/dealer" element={<Navigate to="/dealer/desk" replace />} />
          <Route path="/dealer/login" element={<BankDealerAuthPage initialMode="login" />} />
          <Route path="/dealer/enroll" element={<BankDealerAuthPage initialMode="enroll" />} />
          <Route path="/dealer/desk" element={<BankDealerDeskPage />} />
          <Route path="/dealer/alerts/setup/:setupToken" element={<DealerStandingAlertSetupPage />} />
          <Route path="/dealer-alerts/setup/:setupToken" element={<DealerStandingAlertSetupPage />} />
          <Route path="/mobile-pair" element={<MobilePairAuthPage />} />
          <Route path="/mobile-pair/:token" element={<MobilePairAuthPage />} />
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/force-password-change" element={<ForcePasswordChangePage onPasswordChangeSuccess={handleLoginSuccess} />} />
          <Route path="/renewal" element={<RenewalPage />} />
          <Route element={<AuthWrapper isAuthenticated={isAuthenticated} userRole={userRole} onLogout={handleLogout} />}>
            {mustChangePassword ? (
              <Route path="*" element={<Navigate to="/force-password-change" replace />} />
            ) : (
              <Route path="/*" element={<ProtectedLayout onLogout={handleLogout} userRole={userRole} userPermissions={userPermissions} customerName={customerName} customerId={customerId} subscriptionStatus={subscriptionStatus} subscriptionEndDate={subscriptionEndDate} hasCustodyModule={hasCustodyModule} hasIssuanceModule={hasIssuanceModule} hasQuotationModule={hasQuotationModule} hasReconciliationModule={hasReconciliationModule} />}>
                <Route path="system-owner/*" element={<SystemOwnerRoutes onLogout={handleLogout} />} />
                <Route path="corporate-admin/*" element={<CorporateAdminRoutes onLogout={handleLogout} subscriptionStatus={subscriptionStatus} customerId={customerId} hasIssuanceModule={hasIssuanceModule} hasCustodyModule={hasCustodyModule} hasQuotationModule={hasQuotationModule} hasReconciliationModule={hasReconciliationModule} />} />
                <Route path="checker/*" element={<CheckerRoutes />} />
                <Route path="end-user/*" element={<EndUserRoutes onLogout={handleLogout} subscriptionStatus={subscriptionStatus} customerId={customerId} hasCustodyModule={hasCustodyModule} hasIssuanceModule={hasIssuanceModule} hasQuotationModule={hasQuotationModule} hasReconciliationModule={hasReconciliationModule} />} />
                <Route path="lg-records/:id" element={<LGRecordsRedirect />} />
                <Route path="lg-records" element={<LGRecordsRedirect />} />
                <Route path="issuance/facilities" element={<Navigate to="/corporate-admin/issuance/facilities" replace />} />
                <Route path="issuance/requests" element={<Navigate to={`/${(userRole === 'corporate_admin' || userRole === 'viewer') ? 'corporate-admin' : 'end-user'}/issuance/requests`} replace />} />
                <Route path="issuance/issued-lgs" element={<Navigate to={`/${(userRole === 'corporate_admin' || userRole === 'viewer') ? 'corporate-admin' : 'end-user'}/issuance/issued-lgs`} replace />} />
                <Route path="issuance/reconciliation" element={<Navigate to={`/${(userRole === 'corporate_admin' || userRole === 'viewer') ? 'corporate-admin' : 'end-user'}/issuance/reconciliation`} replace />} />
                <Route path="*" element={<Navigate to={getDefaultRedirectPath(userRole)} replace />} />
              </Route>
            )}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  };
  return renderAppRoutes();
}

// Styling for Session Modal
const modalStyles = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' };
const modalContentStyles = { background: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#1f2937' };

const isPublicPage = () => {
  if (typeof window === 'undefined') return false;
  const p = (window.location.pathname || '').toLowerCase();
  return (
    p.startsWith('/public') ||
    p.includes('/public-quotation') ||
    p.includes('/public/quotation') ||
    p.includes('/public-bank-handshake') ||
    p.includes('/public/bank-handshake') ||
    p.includes('/public-dealer-handshake') ||
    p.includes('/public/dealer-handshake') ||
    p.startsWith('/dealer') ||
    p.startsWith('/mobile-pair')
  );
};

function App() {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WARNING_BUFFER_MS / 1000);

  // Unified Wall-Clock Countdown Logic
  useEffect(() => {
    let interval;
    if (showSessionModal && !isPublicPage()) {
      setTimeLeft(getRemainingWarningSeconds() || (WARNING_BUFFER_MS / 1000));
      interval = setInterval(() => {
        const remaining = getRemainingWarningSeconds();
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          setShowSessionModal(false);
          logoutUser({ preserveNext: true });
        }
      }, 1000);
    } else if (showSessionModal && isPublicPage()) {
      setShowSessionModal(false);
    }
    return () => clearInterval(interval);
  }, [showSessionModal]);

  const handleExtend = async () => {
    const success = await extendSession();
    if (success) {
      setShowSessionModal(false);
      // Restart timers for the next cycle
      startSessionTimers(() => setShowSessionModal(true), Date.now());
    } else {
      setShowSessionModal(false);
      logoutUser({ preserveNext: true });
    }
  };

  const handleCloseAndLogout = () => {
    setShowSessionModal(false);
    logoutUser({ preserveNext: false });
  };

  return (
    <HelmetProvider>
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 antialiased transition-colors duration-200">
        <ErrorBoundary>
          <AppContent
            showSessionModal={showSessionModal}
            onShowSessionWarning={() => {
              if (!isPublicPage()) setShowSessionModal(true);
            }}
            onHideSessionModal={() => setShowSessionModal(false)}
          />
        </ErrorBoundary>

        {showSessionModal && !isPublicPage() && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />

            {/* Modal Card */}
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 animate-in fade-in zoom-in duration-300">

              {/* Top Accent Bar (Red/Orange for Urgency) */}
              <div className="h-2 bg-gradient-to-r from-blue-400 to-red-500" />

              <div className="p-8 text-center">
                {/* Warning Icon Circle */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Session Expiring
                </h3>

                <p className="mb-8 text-gray-600 dark:text-gray-300">
                  For your security, you will be logged out in:
                  <span className="block mt-2 text-4xl font-mono font-extrabold text-red-500 tabular-nums">
                    0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                  </span>
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-200"
                    onClick={handleExtend}
                  >
                    Stay Logged In
                  </button>
                  <button
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                    onClick={handleCloseAndLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <ToastContainer position="top-right" autoClose={2500} transition={Flip} />
      </div>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
