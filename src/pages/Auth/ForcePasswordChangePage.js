// frontend/src/pages/Auth/ForcePasswordChangePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest, getAuthToken, setAuthToken } from 'services/apiService.js';
import { jwtDecode } from 'jwt-decode';
import { Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import GrowLogo from '../../components/Common/GrowLogo';

function ForcePasswordChangePage({ onPasswordChangeSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [policy, setPolicy] = useState({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_digit: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    apiRequest('/password-policy', 'GET')
      .then((res) => {
        if (active && res && typeof res === 'object') {
          setPolicy({
            min_length: Number(res.min_length) || 8,
            require_uppercase: res.require_uppercase !== false,
            require_lowercase: res.require_lowercase !== false,
            require_digit: res.require_digit !== false,
          });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const getRedirectPathFromToken = () => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.role === 'system_owner') {
          return "/system-owner/dashboard";
        } else if (decoded.role === 'corporate_admin') {
          return "/corporate-admin/dashboard";
        } else if (decoded.role === 'end_user' || decoded.role === 'checker') {
          return "/end-user/dashboard";
        }
      } catch (error) {
        console.error("ForcePasswordChangePage: Failed to decode token for redirect path:", error);
      }
    }
    return "/login";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword === currentPassword) { setError('New password must be different from your current password.'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < policy.min_length) { setError(`Password must be at least ${policy.min_length} characters.`); return; }
    if (policy.require_uppercase && !/[A-Z]/.test(newPassword)) { setError('Password must contain at least one uppercase letter.'); return; }
    if (policy.require_lowercase && !/[a-z]/.test(newPassword)) { setError('Password must contain at least one lowercase letter.'); return; }
    if (policy.require_digit && !/\d/.test(newPassword)) { setError('Password must contain at least one digit.'); return; }

    setIsLoading(true);
    try {
      const data = await apiRequest('/change-password', 'POST', {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword
      });

      if (data && data.access_token) {
        setAuthToken(data.access_token);
      }
      
      setSuccessMessage('Password changed successfully! Redirecting...');

      if (onPasswordChangeSuccess) {
        onPasswordChangeSuccess(data);
      }

    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "block w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-400";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", backgroundColor: '#1e2a4a' }}>
      <Helmet>
        <title>Change Password — Grow LG Management Platform</title>
      </Helmet>

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] bg-white -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-[0.04] bg-white -ml-36 -mb-36" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-6 hover:opacity-95 transition-opacity">
            <GrowLogo size="md" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Change Your Password</h2>
            <p className="text-sm text-slate-500 mt-1">
              You must update your password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                className={inputCls}
                placeholder="The password you just used to log in"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                className={inputCls}
                placeholder="Choose a strong new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={policy.min_length}
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                className={inputCls}
                placeholder="Re-enter your new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={policy.min_length}
              />
            </div>

            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside ml-1 space-y-0.5">
                <li>At least {policy.min_length} characters</li>
                {policy.require_uppercase && <li>At least one uppercase letter</li>}
                {policy.require_lowercase && <li>At least one lowercase letter</li>}
                {policy.require_digit && <li>At least one digit</li>}
                <li>Different from your current password</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-start space-x-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Changing...</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" /> Change Password</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForcePasswordChangePage;