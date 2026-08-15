// frontend/src/components/Modals/DecreaseAmountModal.js
import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, MinusCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    // ... (GracePeriodTooltip component remains the same)
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

// Helper function for formatting currency
const formatCurrency = (amount, currencyCode) => {
    if (isNaN(amount) || amount === null) return `0.00 ${currencyCode || ''}`;
    return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode || ''}`;
};


const DecreaseAmountModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [supportingDocument, setSupportingDocument] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialValues = {
        decreaseAmount: '',
        reason: '',
        notes: '',
    };

    const DecreaseAmountSchema = Yup.object().shape({
        decreaseAmount: Yup.number()
            .typeError('Amount to decrease must be a number')
            .required('Amount to decrease is required')
            .positive('Amount to decrease must be positive')
            .max(lgRecord.lg_amount - 0.01, `Amount to decrease must be less than current LG amount (${lgRecord.lg_amount})`),
        reason: Yup.string().required('Reason for amount decrease is required').min(10, 'Reason must be at least 10 characters.'),
        notes: Yup.string().nullable(),
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

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('decrease_amount', parseFloat(values.decreaseAmount));
            formData.append('reason', values.reason);
            if (values.notes) {
                formData.append('notes', values.notes);
            }
            if (supportingDocument) {
                formData.append('internal_supporting_document_file', supportingDocument);
            }

            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/decrease-amount`, 'POST', formData);

            if (response.approval_request_id) {
                toast.info(`LG Decrease Amount request submitted for approval. Request ID: ${response.approval_request_id}.`);
                onSuccess(response.lg_record);
            } else {
                toast.success(`LG ${lgRecord.lg_number} amount decreased successfully!`);
                onSuccess(response.lg_record, response.latest_instruction_id);
            }
        } catch (error) {
            console.error("Failed to decrease LG amount:", error);
            toast.error(`Failed to decrease LG amount: ${error.message || 'An unexpected error occurred.'}`);
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
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-0">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all my-auto sm:my-8 w-full max-w-lg mx-2 sm:mx-auto p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
                                <div className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10">
                                    <button
                                        type="button"
                                        className="rounded-full p-1 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="w-full">
                                    <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900 tracking-tight border-b pb-3 mb-4 pr-8">
                                        Decrease LG Amount: {lgRecord.lg_number}
                                    </DialogTitle>
                                    <div className="mt-2">
                                        <p className="text-gray-600 mb-4 text-xs sm:text-sm">
                                            Reduce the amount of this LG. This action may require approval.
                                        </p>
                                        <Formik
                                            initialValues={initialValues}
                                            validationSchema={DecreaseAmountSchema}
                                            onSubmit={handleSubmit}
                                        >
                                            {({ errors, touched, values }) => {
                                                const currentAmount = parseFloat(lgRecord.lg_amount) || 0;
                                                const decreaseAmount = parseFloat(values.decreaseAmount) || 0;
                                                const newAmount = currentAmount - decreaseAmount;
                                                const currencyCode = lgRecord.lg_currency?.iso_code;

                                                return (
                                                    <Form className={classNames('space-y-4', isGracePeriod ? 'opacity-50' : '')}>
                                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-xs sm:text-sm">
                                                            Current LG Amount: <strong>{currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyCode}</strong>
                                                        </div>

                                                        <div>
                                                            <label htmlFor="decreaseAmount" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                Amount to Decrease ({currencyCode}) <span className="text-red-500">*</span>
                                                            </label>
                                                            <Field
                                                                type="number"
                                                                id="decreaseAmount"
                                                                name="decreaseAmount"
                                                                step="0.01"
                                                                min="0.01"
                                                                placeholder="Enter amount to reduce by..."
                                                                className={classNames(
                                                                    'mt-1 block w-full px-3 py-2 text-sm rounded-lg border shadow-sm focus:outline-none',
                                                                    errors.decreaseAmount && touched.decreaseAmount ? 'border-red-500' : 'border-gray-300'
                                                                )}
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
                                                            <ErrorMessage name="decreaseAmount" component="div" className="text-red-600 text-xs mt-1" />

                                                            {decreaseAmount > 0 && decreaseAmount < currentAmount && (
                                                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                                                    New remaining amount will be: <strong className="text-sm font-bold">{newAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyCode}</strong>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                Reason for Decrease <span className="text-red-500">*</span>
                                                            </label>
                                                            <Field
                                                                as="textarea"
                                                                id="reason"
                                                                name="reason"
                                                                rows="2"
                                                                placeholder="Explain why the LG amount is being reduced..."
                                                                className={classNames(
                                                                    'mt-1 block w-full px-3 py-2 text-sm rounded-lg border shadow-sm focus:outline-none',
                                                                    errors.reason && touched.reason ? 'border-red-500' : 'border-gray-300'
                                                                )}
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
                                                            <ErrorMessage name="reason" component="div" className="text-red-600 text-xs mt-1" />
                                                        </div>

                                                        <div>
                                                            <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                Additional Notes (Optional)
                                                            </label>
                                                            <Field
                                                                as="textarea"
                                                                id="notes"
                                                                name="notes"
                                                                rows="2"
                                                                className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm"
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
                                                        </div>

                                                        <div className="border-t pt-3">
                                                            <label htmlFor="supporting-document-file" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                                                Supporting Document (Optional)
                                                            </label>
                                                            <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                                                <input
                                                                    id="supporting-document-file"
                                                                    name="internal_supporting_document_file"
                                                                    type="file"
                                                                    onChange={handleFileChange}
                                                                    accept=".pdf,image/*"
                                                                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                                    disabled={isGracePeriod || isSubmitting}
                                                                />
                                                                {supportingDocument && (
                                                                    <span className="text-xs text-gray-500 truncate">
                                                                        <FileText className="inline-block h-3.5 w-3.5 mr-1" />
                                                                        {supportingDocument.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 text-xs text-gray-500">Attach any documents related to this request (e.g., formal request from beneficiary).</p>
                                                        </div>

                                                        {errors.general && (
                                                            <div className="text-red-600 text-xs mt-2">
                                                                <AlertCircle className="inline h-4 w-4 mr-1" />
                                                                {errors.general}
                                                            </div>
                                                        )}

                                                        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2 border-t border-gray-100">
                                                            <button
                                                                type="button"
                                                                className={classNames(buttonBaseClassNames, 'justify-center w-full sm:w-auto bg-gray-100 text-gray-700 hover:bg-gray-200 py-2.5')}
                                                                onClick={onClose}
                                                                disabled={isSubmitting}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                                <button
                                                                    type="submit"
                                                                    className={classNames(buttonBaseClassNames, 'justify-center w-full sm:w-auto bg-orange-600 text-white hover:bg-orange-700 font-bold py-2.5 shadow-md', isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : '')}
                                                                    disabled={isSubmitting || isGracePeriod}
                                                                >
                                                                    {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <MinusCircle className="h-5 w-5 mr-2" />}
                                                                    {isSubmitting ? 'Processing...' : 'Submit Decrease Request'}
                                                                </button>
                                                            </GracePeriodTooltip>
                                                        </div>
                                                    </Form>
                                                );
                                            }}
                                        </Formik>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default DecreaseAmountModal;