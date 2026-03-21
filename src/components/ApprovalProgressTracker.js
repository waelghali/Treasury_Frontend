import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/apiService';
import { CheckCircle, Clock, Circle, SkipForward, ShieldCheck, XCircle, Users, Loader2 } from 'lucide-react';

/**
 * ApprovalProgressTracker — Banking-Grade Vertical Timeline
 * 
 * Renders the full approval lifecycle for an issuance request.
 * Statuses: completed | active | skipped | pending
 * 
 * Props:
 * - requestId: number — the issuance request ID
 * - requestStatus: string — current overall request status
 * - compact: boolean — if true, uses smaller spacing (for inline use)
 */
export default function ApprovalProgressTracker({ requestId, requestStatus, compact = false }) {
    const [roadmap, setRoadmap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!requestId) return;
        const fetchRoadmap = async () => {
            try {
                setLoading(true);
                const data = await apiRequest(`/issuance/requests/${requestId}/approval-roadmap`, 'GET');
                setRoadmap(data);
            } catch (err) {
                console.error('Failed to load approval roadmap:', err);
                setError(err.message || 'Failed to load roadmap');
            } finally {
                setLoading(false);
            }
        };
        fetchRoadmap();
    }, [requestId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-400">Loading approval roadmap...</span>
            </div>
        );
    }

    if (error) {
        return <div className="text-xs text-red-500 italic py-4 text-center">{error}</div>;
    }

    if (!roadmap || !roadmap.steps || roadmap.steps.length === 0) {
        return (
            <div className="text-center py-6">
                <Circle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No approval steps configured.</p>
            </div>
        );
    }

    const steps = (roadmap.steps || []).filter(s => s.status !== 'skipped');
    const isFullyApproved = requestStatus === 'APPROVED_INTERNAL';
    const isRejected = requestStatus === 'REJECTED';

    const statusConfig = {
        completed: {
            bg: 'bg-emerald-500',
            ring: 'ring-emerald-100',
            icon: CheckCircle,
            iconColor: 'text-white',
            lineColor: 'bg-emerald-300',
            labelColor: 'text-emerald-700',
            labelBg: 'bg-emerald-50',
        },
        active: {
            bg: 'bg-blue-500',
            ring: 'ring-blue-100',
            icon: Clock,
            iconColor: 'text-white',
            lineColor: 'bg-blue-200',
            labelColor: 'text-blue-700',
            labelBg: 'bg-blue-50',
        },
        skipped: {
            bg: 'bg-slate-200',
            ring: 'ring-slate-50',
            icon: SkipForward,
            iconColor: 'text-slate-400',
            lineColor: 'bg-slate-100',
            labelColor: 'text-slate-400',
            labelBg: 'bg-slate-50',
        },
        pending: {
            bg: 'bg-white border-2 border-slate-200',
            ring: 'ring-slate-50',
            icon: Circle,
            iconColor: 'text-slate-300',
            lineColor: 'bg-slate-100',
            labelColor: 'text-slate-400',
            labelBg: 'bg-slate-50',
        },
    };

    return (
        <div className={compact ? 'space-y-0' : 'space-y-0'}>
            {/* Submission Step (always shown) */}
            <div className="flex gap-3">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    {steps.length > 0 && <div className="w-0.5 flex-1 min-h-[16px] bg-emerald-300" />}
                </div>
                <div className={`pb-${compact ? '3' : '5'} flex-1`}>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Submitted</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Complete</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Request submitted for internal approval</p>
                </div>
            </div>

            {/* Dynamic Sequences */}
            {steps.map((step, idx) => {
                const config = statusConfig[step.status] || statusConfig.pending;
                const Icon = config.icon;
                const isLast = idx === steps.length - 1 && (isFullyApproved || isRejected);

                return (
                    <div key={step.sequence} className="flex gap-3">
                        {/* Vertical Rail */}
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full ${config.bg} ring-4 ${config.ring} flex items-center justify-center flex-shrink-0 shadow-sm ${step.status === 'active' ? 'animate-pulse' : ''}`}>
                                <Icon className={`w-4 h-4 ${config.iconColor}`} />
                            </div>
                            {(!isLast || !(isFullyApproved || isRejected)) && (
                                <div className={`w-0.5 flex-1 min-h-[16px] ${config.lineColor}`} />
                            )}
                            {isLast && (isFullyApproved || isRejected) && idx === steps.length - 1 && (
                                <div className={`w-0.5 flex-1 min-h-[16px] ${isFullyApproved ? 'bg-emerald-300' : 'bg-red-300'}`} />
                            )}
                        </div>

                        {/* Step Content */}
                        <div className={`pb-${compact ? '3' : '5'} flex-1 min-w-0`}>
                            {/* Header */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold uppercase tracking-wider ${config.labelColor}`}>
                                    Seq {step.sequence}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.labelBg} ${config.labelColor}`}>
                                    {step.status === 'completed' ? 'Approved' :
                                        step.status === 'active' ? 'In Progress' :
                                            step.status === 'skipped' ? 'Skipped' : 'Pending'}
                                </span>
                            </div>

                            {/* Condition + Approver */}
                            <p className="text-xs text-gray-600 mt-1">
                                <span className="font-medium text-gray-800">{step.condition_label}</span>
                                <span className="mx-1">→</span>
                                <span className="text-gray-500">{step.approver_label}</span>
                            </p>

                            {/* Signatures info */}
                            {step.required_signatures > 1 && step.status !== 'skipped' && (
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    Requires {step.required_signatures} signature{step.required_signatures > 1 ? 's' : ''}
                                    {step.status === 'active' && step.signatures_collected != null && (
                                        <span className="ml-1 font-medium text-blue-600">
                                            ({step.signatures_collected}/{step.required_signatures} collected)
                                        </span>
                                    )}
                                </p>
                            )}

                            {/* Actions (who approved and when) */}
                            {step.actions && step.actions.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {step.actions.map((action, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[11px] bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                            <span className="text-emerald-800 font-medium truncate">{action.user_name}</span>
                                            <span className="text-emerald-400 flex-shrink-0">•</span>
                                            <span className="text-emerald-500 flex-shrink-0">{action.timestamp}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Expected approvers for active step */}
                            {step.status === 'active' && step.expected_approvers && step.expected_approvers.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Awaiting
                                    </p>
                                    <div className="space-y-1">
                                        {step.expected_approvers.map((approver) => (
                                            <div key={approver.id} className="flex items-center gap-1.5 text-[11px] bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                                <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                                <span className="text-blue-700 truncate">{approver.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Expected approvers for pending step */}
                            {step.status === 'pending' && step.expected_approvers && step.expected_approvers.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {step.expected_approvers.map((approver) => (
                                        <span key={approver.id} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                            {approver.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Skip reason */}
                            {step.status === 'skipped' && step.skip_reason && (
                                <p className="text-[10px] text-slate-400 italic mt-1">{step.skip_reason}</p>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Terminal Node */}
            {(isFullyApproved || isRejected) && (
                <div className="flex gap-3 items-center">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full ${isFullyApproved ? 'bg-emerald-600 ring-4 ring-emerald-100' : 'bg-red-500 ring-4 ring-red-100'} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            {isFullyApproved
                                ? <ShieldCheck className="w-4 h-4 text-white" />
                                : <XCircle className="w-4 h-4 text-white" />}
                        </div>
                    </div>
                    <div className="flex-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isFullyApproved ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isFullyApproved ? 'Fully Approved' : 'Rejected'}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {isFullyApproved ? 'Ready for bank issuance' : 'Request was declined'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
