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

const DecreaseAmountModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [supportingDocument, setSupportingDocument] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialValues = {
        decreaseAmount: '',
        reason: '',
    };

    const DecreaseAmountSchema = Yup.object().shape({
        decreaseAmount: Yup.number()
            .typeError('Amount to decrease must be a number')
            .required('Amount to decrease is required')
            .positive('Amount to decrease must be positive')
            .max(lgRecord.lg_amount - 0.01, `Amount to decrease must be less than current LG amount (${lgRecord.lg_amount})`),
        reason: Yup.string().required('Reason for amount decrease is required').min(10, 'Reason must be at least 10 characters.'),
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
            <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                        <DialogTitle as="h3" className="text-xl font-semibold leading-6 text-gray-900 border-b pb-3 mb-4">
                                            Decrease LG Amount: {lgRecord.lg_number}
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-gray-600 mb-4">
                                                Reduce the amount of this LG. This action may require approval.
                                            </p>
                                            <Formik
                                                initialValues={initialValues}
                                                validationSchema={DecreaseAmountSchema}
                                                onSubmit={handleSubmit}
                                            >
                                                {({ errors, touched }) => (
                                                    <Form className={`space-y-4`}>
                                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm">
                                                            Current LG Amount: <strong>{lgRecord.lg_amount} {lgRecord.lg_currency?.iso_code}</strong> | Status: <strong>{lgRecord.lg_status?.name}</strong>
                                                        </div>

                                                        <div>
                                                            <label htmlFor="decreaseAmount" className="block text-sm font-medium text-gray-700">
                                                                Amount to Decrease ({lgRecord.lg_currency?.iso_code})
                                                            </label>
                                                            <Field
                                                                type="number"
                                                                id="decreaseAmount"
                                                                name="decreaseAmount"
                                                                step="0.01"
                                                                className={`mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 ${errors.decreaseAmount && touched.decreaseAmount ? 'border-red-500' : 'border-gray-300'}`}
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
                                                            <ErrorMessage name="decreaseAmount" component="div" className="text-red-600 text-xs mt-1" />
                                                        </div>

                                                        <div>
                                                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                                                                Reason for Amount Decrease
                                                            </label>
                                                            <Field
                                                                as="textarea"
                                                                id="reason"
                                                                name="reason"
                                                                rows="3"
                                                                className={`mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 ${errors.reason && touched.reason ? 'border-red-500' : 'border-gray-300'}`}
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
                                                            <ErrorMessage name="reason" component="div" className="text-red-600 text-xs mt-1" />
                                                        </div>

                                                        {/* NEW: Optional supporting document upload */}
                                                        <div className="border-t pt-4">
                                                            <label htmlFor="supporting-document-file" className="block text-sm font-medium text-gray-700">
                                                                Optional Supporting Document
                                                            </label>
                                                            <div className="mt-1 flex items-center">
                                                                <input
                                                                    id="supporting-document-file"
                                                                    name="internal_supporting_document_file"
                                                                    type="file"
                                                                    onChange={handleFileChange}
                                                                    accept=".pdf,image/*"
                                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                                    disabled={isGracePeriod || isSubmitting}
                                                                />
                                                                {supportingDocument && (
                                                                    <span className="ml-3 text-sm text-gray-500">
                                                                        <FileText className="inline-block h-4 w-4 mr-1" />
                                                                        {supportingDocument.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-2 text-sm text-gray-500">Attach any documents related to this request (e.g., formal request from beneficiary).</p>
                                                        </div>

                                                        {errors.general && (
                                                            <div className="text-red-600 text-sm mt-2">
                                                                <AlertCircle className="inline h-4 w-4 mr-1" />
                                                                {errors.general}
                                                            </div>
                                                        )}

                                                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                                <button
                                                                    type="submit"
                                                                    className={`${buttonBaseClassNames} sm:col-start-2 bg-orange-600 text-white hover:bg-orange-700 ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                    disabled={isSubmitting || isGracePeriod}
                                                                >
                                                                    {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <MinusCircle className="h-5 w-5 mr-2" />}
                                                                    {isSubmitting ? 'Processing...' : 'Submit Decrease Request'}
                                                                </button>
                                                            </GracePeriodTooltip>
                                                            <button
                                                                type="button"
                                                                className={`${buttonBaseClassNames} sm:col-start-1 bg-gray-200 text-gray-700 hover:bg-gray-300`}
                                                                onClick={onClose}
                                                                disabled={isSubmitting}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </Form>
                                                )}
                                            </Formik>
                                        </div>
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

export default DecreaseAmountModal;