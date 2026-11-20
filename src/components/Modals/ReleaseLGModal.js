// frontend/src/components/Modals/ReleaseLGModal.js
import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, CheckCircle, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

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

const ReleaseLGModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [supportingDocument, setSupportingDocument] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDocMandatory, setIsDocMandatory] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await apiRequest('/end-user/customer-configurations/DOC_MANDATORY_RELEASE', 'GET');
                if (res && res.effective_value !== undefined) {
                    setIsDocMandatory(String(res.effective_value).toLowerCase() === 'true');
                }
            } catch (err) {
                console.warn('Could not fetch DOC_MANDATORY_RELEASE config, defaulting to optional.', err);
            }
        };
        fetchConfig();
    }, []);

    const initialValues = {
        reason: '',
        notes: '', // NEW: Add notes to initial values
        totalDocumentsCount: lgRecord.documents ? lgRecord.documents.length : 0,
        pendingRepliesCount: 0,
    };

    const ReleaseLgSchema = Yup.object().shape({
        reason: Yup.string().required('Reason for release is required').min(10, 'Reason must be at least 10 characters.'),
        notes: Yup.string().nullable(), // NEW: Add notes validation (optional string)
        totalDocumentsCount: Yup.number().nullable(),
        pendingRepliesCount: Yup.number().nullable(),
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
            toast.error("Supporting document is mandatory for LG Release as per Corporate Admin settings.");
            setErrors({ general: "Supporting document is mandatory for LG Release." });
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('reason', values.reason);
            if (values.notes) { // NEW: Conditionally append notes
                formData.append('notes', values.notes);
            }
            if (supportingDocument) {
                formData.append('internal_supporting_document_file', supportingDocument);
            }

            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/release`, 'POST', formData);

            if (response.approval_request_id) {
                toast.info(`LG Release request submitted for approval. Request ID: ${response.approval_request_id}.`);
                onSuccess(response.lg_record);
            } else {
                toast.success(`LG ${lgRecord.lg_number} released successfully!`);
                onSuccess(response.lg_record, response.latest_instruction_id);
            }
        } catch (error) {
            console.error("Failed to release LG:", error);
            toast.error(`Failed to release LG: ${error.message || 'An unexpected error occurred.'}`);
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
                                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                                            <CheckCircle className="h-4 w-4" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight truncate">
                                            Release LG: {lgRecord.lg_number}
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
                                    validationSchema={ReleaseLgSchema}
                                    onSubmit={handleSubmit}
                                >
                                    {({ errors, touched }) => (
                                        <Form className={`flex flex-col flex-1 min-h-0 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                                <p className="text-slate-600 text-xs sm:text-sm">
                                                    Confirm release of this LG. This action will change the LG status to "Released" and may require approval.
                                                </p>
                                                <div className="bg-blue-50/80 border border-blue-200/80 text-blue-900 p-3 rounded-xl text-xs sm:text-sm">
                                                    Current Amount: <strong>{Number(lgRecord.lg_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {lgRecord.lg_currency?.iso_code}</strong> | Status: <strong>{lgRecord.lg_status?.name}</strong>
                                                </div>
                                                <div>
                                                    <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Reason for Release
                                                    </label>
                                                    <Field
                                                        as="textarea"
                                                        id="reason"
                                                        name="reason"
                                                        rows="2"
                                                        className={`mt-1 block w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.reason && touched.reason ? 'border-rose-500' : 'border-slate-300'}`}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="reason" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>
                                                <div>
                                                    <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Additional Notes (Optional)
                                                    </label>
                                                    <Field
                                                        as="textarea"
                                                        id="notes"
                                                        name="notes"
                                                        rows="2"
                                                        className="mt-1 block w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        disabled={isGracePeriod}
                                                    />
                                                </div>
                                                <div className="border-t border-slate-200 pt-3">
                                                    <label htmlFor="supporting-document-file" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Supporting Document {isDocMandatory ? <span className="text-rose-500">*</span> : '(Optional)'}
                                                    </label>
                                                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                                        <input
                                                            id="supporting-document-file"
                                                            name="internal_supporting_document_file"
                                                            type="file"
                                                            onChange={handleFileChange}
                                                            accept=".pdf,image/*"
                                                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                            disabled={isGracePeriod || isSubmitting}
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
                                                        className={`${buttonBaseClassNames} justify-center w-full sm:w-auto rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={isSubmitting || isGracePeriod}
                                                    >
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                        {isSubmitting ? 'Processing...' : 'Submit Release Request'}
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

export default ReleaseLGModal;