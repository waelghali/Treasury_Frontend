// src/components/Trial/useTrialExperience.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';
import { setAuthToken } from '../../services/apiService';

const TRIAL_PROBE_STORAGE_PREFIX = 'grow_trial_mode_probe_v2_';
const TRIAL_UI_MODE_STORAGE_PREFIX = 'grow_trial_ui_mode_v1_';
const INITIAL_ENDUSER_LANDING_PREFIX = 'grow_trial_started_enduser_v4_';

export const PERSONA_LABELS = {
  end_user: 'End User',
  corporate_admin: 'Corporate Admin',
};

function computeSmartNextRoute(targetRole, currentPath = '') {
  const p = (currentPath || '').toLowerCase();
  if (targetRole === 'corporate_admin') {
    if (p.includes('/quotation')) return '/corporate-admin/quotations';
    if (p.includes('/issuance')) return '/corporate-admin/issuance/requests';
    if (p.includes('/lg-records') || p.includes('/pending-approvals')) {
      return '/corporate-admin/approval-requests';
    }
    return '/corporate-admin/dashboard';
  }
  if (p.includes('/reconciliation/workspace')) return '/end-user/reconciliation/workspace';
  if (p.includes('/reconciliation/export')) return '/end-user/reconciliation/export';
  if (p.includes('/issuance/reconciliation')) return '/end-user/issuance/reconciliation';
  if (p.includes('/reconciliation')) return '/end-user/reconciliation';
  if (p.includes('/issuance/request-new')) return '/end-user/issuance/request-new';
  if (p.includes('/quotation')) return '/end-user/quotations/active';
  if (p.includes('/issuance')) return '/end-user/issuance/requests';
  if (p.includes('/approval-requests')) return '/end-user/lg-records';
  return '/end-user/dashboard';
}

async function fetchPublicSampleAsFile(href, filename, mimeType) {
  const resp = await fetch(href);
  if (!resp.ok) {
    throw new Error(`Failed to fetch sample file (${resp.status})`);
  }
  const blob = await resp.blob();
  return new File([blob], filename, { type: mimeType || blob.type || 'application/octet-stream' });
}

export function isCachedTrialSession(customerId) {
  if (!customerId) return false;
  try {
    return sessionStorage.getItem(`${TRIAL_PROBE_STORAGE_PREFIX}${customerId}`) === 'true';
  } catch {
    return false;
  }
}

export default function useTrialExperience({
  userRole,
  customerId,
  isTrialToken = false,
  pathname,
  search,
}) {
  const navigate = useNavigate();
  const autoSwitchedRef = useRef(false);

  const probeKey = customerId ? `${TRIAL_PROBE_STORAGE_PREFIX}${customerId}` : null;
  const uiModeKey = customerId ? `${TRIAL_UI_MODE_STORAGE_PREFIX}${customerId}` : null;
  const initLandingKey = customerId ? `${INITIAL_ENDUSER_LANDING_PREFIX}${customerId}` : null;

  const [trialEnabled, setTrialEnabled] = useState(() =>
    Boolean(isTrialToken || isCachedTrialSession(customerId)) ? true : null
  );
  const [sandboxStatus, setSandboxStatus] = useState(null);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [isRefreshingSim, setIsRefreshingSim] = useState(false);
  const [downloadingSampleId, setDownloadingSampleId] = useState(null);
  const [autoLoadingActionId, setAutoLoadingActionId] = useState(null);
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false);
  const [isPurgingData, setIsPurgingData] = useState(false);
  const [isInvitingColleague, setIsInvitingColleague] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [uiMode, setUiModeState] = useState(() => {
    if (!customerId) return 'guided';
    try {
      const saved = localStorage.getItem(`${TRIAL_UI_MODE_STORAGE_PREFIX}${customerId}`);
      return saved === 'full' ? 'full' : 'guided';
    } catch {
      return 'guided';
    }
  });

  useEffect(() => {
    if (!uiModeKey) return;
    try {
      const saved = localStorage.getItem(uiModeKey);
      setUiModeState(saved === 'full' ? 'full' : 'guided');
    } catch {}
  }, [uiModeKey]);

  const setUiMode = useCallback(
    (nextMode) => {
      const clean = nextMode === 'full' ? 'full' : 'guided';
      setUiModeState(clean);
      try {
        if (uiModeKey) localStorage.setItem(uiModeKey, clean);
      } catch {}
    },
    [uiModeKey]
  );

  const switchPersona = useCallback(
    async (targetRole, explicitNextPath = null, silentToast = true) => {
      if (!targetRole || isSwitchingRole) return;
      const currentActive = sandboxStatus?.active_role || userRole;
      if (targetRole === currentActive) {
        if (explicitNextPath) navigate(explicitNextPath);
        return;
      }

      setIsSwitchingRole(true);
      try {
        const res = await apiClient.post('/trial-sandbox/switch-persona', {
          target_role: targetRole,
        });
        const {
          access_token: newToken,
          role: confirmedRole,
          user_id: nextUserId,
          email: nextEmail,
        } = res.data;
        setAuthToken(newToken);
        try {
          if (initLandingKey) sessionStorage.setItem(initLandingKey, 'done');
          localStorage.setItem('user_role', confirmedRole);
          localStorage.setItem('user_id', String(nextUserId));
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: nextUserId,
              user_id: nextUserId,
              email: nextEmail,
              role: confirmedRole,
              customer_id: sandboxStatus?.customer_id || customerId,
              customer_name: sandboxStatus?.customer_name || '',
            })
          );
        } catch {}

        const destination = explicitNextPath || computeSmartNextRoute(confirmedRole, pathname);
        if (!silentToast) {
          toast.info(`Switched profile to ${PERSONA_LABELS[confirmedRole] || confirmedRole}`, {
            autoClose: 1400,
          });
        }
        window.location.assign(destination);
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Could not switch profile.');
        setIsSwitchingRole(false);
      }
    },
    [customerId, initLandingKey, isSwitchingRole, navigate, pathname, sandboxStatus, userRole]
  );

  const navigateTrialTarget = useCallback(
    (targetPath, requiredRole = null) => {
      if (!targetPath || isSwitchingRole) return;
      const activeRole = sandboxStatus?.active_role || userRole || 'end_user';
      if (requiredRole && requiredRole !== activeRole) {
        switchPersona(requiredRole, targetPath, true);
        return;
      }
      navigate(targetPath);
    },
    [isSwitchingRole, navigate, sandboxStatus, switchPersona, userRole]
  );

  const fetchTrialStatus = useCallback(
    async (silent = true) => {
      if (!customerId || !probeKey || userRole === 'system_owner') {
        setTrialEnabled(false);
        return;
      }
      try {
        const cached = sessionStorage.getItem(probeKey);
        if (cached === 'false') {
          setTrialEnabled(false);
          return;
        }
      } catch {}

      if (!silent) setIsRefreshingSim(true);
      try {
        const res = await apiClient.get('/trial-sandbox/status');
        const data = res?.data;
        if (!data || data.trial_mode !== true) {
          try {
            sessionStorage.setItem(probeKey, 'false');
          } catch {}
          setTrialEnabled(false);
          setSandboxStatus(null);
          return;
        }
        try {
          sessionStorage.setItem(probeKey, 'true');
        } catch {}
        setTrialEnabled(true);
        setSandboxStatus(data);
      } catch {
        setTrialEnabled((prev) => (prev === null ? false : prev));
      } finally {
        if (!silent) setIsRefreshingSim(false);
      }
    },
    [customerId, probeKey, userRole]
  );

  useEffect(() => {
    if (!customerId || !probeKey || userRole === 'system_owner') {
      setTrialEnabled(false);
      setSandboxStatus(null);
      return;
    }
    try {
      const cached = sessionStorage.getItem(probeKey);
      if (cached === 'false') {
        setTrialEnabled(false);
        setSandboxStatus(null);
        return;
      }
    } catch {}
    fetchTrialStatus(true);
  }, [customerId, probeKey, userRole, pathname, fetchTrialStatus]);

  // Guarantee Free Trial logins ALWAYS land directly on Trial Home (never any other page)
  useEffect(() => {
    if (trialEnabled !== true || !sandboxStatus || !initLandingKey || autoSwitchedRef.current) {
      return;
    }
    try {
      const justLoggedIn = sessionStorage.getItem('grow_just_logged_in_v1') === '1';
      const alreadyInitialized = sessionStorage.getItem(initLandingKey);

      if (justLoggedIn || !alreadyInitialized) {
        sessionStorage.removeItem('grow_just_logged_in_v1');
        sessionStorage.setItem(initLandingKey, 'done');

        // Ensure Trial Home renders in Guided mode on login (not hidden by a prior "Show All Menus" toggle)
        setUiMode('guided');

        const pLower = (pathname || '').toLowerCase();
        const isAlreadyOnTrialHome =
          (pLower === '/end-user/dashboard' || pLower === '/corporate-admin/dashboard') &&
          !(search || '').includes('view=dashboard');

        if (sandboxStatus.active_role === 'corporate_admin' && !justLoggedIn && isAlreadyOnTrialHome) {
          autoSwitchedRef.current = true;
          switchPersona('end_user', '/end-user/dashboard', true);
        } else if (!isAlreadyOnTrialHome) {
          autoSwitchedRef.current = true;
          const homeDest =
            sandboxStatus.active_role === 'corporate_admin'
              ? '/corporate-admin/dashboard'
              : '/end-user/dashboard';
          navigate(homeDest, { replace: true });
        }
      }
    } catch {}
  }, [trialEnabled, sandboxStatus, initLandingKey, navigate, pathname, search, setUiMode, switchPersona]);

  // In Easy Trial View (`guided`), `/corporate-admin/reconciliation*` is a read-only oversight
  // dashboard with no upload dropzone — automatically switch to `/end-user/reconciliation*`
  // so Statement Upload & Matching Workspace always open the real operational screens.
  useEffect(() => {
    if (
      trialEnabled !== true ||
      !sandboxStatus ||
      uiMode !== 'guided' ||
      isSwitchingRole ||
      autoSwitchedRef.current
    ) {
      return;
    }
    const pLower = (pathname || '').toLowerCase();
    if (
      pLower.startsWith('/corporate-admin/reconciliation') &&
      !pLower.includes('/issuance/reconciliation')
    ) {
      const targetEndUserPath = pathname.replace(
        /^\/corporate-admin\/reconciliation/i,
        '/end-user/reconciliation'
      );
      if (sandboxStatus.active_role !== 'end_user') {
        autoSwitchedRef.current = true;
        switchPersona('end_user', targetEndUserPath, true);
      } else {
        navigate(targetEndUserPath, { replace: true });
      }
    }
  }, [
    trialEnabled,
    sandboxStatus,
    uiMode,
    isSwitchingRole,
    pathname,
    navigate,
    switchPersona,
  ]);

  // Poll RFQ simulator lightly while on quotation screens & refresh immediately when a new RFQ is created
  useEffect(() => {
    if (trialEnabled !== true) return undefined;
    const handleImmediateRefresh = () => fetchTrialStatus(true);
    window.addEventListener('check-deal-acceptance', handleImmediateRefresh);
    window.addEventListener('quotation-window-closed', handleImmediateRefresh);

    let interval = null;
    if ((pathname || '').toLowerCase().includes('/quotation')) {
      interval = setInterval(() => {
        if (typeof document === 'undefined' || !document.hidden) {
          fetchTrialStatus(true);
        }
      }, 7000);
    }
    return () => {
      window.removeEventListener('check-deal-acceptance', handleImmediateRefresh);
      window.removeEventListener('quotation-window-closed', handleImmediateRefresh);
      if (interval) clearInterval(interval);
    };
  }, [trialEnabled, pathname, fetchTrialStatus]);

  const downloadSampleFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.apiPath) {
        if (file.href) {
          const link = document.createElement('a');
          link.href = file.href;
          link.setAttribute('download', file.downloadName || 'Sample_File');
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
        return;
      }
      if (downloadingSampleId) return;
      setDownloadingSampleId(file.id);
      try {
        const res = await apiClient.get(file.apiPath, { responseType: 'blob' });
        const disp = res?.headers?.['content-disposition'] || '';
        const fnameMatch = disp.match(/filename="?([^"]+)"?/i);
        const fname = fnameMatch ? fnameMatch[1] : file.downloadName || 'Sample_Document.pdf';
        const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', fname);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
        toast.success(`Downloaded personalized LG PDF (${fname})!`, { autoClose: 2000 });
      } catch {
        toast.error('Could not generate personalized sample PDF.');
      } finally {
        setDownloadingSampleId(null);
      }
    },
    [downloadingSampleId]
  );

  const downloadValueSummaryPdf = useCallback(async () => {
    if (isDownloadingSummary) return;
    setIsDownloadingSummary(true);
    try {
      const res = await apiClient.get('/trial-sandbox/value-summary.pdf', {
        responseType: 'blob',
      });
      const disp = res?.headers?.['content-disposition'] || '';
      const fnameMatch = disp.match(/filename="?([^"]+)"?/i);
      const fname = fnameMatch ? fnameMatch[1] : 'Grow_Management_Value_Summary.pdf';
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fname);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded 1-Page Management Summary PDF!', { autoClose: 2200 });
    } catch {
      toast.error('Could not generate Management Summary PDF.');
    } finally {
      setIsDownloadingSummary(false);
    }
  }, [isDownloadingSummary]);

  const purgeUploadedTestData = useCallback(async () => {
    if (isPurgingData) return false;
    setIsPurgingData(true);
    try {
      const res = await apiClient.post('/trial-sandbox/purge-uploaded-data');
      toast.success(
        res?.data?.message || 'Deleted your uploaded test files. Starter sample data remains ready.'
      );
      await fetchTrialStatus(true);
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not delete uploaded test files.');
      return false;
    } finally {
      setIsPurgingData(false);
    }
  }, [fetchTrialStatus, isPurgingData]);

  const inviteColleague = useCallback(
    async ({ email, name, role }) => {
      if (isInvitingColleague) return { ok: false };
      setIsInvitingColleague(true);
      try {
        const res = await apiClient.post('/trial-sandbox/invite-colleague', {
          email: (email || '').trim(),
          name: (name || '').trim() || undefined,
          role: role || 'end_user',
        });
        toast.success(res?.data?.message || 'Activation link sent to your colleague!');
        await fetchTrialStatus(true);
        return { ok: true };
      } catch (err) {
        const msg = err?.response?.data?.detail || 'Could not send colleague invitation.';
        toast.error(msg);
        return { ok: false, error: msg };
      } finally {
        setIsInvitingColleague(false);
      }
    },
    [fetchTrialStatus, isInvitingColleague]
  );

  const submitTrialFeedback = useCallback(
    async ({ sentiment = 'POSITIVE', feedbackType = 'GENERAL_FEEDBACK', message = '' }) => {
      if (isSubmittingFeedback) return false;
      setIsSubmittingFeedback(true);
      try {
        const cleanMsg =
          (message || '').trim() ||
          (sentiment === 'POSITIVE'
            ? 'Trial user found this workflow easy and clear.'
            : sentiment === 'NEGATIVE'
            ? 'Trial user reported something confusing on this screen.'
            : 'Trial user shared a feature question/idea.');
        await apiClient.post('/feedback/', {
          message: cleanMsg,
          feedback_type: feedbackType,
          sentiment,
          ai_summary: `Screen: ${pathname || '/dashboard'}`,
        });
        toast.success(
          sentiment === 'NEGATIVE'
            ? 'Thank you! Our team received your note and will help right away.'
            : 'Thank you for your feedback!'
        );
        return true;
      } catch {
        toast.error('Could not send feedback right now.');
        return false;
      } finally {
        setIsSubmittingFeedback(false);
      }
    },
    [isSubmittingFeedback, pathname]
  );

  const fastForwardRfq = useCallback(async () => {
    const rfqSim = sandboxStatus?.active_rfq_simulator;
    if (!rfqSim?.rfq_id || isFastForwarding) return;
    setIsFastForwarding(true);
    try {
      const res = await apiClient.post(`/trial-sandbox/rfq/${rfqSim.rfq_id}/fast-forward`);
      toast.success(
        res?.data?.message || 'Window closed (00:00)! Sealed quotes unsealed for evaluation.'
      );
      await fetchTrialStatus(true);
      const activeRole = sandboxStatus?.active_role || userRole || 'end_user';
      window.dispatchEvent(new Event('quotation-window-closed'));
      window.dispatchEvent(new Event('check-deal-acceptance'));
      const prefix = activeRole === 'corporate_admin' ? '/corporate-admin' : '/end-user';
      navigate(`${prefix}/quotations/results/${rfqSim.rfq_id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not fast-forward RFQ window.');
    } finally {
      setIsFastForwarding(false);
    }
  }, [fetchTrialStatus, isFastForwarding, navigate, sandboxStatus, userRole]);

  const autoLoadSampleScenario = useCallback(
    async (actionId) => {
      if (!actionId || autoLoadingActionId || isSwitchingRole) return;

      const currentRole = sandboxStatus?.active_role || userRole || 'end_user';
      if (currentRole !== 'end_user') {
        const destMap = {
          reconciliation_full: '/end-user/reconciliation/workspace',
          custody_scan: '/end-user/lg-records/new',
          issuance_wording: '/end-user/issuance/request-new',
          issuance_recon: '/end-user/issuance/reconciliation',
        };
        try {
          sessionStorage.setItem('grow_pending_autoload_v1', actionId);
        } catch {}
        await switchPersona('end_user', destMap[actionId] || '/end-user/dashboard', true);
        return;
      }

      setAutoLoadingActionId(actionId);
      try {
        if (actionId === 'reconciliation_full') {
          const [banksRes, stmtsRes, erpRes] = await Promise.all([
            apiClient.get('/reconciliation/banks').catch(() => ({ data: [] })),
            apiClient.get('/reconciliation/statements').catch(() => ({ data: [] })),
            apiClient.get('/reconciliation/erp-records?limit=500').catch(() => ({ data: [] })),
          ]);
          const banks = Array.isArray(banksRes?.data) ? banksRes.data : [];
          const existingStmts = Array.isArray(stmtsRes?.data) ? stmtsRes.data : [];
          const existingErp = Array.isArray(erpRes?.data) ? erpRes.data : [];

          const bankAId = banks[0]?.id || 1;
          const bankBId = banks[1]?.id || bankAId;
          const existingNames = new Set(
            existingStmts.map((s) => String(s.file_name || '').trim().toLowerCase())
          );

          if (!existingNames.has('sample_bank_a_operating_statement.csv')) {
            const fileA = await fetchPublicSampleAsFile(
              '/demo/trial-kit/Sample_Bank_A_Operating_Statement.csv',
              'Sample_Bank_A_Operating_Statement.csv',
              'text/csv'
            );
            const fdA = new FormData();
            fdA.append('bank_id', String(bankAId));
            fdA.append('opening_balance', '10000000.00');
            fdA.append('closing_balance', '8669925.00');
            fdA.append('file', fileA);
            await apiClient.post('/reconciliation/statements/upload', fdA);
          }

          if (!existingNames.has('sample_bank_b_sweep_receiver_statement.csv')) {
            const fileB = await fetchPublicSampleAsFile(
              '/demo/trial-kit/Sample_Bank_B_Sweep_Receiver_Statement.csv',
              'Sample_Bank_B_Sweep_Receiver_Statement.csv',
              'text/csv'
            );
            const fdB = new FormData();
            fdB.append('bank_id', String(bankBId));
            fdB.append('opening_balance', '3000000.00');
            fdB.append('closing_balance', '8018400.00');
            fdB.append('file', fileB);
            await apiClient.post('/reconciliation/statements/upload', fdB);
          }

          if (existingErp.length === 0) {
            const fileErp = await fetchPublicSampleAsFile(
              '/demo/trial-kit/Sample_SAP_Open_Invoices.csv',
              'Sample_SAP_Open_Invoices.csv',
              'text/csv'
            );
            const fdErp = new FormData();
            fdErp.append('file', fileErp);
            await apiClient.post('/reconciliation/erp-records/upload', fdErp);
          }

          await apiClient.post('/reconciliation/classify').catch(() => {});
          await apiClient.post('/reconciliation/detect-relationships').catch(() => {});
          await apiClient.post('/reconciliation/auto-match').catch(() => {});

          try {
            localStorage.setItem('recon_viewMode', 'split');
          } catch {}
          await fetchTrialStatus(true);
          window.dispatchEvent(
            new CustomEvent('grow-trial-sample-loaded', { detail: { scope: 'reconciliation' } })
          );
          toast.success('Sample Bank A & B statements + SAP invoices loaded and matched!');
          if (!(pathname || '').toLowerCase().includes('/end-user/reconciliation/workspace')) {
            navigate('/end-user/reconciliation/workspace');
          }
        } else if (actionId === 'custody_scan') {
          const res = await apiClient.get('/trial-sandbox/sample-custody-lg.pdf', {
            responseType: 'blob',
          });
          const disp = res?.headers?.['content-disposition'] || '';
          const fnameMatch = disp.match(/filename="?([^"]+)"?/i);
          const fname = fnameMatch ? fnameMatch[1] : 'Sample_Performance_LG.pdf';
          const file = new File([res.data], fname, { type: 'application/pdf' });
          window.__growPendingCustodySampleFile = file;
          window.dispatchEvent(
            new CustomEvent('grow-trial-load-custody-sample', { detail: { file } })
          );
          if (!(pathname || '').toLowerCase().includes('/end-user/lg-records/new')) {
            navigate('/end-user/lg-records/new');
          }
        } else if (actionId === 'issuance_wording') {
          const [wordingFile, contractFile] = await Promise.all([
            fetchPublicSampleAsFile(
              '/demo/trial-kit/Sample_Client_Risky_Advance_LG_Draft.pdf',
              'Sample_Client_Risky_Advance_LG_Draft.pdf',
              'application/pdf'
            ),
            fetchPublicSampleAsFile(
              '/demo/docs/Apex_Contract_Award_NAUUA_2026.pdf',
              'Apex_Contract_Award_NAUUA_2026.pdf',
              'application/pdf'
            ),
          ]);
          window.__growPendingIssuanceSampleFiles = { wordingFile, contractFile };
          window.dispatchEvent(
            new CustomEvent('grow-trial-load-issuance-wording-sample', {
              detail: { wordingFile, contractFile },
            })
          );
          if (!(pathname || '').toLowerCase().includes('/issuance/request')) {
            navigate('/end-user/issuance/request-new');
          }
        } else if (actionId === 'issuance_recon') {
          const banksRes = await apiClient.get('/issuance/banks').catch(() => ({ data: [] }));
          const banksList = Array.isArray(banksRes?.data) ? banksRes.data : [];
          const targetBank =
            banksList.find((b) =>
              /emirates nbd|enbd|first national|fncb/i.test(`${b.name || ''} ${b.short_name || ''}`)
            ) || banksList[0];
          const targetBankId = targetBank?.id || 1;
          const posFile = await fetchPublicSampleAsFile(
            '/demo/docs/FNCB_LG_Position_Statement_Nov2026.pdf',
            'FNCB_LG_Position_Statement_Nov2026.pdf',
            'application/pdf'
          );
          const fd = new FormData();
          fd.append('bank_id', String(targetBankId));
          fd.append('position_date', new Date().toISOString().split('T')[0]);
          fd.append('notes', 'Guided Trial Sample Bank LG Position Statement');
          fd.append('file', posFile);

          const uploadRes = await apiClient.post('/issuance/reconciliation/sessions', fd);
          const session = uploadRes?.data;
          if (session?.id) {
            await apiClient
              .post(`/issuance/reconciliation/sessions/${session.id}/match`)
              .catch(() => {});
            await fetchTrialStatus(true);
            window.dispatchEvent(
              new CustomEvent('grow-trial-sample-loaded', {
                detail: { scope: 'issuance_recon', sessionId: session.id },
              })
            );
            toast.success('Sample Bank LG List uploaded and compared against your records!');
            navigate(`/end-user/issuance/reconciliation?sessionId=${session.id}`);
          }
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.detail || err?.message || 'Could not auto-load sample data.'
        );
      } finally {
        setAutoLoadingActionId(null);
      }
    },
    [
      autoLoadingActionId,
      fetchTrialStatus,
      isSwitchingRole,
      navigate,
      pathname,
      sandboxStatus,
      switchPersona,
      userRole,
    ]
  );

  useEffect(() => {
    if (trialEnabled !== true || !sandboxStatus) return undefined;
    const activeRoleVal = sandboxStatus.active_role || userRole || 'end_user';
    if (activeRoleVal === 'end_user') {
      try {
        const pendingAction = sessionStorage.getItem('grow_pending_autoload_v1');
        if (pendingAction) {
          sessionStorage.removeItem('grow_pending_autoload_v1');
          autoLoadSampleScenario(pendingAction);
        }
      } catch {}
    }

    const handleTrigger = (evt) => {
      const actionId = evt?.detail?.actionId;
      if (actionId) {
        autoLoadSampleScenario(actionId);
      }
    };
    window.addEventListener('grow-trial-trigger-autoload', handleTrigger);
    return () => window.removeEventListener('grow-trial-trigger-autoload', handleTrigger);
  }, [trialEnabled, sandboxStatus, userRole, autoLoadSampleScenario]);

  const activeRole = sandboxStatus?.active_role || userRole || 'end_user';
  const pathLower = (pathname || '').toLowerCase();
  const isDashboardRoot =
    pathLower.endsWith('/dashboard') &&
    !pathLower.includes('/reconciliation') &&
    !pathLower.includes('/quotations') &&
    !pathLower.includes('/reports');
  const showGuidedHome = Boolean(
    trialEnabled === true &&
      sandboxStatus &&
      uiMode === 'guided' &&
      isDashboardRoot &&
      !(search || '').includes('view=dashboard')
  );

  return {
    isTrial: Boolean(trialEnabled === true && sandboxStatus && userRole !== 'system_owner'),
    sandboxStatus,
    activeRole,
    uiMode,
    setUiMode,
    showGuidedHome,
    isSwitchingRole,
    isFastForwarding,
    isRefreshingSim,
    downloadingSampleId,
    autoLoadingActionId,
    isDownloadingSummary,
    isPurgingData,
    isInvitingColleague,
    isSubmittingFeedback,
    switchPersona,
    navigateTrialTarget,
    downloadSampleFile,
    autoLoadSampleScenario,
    downloadValueSummaryPdf,
    purgeUploadedTestData,
    inviteColleague,
    submitTrialFeedback,
    fastForwardRfq,
    refreshTrialStatus: () => fetchTrialStatus(false),
  };
}
