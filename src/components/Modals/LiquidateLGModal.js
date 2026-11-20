// frontend/src/components/Modals/LiquidateLGModal.js
import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, FileMinus, AlertCircle, FileText, Loader2, Sparkles } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import AmountInWordsHint from '../Common/AmountInWordsHint';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-xl py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const LiquidateLGModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [liquidationType, setLiquidationType] = useState('full');
    const [supportingDocument, setSupportingDocument] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // CRITICAL FIX: Add local state for submission status
    const [isDocMandatory, setIsDocMandatory] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await apiRequest('/end-user/customer-configurations/DOC_MANDATORY_LIQUIDATION', 'GET');
                if (res && res.effective_value !== undefined) {
                    setIsDocMandatory(String(res.effective_value).toLowerCase() === 'true');
                }
            } catch (err) {
                console.warn('Could not fetch DOC_MANDATORY_LIQUIDATION config, defaulting to optional.', err);
            }
        };
        fetchConfig();
    }, []);

    const initialValues = {
        liquidationType: 'full',
        newAmount: '',
        reason: '',
        notes: lgRecord?.mandatory_claim_statement || '',
    };

    const LiquidateLgSchema = Yup.object().shape({
        liquidationType: Yup.string().oneOf(['full', 'partial']).required('Liquidation type is required'),
        newAmount: Yup.number().when('liquidationType', {
            is: 'partial',
            then: (schema) => schema
                .typeError('Amount must be a number')
                .required('New amount is required for partial liquidation')
                .positive('Amount must be positive')
                .max(lgRecord.lg_amount, `New amount must be less than or equal to current LG amount (${lgRecord.lg_amount})`),
            otherwise: (schema) => schema.nullable(),
        }),
        reason: Yup.string().required('Reason for liquidation is required').min(10, 'Reason must be at least 10 characters.'),
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSupportingDocument(file);
    };

    const handleSubmit = async (values, { setErrors }) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }

        if (isDocMandatory && !supportingDocument) {
            toast.error("Supporting document is mandatory for liquidation as per Corporate Admin settings.");
            setErrors({ general: "Supporting document is mandatory for liquidation." });
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('liquidation_type', values.liquidationType);
            formData.append('reason', values.reason);
	        if (values.notes) {
				formData.append('notes', values.notes);
			}
            if (values.liquidationType === 'partial' && values.newAmount) {
                formData.append('new_amount', values.newAmount);
            }
            if (supportingDocument) {
                formData.append('internal_supporting_document_file', supportingDocument);
            }

            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/liquidate`, 'POST', formData);

            if (response.approval_request_id) {
                toast.info(`LG Liquidation request submitted for approval. Request ID: ${response.approval_request_id}.`);
                onSuccess(response.lg_record);
            } else {
                toast.success(`LG ${lgRecord.lg_number} liquidated successfully!`);
                onSuccess(response.lg_record, response.latest_instruction_id);
            }
        } catch (error) {
            console.error("Failed to liquidate LG:", error);
            toast.error(`Failed to liquidate LG: ${error.message || 'An unexpected error occurred.'}`);
            setErrors({ general: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition show={true} as={React.Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-4">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white border border-slate-200/80 text-left shadow-2xl transition-all my-auto w-full max-w-lg flex flex-col max-h-[90vh]">
                                {/* Sticky Header */}
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                                            <FileMinus className="h-4 w-4" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight truncate">
                                            Liquidate LG: {lgRecord.lg_number}
                                        </DialogTitle>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                <Formik
                                    initialValues={initialValues}
                                    validationSchema={LiquidateLgSchema}
                                    onSubmit={handleSubmit}
                                >
                                    {({ errors, touched, values, setFieldValue }) => (
                                        <Form className={`flex flex-col flex-1 min-h-0 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                                <p className="text-slate-600 text-xs sm:text-sm">
                                                    Choose full or partial liquidation for this LG. This action may require approval.
                                                </p>
                                                <div className="bg-blue-50/80 border border-blue-200/80 text-blue-900 p-3 rounded-xl text-xs sm:text-sm">
                                                    Current LG Amount: <strong>{Number(lgRecord.lg_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {lgRecord.lg_currency?.iso_code}</strong>
                                                </div>

                                                <div>
                                                    <label htmlFor="liquidationType" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Liquidation Type
                                                    </label>
                                                    <Field
                                                        as="select"
                                                        id="liquidationType"
                                                        name="liquidationType"
                                                        onChange={(e) => {
                                                            setLiquidationType(e.target.value);
                                                            setFieldValue('liquidationType', e.target.value);
                                                            if (e.target.value === 'full') {
                                                                setFieldValue('newAmount', '');
                                                            }
                                                        }}
                                                        className={`mt-1 block w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.liquidationType && touched.liquidationType ? 'border-rose-500' : 'border-slate-300'}`}
                                                        disabled={isGracePeriod}
                                                    >
                                                        <option value="full">Full Liquidation (Amount becomes 0)</option>
                                                        <option value="partial">Partial Liquidation (Reduce Amount)</option>
                                                    </Field>
                                                    <ErrorMessage name="liquidationType" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>

                                                {liquidationType === 'partial' && (
                                                    <div>
                                                        <label htmlFor="newAmount" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                            New LG Amount <span className="text-rose-500">*</span>
                                                        </label>
                                                        <Field
                                                            type="number"
                                                            id="newAmount"
                                                            name="newAmount"
                                                            placeholder="e.g., 50000"
                                                            className={`mt-1 block w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.newAmount && touched.newAmount ? 'border-rose-500' : 'border-slate-300'}`}
                                                            disabled={isGracePeriod}
                                                        />
                                                        <AmountInWordsHint
                                                            amount={values.newAmount}
                                                            currencyCode={lgRecord?.lg_currency?.iso_code || ''}
                                                        />
                                                        <ErrorMessage name="newAmount" component="div" className="text-rose-600 text-xs mt-1" />
                                                    </div>
                                                )}

                                                <div>
                                                    <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Reason for Liquidation <span className="text-rose-500">*</span>
                                                    </label>
                                                    <Field
                                                        as="textarea"
                                                        id="reason"
                                                        name="reason"
                                                        rows="3"
                                                        className={`mt-1 block w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.reason && touched.reason ? 'border-rose-500' : 'border-slate-300'}`}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="reason" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>

                                                {lgRecord?.mandatory_claim_statement && (
                                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/90 rounded-xl p-3.5 space-y-2 shadow-sm">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs uppercase tracking-wide">
                                                                <Sparkles className="w-4 h-4 text-amber-600" />
                                                                Mandatory Claim Condition Detected
                                                            </div>
                                                            <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                                                Required by Original LG
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-amber-900 italic bg-white/90 p-2.5 rounded-lg border border-amber-200/80 leading-relaxed font-mono text-[11.5px]">
                                                            "{lgRecord.mandatory_claim_statement}"
                                                        </p>
                                                        <div className="flex items-center justify-between text-[11px] text-amber-800">
                                                            <span>This declaration is automatically injected into the bank liquidation demand letter.</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFieldValue('notes', lgRecord.mandatory_claim_statement)}
                                                                className="font-bold text-amber-900 hover:text-amber-950 underline ml-2"
                                                            >
                                                                Reset Note to Clause
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700">
                                                            Liquidation Notes & Claim Declarations
                                                        </label>
                                                        <span className="text-[11px] text-slate-400">Printed on Bank Demand Letter</span>
                                                    </div>
                                                    <Field
                                                        as="textarea"
                                                        id="notes"
                                                        name="notes"
                                                        rows="3"
                                                        placeholder="Additional notes or mandatory statements for the bank liquidation letter..."
                                                        className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        disabled={isGracePeriod}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Supporting Document {isDocMandatory ? <span className="text-rose-500">*</span> : '(Optional)'}
                                                    </label>
                                                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                                        <input
                                                            type="file"
                                                            id="supportingDocument"
                                                            name="supportingDocument"
                                                            onChange={handleFileChange}
                                                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                            disabled={isGracePeriod}
                                                        />
                                                        {supportingDocument && (
                                                            <span className="text-xs text-slate-500 truncate">
                                                                <FileText className="inline-block h-3.5 w-3.5 mr-1" />
                                                                {supportingDocument.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-500">Attach any documents related to this request (e.g., formal request from beneficiary).</p>
                                                </div>

                                                {errors.general && (
                                                    <div className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                                                        <AlertCircle className="inline h-4 w-4 mr-1" />
                                                        {errors.general}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sticky Footer */}
                                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                                                <button
                                                    type="button"
                                                    className={`${buttonBaseClassNames} justify-center w-full sm:w-auto rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}
                                                    onClick={onClose}
                                                    disabled={isSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        type="submit"
                                                        className={`${buttonBaseClassNames} justify-center w-full sm:w-auto rounded-xl bg-rose-600 text-white hover:bg-rose-700 ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={isSubmitting || isGracePeriod}
                                                    >
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileMinus className="h-4 w-4 mr-2" />}
                                                        {isSubmitting ? 'Processing...' : 'Submit Liquidation Request'}
                                                    </button>
                                                </GracePeriodTooltip>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default LiquidateLGModal;