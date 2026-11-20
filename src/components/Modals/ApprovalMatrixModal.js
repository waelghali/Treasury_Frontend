import React from 'react';
import { Shield, Globe, Trash2, Save, Loader2, Layers, Pencil, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ApprovalMatrixModal = ({
    show,
    onClose,
    matrixSteps,
    setMatrixSteps,
    availableUsers,
    availableDepartments,
    availableCurrencies,
    availableGroups,
    editingStep,
    setEditingStep,
    editingMatrixIndex,
    isSaving,
    handleInsertMatrixStep,
    handleSaveMatrix,
    handleRemoveMatrixStep,
    handleEditMatrixStep,
    handleCancelEditMatrixStep
}) => {
    const { t } = useTranslation();
    if (!show) return null;

    // Determine the locked currency for amount-based steps.
    // All AMOUNT_OVER and AMOUNT_RANGE steps must use the same currency.
    const lockedCurrencyId = (() => {
        // Check existing saved steps first (but not the one being edited)
        for (let i = 0; i < matrixSteps.length; i++) {
            if (i === editingMatrixIndex) continue; // skip the step being edited
            const step = matrixSteps[i];
            if ((step.condition_type === 'AMOUNT_OVER' || step.condition_type === 'AMOUNT_RANGE') && step.currency_id) {
                return String(step.currency_id);
            }
        }
        // Then check the current editing step
        if ((editingStep.condition_type === 'AMOUNT_OVER' || editingStep.condition_type === 'AMOUNT_RANGE') && editingStep.currency_id) {
            return String(editingStep.currency_id);
        }
        return null;
    })();

    // Helper: resolve approver_values IDs to display names
    const getApproverLabel = (step) => {
        if (step.approver_type === 'DEPT_HEAD') {
            return t('modals.approvalMatrixModal.approverOptions.deptHead');
        }
        if (step.approver_type === 'USERS') {
            const names = (step.approver_values || []).map(id => {
                const user = availableUsers.find(u => String(u.id) === String(id));
                return user ? (user.full_name || user.email || `ID ${id}`) : `User ${id}`;
            });
            return names.length > 0 ? names.join(', ') : t('modals.approvalMatrixModal.approverOptions.users');
        }
        if (step.approver_type === 'GROUP') {
            const names = (step.approver_values || []).map(id => {
                const group = availableGroups?.find(g => String(g.id) === String(id));
                return group ? group.name : `Group ${id}`;
            });
            return names.length > 0 ? names.join(', ') : t('modals.approvalMatrixModal.approverOptions.group');
        }
        return step.approver_type;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-5xl w-full p-0 overflow-hidden flex flex-col max-h-[88vh] h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold flex items-center"><Shield className="w-5 h-5 mr-2.5 rtl-flip" /> {t('modals.approvalMatrixModal.title')}</h3>
                        <p className="text-blue-100 text-xs sm:text-sm mt-0.5">{t('modals.approvalMatrixModal.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex-grow overflow-hidden flex flex-col lg:flex-row min-h-0">
                    {/* LEFT: STEP BUILDER */}
                    <div className="w-full lg:w-1/2 p-5 sm:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70">
                        <h4 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-wider">
                            {editingMatrixIndex !== null ? `✏️ Edit Step ${editingMatrixIndex + 1}` : t('modals.approvalMatrixModal.createStep')}
                        </h4>

                        <div className="space-y-4">
                            {/* 1. The Trigger Condition Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                                <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                                    {t('modals.approvalMatrixModal.triggerCondition')}
                                </label>

                                <select
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={editingStep.condition_type}
                                    onChange={e => setEditingStep({ ...editingStep, condition_type: e.target.value, condition_value: '' })}
                                >
                                    <option value="ALWAYS">{t('modals.approvalMatrixModal.triggerOptions.always')}</option>
                                    <option value="AMOUNT_RANGE">{t('modals.approvalMatrixModal.triggerOptions.amountRange')}</option>
                                    <option value="AMOUNT_OVER">{t('modals.approvalMatrixModal.triggerOptions.amountOver')}</option>
                                    <option value="DEPT_MATCH">{t('modals.approvalMatrixModal.triggerOptions.deptMatch')}</option>
                                    <option value="CROSS_BORDER">{t('modals.approvalMatrixModal.triggerOptions.crossBorder')}</option>
                                    <option value="THIRD_PARTY">Third-Party Issuance</option>
                                </select>

                                {/* CASE A: Amount Range */}
                                {editingStep.condition_type === 'AMOUNT_RANGE' && (
                                    <div className="mt-3 flex gap-2 items-center">
                                        <input
                                            type="number"
                                            className="w-1/3 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Min (e.g. 500)"
                                            value={editingStep.condition_value.split(',')[0] || ''}
                                            onChange={e => {
                                                const parts = editingStep.condition_value.split(',');
                                                setEditingStep({ ...editingStep, condition_value: `${e.target.value},${parts[1] || ''}` });
                                            }}
                                        />
                                        <span className="text-slate-500 text-sm">to</span>
                                        <input
                                            type="number"
                                            className="w-1/3 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Max (e.g. 1000)"
                                            value={editingStep.condition_value.split(',')[1] || ''}
                                            onChange={e => {
                                                const parts = editingStep.condition_value.split(',');
                                                setEditingStep({ ...editingStep, condition_value: `${parts[0] || ''},${e.target.value}` });
                                            }}
                                        />
                                        <select
                                            className="w-1/3 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={lockedCurrencyId || editingStep.currency_id}
                                            onChange={e => setEditingStep({ ...editingStep, currency_id: e.target.value })}
                                            disabled={!!lockedCurrencyId && lockedCurrencyId !== String(editingStep.currency_id)}
                                            title={lockedCurrencyId ? 'Currency is locked to match other amount-based steps' : ''}
                                        >
                                            <option value="">Ccy</option>
                                            {availableCurrencies.map(c => <option key={c.id} value={c.id}>{c.iso_code}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* CASE B: Amount Over */}
                                {editingStep.condition_type === 'AMOUNT_OVER' && (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="number"
                                            className="flex-grow border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="e.g. 100000"
                                            value={editingStep.condition_value}
                                            onChange={e => setEditingStep({ ...editingStep, condition_value: e.target.value })}
                                        />
                                        <select
                                            className="w-24 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={lockedCurrencyId || editingStep.currency_id}
                                            onChange={e => setEditingStep({ ...editingStep, currency_id: e.target.value })}
                                            disabled={!!lockedCurrencyId && lockedCurrencyId !== String(editingStep.currency_id)}
                                            title={lockedCurrencyId ? 'Currency is locked to match other amount-based steps' : ''}
                                        >
                                            <option value="">Ccy</option>
                                            {availableCurrencies.map(c => <option key={c.id} value={c.id}>{c.iso_code}</option>)}
                                        </select>
                                    </div>
                                )}

                                {editingStep.condition_type === 'DEPT_MATCH' && (
                                    <select
                                        className="mt-3 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        value={editingStep.condition_value}
                                        onChange={e => setEditingStep({ ...editingStep, condition_value: e.target.value })}
                                    >
                                        <option value="">Select Department...</option>
                                        {availableDepartments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                )}

                                {editingStep.condition_type === 'CROSS_BORDER' && (
                                    <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                                        <p className="text-xs text-blue-700 italic flex items-center">
                                            <Globe className="h-3.5 w-3.5 mr-1.5 rtl-flip" /> {t('modals.approvalMatrixModal.crossBorderNote')}
                                        </p>
                                    </div>
                                )}

                                {editingStep.condition_type === 'THIRD_PARTY' && (
                                    <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                                        <p className="text-xs text-indigo-700 italic flex items-center">
                                            <Shield className="h-3.5 w-3.5 mr-1.5" /> This rule triggers when the request is for third-party issuance (beneficiary is not the applying entity).
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Approver Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                                <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">{t('modals.approvalMatrixModal.whoApproves')}</label>
                                <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={editingStep.approver_type}
                                    onChange={e => {
                                        const newType = e.target.value;
                                        // Auto-set required_signatures to 1 for non-group types
                                        const newSigs = newType === 'GROUP' ? editingStep.required_signatures : 1;
                                        setEditingStep({ ...editingStep, approver_type: newType, approver_values: [], required_signatures: newSigs });
                                    }}>
                                    <option value="DEPT_HEAD">{t('modals.approvalMatrixModal.approverOptions.deptHead')}</option>
                                    <option value="GROUP">{t('modals.approvalMatrixModal.approverOptions.group')}</option>
                                    <option value="USERS">{t('modals.approvalMatrixModal.approverOptions.users')}</option>
                                </select>

                                {editingStep.approver_type === 'GROUP' && (
                                    <div className="mt-3 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                                        {availableGroups?.length === 0 ? (
                                            <p className="text-xs text-slate-500 text-center py-2 italic">No groups found. Create them in Organization & Teams.</p>
                                        ) : (
                                            availableGroups?.map(group => {
                                                const isChecked = editingStep.approver_values.includes(String(group.id));
                                                return (
                                                    <label key={group.id} className="flex items-center p-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-200/60 rounded-lg">
                                                        <input
                                                            type="checkbox"
                                                            className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const newVals = e.target.checked
                                                                    ? [...editingStep.approver_values, String(group.id)]
                                                                    : editingStep.approver_values.filter(id => id !== String(group.id));
                                                                setEditingStep({ ...editingStep, approver_values: newVals });
                                                            }}
                                                        />
                                                        {group.name} <span className="text-xs text-slate-400 ml-2">({group.users?.length || 0} members)</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {editingStep.approver_type === 'USERS' && (
                                    <div className="mt-3 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                                        {availableUsers.length === 0 ? (
                                            <p className="text-xs text-slate-500 text-center py-2 italic">No active users found.</p>
                                        ) : (
                                            availableUsers.map(user => {
                                                const isChecked = editingStep.approver_values.includes(String(user.id));
                                                return (
                                                    <label key={user.id} className="flex items-center p-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-200/60 rounded-lg">
                                                        <input
                                                            type="checkbox"
                                                            className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const newVals = e.target.checked
                                                                    ? [...editingStep.approver_values, String(user.id)]
                                                                    : editingStep.approver_values.filter(id => id !== String(user.id));
                                                                setEditingStep({ ...editingStep, approver_values: newVals });
                                                            }}
                                                        />
                                                        {user.email || `User ID: ${user.id}`}
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Joint Signature Section — only for GROUP approver type */}
                            {editingStep.approver_type === 'GROUP' && (
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                                    <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">{t('modals.approvalMatrixModal.signaturesRequired')}</label>
                                    <div className="flex items-center gap-4">
                                        <input type="number" min="1" className="w-20 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editingStep.required_signatures}
                                            onChange={e => setEditingStep({ ...editingStep, required_signatures: parseInt(e.target.value) || 1 })} />
                                        <span className="text-sm text-slate-500">{t('modals.approvalMatrixModal.signaturesSub')}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleInsertMatrixStep}
                                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors"
                            >
                                {editingMatrixIndex !== null ? `✓ Update Step ${editingMatrixIndex + 1}` : t('modals.approvalMatrixModal.insertSequence')}
                            </button>
                            {editingMatrixIndex !== null && (
                                <button
                                    onClick={handleCancelEditMatrixStep}
                                    className="w-full mt-2 bg-white border border-slate-300 text-slate-700 py-2 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <X className="h-4 w-4" /> Cancel Edit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: THE LADDER */}
                    <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-white">
                        <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
                            <h4 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-wider">{t('modals.approvalMatrixModal.liveSequence')}</h4>
                            <div className="space-y-3">
                                {matrixSteps.length === 0 ? (
                                    <div className="text-center py-20 text-slate-300"><Layers className="h-14 w-14 mx-auto mb-3" /><p className="text-sm text-slate-400">{t('modals.approvalMatrixModal.noRulesDefined')}</p></div>
                                ) : (
                                    matrixSteps.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-3.5 group">
                                            <div className="bg-indigo-600 text-white w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">{idx + 1}</div>
                                            <div className={`flex-grow border p-3.5 rounded-xl group-hover:border-indigo-300 transition-colors shadow-sm ${editingMatrixIndex === idx ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200' : 'bg-white border-slate-200/80'}`}>
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <p className="font-bold text-slate-800 uppercase text-xs">
                                                            {t(`modals.approvalMatrixModal.triggerOptions.${step.condition_type === 'AMOUNT_RANGE' ? 'amountRange' : step.condition_type === 'AMOUNT_OVER' ? 'amountOver' : step.condition_type === 'ANY_DEPARTMENT' ? 'anyDepartment' : step.condition_type === 'DEPT_MATCH' ? 'deptMatch' : step.condition_type === 'CROSS_BORDER' ? 'crossBorder' : step.condition_type === 'THIRD_PARTY' ? 'thirdParty' : 'always'}`)}
                                                            {step.condition_value && step.condition_type === 'DEPT_MATCH'
                                                                ? ` (${(() => { const dept = availableDepartments?.find(d => String(d.id) === String(step.condition_value)); return dept ? dept.name : step.condition_value; })()})`
                                                                : step.condition_value ? ` (${step.condition_value})` : ''}
                                                        </p>
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            {t('modals.approvalMatrixModal.approversText')} <span className="font-medium text-slate-800">{getApproverLabel(step)}</span>
                                                            {step.approver_type === 'GROUP' && (
                                                                <span className="ml-2 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">{t('modals.approvalMatrixModal.reqSigs')} {step.required_signatures}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => handleEditMatrixStep(idx)}
                                                            className={`p-1.5 rounded-lg transition-colors ${editingMatrixIndex === idx ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveMatrixStep(idx)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Save Button Footer */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                            <button
                                onClick={handleSaveMatrix}
                                disabled={isSaving}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-700 shadow-sm inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                {t('modals.approvalMatrixModal.saveMatrix')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApprovalMatrixModal;