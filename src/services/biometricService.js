// src/services/biometricService.js
// WebAuthn / Passkey Biometric Login (Face ID, Touch ID, Android Fingerprint)
// Scoped exclusively to permanent platform users (End Users, Corporate Admins, Checkers, System Owners).

import apiClient from './apiClient';
import { API_BASE_URL, getOrCreateDeviceId } from './apiService';
import { isIosDevice } from './pushService';

const BIOMETRIC_CRED_ID_KEY = 'grow_biometric_cred_id';
const BIOMETRIC_EMAIL_KEY = 'grow_biometric_user_email';

export const bufferToBase64Url = (buffer) => {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const base64UrlToUint8Array = (base64UrlString) => {
  if (!base64UrlString) return new Uint8Array(0);
  const padding = '='.repeat((4 - (base64UrlString.length % 4)) % 4);
  const base64 = (base64UrlString + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isBiometricSupported = () => {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator?.credentials?.create === 'function' &&
    typeof navigator?.credentials?.get === 'function'
  );
};

export const isPlatformAuthenticatorAvailable = async () => {
  if (!isBiometricSupported()) return false;
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
};

export const getBiometricDisplayLabel = () => {
  if (isIosDevice()) return 'Face ID / Touch ID';
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
    return 'Fingerprint / Face Unlock';
  }
  return 'Biometric Passkey (Fingerprint / Face ID)';
};

export const getStoredBiometricInfo = () => {
  try {
    const credentialId = localStorage.getItem(BIOMETRIC_CRED_ID_KEY) || '';
    const email = localStorage.getItem(BIOMETRIC_EMAIL_KEY) || '';
    return {
      hasBiometric: Boolean(credentialId),
      credentialId: credentialId || null,
      email: email || null,
    };
  } catch {
    return { hasBiometric: false, credentialId: null, email: null };
  }
};

export const saveStoredBiometricInfo = (credentialId, email) => {
  try {
    if (credentialId) localStorage.setItem(BIOMETRIC_CRED_ID_KEY, credentialId);
    if (email) localStorage.setItem(BIOMETRIC_EMAIL_KEY, email);
  } catch {}
};

export const clearStoredBiometricInfo = () => {
  try {
    localStorage.removeItem(BIOMETRIC_CRED_ID_KEY);
    localStorage.removeItem(BIOMETRIC_EMAIL_KEY);
  } catch {}
};

const detectPlatformAndLabel = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = isIosDevice() ? 'ios' : /android/i.test(ua) ? 'android' : 'desktop';
  const deviceLabel = isIosDevice()
    ? 'iPhone / iPad (Face ID / Touch ID)'
    : platform === 'android'
    ? 'Android Phone (Biometrics)'
    : 'Biometric Device';
  return { platform, deviceLabel };
};

/**
 * Enrolls Face ID / Touch ID / Fingerprint using pre-fetched WebAuthn registration options.
 * Keeping navigator.credentials.create() as the very first await preserves user gesture activation on iOS Safari.
 */
export const enrollBiometricWithOptions = async (regOptions, customMeta = {}) => {
  if (!regOptions?.public_key || !regOptions?.challenge_token) {
    throw new Error('Biometric setup options are missing. Please refresh and try again.');
  }

  const pk = regOptions.public_key;
  const publicKeyCredentialCreationOptions = {
    challenge: base64UrlToUint8Array(pk.challenge),
    rp: pk.rp,
    user: {
      id: base64UrlToUint8Array(pk.user.id),
      name: pk.user.name,
      displayName: pk.user.displayName || pk.user.name,
    },
    pubKeyCredParams: pk.pubKeyCredParams || [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: pk.authenticatorSelection || {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: pk.timeout || 60000,
    attestation: pk.attestation || 'none',
    excludeCredentials: (pk.excludeCredentials || []).map((c) => ({
      type: 'public-key',
      id: base64UrlToUint8Array(c.id),
    })),
  };

  // Native biometric prompt (Face ID / Touch ID / Fingerprint)
  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  if (!credential || !credential.response) {
    throw new Error('Biometric enrollment was cancelled or did not return a credential.');
  }

  const response = credential.response;
  const credentialId = bufferToBase64Url(credential.rawId);
  const clientDataJson = bufferToBase64Url(response.clientDataJSON);
  const attestationObject = response.attestationObject
    ? bufferToBase64Url(response.attestationObject)
    : null;
  const authenticatorData =
    typeof response.getAuthenticatorData === 'function'
      ? bufferToBase64Url(response.getAuthenticatorData())
      : null;
  const publicKeySpki =
    typeof response.getPublicKey === 'function' && response.getPublicKey()
      ? bufferToBase64Url(response.getPublicKey())
      : null;
  const publicKeyAlg =
    typeof response.getPublicKeyAlgorithm === 'function'
      ? response.getPublicKeyAlgorithm()
      : -7;

  const { platform, deviceLabel } = detectPlatformAndLabel();

  const verifyRes = await apiClient.post('/webauthn/register/verify', {
    challenge_token: regOptions.challenge_token,
    credential_id: credentialId,
    client_data_json: clientDataJson,
    attestation_object: attestationObject,
    authenticator_data: authenticatorData,
    public_key_spki: publicKeySpki,
    public_key_alg: publicKeyAlg,
    device_id: getOrCreateDeviceId(),
    device_label: customMeta.deviceLabel || deviceLabel,
    platform: customMeta.platform || platform,
  });

  saveStoredBiometricInfo(credentialId, verifyRes.data?.user_email || pk.user.name);
  return verifyRes.data;
};

/**
 * Fetches WebAuthn registration options for an already logged-in permanent user.
 */
export const fetchBiometricRegistrationOptions = async () => {
  const { data } = await apiClient.post('/webauthn/register/options', {
    rp_id: window.location.hostname,
  });
  return data;
};

/**
 * Fetches WebAuthn login challenge options for LoginPage.
 */
export const fetchBiometricAuthOptions = async ({ email, credentialId } = {}) => {
  const stored = getStoredBiometricInfo();
  const res = await fetch(`${API_BASE_URL}/webauthn/authenticate/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email || stored.email || null,
      credential_id: credentialId || stored.credentialId || null,
      device_id: getOrCreateDeviceId(),
      rp_id: window.location.hostname,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Could not initialize biometric sign-in.');
  }
  return await res.json();
};

/**
 * Triggers Face ID / Touch ID / Fingerprint sign-in and exchanges the assertion for a JWT token.
 */
export const authenticateWithBiometric = async (preloadedOptions = null, { email } = {}) => {
  const authOptions = preloadedOptions || (await fetchBiometricAuthOptions({ email }));
  const pk = authOptions.public_key;

  const publicKeyCredentialRequestOptions = {
    challenge: base64UrlToUint8Array(pk.challenge),
    rpId: pk.rpId || window.location.hostname,
    userVerification: pk.userVerification || 'required',
    timeout: pk.timeout || 60000,
  };

  if (Array.isArray(pk.allowCredentials) && pk.allowCredentials.length > 0) {
    publicKeyCredentialRequestOptions.allowCredentials = pk.allowCredentials.map((c) => ({
      type: 'public-key',
      id: base64UrlToUint8Array(c.id),
    }));
  }

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  if (!assertion || !assertion.response) {
    throw new Error('Biometric verification was cancelled.');
  }

  const credentialId = bufferToBase64Url(assertion.rawId);
  const clientDataJson = bufferToBase64Url(assertion.response.clientDataJSON);
  const authenticatorData = bufferToBase64Url(assertion.response.authenticatorData);
  const signature = bufferToBase64Url(assertion.response.signature);

  const verifyRes = await fetch(`${API_BASE_URL}/webauthn/authenticate/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge_token: authOptions.challenge_token,
      credential_id: credentialId,
      client_data_json: clientDataJson,
      authenticator_data: authenticatorData,
      signature: signature,
      device_id: getOrCreateDeviceId(),
    }),
  });

  const data = await verifyRes.json().catch(() => ({}));
  if (!verifyRes.ok) {
    if (verifyRes.status === 401 && (data.detail || '').toLowerCase().includes('not recognized')) {
      clearStoredBiometricInfo();
    }
    throw new Error(data.detail || 'Biometric login failed.');
  }

  if (data.user?.email) {
    saveStoredBiometricInfo(credentialId, data.user.email);
  }
  return data;
};

