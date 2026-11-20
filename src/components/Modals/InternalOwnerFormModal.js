// frontend/src/components/Modals/InternalOwnerFormModal.js
import React from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, UserPlus, Edit3 } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

// A reusable component to provide a tooltip for disabled elements during the grace period.
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

const InternalOwnerFormModal = ({ owner, onClose, onSuccess, isGracePeriod }) => { // NEW: Accept isGracePeriod prop
    const isEditMode = !!owner;
    const modalTitle = isEditMode ? 'Edit Internal Owner Details' : 'Add New Internal Owner';
    const submitButtonText = isEditMode ? 'Save Changes' : 'Add Owner';
    const submitButtonIcon = isEditMode ? <Edit3 className="h-5 w-5 mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />;

    const InternalOwnerSchema = Yup.object().shape({
        email: Yup.string()
            .email('Invalid email address')
            .required('Email is required'),
        phoneNumber: Yup.string()
            .matches(/^[0-9\-\(\)\s\+]+$/, 'Invalid phone number format')
            .required('Phone Number is required'),
        internalId: Yup.string().nullable(),
        managerEmail: Yup.string()
            .email('Invalid manager email address')
            .required('Manager Email is required'),
    });

    const initialValues = {
        email: owner?.email || '',
        phoneNumber: owner?.phone_number || '',
        internalId: owner?.internal_id || '',
        managerEmail: owner?.manager_email || '',
    };

    const handleSubmit = async (values, { setSubmitting, setErrors }) => {
        if (isGracePeriod) { // NEW: Grace period check
            toast.warn("This action is disabled during your subscription's grace period.");
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                email: values.email,
                phone_number: values.phoneNumber,
                internal_id: values.internalId || null,
                manager_email: values.managerEmail,
            };

            let response;
            if (isEditMode) {
                response = await apiRequest(`/end-user/internal-owner-contacts/${owner.id}`, 'PUT', payload);
            } else {
                response = await apiRequest('/end-user/internal-owner-contacts', 'POST', payload);
            }

            if (response.approval_request_id) {
                toast.info(`Internal Owner Change Request submitted for approval. Request ID: ${response.approval_request_id}`);
            } else {
                toast.success(`Internal Owner Contact ${isEditMode ? 'updated' : 'added'} successfully!`);
            }
            onSuccess();
        } catch (error) {
            console.error('Operation failed:', error);
            toast.error(`Failed to ${isEditMode ? 'update' : 'add'} internal owner: ${error.message || 'An unexpected error occurred.'}`);
            setErrors({ general: error.message || 'An unexpected error occurred.' });
        } finally {
            setSubmitting(false);
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

                <div className="fixed inset-0 z-[100] w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white border border-slate-200 text-left shadow-2xl transition-all w-full max-w-lg flex flex-col max-h-[90vh]">
                                {/* Sticky Header */}
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                                            {isEditMode ? <Edit3 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                                        </div>
                                        <DialogTitle as="h3" className="text-base font-bold leading-6 text-slate-900">
                                            {modalTitle}
                                        </DialogTitle>
                                    </div>
                                    <button
                                        type="button"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                <Formik
                                    initialValues={initialValues}
                                    validationSchema={InternalOwnerSchema}
                                    onSubmit={handleSubmit}
                                >
                                    {({ isSubmitting, errors, touched }) => (
                                        <Form className={`flex flex-col flex-1 min-h-0 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            {/* Scrollable Body */}
                                            <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                                <div>
                                                    <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                                                        Email
                                                    </label>
                                                    <Field
                                                        type="email"
                                                        id="email"
                                                        name="email"
                                                        className={`block w-full px-3 py-2 rounded-xl border text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 ${errors.email && touched.email ? 'border-rose-500' : 'border-slate-300'}`}
                                                        disabled={isEditMode || isGracePeriod}
                                                    />
                                                    <ErrorMessage name="email" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>
                                                <div>
                                                    <label htmlFor="phoneNumber" className="block text-xs font-semibold text-slate-700 mb-1">
                                                        Phone Number
                                                    </label>
                                                    <Field
                                                        type="text"
                                                        id="phoneNumber"
                                                        name="phoneNumber"
                                                        className={`block w-full px-3 py-2 rounded-xl border text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phoneNumber && touched.phoneNumber ? 'border-rose-500' : 'border-slate-300'}`}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="phoneNumber" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>
                                                <div>
                                                    <label htmlFor="internalId" className="block text-xs font-semibold text-slate-700 mb-1">
                                                        Internal ID (Optional)
                                                    </label>
                                                    <Field
                                                        type="text"
                                                        id="internalId"
                                                        name="internalId"
                                                        className="block w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        disabled={isGracePeriod}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="managerEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                                                        Manager Email
                                                    </label>
                                                    <Field
                                                        type="email"
                                                        id="managerEmail"
                                                        name="managerEmail"
                                                        className={`block w-full px-3 py-2 rounded-xl border text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.managerEmail && touched.managerEmail ? 'border-rose-500' : 'border-slate-300'}`}
                                                        disabled={isGracePeriod}
                                                    />
                                                    <ErrorMessage name="managerEmail" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>

                                                {errors.general && (
                                                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-xl">
                                                        {errors.general}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sticky Footer inside Form */}
                                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                                                    onClick={onClose}
                                                    disabled={isSubmitting}
                                                >
                                                    Cancel
                                                </button>
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        type="submit"
                                                        className={`inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={isSubmitting || isGracePeriod}
                                                    >
                                                        {isSubmitting ? 'Processing...' : submitButtonIcon}
                                                        {isSubmitting ? 'Processing...' : submitButtonText}
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

export default InternalOwnerFormModal;