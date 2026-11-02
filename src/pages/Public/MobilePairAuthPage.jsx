// src/pages/Public/MobilePairAuthPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { Smartphone, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, Share2, PlusSquare, ArrowRight, RefreshCw, Fingerprint } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { getOrCreateDeviceId } from '../../services/apiService';
import {
    isPushSupported,
    isIosDevice,
    isStandalone,
    getPushStatus,
    getVapidPublicKey,
    urlBase64ToUint8Array
} from '../../services/pushService';
import {
    isBiometricSupported,
    getBiometricDisplayLabel,
    enrollBiometricWithOptions,
    getStoredBiometricInfo,
} from '../../services/biometricService';

export default function MobilePairAuthPage() {
    const { token: routeToken } = useParams();
    const [searchParams] = useSearchParams();
    const token = routeToken || searchParams.get('token');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState(false);
    const [accountInfo, setAccountInfo] = useState(null);
    const [tokenError, setTokenError] = useState('');
    const [authError, setAuthError] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [iosGuideNeeded, setIosGuideNeeded] = useState(false);
    const [webauthnOptions, setWebauthnOptions] = useState(null);
    const [enrollingBio, setEnrollingBio] = useState(false);
    const [bioEnrolled, setBioEnrolled] = useState(() => getStoredBiometricInfo().hasBiometric);
    const [bioError, setBioError] = useState('');

    useEffect(() => {
        if (!token) {
            setTokenError('Missing pairing token. Please scan the QR code from your computer screen again.');
            setLoading(false);
            return;
        }
        loadPairInfo();
    }, [token]);

    const loadPairInfo = async () => {
        setLoading(true);
        setTokenError('');
        try {
            const res = await apiClient.get(`/notifications/push/mobile-pair/${token}/info`);
            setAccountInfo(res.data);
            if (res.data?.is_paired) {
                setIsSuccess(true);
            }
        } catch (e) {
            const isNetErr = !e.response || e.message === 'Network Error' || e.code === 'ERR_NETWORK';
            const msg = isNetErr
                ? 'Cannot connect to Grow server. Please ensure the backend service is running.'
                : (e?.response?.data?.detail || 'This pairing QR code has expired or is invalid. Please generate a new QR code on your computer.');
            setTokenError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorize = async (e) => {
        e.preventDefault();
        setAuthError('');
        if (!password.trim()) {
            setAuthError('Please enter your Grow corporate password.');
            return;
        }

        // On iOS, Web Push is only supported when added to Home Screen
        if (isIosDevice() && !isStandalone()) {
            setIosGuideNeeded(true);
            return;
        }

        if (!isPushSupported()) {
            setAuthError('Web Push notifications are not supported in this mobile browser.');
            return;
        }

        setAuthorizing(true);
        setAuthError('');

        try {
            // Request push notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setAuthError('Notification permission was denied. Please allow notifications in your phone browser settings to receive alerts.');
                setAuthorizing(false);
                return;
            }

            // Fetch VAPID public key
            const vapidKey = accountInfo?.vapid_public_key || (await getVapidPublicKey());
            if (!vapidKey) {
                setAuthError('Push notifications are not configured on the server.');
                setAuthorizing(false);
                return;
            }

            // Register service worker and ensure ready
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                });
            }

            const json = sub.toJSON();
            const platform = isIosDevice() ? 'ios' : (/Android/.test(navigator.userAgent) ? 'android' : 'desktop');
            const deviceLabel = isIosDevice() ? 'iPhone / iPad' : (platform === 'android' ? 'Android Phone' : 'Mobile Device');

            // Send authorization with password to backend
            const res = await apiClient.post(`/notifications/push/mobile-pair/${token}/authorize`, {
                password,
                endpoint: sub.endpoint,
                keys: {
                    p256dh: json.keys?.p256dh,
                    auth: json.keys?.auth
                },
                device_id: getOrCreateDeviceId(),
                device_label: deviceLabel,
                platform,
                rp_id: window.location.hostname,
            });

            if (res.data?.user_id) {
                try {
                    localStorage.setItem('push_owner_user_id', String(res.data.user_id));
                } catch {}
            }
            if (res.data?.webauthn_registration) {
                setWebauthnOptions(res.data.webauthn_registration);
            }

            setIsSuccess(true);
        } catch (err) {
            console.error('Authorization failed:', err);
            const isNetErr = !err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK';
            const msg = isNetErr
                ? 'Network connection error: Unable to communicate with the Grow API server. Please check your network connection.'
                : (err?.response?.data?.detail || err?.message || 'Failed to authorize this device.');
            setAuthError(msg);
        } finally {
            setAuthorizing(false);
        }
    };

    const handleEnableBiometrics = async () => {
        if (!webauthnOptions) return;
        setEnrollingBio(true);
        setBioError('');
        try {
            await enrollBiometricWithOptions(webauthnOptions);
            setBioEnrolled(true);
        } catch (err) {
            console.error('Biometric enrollment failed:', err);
            if (err?.name === 'NotAllowedError') {
                setBioError('Biometric verification was cancelled or not allowed on this device.');
            } else {
                setBioError(err?.response?.data?.detail || err?.message || 'Could not enable biometric login.');
            }
        } finally {
            setEnrollingBio(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
            {/* Top Brand Header */}
            <div className="max-w-md w-full mx-auto pt-6 text-center">
                <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-400 mb-3 shadow-md">
                    <ShieldCheck size={14} />
                    <span>Zero-Trust Device Authorization</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Grow Treasury Platform</h1>
                <p className="text-xs text-slate-400 mt-1">Mobile Alert Pairing Ceremony</p>
            </div>

            {/* Main Center Card */}
            <div className="max-w-md w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in-up">
                {loading && (
                    <div className="py-12 flex flex-col items-center gap-3 text-center">
                        <RefreshCw size={32} className="animate-spin text-emerald-400" />
                        <p className="text-xs text-slate-300 font-medium">Verifying pairing token...</p>
                    </div>
                )}

                {!loading && tokenError && (
                    <div className="py-6 flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-white">Pairing Link Invalid</h3>
                        <p className="text-xs text-rose-300 leading-relaxed">{tokenError}</p>
                        <button
                            onClick={() => { setTokenError(''); loadPairInfo(); }}
                            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                            Retry Handshake
                        </button>
                    </div>
                )}

                {!loading && !tokenError && isSuccess && (
                    <div className="py-6 flex flex-col items-center text-center gap-3 animate-fadeIn">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center animate-bounce">
                            <CheckCircle2 size={36} />
                        </div>
                        <h2 className="text-lg font-bold text-white mt-1">Device Successfully Authorized!</h2>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                            This phone is now securely linked to <strong>{accountInfo?.email}</strong>. You will receive instant lock-screen alerts for RFQs, quotations, and approvals.
                        </p>

                        {/* Biometric Enrollment Step (Face ID / Fingerprint for Notification Tap Login) */}
                        {isBiometricSupported() && webauthnOptions && !bioEnrolled && (
                            <div className="w-full mt-3 p-4 bg-slate-950/80 border border-blue-500/40 rounded-2xl text-left space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <Fingerprint size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">
                                            Enable {getBiometricDisplayLabel()} Login
                                        </h4>
                                        <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                                            Skip typing your email and password when you tap a mobile notification. Unlock Grow instantly with your phone&apos;s biometrics.
                                        </p>
                                    </div>
                                </div>

                                {bioError && (
                                    <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-[11px] text-rose-300">
                                        {bioError}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleEnableBiometrics}
                                    disabled={enrollingBio}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {enrollingBio ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" />
                                            <span>Waiting for {getBiometricDisplayLabel()}...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Fingerprint size={16} />
                                            <span>Activate {getBiometricDisplayLabel()}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {bioEnrolled && (
                            <div className="w-full mt-2 p-3.5 bg-blue-950/40 border border-blue-700/50 rounded-2xl flex items-center gap-2.5 text-left">
                                <Fingerprint size={18} className="text-blue-400 shrink-0" />
                                <div className="text-[11px] text-blue-200 leading-relaxed">
                                    <strong className="text-white block">{getBiometricDisplayLabel()} Enabled</strong>
                                    When you tap a notification on this phone, you can sign in with a single biometric scan.
                                </div>
                            </div>
                        )}

                        <div className="w-full mt-2 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl text-[11px] text-emerald-300">
                            You may now close this browser tab or return to your computer.
                        </div>
                    </div>
                )}

                {!loading && !tokenError && !isSuccess && iosGuideNeeded && (
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                            <Share2 size={18} />
                            <span>iOS Home Screen Setup Required</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Apple iOS requires web applications to be added to the Home Screen before allowing lock-screen push alerts:
                        </p>
                        <div className="space-y-2.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                                <span>Tap the <strong>Share</strong> button <Share2 size={13} className="inline text-blue-400" /> at the bottom of Safari.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                                <span>Scroll down and select <strong>"Add to Home Screen"</strong> <PlusSquare size={13} className="inline text-emerald-400" />.</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                                <span>Open <strong>Grow</strong> from your Home Screen to finish pairing.</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIosGuideNeeded(false)}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                            Back to Authorization
                        </button>
                    </div>
                )}

                {!loading && !tokenError && !isSuccess && !iosGuideNeeded && accountInfo && (
                    <form onSubmit={handleAuthorize} className="space-y-4">
                        <div className="text-center pb-2 border-b border-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pairing Mobile Device For</p>
                            <h3 className="text-base font-bold text-white mt-0.5">{accountInfo.full_name || accountInfo.email}</h3>
                            <p className="text-xs text-emerald-400 font-mono mt-0.5">{accountInfo.email}</p>
                            {accountInfo.company_name && (
                                <p className="text-[11px] text-slate-400 mt-0.5">{accountInfo.company_name}</p>
                            )}
                        </div>

                        {/* Unlocked Laptop Security Notice */}
                        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-3.5 flex items-start gap-2.5">
                            <Lock size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                                <strong>Physical Security Verification:</strong> Enter your Grow corporate password to confirm you are the authorized owner of this device.
                            </div>
                        </div>

                        {/* Inline Auth Error Banner */}
                        {authError && (
                            <div className="bg-rose-500/15 border border-rose-500/40 rounded-2xl p-3 flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
                                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                                <div className="leading-relaxed">
                                    <strong className="text-white block font-semibold">Authentication Failed</strong>
                                    {authError}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                Grow Account Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); if (authError) setAuthError(''); }}
                                    placeholder="Enter your corporate password"
                                    required
                                    autoFocus
                                    className={`w-full px-3.5 py-3 bg-slate-950 border ${authError ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-500' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'} rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 font-medium pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={authorizing || !password.trim()}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {authorizing ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    <span>Verifying & Linking Device...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={16} />
                                    <span>Authorize & Enable Alerts</span>
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Bottom Footer */}
            <div className="max-w-md w-full mx-auto pb-4 text-center text-[10px] text-slate-500">
                Grow Treasury Management System · End-to-End Encrypted Web Push Alerts
            </div>
        </div>
    );
}
