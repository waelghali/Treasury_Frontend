// frontend/src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import LoginPage from './pages/Auth/LoginPage';
import ForcePasswordChangePage from './pages/Auth/ForcePasswordChangePage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import KnowMorePage from './pages/KnowMorePage';
import FreeTrialRegistration from './pages/Public/FreeTrialRegistration'; 
import PublicIssuancePortal from './pages/Public/PublicIssuancePortal';
import RenewalPage from './pages/RenewalPage'; 

import AuthWrapper from './components/AuthWrapper';
import ProtectedLayout from './components/ProtectedLayout';
import LegalArtifactModal from './components/LegalArtifactModal';

import SystemOwnerRoutes from './routes/SystemOwnerRoutes.js';
import CorporateAdminRoutes from './routes/CorporateAdminRoutes.js';
import EndUserRoutes from './routes/EndUserRoutes.js';

import { 
  getAuthToken, 
  setAuthToken, 
  startInactivityTracker, 
  stopInactivityTracker,
  startSessionTimers,
  clearSessionTimers,
  extendSession,
  logoutUser,
  handleUserActivity,
  WARNING_BUFFER_MS 
} from './services/apiService';
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
  const [customerName, setCustomerName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [showLegalModal, setShowLegalModal] = useState(false);

  const navigate = useNavigate();
  
  // Ref to track modal state inside event listeners without triggering re-renders
  const modalOpenRef = useRef(showSessionModal);

  useEffect(() => {
    modalOpenRef.current = showSessionModal;
  }, [showSessionModal]);

  const onIdleWarning = useCallback(() => {
    onShowSessionWarning();
  }, [onShowSessionWarning]);

  const initTrackers = (state) => {
    if (state.isAuthenticated && !state.mustChangePassword && !state.mustAcceptPolicies && state.subscriptionStatus !== 'expired') {
      startInactivityTracker();
      startSessionTimers(onIdleWarning);
    } else {
      stopInactivityTracker();
      clearSessionTimers();
    }
  };

  const decodeTokenAndSetState = (token) => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsAuthenticated(true);
        setUserRole(decoded.role);
        setMustChangePassword(decoded.must_change_password || false);
        setMustAcceptPolicies(decoded.must_accept_policies || false);
        setUserId(decoded.user_id);
        setCustomerName(decoded.customer_name);
        setSubscriptionStatus(decoded.subscription_status || 'active');
        setSubscriptionEndDate(decoded.subscription_end_date || null);
        setUserPermissions(decoded.permissions || []);
        return { 
          isAuthenticated: true,
          userRole: decoded.role,
          mustChangePassword: decoded.must_change_password || false,
          mustAcceptPolicies: decoded.must_accept_policies || false,
          subscriptionStatus: decoded.subscription_status || 'active'
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

  // Initial Load & Storage Sync
  useEffect(() => {
    const token = getAuthToken();
    const state = decodeTokenAndSetState(token);
    
    if (state.isAuthenticated && !modalOpenRef.current) initTrackers(state);
    if (state.isAuthenticated && state.mustAcceptPolicies) setShowLegalModal(true);

    const handleStorageChange = (event) => {
      if (event.key === 'jwt_token') {
        const newState = decodeTokenAndSetState(event.newValue);
        if (newState.isAuthenticated && !modalOpenRef.current) initTrackers(newState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    setIsLoading(false);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); 

  // User Activity Tracking
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const resetAction = () => {
      // If modal is open, we stop resetting the timer to let it expire
      if (isAuthenticated && !modalOpenRef.current) {
        handleUserActivity(onIdleWarning);
      }
    };

    if (isAuthenticated) {
      activityEvents.forEach(event => window.addEventListener(event, resetAction));
    }

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, resetAction));
    };
  }, [isAuthenticated, onIdleWarning]);

  const handleLoginSuccess = (response) => {
    setAuthToken(response.access_token);
    const state = decodeTokenAndSetState(response.access_token);
    if (state.mustAcceptPolicies) setShowLegalModal(true);
    else if (!state.isAuthenticated) navigate("/login", { replace: true });
    else if (state.mustChangePassword) navigate("/force-password-change", { replace: true });
    else if (state.subscriptionStatus === 'expired') navigate("/renewal", { replace: true });
    else {
        initTrackers(state);
        navigate(getDefaultRedirectPath(state.userRole), { replace: true });
    }
  };

  const handleAcceptSuccess = () => {
    const state = decodeTokenAndSetState(getAuthToken());
    setShowLegalModal(false);
    if (state.mustChangePassword) navigate("/force-password-change", { replace: true });
    else if (state.subscriptionStatus === 'expired') navigate("/renewal", { replace: true });
    else {
      initTrackers(state);
      navigate(getDefaultRedirectPath(state.userRole), { replace: true });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowLegalModal(false);
    onHideSessionModal();
    logoutUser();
  };

  const getDefaultRedirectPath = (role) => {
    if (role === 'system_owner') return "/system-owner/dashboard";
    if (role === 'corporate_admin') return "/corporate-admin/dashboard";
    if (role === 'end_user' || role === 'checker' || role === 'viewer') return "/end-user/action-center";
    return "/login";
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
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/force-password-change" element={<ForcePasswordChangePage onPasswordChangeSuccess={handleLoginSuccess} />} />
          <Route path="/renewal" element={<RenewalPage />} />
          <Route element={<AuthWrapper isAuthenticated={isAuthenticated} userRole={userRole} onLogout={handleLogout} />}>
            {mustChangePassword ? (
              <Route path="*" element={<Navigate to="/force-password-change" replace />} />
            ) : (
              <Route path="/*" element={<ProtectedLayout onLogout={handleLogout} userRole={userRole} userPermissions={userPermissions} customerName={customerName} subscriptionStatus={subscriptionStatus} subscriptionEndDate={subscriptionEndDate} />}>
                <Route path="system-owner/*" element={<SystemOwnerRoutes onLogout={handleLogout} />} />
                <Route path="corporate-admin/*" element={<CorporateAdminRoutes onLogout={handleLogout} subscriptionStatus={subscriptionStatus} />} />
                <Route path="end-user/*" element={<EndUserRoutes onLogout={handleLogout} subscriptionStatus={subscriptionStatus} />} />
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

function App() {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WARNING_BUFFER_MS / 1000);

  // Unified Countdown Logic
  useEffect(() => {
    let interval;
    if (showSessionModal) {
      setTimeLeft(WARNING_BUFFER_MS / 1000);
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showSessionModal]);

  const handleExtend = async () => {
    const success = await extendSession();
    if (success) {
      setShowSessionModal(false);
      // Restart timers for the next cycle
      startSessionTimers(() => setShowSessionModal(true)); 
    } else {
      setShowSessionModal(false);
      logoutUser();
    }
  };

  const handleCloseAndLogout = () => {
    setShowSessionModal(false);
    logoutUser();
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 antialiased transition-colors duration-200">
        <AppContent 
          showSessionModal={showSessionModal}
          onShowSessionWarning={() => setShowSessionModal(true)} 
          onHideSessionModal={() => setShowSessionModal(false)}
        />
				
		{showSessionModal && (
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
  );
}

export default App;