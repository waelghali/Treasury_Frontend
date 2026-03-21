// src/pages/Auth/ResetPasswordPage.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from 'services/apiService';
import { Lock, Loader2, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';

function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenFromUrl = queryParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Password reset token is missing from the URL.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    if (!token) { setError('Missing password reset token.'); setIsLoading(false); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); setIsLoading(false); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); setIsLoading(false); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Must contain at least one uppercase letter.'); setIsLoading(false); return; }
    if (!/[a-z]/.test(newPassword)) { setError('Must contain at least one lowercase letter.'); setIsLoading(false); return; }
    if (!/\d/.test(newPassword)) { setError('Must contain at least one digit.'); setIsLoading(false); return; }

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword, confirm_new_password: confirmNewPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password reset successfully!', { autoClose: 5000 });
        setMessage('Your password has been reset. Redirecting to login...');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.detail || 'Reset failed. The token might be invalid or expired.');
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
        <title>Reset Password — Grow LG Management Platform</title>
        <meta name="description" content="Set a new password for your Grow account." />
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
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
            <p className="text-sm text-gray-500 mt-1">Choose a strong new password for your account.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!token && (
              <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error || 'No reset token found. Please use the link from your email.'}</span>
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                className={inputCls}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength="8"
              />
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                required
                className={inputCls}
                placeholder="Confirm your new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                minLength="8"
              />
            </div>

            {/* Password requirements hint */}
            <div className="text-xs text-gray-400 space-y-0.5">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside ml-1 space-y-0.5">
                <li>At least 8 characters</li>
                <li>One uppercase and one lowercase letter</li>
                <li>At least one digit</li>
              </ul>
            </div>

            {message && (
              <div className="flex items-start space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {error && token && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
              disabled={isLoading || !token}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Resetting...</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" /> Reset Password</>
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-100">
            <Link to="/login" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;