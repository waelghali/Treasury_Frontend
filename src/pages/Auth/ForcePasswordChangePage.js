// frontend/src/pages/Auth/ForcePasswordChangePage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, getAuthToken, setAuthToken } from 'services/apiService.js';
import { jwtDecode } from 'jwt-decode';
import { Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

function ForcePasswordChangePage({ onPasswordChangeSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

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

    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }

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

  const inputCls = "block w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400";

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
          <div className="flex items-center justify-center space-x-2 mb-6">
            <span className="text-xl font-bold text-white tracking-tight">Grow</span>
            <span className="text-xs text-blue-400 font-medium">Business Development</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Change Your Password</h2>
            <p className="text-sm text-gray-500 mt-1">
              You must update your password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
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
              <label htmlFor="newPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
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
                minLength="8"
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
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
                minLength="8"
              />
            </div>

            <div className="text-xs text-gray-400 space-y-0.5">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside ml-1 space-y-0.5">
                <li>At least 8 characters</li>
                <li>One uppercase and one lowercase letter</li>
                <li>At least one digit</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
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