import React from 'react';
import { XCircle, Shield, Globe, Trash2, Save, Loader2, Layers, Pencil, X } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-0 overflow-hidden flex flex-col h-[85vh]">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold flex items-center"><Shield className="mr-3 rtl-flip" /> {t('modals.approvalMatrixModal.title')}</h3>
                        <p className="text-blue-100 text-sm">{t('modals.approvalMatrixModal.subtitle')}</p>
                    </div>
                    <button onClick={onClose}><XCircle className="h-8 w-8 hover:text-red-200" /></button>
                </div>

                <div className="flex-grow overflow-hidden flex">
                    {/* LEFT: STEP BUILDER */}
                    <div className="w-1/2 p-8 overflow-y-auto border-r bg-gray-50">
                        <h4 className="font-bold text-gray-700 mb-6 uppercase text-xs tracking-widest">
                            {editingMatrixIndex !== null ? `✏️ Edit Step ${editingMatrixIndex + 1}` : t('modals.approvalMatrixModal.createStep')}
                        </h4>

                        <div className="space-y-6">
                            {/* 1. The Trigger Condition Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border">
                                <label className="block text-xs font-black text-blue-600 uppercase mb-2">
                                    {t('modals.approvalMatrixModal.triggerCondition')}
                                </label>

                                <select
                                    className="w-full border-gray-300 rounded-lg p-2 text-sm"
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
                                            className="w-1/3 border-gray-300 rounded-lg p-2 text-sm"
                                            placeholder="Min (e.g. 500)"
                                            value={editingStep.condition_value.split(',')[0] || ''}
                                            onChange={e => {
                                                const parts = editingStep.condition_value.split(',');
                                                setEditingStep({ ...editingStep, condition_value: `${e.target.value},${parts[1] || ''}` });
                                            }}
                                        />
                                        <span className="text-gray-500 text-sm">to</span>
                                        <input
                                            type="number"
                                            className="w-1/3 border-gray-300 rounded-lg p-2 text-sm"
                                            placeholder="Max (e.g. 1000)"
                                            value={editingStep.condition_value.split(',')[1] || ''}
                                            onChange={e => {
                                                const parts = editingStep.condition_value.split(',');
                                                setEditingStep({ ...editingStep, condition_value: `${parts[0] || ''},${e.target.value}` });
                                            }}
                                        />
                                        <select
                                            className="w-1/3 border-gray-300 rounded-lg p-2 text-sm"
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
                                            className="flex-grow border-gray-300 rounded-lg p-2 text-sm"
                                            placeholder="e.g. 100000"
                                            value={editingStep.condition_value}
                                            onChange={e => setEditingStep({ ...editingStep, condition_value: e.target.value })}
                                        />
                                        <select
                                            className="w-24 border-gray-300 rounded-lg p-2 text-sm"
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
                                        className="mt-3 w-full border-gray-300 rounded-lg p-2 text-sm"
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
                                    <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                        <p className="text-xs text-blue-600 italic flex items-center">
                                            <Globe className="h-3 w-3 mr-1 rtl-flip" /> {t('modals.approvalMatrixModal.crossBorderNote')}
                                        </p>
                                    </div>
                                )}

                                {editingStep.condition_type === 'THIRD_PARTY' && (
                                    <div className="mt-3 p-2 bg-purple-50 border border-purple-100 rounded-lg">
                                        <p className="text-xs text-purple-600 italic flex items-center">
                                            <Shield className="h-3 w-3 mr-1" /> This rule triggers when the request is for third-party issuance (beneficiary is not the applying entity).
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Approver Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border">
                                <label className="block text-xs font-black text-blue-600 uppercase mb-2">{t('modals.approvalMatrixModal.whoApproves')}</label>
                                <select className="w-full border-gray-300 rounded-lg"
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
                                    <div className="mt-3 max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                                        {availableGroups?.length === 0 ? (
                                            <p className="text-xs text-gray-500 text-center py-2 italic">No groups found. Create them in Organization & Teams.</p>
                                        ) : (
                                            availableGroups?.map(group => {
                                                const isChecked = editingStep.approver_values.includes(String(group.id));
                                                return (
                                                    <label key={group.id} className="flex items-center p-1 text-sm cursor-pointer hover:bg-gray-200 rounded">
                                                        <input
                                                            type="checkbox"
                                                            className="mr-2"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const newVals = e.target.checked
                                                                    ? [...editingStep.approver_values, String(group.id)]
                                                                    : editingStep.approver_values.filter(id => id !== String(group.id));
                                                                setEditingStep({ ...editingStep, approver_values: newVals });
                                                            }}
                                                        />
                                                        {group.name} <span className="text-xs text-gray-400 ml-2">({group.users?.length || 0} members)</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {editingStep.approver_type === 'USERS' && (
                                    <div className="mt-3 max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                                        {availableUsers.length === 0 ? (
                                            <p className="text-xs text-gray-500 text-center py-2 italic">No active users found.</p>
                                        ) : (
                                            availableUsers.map(user => {
                                                const isChecked = editingStep.approver_values.includes(String(user.id));
                                                return (
                                                    <label key={user.id} className="flex items-center p-1 text-sm cursor-pointer hover:bg-gray-200 rounded">
                                                        <input
                                                            type="checkbox"
                                                            className="mr-2"
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
                                <div className="bg-white p-4 rounded-xl shadow-sm border">
                                    <label className="block text-xs font-black text-blue-600 uppercase mb-2">{t('modals.approvalMatrixModal.signaturesRequired')}</label>
                                    <div className="flex items-center gap-4">
                                        <input type="number" min="1" className="w-16 border-gray-300 rounded-lg p-2" value={editingStep.required_signatures}
                                            onChange={e => setEditingStep({ ...editingStep, required_signatures: parseInt(e.target.value) || 1 })} />
                                        <span className="text-sm text-gray-500">{t('modals.approvalMatrixModal.signaturesSub')}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleInsertMatrixStep}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-transform active:scale-95"
                            >
                                {editingMatrixIndex !== null ? `✓ Update Step ${editingMatrixIndex + 1}` : t('modals.approvalMatrixModal.insertSequence')}
                            </button>
                            {editingMatrixIndex !== null && (
                                <button
                                    onClick={handleCancelEditMatrixStep}
                                    className="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded-xl font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="h-4 w-4" /> Cancel Edit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: THE LADDER */}
                    <div className="w-1/2 p-8 overflow-y-auto bg-white">
                        <h4 className="font-bold text-gray-700 mb-6 uppercase text-xs tracking-widest">{t('modals.approvalMatrixModal.liveSequence')}</h4>
                        <div className="space-y-4">
                            {matrixSteps.length === 0 ? (
                                <div className="text-center py-20 opacity-30"><Layers className="h-16 w-16 mx-auto mb-4" /><p>{t('modals.approvalMatrixModal.noRulesDefined')}</p></div>
                            ) : (
                                matrixSteps.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className="bg-blue-600 text-white w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold">{idx + 1}</div>
                                        <div className={`flex-grow border p-4 rounded-xl group-hover:border-blue-400 transition-colors shadow-sm ${editingMatrixIndex === idx ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-white'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-gray-800 uppercase text-xs">
                                                        {t(`modals.approvalMatrixModal.triggerOptions.${step.condition_type === 'AMOUNT_RANGE' ? 'amountRange' : step.condition_type === 'AMOUNT_OVER' ? 'amountOver' : step.condition_type === 'ANY_DEPARTMENT' ? 'anyDepartment' : step.condition_type === 'DEPT_MATCH' ? 'deptMatch' : step.condition_type === 'CROSS_BORDER' ? 'crossBorder' : step.condition_type === 'THIRD_PARTY' ? 'thirdParty' : 'always'}`)}
                                                        {step.condition_value && step.condition_type === 'DEPT_MATCH'
                                                            ? ` (${(() => { const dept = availableDepartments?.find(d => String(d.id) === String(step.condition_value)); return dept ? dept.name : step.condition_value; })()})`
                                                            : step.condition_value ? ` (${step.condition_value})` : ''}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {t('modals.approvalMatrixModal.approversText')} <span className="font-medium">{getApproverLabel(step)}</span>
                                                        {step.approver_type === 'GROUP' && (
                                                            <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">{t('modals.approvalMatrixModal.reqSigs')} {step.required_signatures}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditMatrixStep(idx)}
                                                        className={`p-2 rounded-lg transition-colors ${editingMatrixIndex === idx ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMatrixStep(idx)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Save Button Footer */}
                        <div className="mt-8 pt-6 border-t flex justify-end">
                            <button
                                onClick={handleSaveMatrix}
                                disabled={isSaving}
                                className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
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