import React, { useState, useEffect, Fragment } from 'react';
import { Loader2, Send, X, Calendar, TrendingUp, Pencil, Zap, CheckCircle } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import moment from 'moment';

const DISPLAY_DATE_FORMAT = 'DD-MMM-YYYY';
const API_DATE_FORMAT = 'YYYY-MM-DD';

const MaintenanceActionModal = ({ isOpen, actionType, lg, onClose, onSubmit, submitting }) => {
    const [formData, setFormData] = useState({});
    const [supportFile, setSupportFile] = useState(null);
    const [extendMethod, setExtendMethod] = useState('date');
    const [extensionMonths, setExtensionMonths] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData({});
            setSupportFile(null);
            setExtendMethod('date');
            setExtensionMonths('');
        }
    }, [isOpen, actionType, lg]);

    if (!isOpen || !actionType || !lg) return null;

    const actionConfig = {
        EXTEND: { title: 'Extend Letter of Guarantee', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
        INCREASE_AMOUNT: { title: 'Increase LG Amount', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        AMENDMENT: { title: 'Amend Letter of Guarantee', icon: Pencil, color: 'text-violet-600', bg: 'bg-violet-100' },
        ACTIVATE: { title: 'Activate Letter of Guarantee', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100' },
    };

    const config = actionConfig[actionType] || { title: actionType.replace(/_/g, ' '), icon: Send, color: 'text-slate-600', bg: 'bg-slate-100' };
    const Icon = config.icon;

    const handleSubmitClick = () => {
        const finalData = { ...formData };
        if (actionType === 'EXTEND') {
            if (extendMethod === 'months') {
                const months = parseInt(extensionMonths, 10);
                if (months > 0 && lg.expiry_date) {
                    finalData.new_expiry_date = moment(lg.expiry_date).add(months, 'months').format(API_DATE_FORMAT);
                }
            }
        }
        onSubmit(actionType, finalData, supportFile);
    };

    const isReadyForSubmit = () => {
        if (submitting) return false;
        if (actionType === 'EXTEND') {
            if (extendMethod === 'date' && !formData.new_expiry_date) return false;
            if (extendMethod === 'months' && (!extensionMonths || parseInt(extensionMonths, 10) <= 0)) return false;
        }
        if (actionType === 'INCREASE_AMOUNT' && !formData.new_amount) return false;
        if (actionType === 'AMENDMENT' && !formData.amendment_text && !formData.new_beneficiary_name && !formData.new_beneficiary_address && !formData.new_lg_purpose) return false;
        return true;
    };

    const currentAmount = parseFloat(lg.current_amount || lg.amount || 0);
    const currency = lg.currency_code || lg.currency || '';

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={!submitting ? onClose : () => {}}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 transition-opacity backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl flex flex-col max-h-[90vh]">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${config.bg}`}>
                                            <Icon className={`w-5 h-5 ${config.color}`} />
                                        </div>
                                        <div>
                                            <DialogTitle as="h3" className="text-lg font-bold text-slate-900">
                                                {config.title}
                                            </DialogTitle>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                Ref: {lg.lg_ref_number || lg.lg_number || 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={submitting}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 focus:outline-none"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="px-5 py-4 overflow-y-auto flex-1">
                                    {/* Abstract Info Panel */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 shadow-sm">
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-slate-500 text-[10px] mb-0.5 font-bold uppercase tracking-wider">Beneficiary</p>
                                                <p className="font-semibold text-slate-900 truncate" title={lg.beneficiary_name || lg.beneficiary_corporate?.entity_name}>
                                                    {lg.beneficiary_name || lg.beneficiary_corporate?.entity_name || '—'}
                                                </p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-slate-500 text-[10px] mb-0.5 font-bold uppercase tracking-wider">Current Expiry</p>
                                                <p className="font-semibold text-slate-900">
                                                    {lg.expiry_date ? moment(lg.expiry_date).format(DISPLAY_DATE_FORMAT) : '—'}
                                                </p>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-200 pt-2">
                                                <p className="text-slate-500 text-[10px] mb-0.5 font-bold uppercase tracking-wider">Current Amount</p>
                                                <p className="font-bold text-slate-900 text-base">
                                                    {currency} {currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="space-y-4">
                                        {actionType === 'EXTEND' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Extension Method</label>
                                                    <div className="flex items-center gap-6 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                                                        <label className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-lg transition-colors ${extendMethod === 'date' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                            <input type="radio" checked={extendMethod === 'date'} onChange={() => setExtendMethod('date')} className="sr-only" />
                                                            <Calendar className={`w-4 h-4 ${extendMethod === 'date' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                            <span className="text-sm font-semibold">Specific Date</span>
                                                        </label>
                                                        <label className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-lg transition-colors ${extendMethod === 'months' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                            <input type="radio" checked={extendMethod === 'months'} onChange={() => setExtendMethod('months')} className="sr-only" />
                                                            <TrendingUp className={`w-4 h-4 ${extendMethod === 'months' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                            <span className="text-sm font-semibold">By Months</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {extendMethod === 'date' ? (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">New Expiry Date <span className="text-red-500">*</span></label>
                                                        <input type="date" value={formData.new_expiry_date || ''}
                                                            onChange={e => setFormData({ ...formData, new_expiry_date: e.target.value })}
                                                            min={lg.expiry_date || undefined}
                                                            className="w-full px-3 py-2 border border-slate-300 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Months <span className="text-red-500">*</span></label>
                                                        <input type="number" min="1" placeholder="e.g. 12" value={extensionMonths}
                                                            onChange={e => setExtensionMonths(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                                                        {extensionMonths && parseInt(extensionMonths, 10) > 0 && lg.expiry_date && (
                                                            <div className="mt-2 flex items-start gap-2 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                                                                <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                                                                <p className="text-xs text-blue-800 font-medium leading-tight">
                                                                    Approximate new expiry date:<br />
                                                                    <span className="text-blue-900 font-bold">{moment(lg.expiry_date).add(parseInt(extensionMonths, 10), 'months').format(DISPLAY_DATE_FORMAT)}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {actionType === 'INCREASE_AMOUNT' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">New Total Amount ({currency}) <span className="text-red-500">*</span></label>
                                                <input type="number" step="0.01" value={formData.new_amount || ''} placeholder={`e.g. ${currentAmount + 5000}`}
                                                    onChange={e => setFormData({ ...formData, new_amount: e.target.value })}
                                                    className="w-full px-3 py-2.5 border border-slate-300 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow" />
                                            </div>
                                        )}

                                        {actionType === 'AMENDMENT' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">New Beneficiary Name <span className="font-normal text-slate-400 font-medium">(optional)</span></label>
                                                    <input type="text" value={formData.new_beneficiary_name || ''}
                                                        onChange={e => setFormData({ ...formData, new_beneficiary_name: e.target.value })}
                                                        placeholder="Leave blank to keep unchanged"
                                                        className="w-full px-3 py-2.5 border border-slate-300 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-shadow" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">New Beneficiary Address <span className="font-normal text-slate-400 font-medium">(optional)</span></label>
                                                    <input type="text" value={formData.new_beneficiary_address || ''}
                                                        onChange={e => setFormData({ ...formData, new_beneficiary_address: e.target.value })}
                                                        placeholder="Leave blank to keep unchanged"
                                                        className="w-full px-3 py-2.5 border border-slate-300 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-shadow" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">New LG Purpose <span className="font-normal text-slate-400 font-medium">(optional)</span></label>
                                                    <textarea rows={2} value={formData.new_lg_purpose || ''}
                                                        onChange={e => setFormData({ ...formData, new_lg_purpose: e.target.value })}
                                                        placeholder="Leave blank to keep unchanged"
                                                        className="w-full px-3 py-2.5 border border-slate-300 shadow-sm rounded-xl text-sm resize-none focus:ring-2 focus:ring-violet-500 outline-none transition-shadow" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Additional Amendment Description <span className="font-normal text-slate-400 font-medium">(optional)</span></label>
                                                    <textarea rows={3} value={formData.amendment_text || ''}
                                                        onChange={e => setFormData({ ...formData, amendment_text: e.target.value })}
                                                        placeholder="Any additional details about the amendment..."
                                                        className="w-full px-3 py-2.5 border border-slate-300 shadow-sm rounded-xl text-sm resize-none focus:ring-2 focus:ring-violet-500 outline-none transition-shadow" />
                                                </div>
                                            </div>
                                        )}

                                        {actionType === 'ACTIVATE' && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                                                <Zap className="w-5 h-5 text-amber-600 shrink-0" />
                                                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                                                    This will send an activation instruction to the bank for this non-operative advance payment guarantee once internal approval is granted.
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 gap-4 pt-3 mt-3 border-t border-slate-100">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Supporting Document <span className="font-normal text-slate-400 font-medium">(optional)</span></label>
                                                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    onChange={e => setSupportFile(e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-[10px] file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50 file:transition-colors cursor-pointer" />
                                                {supportFile && (
                                                    <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1.5 ml-1">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Attached: {supportFile.name}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes <span className="font-normal text-slate-400 font-medium">(optional)</span></label>
                                                <textarea rows={2} value={formData.notes || ''}
                                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                    placeholder="Add any internal justification for approvers..."
                                                    className="w-full px-3 py-2 border border-slate-300 shadow-sm rounded-xl text-sm resize-none focus:ring-2 focus:ring-slate-400 outline-none transition-shadow" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={submitting}
                                        className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmitClick}
                                        disabled={!isReadyForSubmit()}
                                        className={`px-5 py-2 text-sm font-bold text-white shadow-sm rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2
                                            ${actionType === 'EXTEND' ? 'bg-blue-600 hover:bg-blue-700' :
                                              actionType === 'INCREASE_AMOUNT' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                              actionType === 'AMENDMENT' ? 'bg-violet-600 hover:bg-violet-700' :
                                              'bg-slate-800 hover:bg-slate-900'}`}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                                        Submit Request
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default MaintenanceActionModal;
