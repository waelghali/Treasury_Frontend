// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import LoginPage from './pages/Auth/LoginPage';
import ForcePasswordChangePage from './pages/Auth/ForcePasswordChangePage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import KnowMorePage from './pages/KnowMorePage';
import FreeTrialRegistration from './pages/Public/FreeTrialRegistration'; // NEW IMPORT

import RenewalPage from './pages/RenewalPage'; 

import AuthWrapper from './components/AuthWrapper';
import ProtectedLayout from './components/ProtectedLayout';
import LegalArtifactModal from './components/LegalArtifactModal';

import SystemOwnerRoutes from './routes/SystemOwnerRoutes.js';
import CorporateAdminRoutes from './routes/CorporateAdminRoutes.js';
import EndUserRoutes from './routes/EndUserRoutes.js';

import { getAuthToken, setAuthToken, startInactivityTracker, stopInactivityTracker } from './services/apiService';
import { jwtDecode } from 'jwt-decode';

import { ToastContainer, Flip } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ToastAnimations.css';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mustAcceptPolicies, setMustAcceptPolicies] = useState(false);
  const [userId, setUserId] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);

  const [showLegalModal, setShowLegalModal] = useState(false);

  const navigate = useNavigate();

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
        setUserRole(null);
        setUserPermissions([]);
      }
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
      setUserPermissions([]);
    }
    return { isAuthenticated: false };
  };

  useEffect(() => {
    const token = getAuthToken();
    const state = decodeTokenAndSetState(token);

    if (state.isAuthenticated && !state.mustChangePassword && !state.mustAcceptPolicies && state.subscriptionStatus !== 'expired') {
      startInactivityTracker();
    } else {
      stopInactivityTracker();
    }
    
    if (state.isAuthenticated && state.mustAcceptPolicies) {
        setShowLegalModal(true);
    }

    setIsLoading(false);

    const handleStorageChange = (event) => {
      if (event.key === 'jwt_token') {
        const newToken = event.newValue;
        const newState = decodeTokenAndSetState(newToken);
        if (newState.isAuthenticated && !newState.mustChangePassword && !newState.mustAcceptPolicies && newState.subscriptionStatus !== 'expired') {
          startInactivityTracker();
        } else {
          stopInactivityTracker();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      stopInactivityTracker();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLoginSuccess = (response) => {
    setAuthToken(response.access_token);
    // FIX: Temporarily disable no-unused-vars rule here to allow using destructured properties for branching logic
    // eslint-disable-next-line no-unused-vars
    const { 
      mustChangePassword: updatedMustChangePassword, 
      mustAcceptPolicies: updatedMustAcceptPolicies,
      userRole: updatedUserRole, 
      isAuthenticated: updatedIsAuthenticated, 
      subscriptionStatus: updatedSubscriptionStatus 
    } = decodeTokenAndSetState(response.access_token);

    if (updatedMustAcceptPolicies) {
        setShowLegalModal(true);
    } else if (!updatedIsAuthenticated) {
        navigate("/login", { replace: true });
    } else if (updatedMustChangePassword) {
        navigate("/force-password-change", { replace: true });
    } else if (updatedSubscriptionStatus === 'expired') {
        navigate("/renewal", { replace: true });
    } else {
        const redirectPath = getDefaultRedirectPath(updatedUserRole);
        navigate(redirectPath, { replace: true });
    }
  };

  const handleAcceptSuccess = () => {
    const token = getAuthToken();
    const { 
      mustChangePassword: updatedMustChangePassword, 
      userRole: updatedUserRole, 
      isAuthenticated: updatedIsAuthenticated, 
      subscriptionStatus: updatedSubscriptionStatus 
    } = decodeTokenAndSetState(token);
    
    setShowLegalModal(false);

    if (updatedMustChangePassword) {
      navigate("/force-password-change", { replace: true });
    } else if (updatedSubscriptionStatus === 'expired') {
        navigate("/renewal", { replace: true });
    } else {
      const redirectPath = getDefaultRedirectPath(updatedUserRole);
      navigate(redirectPath, { replace: true });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setMustChangePassword(false);
    setMustAcceptPolicies(false);
    setShowLegalModal(false);
    setUserId(null);
    setCustomerName(null);
    setAuthToken(null);
    stopInactivityTracker();
    navigate("/login", { replace: true });
  };

  const getDefaultRedirectPath = (role) => {
    if (role === 'system_owner') {
      return "/system-owner/dashboard";
    } else if (role === 'corporate_admin') {
      return "/corporate-admin/dashboard";
    } else if (role === 'end_user' || role === 'checker' || role === 'viewer') {
      // FIX: Changed default redirect from 'lg-records' to 'action-center'
      return "/end-user/action-center"; 
    }
    return "/login";
  };
  
  const renderAppRoutes = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
          <p>Loading application and determining access...</p>
        </div>
      );
    }

    return (
      <>
        {showLegalModal && <LegalArtifactModal onAcceptSuccess={handleAcceptSuccess} onLogout={handleLogout} />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/know-more" element={<KnowMorePage />} />
          <Route path="/free-trial-register" element={<FreeTrialRegistration />} />
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/force-password-change" element={<ForcePasswordChangePage onPasswordChangeSuccess={handleLoginSuccess} />} />
          <Route path="/renewal" element={<RenewalPage />} />
          
          <Route element={<AuthWrapper isAuthenticated={isAuthenticated} userRole={userRole} onLogout={handleLogout} />}>
            {mustChangePassword ? (
              <Route path="*" element={<Navigate to="/force-password-change" replace />} />
            ) : (
              <Route
                path="/*"
                element={
                  <ProtectedLayout 
                    onLogout={handleLogout} 
                    key={userId} 
                    userRole={userRole}
                    userPermissions={userPermissions}
                    customerName={customerName} 
                    subscriptionStatus={subscriptionStatus} 
                    subscriptionEndDate={subscriptionEndDate} 
                  />
                }
              >
                <Route path="system-owner/*" element={<SystemOwnerRoutes onLogout={handleLogout} />} />
                <Route path="corporate-admin/*" element={<CorporateAdminRoutes onLogout={handleLogout} subscriptionStatus={subscriptionStatus} />} />
                <Route path="end-user/*" element={<EndUserRoutes onLogout={handleLogout} subscriptionStatus={subscriptionStatus} />} />
                {/* Fallback route inside protected area */}
                <Route path="*" element={<Navigate to={getDefaultRedirectPath(userRole)} replace />} />
              </Route>
            )}
          </Route>
          {/* Fallback route for unauthenticated users */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  };
  
  return renderAppRoutes();
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800 antialiased">
        <AppContent />
        <ToastContainer
          position="top-right"
          autoClose={2500}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          transition={Flip}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;