// frontend/src/pages/SystemOwner/ComposeEmailPage.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  Send,
  Paperclip,
  Plus,
  Trash2,
  Users,
  Building2,
  Landmark,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Settings,
  Eye,
  Clock,
  Sparkles,
  X,
  Reply,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';

const QUICK_SNIPPETS = [
  {
    label: 'Onboarding Welcome',
    subject: 'Welcome to Grow BD Treasury Platform — Next Steps',
    badge: 'Client Onboarding',
    ctaText: 'Access Grow Treasury Portal',
    ctaUrl: 'https://www.growbusinessdevelopment.com/login',
    body: `We are delighted to welcome your organization to the Grow BD Treasury Platform.\n\nYour dedicated workspace has been provisioned and is ready for your treasury and trade finance operations. Below are the key highlights of your setup:\n\n- Secure multi-entity Letter of Guarantee (LG) Custody & Issuance lifecycle tracking\n- Automated bank SLA monitoring, smart reminders, and executive analytics\n- Direct digital quotation and facility management workflows\n\nPlease let us know if you would like to schedule a quick walkthrough session with your team this week.`
  },
  {
    label: 'Trial Follow-Up',
    subject: 'Following Up on Your Grow Treasury Trial Registration',
    badge: 'Grow Business Development',
    ctaText: 'Explore Platform Capabilities',
    ctaUrl: 'https://www.growbusinessdevelopment.com',
    body: `Thank you for registering your interest in the Grow BD Treasury Platform.\n\nWe have reviewed your trial registration details and would love to arrange a brief 15-minute onboarding call to tailor the workspace to your corporate entities and banking partners.\n\nPlease reply directly to this email with a convenient time for your team.`
  },
  {
    label: 'Bank Desk Outreach',
    subject: 'Corporate Treasury Partnership — Grow BD Platform',
    badge: 'Institutional Banking',
    ctaText: 'Visit Grow BD Platform',
    ctaUrl: 'https://www.growbusinessdevelopment.com',
    body: `We are reaching out from Grow Business Development regarding our corporate treasury clients who actively manage their Letters of Guarantee and FX/T-Bill quotations with your esteemed institution.\n\nWe would welcome the opportunity to coordinate with your Trade Finance and Treasury Desk to streamline digital workflows and turnarounds for our mutual corporate clients.`
  }
];

function formatBodyPreviewHtml(rawBody) {
  if (!rawBody || !rawBody.trim()) {
    return `<p style="margin: 0; color: #94a3b8; font-style: italic;">Start typing your message on the left to preview the Branded Grow Card...</p>`;
  }
  const trimmed = rawBody.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('<p') ||
    lower.includes('<div') ||
    lower.includes('<table') ||
    lower.includes('<ul') ||
    lower.includes('<ol')
  ) {
    return trimmed;
  }

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const blocks = trimmed.split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (!lines.length) return '';
      if (lines.every((l) => l.startsWith('- ') || l.startsWith('* ') || l.startsWith('• '))) {
        const items = lines
          .map(
            (l) =>
              `<li style="margin-bottom: 6px; line-height: 1.6; color: #334155;">${escapeHtml(
                l.slice(2).trim()
              )}</li>`
          )
          .join('');
        return `<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #334155; list-style-type: disc;">${items}</ul>`;
      }
      const escapedLines = block
        .split('\n')
        .map((l) => escapeHtml(l))
        .join('<br/>');
      return `<p style="margin: 0 0 16px 0; line-height: 1.65; color: #334155; font-size: 14px;">${escapedLines}</p>`;
    })
    .join('');
}

function ComposeEmailPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Bootstrap Data
  const [verifiedDomain, setVerifiedDomain] = useState('growbusinessdevelopment.com');
  const [platformName, setPlatformName] = useState('Grow BD Treasury Platform');
  const [senders, setSenders] = useState([]);
  const [recipientsDir, setRecipientsDir] = useState({ customers: [], banks: [], trials: [] });
  const [history, setHistory] = useState([]);

  // Composer State
  const [selectedSenderEmail, setSelectedSenderEmail] = useState('');
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [replyTo, setReplyTo] = useState('');

  const [toEmails, setToEmails] = useState([]);
  const [toInput, setToInput] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [ccEmails, setCcEmails] = useState([]);
  const [ccInput, setCcInput] = useState('');
  const [bccEmails, setBccEmails] = useState([]);
  const [bccInput, setBccInput] = useState('');

  const [subject, setSubject] = useState('');
  const [headerTitle, setHeaderTitle] = useState('');
  const [headerBadge, setHeaderBadge] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [body, setBody] = useState('');
  const [showCta, setShowCta] = useState(false);
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [attachments, setAttachments] = useState([]);

  // UI Helpers State
  const [rightTab, setRightTab] = useState('preview'); // 'preview' | 'history'
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('customers'); // 'customers' | 'banks' | 'trials'
  const [pickerSearch, setPickerSearch] = useState('');
  const [recipientTargetField, setRecipientTargetField] = useState('to'); // 'to' | 'cc' | 'bcc'

  // Manage Cloudflare Senders Modal State
  const [showSenderManager, setShowSenderManager] = useState(false);
  const [editingSender, setEditingSender] = useState(null);
  const [senderForm, setSenderForm] = useState({
    emailPrefix: '',
    display_name: '',
    description: '',
    can_receive_replies: true,
    default_reply_to: '',
    is_active: true,
    is_default: false
  });
  const [savingSender, setSavingSender] = useState(false);

  const fileInputRef = useRef(null);

  const fetchBootstrap = async (preserveSelection = false) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/system-owner/email-composer/bootstrap');
      const data = res.data || {};
      setVerifiedDomain(data.verified_domain || 'growbusinessdevelopment.com');
      setPlatformName(data.platform_name || 'Grow BD Treasury Platform');
      const loadedSenders = data.senders || [];
      setSenders(loadedSenders);
      setRecipientsDir(data.recipients || { customers: [], banks: [], trials: [] });
      setHistory(data.history || []);

      const activeSenders = loadedSenders.filter((s) => s.is_active);
      if (!preserveSelection && activeSenders.length > 0) {
        const def = activeSenders.find((s) => s.is_default) || activeSenders[0];
        handleSelectSender(def, loadedSenders);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load Email Composer configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSenders = useMemo(() => senders.filter((s) => s.is_active), [senders]);

  const currentSenderObj = useMemo(
    () => senders.find((s) => s.email.toLowerCase() === (selectedSenderEmail || '').toLowerCase()) || null,
    [senders, selectedSenderEmail]
  );

  const handleSelectSender = (senderObjOrEmail, senderList = senders) => {
    const obj =
      typeof senderObjOrEmail === 'string'
        ? senderList.find((s) => s.email.toLowerCase() === senderObjOrEmail.toLowerCase())
        : senderObjOrEmail;
    if (!obj) return;
    setSelectedSenderEmail(obj.email);
    setSenderDisplayName(obj.display_name || 'Grow Business Development');
    setReplyTo(obj.default_reply_to || (obj.can_receive_replies ? obj.email : `info@${verifiedDomain}`));
    if (!headerBadge) {
      setHeaderBadge(obj.display_name || 'Grow Business Development');
    }
  };

  // Chip input helpers
  const addEmailToList = (raw, list, setList) => {
    if (!raw) return;
    const parts = raw
      .split(/[,;\s\n]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const updated = [...list];
    let added = 0;
    parts.forEach((addr) => {
      if (addr.includes('@') && addr.split('@')[1]?.includes('.')) {
        if (!updated.some((e) => e.toLowerCase() === addr.toLowerCase())) {
          updated.push(addr);
          added += 1;
        }
      } else {
        toast.warning(`"${addr}" does not look like a valid email address.`);
      }
    });
    if (added > 0) setList(updated);
  };

  const handleChipKeyDown = (e, inputVal, setInputVal, list, setList) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key)) {
      if (inputVal.trim()) {
        e.preventDefault();
        addEmailToList(inputVal, list, setList);
        setInputVal('');
      }
    } else if (e.key === 'Backspace' && !inputVal && list.length > 0) {
      setList(list.slice(0, -1));
    }
  };

  const removeEmailFromList = (emailToRemove, list, setList) => {
    setList(list.filter((e) => e !== emailToRemove));
  };

  const addQuickRecipient = (email, nameHint = '', badgeHint = '') => {
    if (!email) return;
    if (recipientTargetField === 'cc') {
      setShowCcBcc(true);
      addEmailToList(email, ccEmails, setCcEmails);
    } else if (recipientTargetField === 'bcc') {
      setShowCcBcc(true);
      addEmailToList(email, bccEmails, setBccEmails);
    } else {
      addEmailToList(email, toEmails, setToEmails);
    }
    if (nameHint && !recipientName && toEmails.length === 0) {
      setRecipientName(nameHint);
    }
    if (badgeHint && (!headerBadge || headerBadge === currentSenderObj?.display_name)) {
      setHeaderBadge(badgeHint);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setAttachments((prev) => {
      const existingNames = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const uniqueNew = selected.filter((f) => !existingNames.has(`${f.name}-${f.size}`));
      return [...prev, ...uniqueNew];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const applySnippet = (snippet) => {
    setSubject(snippet.subject);
    setHeaderBadge(snippet.badge);
    setBody(snippet.body);
    if (snippet.ctaText && snippet.ctaUrl) {
      setShowCta(true);
      setCtaText(snippet.ctaText);
      setCtaUrl(snippet.ctaUrl);
    }
    toast.info(`Loaded "${snippet.label}" template into composer.`);
  };

  const clearComposer = (notify = false) => {
    setToEmails([]);
    setToInput('');
    setCcEmails([]);
    setCcInput('');
    setBccEmails([]);
    setBccInput('');
    setShowCcBcc(false);
    setSubject('');
    setHeaderTitle('');
    setHeaderBadge(currentSenderObj?.display_name || senderDisplayName || 'Grow Business Development');
    setRecipientName('');
    setBody('');
    setShowCta(false);
    setCtaText('');
    setCtaUrl('');
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (notify) {
      toast.info('Email composer cleared.');
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();

    // Flush any pending text in the input boxes
    const finalTo = [...toEmails];
    if (toInput.trim()) {
      toInput
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter((x) => x.includes('@'))
        .forEach((x) => {
          if (!finalTo.some((eAddr) => eAddr.toLowerCase() === x.toLowerCase())) finalTo.push(x);
        });
      setToEmails(finalTo);
      setToInput('');
    }

    const finalCc = [...ccEmails];
    if (ccInput.trim()) {
      ccInput
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter((x) => x.includes('@'))
        .forEach((x) => {
          if (!finalCc.some((eAddr) => eAddr.toLowerCase() === x.toLowerCase())) finalCc.push(x);
        });
      setCcEmails(finalCc);
      setCcInput('');
    }

    const finalBcc = [...bccEmails];
    if (bccInput.trim()) {
      bccInput
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter((x) => x.includes('@'))
        .forEach((x) => {
          if (!finalBcc.some((eAddr) => eAddr.toLowerCase() === x.toLowerCase())) finalBcc.push(x);
        });
      setBccEmails(finalBcc);
      setBccInput('');
    }

    if (!selectedSenderEmail) {
      toast.error('Please select a verified Cloudflare sender address.');
      return;
    }
    if (finalTo.length === 0 && finalCc.length === 0 && finalBcc.length === 0) {
      toast.error('Please add at least one recipient email address.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject.');
      return;
    }
    if (!body.trim()) {
      toast.error('Please write your email message body.');
      return;
    }

    try {
      setSending(true);
      const formData = new FormData();
      formData.append('sender_email', selectedSenderEmail);
      formData.append('sender_display_name', senderDisplayName.trim() || 'Grow Business Development');
      formData.append('to_emails', JSON.stringify(finalTo));
      formData.append('cc_emails', JSON.stringify(finalCc));
      formData.append('bcc_emails', JSON.stringify(finalBcc));
      if (replyTo.trim()) formData.append('reply_to', replyTo.trim());
      formData.append('subject', subject.trim());
      if (headerTitle.trim()) formData.append('header_title', headerTitle.trim());
      if (headerBadge.trim()) formData.append('header_badge', headerBadge.trim());
      if (recipientName.trim()) formData.append('recipient_name', recipientName.trim());
      formData.append('body', body);
      if (showCta && ctaText.trim() && ctaUrl.trim()) {
        formData.append('cta_text', ctaText.trim());
        formData.append('cta_url', ctaUrl.trim());
      }
      attachments.forEach((file) => {
        formData.append('files', file);
      });

      const res = await apiClient.post('/system-owner/email-composer/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(res.data?.message || 'Email dispatched successfully!');
      clearComposer(false);
      fetchBootstrap(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send email. Please check relay settings.');
    } finally {
      setSending(false);
    }
  };

  // Cloudflare Sender Management Handlers
  const openAddSender = () => {
    setEditingSender(null);
    setSenderForm({
      emailPrefix: '',
      display_name: 'Grow Business Development',
      description: 'Cloudflare Email Routing address',
      can_receive_replies: true,
      default_reply_to: '',
      is_active: true,
      is_default: false
    });
  };

  const openEditSender = (s) => {
    setEditingSender(s);
    const prefix = s.email.includes('@') ? s.email.split('@')[0] : s.email;
    setSenderForm({
      emailPrefix: prefix,
      display_name: s.display_name || '',
      description: s.description || '',
      can_receive_replies: s.can_receive_replies,
      default_reply_to: s.default_reply_to || '',
      is_active: s.is_active,
      is_default: s.is_default
    });
  };

  const handleSaveSender = async (e) => {
    e.preventDefault();
    const cleanPrefix = (senderForm.emailPrefix || '').trim().replace(/@.*$/, '');
    if (!cleanPrefix) {
      toast.error('Please enter the email prefix (e.g., info, support, wael).');
      return;
    }
    const fullEmail = `${cleanPrefix}@${verifiedDomain}`;
    const payload = {
      email: fullEmail,
      display_name: senderForm.display_name.trim() || 'Grow Business Development',
      description: senderForm.description.trim(),
      can_receive_replies: senderForm.can_receive_replies,
      default_reply_to:
        senderForm.default_reply_to.trim() ||
        (senderForm.can_receive_replies ? fullEmail : `info@${verifiedDomain}`),
      is_active: senderForm.is_active,
      is_default: senderForm.is_default
    };

    try {
      setSavingSender(true);
      if (editingSender) {
        await apiClient.put(`/system-owner/email-composer/senders/${editingSender.id}`, payload);
        toast.success(`Updated sender ${fullEmail}`);
      } else {
        await apiClient.post('/system-owner/email-composer/senders', payload);
        toast.success(`Added Cloudflare sender ${fullEmail}`);
      }
      setEditingSender(null);
      openAddSender();
      await fetchBootstrap(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save sender.');
    } finally {
      setSavingSender(false);
    }
  };

  const handleDeleteSender = async (senderObj) => {
    if (!window.confirm(`Remove "${senderObj.email}" from the allowed Cloudflare sender list?`)) return;
    try {
      await apiClient.delete(`/system-owner/email-composer/senders/${senderObj.id}`);
      toast.success(`Removed ${senderObj.email}`);
      await fetchBootstrap(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete sender.');
    }
  };

  const loadHistoryItemIntoComposer = (item) => {
    if (item.sender_email) {
      handleSelectSender(item.sender_email);
    }
    if (item.sender_display_name) setSenderDisplayName(item.sender_display_name);
    setToEmails(item.to_emails || []);
    setCcEmails(item.cc_emails || []);
    setBccEmails(item.bcc_emails || []);
    if ((item.cc_emails && item.cc_emails.length) || (item.bcc_emails && item.bcc_emails.length)) {
      setShowCcBcc(true);
    }
    setSubject(item.subject || '');
    setHeaderBadge(item.header_badge || '');
    setRecipientName(item.recipient_name || '');
    if (item.body_preview) setBody(item.body_preview);
    setRightTab('preview');
    toast.info('Loaded email details into the composer.');
  };

  // Filtered directory for Quick-Pick
  const filteredCustomers = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return recipientsDir.customers || [];
    return (recipientsDir.customers || []).filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        (c.users || []).some((u) => u.email?.toLowerCase().includes(q))
    );
  }, [recipientsDir.customers, pickerSearch]);

  const filteredBanks = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return recipientsDir.banks || [];
    return (recipientsDir.banks || []).filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.short_name?.toLowerCase().includes(q) ||
        (b.emails || []).some((e) => e.toLowerCase().includes(q))
    );
  }, [recipientsDir.banks, pickerSearch]);

  const filteredTrials = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return recipientsDir.trials || [];
    return (recipientsDir.trials || []).filter(
      (t) =>
        t.organization_name?.toLowerCase().includes(q) ||
        t.contact_name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
    );
  }, [recipientsDir.trials, pickerSearch]);

  const effectiveCardTitle = headerTitle.trim() || subject.trim() || 'Official Platform Communication';
  const effectiveCardBadge = headerBadge.trim() || senderDisplayName.trim() || 'Grow Business Development';
  const isNoReplySelected =
    currentSenderObj &&
    (!currentSenderObj.can_receive_replies ||
      currentSenderObj.email.toLowerCase().startsWith('noreply@') ||
      currentSenderObj.email.toLowerCase().startsWith('no-reply@'));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center text-sky-400 shrink-0 shadow-sm">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">Executive Email Composer</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Branded Grow Card
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                @{verifiedDomain}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Compose and dispatch official branded emails using your Cloudflare-routed domain addresses via Resend &amp; Brevo failover.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              openAddSender();
              setShowSenderManager(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            Manage Cloudflare Senders ({activeSenders.length})
          </button>
          <button
            type="button"
            onClick={() => fetchBootstrap(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: COMPOSER FORM (7 cols) */}
        <form
          onSubmit={handleSendEmail}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100"
        >
          {/* 1. SENDER SELECTION (CLOUDFLARE LIST) */}
          <div className="p-4 sm:p-5 space-y-3 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                1. Sender Identity (Cloudflare Verified List)
              </label>
              {currentSenderObj && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    !isNoReplySelected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {!isNoReplySelected ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Can Receive Replies (Cloudflare Routed)
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Outbound Only (No-Reply Address)
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  From Email Address *
                </label>
                <select
                  value={selectedSenderEmail}
                  onChange={(e) => handleSelectSender(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {activeSenders.map((s) => (
                    <option key={s.id} value={s.email}>
                      {s.email} {s.can_receive_replies ? '• (Receives Email)' : '• (No-Reply)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={senderDisplayName}
                  onChange={(e) => setSenderDisplayName(e.target.value)}
                  placeholder="e.g. Grow Business Development"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Reply-To row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 shrink-0">
                <Reply className="w-3.5 h-3.5 text-slate-400" />
                Reply-To Address:
              </div>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder={`e.g. info@${verifiedDomain}`}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {isNoReplySelected && (
                <span className="text-[10px] text-amber-700 font-medium">
                  Replies to noreply@ will route to this Reply-To address.
                </span>
              )}
            </div>
          </div>

          {/* 2. RECIPIENTS & DIRECTORY PICKER */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                2. Recipients
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                >
                  {showCcBcc ? 'Hide CC / BCC' : '+ Add CC / BCC'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecipientPicker(!showRecipientPicker)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    showRecipientPicker
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {showRecipientPicker ? 'Close Contact Directory' : 'Quick-Pick Recipients'}
                </button>
              </div>
            </div>

            {/* QUICK-PICK DIRECTORY DRAWER */}
            {showRecipientPicker && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPickerTab('customers')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        pickerTab === 'customers'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Customers &amp; Users ({(recipientsDir.customers || []).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerTab('banks')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        pickerTab === 'banks'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      Partner Banks ({(recipientsDir.banks || []).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerTab('trials')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        pickerTab === 'trials'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Trial Leads ({(recipientsDir.trials || []).length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500 font-medium">Add to:</span>
                    {['to', 'cc', 'bcc'].map((fld) => (
                      <button
                        key={fld}
                        type="button"
                        onClick={() => setRecipientTargetField(fld)}
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          recipientTargetField === fld
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600'
                        }`}
                      >
                        {fld}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Filter by organization name, bank, or email..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Directory Items */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {pickerTab === 'customers' &&
                    (filteredCustomers.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No matching customers found.</p>
                    ) : (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          className="bg-white border border-slate-200/80 rounded-lg p-2 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">{c.name}</span>
                            {c.contact_email && (
                              <button
                                type="button"
                                onClick={() => addQuickRecipient(c.contact_email, c.name, c.name)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md"
                              >
                                <Plus className="w-3 h-3" />
                                Primary: {c.contact_email}
                              </button>
                            )}
                          </div>
                          {c.users && c.users.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {c.users.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => addQuickRecipient(u.email, c.name, c.name)}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  {u.email}
                                  <span className="text-[9px] text-slate-400">({u.role})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ))}

                  {pickerTab === 'banks' &&
                    (filteredBanks.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No bank emails found.</p>
                    ) : (
                      filteredBanks.map((b) => (
                        <div
                          key={b.id}
                          className="bg-white border border-slate-200/80 rounded-lg p-2 flex items-center justify-between flex-wrap gap-2"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800">{b.name}</span>
                            {b.email_domain && (
                              <span className="ml-2 text-[10px] text-slate-400">@{b.email_domain}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(b.emails || []).map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() =>
                                  addQuickRecipient(em, `${b.short_name || b.name} Treasury Desk`, b.short_name || b.name)
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ))}

                  {pickerTab === 'trials' &&
                    (filteredTrials.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No trial registrations found.</p>
                    ) : (
                      filteredTrials.map((t) => (
                        <div
                          key={t.id}
                          className="bg-white border border-slate-200/80 rounded-lg p-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800">{t.organization_name}</span>
                            {t.contact_name && (
                              <span className="text-[11px] text-slate-500 ml-1.5">• {t.contact_name}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              addQuickRecipient(
                                t.email,
                                t.contact_name || t.organization_name,
                                t.organization_name
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            <Plus className="w-3 h-3" />
                            {t.email}
                          </button>
                        </div>
                      ))
                    ))}
                </div>
              </div>
            )}

            {/* TO EMAIL CHIPS */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                To * <span className="text-slate-400 font-normal">(Press Enter or comma to add multiple)</span>
              </label>
              <div className="min-h-[38px] flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                {toEmails.map((em) => (
                  <span
                    key={em}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200"
                  >
                    {em}
                    <button
                      type="button"
                      onClick={() => removeEmailFromList(em, toEmails, setToEmails)}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={(e) => handleChipKeyDown(e, toInput, setToInput, toEmails, setToEmails)}
                  onBlur={() => {
                    if (toInput.trim()) {
                      addEmailToList(toInput, toEmails, setToEmails);
                      setToInput('');
                    }
                  }}
                  placeholder={toEmails.length === 0 ? 'recipient@company.com...' : 'Add another...'}
                  className="flex-1 min-w-[160px] text-xs text-slate-800 px-1.5 py-1 focus:outline-none"
                />
              </div>
            </div>

            {/* CC & BCC CHIPS */}
            {showCcBcc && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">CC</label>
                  <div className="min-h-[36px] flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-slate-300 bg-white">
                    {ccEmails.map((em) => (
                      <span
                        key={em}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700"
                      >
                        {em}
                        <button
                          type="button"
                          onClick={() => removeEmailFromList(em, ccEmails, setCcEmails)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={(e) => handleChipKeyDown(e, ccInput, setCcInput, ccEmails, setCcEmails)}
                      onBlur={() => {
                        if (ccInput.trim()) {
                          addEmailToList(ccInput, ccEmails, setCcEmails);
                          setCcInput('');
                        }
                      }}
                      placeholder="cc@company.com"
                      className="flex-1 min-w-[110px] text-xs text-slate-800 px-1 py-0.5 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">BCC</label>
                  <div className="min-h-[36px] flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-slate-300 bg-white">
                    {bccEmails.map((em) => (
                      <span
                        key={em}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700"
                      >
                        {em}
                        <button
                          type="button"
                          onClick={() => removeEmailFromList(em, bccEmails, setBccEmails)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={bccInput}
                      onChange={(e) => setBccInput(e.target.value)}
                      onKeyDown={(e) => handleChipKeyDown(e, bccInput, setBccInput, bccEmails, setBccEmails)}
                      onBlur={() => {
                        if (bccInput.trim()) {
                          addEmailToList(bccInput, bccEmails, setBccEmails);
                          setBccInput('');
                        }
                      }}
                      placeholder="bcc@company.com"
                      className="flex-1 min-w-[110px] text-xs text-slate-800 px-1 py-0.5 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. BRANDED GROW CARD CONTENT */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                3. Branded Grow Card Content
              </label>

              {/* Quick Snippets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Quick Templates:
                </span>
                {QUICK_SNIPPETS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => applySnippet(s)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Email Subject Line *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Grow BD Treasury Platform — Account & Onboarding Update"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Greeting Name <span className="text-slate-400 font-normal">(Dear ...)</span>
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Leave blank for 'Hello,'"
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Top-Right Header Pill Badge
                </label>
                <input
                  type="text"
                  value={headerBadge}
                  onChange={(e) => setHeaderBadge(e.target.value)}
                  placeholder="e.g. Client Name or Grow BD"
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Card Banner Title <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="Defaults to Subject line"
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Message Body *{' '}
                  <span className="text-slate-400 font-normal">
                    (Blank lines create paragraphs; lines starting with &quot;- &quot; create bullet lists)
                  </span>
                </label>
              </div>
              <textarea
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email content here..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Optional CTA Button */}
            <div className="pt-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCta(!showCta)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {showCta ? 'Remove Call-to-Action Button' : '+ Add Call-to-Action Button to Card'}
                </button>
              </div>
              {showCta && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="e.g. Access Grow Treasury Portal"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Button Target URL
                    </label>
                    <input
                      type="url"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://www.growbusinessdevelopment.com"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. ATTACHMENTS & SEND ACTION */}
          <div className="p-4 sm:p-5 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition shadow-sm"
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  Attach Files
                </button>
                <span className="text-[11px] text-slate-400">
                  PDF, Excel, Word, or Images supported
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => clearComposer(true)}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  Clear
                </button>

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 shadow-sm disabled:opacity-50 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Dispatching Email...' : 'Send Branded Email'}
                </button>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 shadow-sm"
                  >
                    <Paperclip className="w-3 h-3 text-indigo-500" />
                    <span className="font-medium truncate max-w-[180px]">{file.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* RIGHT COLUMN: LIVE BRANDED CARD PREVIEW & RECENT SENT LOG (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rightTab === 'preview'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Grow Card Preview
              </button>
              <button
                type="button"
                onClick={() => setRightTab('history')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rightTab === 'history'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Sent History ({history.length})
              </button>
            </div>
          </div>

          {rightTab === 'preview' ? (
            <div className="p-4 space-y-3 bg-slate-100/80">
              {/* Envelope metadata summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-[11px] space-y-1 text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-400">From:</span>
                  <span className="font-bold text-slate-800 truncate">
                    {senderDisplayName || 'Grow BD'} &lt;{selectedSenderEmail || `info@${verifiedDomain}`}&gt;
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-400">Reply-To:</span>
                  <span className="text-slate-700 truncate">{replyTo || selectedSenderEmail}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-400">Subject:</span>
                  <span className="font-semibold text-slate-900 truncate">
                    {subject || '(No subject yet)'}
                  </span>
                </div>
              </div>

              {/* Exact replica of build_standard_email_html */}
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                {/* Dark Navy Header */}
                <div className="bg-[#0f172a] px-6 py-5 text-white flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#38bdf8] block mb-1">
                      {platformName.toUpperCase()}
                    </span>
                    <h2 className="text-base font-bold text-white leading-snug">
                      {effectiveCardTitle}
                    </h2>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-block bg-[#1e293b] text-[#38bdf8] px-3 py-1 rounded-full text-[11px] font-bold border border-[#38bdf8]">
                      {effectiveCardBadge}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 bg-white text-slate-700 text-xs space-y-3">
                  <p className="text-sm text-slate-700 mb-3">
                    {recipientName.trim() ? (
                      <>
                        Dear <strong>{recipientName.trim()}</strong>,
                      </>
                    ) : (
                      'Hello,'
                    )}
                  </p>

                  <div
                    className="text-xs leading-relaxed text-slate-700"
                    dangerouslySetInnerHTML={{ __html: formatBodyPreviewHtml(body) }}
                  />

                  {showCta && ctaText.trim() && (
                    <div className="pt-4 pb-2 text-center">
                      <span className="inline-block bg-[#1e40af] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-sm">
                        {ctaText.trim()} &rarr;
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="bg-[#f8fafc] border-t border-slate-200 px-6 py-4 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">
                    {platformName} &bull;{' '}
                    {isNoReplySelected
                      ? 'Automated System Notification'
                      : `Official Communication • ${selectedSenderEmail}`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Generated for {effectiveCardBadge}. Confidential.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 max-h-[600px] overflow-y-auto space-y-2.5">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No direct emails have been sent from the composer yet.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-xl p-3 hover:border-indigo-200 transition space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.subject}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          From: <span className="font-semibold text-slate-700">{item.sender_email}</span>
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.success
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.success ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Failed
                          </>
                        )}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 truncate">
                      To: {(item.to_emails || []).join(', ') || '—'}
                    </div>

                    {item.body_preview && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg">
                        {item.body_preview}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => loadHistoryItemIntoComposer(item)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        Load into Composer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* CLOUDFLARE SENDER LIST MANAGER MODAL */}
      {showSenderManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-bold">Manage Cloudflare-Routed Sender List</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Keep this list synced with the email routing addresses configured on @{verifiedDomain} in Cloudflare.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSenderManager(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Existing Senders List */}
              <div className="space-y-2">
                {senders.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{s.email}</span>
                        <span className="text-[11px] font-semibold text-slate-600">
                          ({s.display_name})
                        </span>
                        {s.is_default && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            Default
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            s.can_receive_replies
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.can_receive_replies ? 'Cloudflare Routed' : 'No-Reply'}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{s.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditSender(s)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSender(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit Form */}
              <form
                onSubmit={handleSaveSender}
                className="border-t border-slate-200 pt-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {editingSender ? `Edit Sender: ${editingSender.email}` : '+ Add Cloudflare Sender Address'}
                  </h4>
                  {editingSender && (
                    <button
                      type="button"
                      onClick={openAddSender}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Cloudflare Email Address *
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden bg-white">
                      <input
                        type="text"
                        value={senderForm.emailPrefix}
                        onChange={(e) =>
                          setSenderForm({ ...senderForm, emailPrefix: e.target.value })
                        }
                        placeholder="e.g. wael, billing, support"
                        className="w-full px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                      />
                      <span className="bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 border-l border-slate-300">
                        @{verifiedDomain}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Default Display Name *
                    </label>
                    <input
                      type="text"
                      value={senderForm.display_name}
                      onChange={(e) =>
                        setSenderForm({ ...senderForm, display_name: e.target.value })
                      }
                      placeholder="e.g. Grow Business Development"
                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Description / Purpose
                    </label>
                    <input
                      type="text"
                      value={senderForm.description}
                      onChange={(e) =>
                        setSenderForm({ ...senderForm, description: e.target.value })
                      }
                      placeholder="e.g. Executive & Partnership Inquiries"
                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Default Reply-To Override (Optional)
                    </label>
                    <input
                      type="email"
                      value={senderForm.default_reply_to}
                      onChange={(e) =>
                        setSenderForm({ ...senderForm, default_reply_to: e.target.value })
                      }
                      placeholder={`Defaults to sender email`}
                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={senderForm.can_receive_replies}
                        onChange={(e) =>
                          setSenderForm({
                            ...senderForm,
                            can_receive_replies: e.target.checked
                          })
                        }
                        className="rounded text-indigo-600"
                      />
                      Can Receive Email in Cloudflare
                    </label>

                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={senderForm.is_default}
                        onChange={(e) =>
                          setSenderForm({ ...senderForm, is_default: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      Set as Default Sender
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSender}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {savingSender
                      ? 'Saving...'
                      : editingSender
                      ? 'Update Sender'
                      : 'Add to Sender List'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComposeEmailPage;

