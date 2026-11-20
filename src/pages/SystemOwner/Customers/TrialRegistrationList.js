// frontend/src/pages/SystemOwner/Customers/TrialRegistrationList.js

import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from 'services/apiService.js';
import { toast } from 'react-toastify';
import { openPendingTab } from 'utils/navUtils';
import {
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  Star,
  Clock,
  MessageCircle,
  Mail,
  PlusCircle,
  Users,
  Upload,
  Loader2,
} from 'lucide-react';
import TrialRegistrationDetailsModal from './TrialRegistrationDetailsModal';
import { formatDate } from 'utils/dateFormat';

const statusColors = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

const statusText = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const FUNNEL_STAGE_STYLES = {
  WAITING_ACTIVATION: 'bg-slate-100 text-slate-700 border-slate-300',
  ACTIVATED: 'bg-blue-50 text-blue-700 border-blue-200',
  FIRST_TEST_DONE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  OWN_DOCS_UPLOADED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MULTI_STAKEHOLDER: 'bg-purple-50 text-purple-800 border-purple-200',
};

const MODULE_BADGES = {
  custody: { label: 'Custody', cls: 'bg-blue-100 text-blue-700' },
  issuance: { label: 'Issuance', cls: 'bg-purple-100 text-purple-700' },
  quotations: { label: 'FX & T-Bills', cls: 'bg-emerald-100 text-emerald-700' },
  reconciliation: { label: 'Bank Recon', cls: 'bg-amber-100 text-amber-800' },
};

function cleanWhatsAppPhone(rawPhone = '') {
  const digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('01') && digits.length === 11) return `2${digits}`;
  return digits;
}

function TrialRegistrationList() {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extendingId, setExtendingId] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const fetchRegistrations = async (statusFilter) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest(
        `/system-owner/trial/trial-registrations/?status=${statusFilter}`,
        'GET'
      );
      setRegistrations(response);
    } catch (err) {
      console.error('Failed to fetch trial registrations:', err);
      setError(`Failed to load registrations: ${err.message || 'An unexpected error occurred.'}`);
      toast.error(`Failed to load registrations: ${err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations(activeTab);
  }, [activeTab]);

  const funnelCounts = useMemo(() => {
    const counts = {
      WAITING_ACTIVATION: 0,
      ACTIVATED: 0,
      FIRST_TEST_DONE: 0,
      OWN_DOCS_UPLOADED: 0,
      MULTI_STAKEHOLDER: 0,
    };
    if (activeTab !== 'approved') return counts;
    registrations.forEach((r) => {
      const stg = r?.trial_insights?.funnel_stage || 'WAITING_ACTIVATION';
      if (counts[stg] !== undefined) counts[stg] += 1;
    });
    return counts;
  }, [activeTab, registrations]);

  const handleAction = async (registrationId, action) => {
    try {
      if (action === 'approve') {
        const response = await apiRequest(
          `/system-owner/trial/trial-registrations/${registrationId}/approve`,
          'POST'
        );
        toast.success(
          `Registration for ${response.name} approved! 14-day timer will start on their first login.`
        );
      } else if (action === 'reject') {
        await apiRequest(
          `/system-owner/trial/trial-registrations/${registrationId}/reject`,
          'POST'
        );
        toast.info('Registration rejected.');
      }
      fetchRegistrations(activeTab);
    } catch (err) {
      console.error(`Failed to ${action} registration:`, err);
      toast.error(`Failed to ${action} registration: ${err.message || ''}`);
    }
  };

  const handleExtendTrial = async (registrationId, daysToAdd) => {
    if (extendingId) return;
    setExtendingId(registrationId);
    try {
      const res = await apiRequest(
        `/system-owner/trial/trial-registrations/${registrationId}/extend`,
        'POST',
        { days: daysToAdd }
      );
      toast.success(res?.message || `Extended trial by +${daysToAdd} days.`);
      fetchRegistrations(activeTab);
    } catch (err) {
      toast.error(`Failed to extend trial: ${err.message || ''}`);
    } finally {
      setExtendingId(null);
    }
  };

  const handleViewDocument = async (gcsPath) => {
    if (!gcsPath) {
      toast.error('No document path available.');
      return;
    }

    const tab = openPendingTab('Loading Document...');
    try {
      const response = await apiRequest(
        `/system-owner/trial/get-document-url/?gcs_uri=${encodeURIComponent(gcsPath)}`,
        'GET'
      );

      if (response && response.url) {
        tab.setUrl(response.url);
      } else {
        tab.close();
        toast.error('Failed to retrieve document URL.');
      }
    } catch (err) {
      tab.close();
      console.error('Error fetching document URL:', err);
      toast.error(`Error opening document: ${err.message}`);
    }
  };

  const handleViewDetails = (registration) => {
    setSelectedRegistration(registration);
  };

  return (
    <>
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Trial Registrations &amp; Funnel</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              14-day timer starts on first login · Track activation, real file uploads, team invites
              &amp; personal sales check-ins.
            </p>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-indigo-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                activeTab === 'approved'
                  ? 'bg-white text-indigo-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Approved Funnel
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                activeTab === 'rejected'
                  ? 'bg-white text-indigo-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        {/* LIVE CONVERSION FUNNEL SUMMARY BAR ON APPROVED TAB */}
        {activeTab === 'approved' && !isLoading && registrations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              {
                key: 'WAITING_ACTIVATION',
                label: 'Waiting 1st Login',
                cls: 'bg-slate-50 border-slate-200 text-slate-800',
              },
              {
                key: 'ACTIVATED',
                label: 'Activated (Signed In)',
                cls: 'bg-blue-50/70 border-blue-200 text-blue-900',
              },
              {
                key: 'FIRST_TEST_DONE',
                label: 'Completed 1st Test',
                cls: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
              },
              {
                key: 'OWN_DOCS_UPLOADED',
                label: 'Uploaded Own Files',
                cls: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
              },
              {
                key: 'MULTI_STAKEHOLDER',
                label: 'Team Involved (2+)',
                cls: 'bg-purple-50/70 border-purple-200 text-purple-900',
              },
            ].map((st) => (
              <div key={st.key} className={`rounded-xl border px-3 py-2 ${st.cls}`}>
                <div className="text-lg font-extrabold">{funnelCounts[st.key]}</div>
                <div className="text-[11px] font-semibold opacity-80">{st.label}</div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="p-3 text-xs font-medium text-rose-700 rounded-xl bg-rose-50 border border-rose-200">{error}</div>}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mr-2" />
            <p className="text-sm text-slate-500">Loading registrations...</p>
          </div>
        ) : registrations.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-10">No {activeTab} registrations found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Company &amp; Contact
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    #1 Priority &amp; Modules
                  </th>
                  {activeTab === 'approved' ? (
                    <>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        Funnel Milestone
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        14d Clock &amp; Extend
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        Personal Sales Check-In
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        Entities
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        Registered At
                      </th>
                    </>
                  )}
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {registrations.map((reg) => {
                  const insights = reg.trial_insights || null;
                  const stepsDone = insights?.steps_completed || {};
                  const touchpoint = insights?.recommended_touchpoint || null;
                  const waPhone = cleanWhatsAppPhone(reg.contact_phone);
                  const waHref =
                    touchpoint && waPhone
                      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(
                          touchpoint.whatsapp_text || ''
                        )}`
                      : null;
                  const mailHref = touchpoint
                    ? `mailto:${reg.admin_email}?subject=${encodeURIComponent(
                        touchpoint.email_subject || 'Your Grow Treasury Free Trial'
                      )}&body=${encodeURIComponent(touchpoint.whatsapp_text || '')}`
                    : `mailto:${reg.admin_email}`;

                  return (
                    <tr
                      key={reg.id}
                      onClick={() => handleViewDetails(reg)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                    >
                      {/* Company & Contact */}
                      <td className="px-3 py-2.5">
                        <div className="text-sm font-semibold text-slate-900 max-w-[200px] truncate" title={reg.organization_name}>
                          {reg.organization_name}
                        </div>
                        <div className="text-xs text-slate-500 max-w-[200px] truncate" title={`${reg.contact_admin_name ? `${reg.contact_admin_name} · ` : ''}${reg.admin_email}`}>
                          {reg.contact_admin_name ? `${reg.contact_admin_name} · ` : ''}
                          {reg.admin_email}
                        </div>
                        {reg.contact_phone && (
                          <div className="text-[11px] text-slate-400">{reg.contact_phone}</div>
                        )}
                      </td>

                      {/* #1 Priority + Modules */}
                      <td className="px-3 py-2.5 text-sm">
                        <div className="flex gap-1 flex-wrap max-w-[240px]">
                          {(reg.requested_modules || ['custody']).map((mod, idx) => {
                            const normKey = mod === 'quotation' ? 'quotations' : mod;
                            const b = MODULE_BADGES[normKey] || {
                              label: mod,
                              cls: 'bg-slate-100 text-slate-700',
                            };
                            const isPrimary = idx === 0;
                            const isTested = Boolean(stepsDone[normKey]);
                            return (
                              <span
                                key={`${mod}-${idx}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                  isPrimary ? 'ring-1 ring-indigo-500 font-bold' : ''
                                } ${b.cls}`}
                                title={
                                  isPrimary ? '#1 Priority selected by prospect' : 'Unlocked module'
                                }
                              >
                                {isPrimary && (
                                  <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
                                )}
                                <span>{b.label}</span>
                                {isTested && <span className="text-emerald-700 font-extrabold">✓</span>}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {activeTab === 'approved' ? (
                        <>
                          {/* Live Funnel Milestone */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {insights ? (
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                    FUNNEL_STAGE_STYLES[insights.funnel_stage] ||
                                    FUNNEL_STAGE_STYLES.ACTIVATED
                                  }`}
                                >
                                  {insights.stage_label}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  {insights.own_documents_uploaded && (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                                      <Upload className="w-3 h-3" /> Own file
                                    </span>
                                  )}
                                  {insights.invited_colleagues_count > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-purple-700 font-semibold">
                                      <Users className="w-3 h-3" /> +
                                      {insights.invited_colleagues_count} colleague
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* 14d Clock & 1-Click Extensions */}
                          <td
                            className="px-3 py-2.5 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {insights ? (
                              <div className="space-y-1.5">
                                {!insights.is_activated ? (
                                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>14d starts on 1st login</span>
                                  </div>
                                ) : (
                                  <div
                                    className={`inline-flex items-center gap-1 text-xs font-bold ${
                                      (insights.days_remaining ?? 0) <= 3
                                        ? 'text-rose-600'
                                        : 'text-emerald-700'
                                    }`}
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                      {(insights.days_remaining ?? 0) > 0
                                        ? `${insights.days_remaining}d left`
                                        : 'Expired'}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={extendingId === reg.id}
                                    onClick={() => handleExtendTrial(reg.id, 7)}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 cursor-pointer disabled:opacity-50"
                                    title="Extend evaluation by +7 days"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    <span>7d</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={extendingId === reg.id}
                                    onClick={() => handleExtendTrial(reg.id, 14)}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 cursor-pointer disabled:opacity-50"
                                    title="Extend evaluation by +14 days"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    <span>14d</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Suggested Consultative Sales Touchpoint */}
                          <td
                            className="px-3 py-2.5 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {touchpoint ? (
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-800 max-w-[190px] truncate" title={`${touchpoint.label} (${touchpoint.timing})`}>
                                  {touchpoint.label}{' '}
                                  <span className="text-[11px] font-normal text-slate-500">
                                    ({touchpoint.timing})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {waHref && (
                                    <a
                                      href={waHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                      title="Open personalized WhatsApp check-in"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </a>
                                  )}
                                  <a
                                    href={mailHref}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                                    title="Open personalized email draft"
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span>Email</span>
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">
                            {reg.entities_count}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full border ${
                                statusColors[reg.status]
                              }`}
                            >
                              {statusText[reg.status]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-500">
                            {formatDate(reg.accepted_terms_at)}
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td
                        className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          {reg.commercial_register_document_path ? (
                            <button
                              onClick={() =>
                                handleViewDocument(reg.commercial_register_document_path)
                              }
                              className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 transition-colors"
                              title="View Commercial Register"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          ) : (
                            <span
                              className="text-xs text-slate-400 px-1.5"
                              title="Trial request — no Commercial Register uploaded yet"
                            >
                              No CR
                            </span>
                          )}

                          <button
                            onClick={() => handleViewDetails(reg)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {reg.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(reg.id, 'approve')}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 transition-colors"
                                title="Approve Registration"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleAction(reg.id, 'reject')}
                                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-900 hover:bg-rose-50 transition-colors"
                                title="Reject Registration"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedRegistration && (
        <TrialRegistrationDetailsModal
          registration={selectedRegistration}
          onClose={() => setSelectedRegistration(null)}
        />
      )}
    </>
  );
}

export default TrialRegistrationList;
