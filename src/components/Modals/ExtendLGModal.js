// frontend/src/components/Modals/ExtendLGModal.js
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import FormattedDateInput from 'components/FormattedDateInput';

// Reusable component for tooltip during grace period, as seen in the first modal
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-xl py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const DISPLAY_DATE_FORMAT_MOMENT = 'DD-MMM-YYYY';
const API_DATE_FORMAT = 'YYYY-MM-DD';

const ExtendLGModal = ({ lgRecord, onClose, onSuccess, isGracePeriod }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialValues, setInitialValues] = useState({
        extensionMethod: 'date',
        specificNewExpiryDate: '',
        extensionMonths: '', 
        notes: '',
    });

    const ExtensionSchema = Yup.object().shape({
        extensionMethod: Yup.string().oneOf(['date', 'months']).required('Extension method is required.'),
        specificNewExpiryDate: Yup.string().when('extensionMethod', {
            is: 'date',
            then: (schema) => schema
                .required('New Expiry Date is required.')
                .test('is-after-current', 'New Expiry Date must be after the current one.', (value) => {
                    const currentExpiry = moment(lgRecord.expiry_date);
                    return moment(value, API_DATE_FORMAT).isAfter(currentExpiry, 'day');
                }),
            otherwise: (schema) => schema.nullable(),
        }),
        extensionMonths: Yup.number().when('extensionMethod', {
            is: 'months',
            then: (schema) => schema
                .typeError('Number of months must be a number.')
                .required('Number of months is required.')
                .positive('Number of months must be a positive integer.'),
            otherwise: (schema) => schema.nullable(),
        }),
        notes: Yup.string().nullable(),
    });

    useEffect(() => {
        if (lgRecord) {
            // Use lgRecord.lg_period_months to calculate the proposed date.
            // Default to a sensible value like 12 if not available.
            const monthsToExtend = lgRecord.lg_period_months || 12;
            const proposedDate = moment(lgRecord.expiry_date).add(monthsToExtend, 'months');
            const newExpiryDate = proposedDate.format(API_DATE_FORMAT);

            setInitialValues(prevValues => ({
                ...prevValues,
                specificNewExpiryDate: newExpiryDate,
                extensionMonths: lgRecord.lg_period_months ? lgRecord.lg_period_months.toString() : '12'
            }));
        }
    }, [lgRecord]);

    const handleSubmit = async (values, { setErrors }) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }

        setIsSubmitting(true);

        let finalNewExpiryDateMoment = null;

        if (values.extensionMethod === 'date') {
            finalNewExpiryDateMoment = moment(values.specificNewExpiryDate, API_DATE_FORMAT);
        } else {
            const months = parseInt(values.extensionMonths, 10);
            finalNewExpiryDateMoment = moment(lgRecord.expiry_date).add(months, 'months');
        }

        try {
            const payload = {
                new_expiry_date: finalNewExpiryDateMoment.format(API_DATE_FORMAT),
                notes: values.notes || null,
            };

            const response = await apiRequest(`/end-user/lg-records/${lgRecord.id}/extend`, 'POST', payload);

            toast.success(`LG Record ${response.lg_record.lg_number} successfully extended to ${moment(response.lg_record.expiry_date).format(DISPLAY_DATE_FORMAT_MOMENT)}.`);
            onSuccess(response.lg_record, response.latest_instruction_id);
            onClose();

        } catch (error) {
            console.error('Failed to extend LG:', error);
            const errorMessage = error.message || 'An unexpected error occurred.';
            toast.error(`Failed to extend LG: ${errorMessage}`);
            setErrors({ general: errorMessage });
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
                                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight truncate">
                                            Extend Letter of Guarantee: {lgRecord.lg_number}
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
                                    validationSchema={ExtensionSchema}
                                    onSubmit={handleSubmit}
                                    enableReinitialize={true} 
                                >
                                    {({ errors, touched, values }) => (
                                        <Form className={`flex flex-col flex-1 min-h-0 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                            <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
                                                <p className="text-xs sm:text-sm text-slate-600">
                                                    Extend the expiry date for this LG.
                                                </p>
                                                <div className="bg-blue-50/80 border border-blue-200/80 text-blue-900 p-3 rounded-xl text-xs sm:text-sm">
                                                    Current Expiry: <strong>{moment(lgRecord.expiry_date).format(DISPLAY_DATE_FORMAT_MOMENT)}</strong> | Amount: <strong>{Number(lgRecord.lg_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {lgRecord.lg_currency?.iso_code}</strong>
                                                </div>

                                                <div>
                                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                                                        Extension Method <span className="text-rose-500">*</span>
                                                    </label>
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <label className="inline-flex items-center text-xs sm:text-sm cursor-pointer">
                                                            <Field
                                                                type="radio"
                                                                className="form-radio text-indigo-600 focus:ring-indigo-500"
                                                                name="extensionMethod"
                                                                value="date"
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
                                                            <span className="ml-2 text-slate-700">Select Specific Date</span>
                                                        </label>
                                                        <label className="inline-flex items-center text-xs sm:text-sm cursor-pointer">
                                                            <Field
                                                                type="radio"
                                                                className="form-radio text-indigo-600 focus:ring-indigo-500"
                                                                name="extensionMethod"
                                                                value="months"
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
                                                            <span className="ml-2 text-slate-700">Extend by Months</span>
                                                        </label>
                                                    </div>
                                                    <ErrorMessage name="extensionMethod" component="div" className="text-rose-600 text-xs mt-1" />
                                                </div>

                                                {values.extensionMethod === 'date' && (
                                                    <div>
                                                        <label htmlFor="specificNewExpiryDate" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                            New Expiry Date <span className="text-rose-500">*</span>
                                                        </label>
                                                        <Field
                                                            component={FormattedDateInput}
                                                            id="specificNewExpiryDate"
                                                            name="specificNewExpiryDate"
                                                            className={`mt-1 block w-full px-3 py-2 text-sm border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.specificNewExpiryDate && touched.specificNewExpiryDate ? 'border-rose-500' : 'border-slate-300'}`}
                                                            min={moment(lgRecord.expiry_date).add(1, 'day').format(API_DATE_FORMAT)}
                                                            disabled={isGracePeriod || isSubmitting}
                                                        />
                                                        <ErrorMessage name="specificNewExpiryDate" component="div" className="text-rose-600 text-xs mt-1" />
                                                    </div>
                                                )}

                                                {values.extensionMethod === 'months' && (
                                                    <div>
                                                        <label htmlFor="extensionMonths" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                            Number of Months to Extend <span className="text-rose-500">*</span>
                                                        </label>
                                                        <Field
                                                            type="number"
                                                            id="extensionMonths"
                                                            name="extensionMonths"
                                                            placeholder="e.g., 3, 6, 12"
                                                            min="1"
                                                            className={`mt-1 block w-full px-3 py-2 text-sm border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.extensionMonths && touched.extensionMonths ? 'border-rose-500' : 'border-slate-300'}`}
                                                            disabled={isGracePeriod || isSubmitting}
                                                        />
                                                        <ErrorMessage name="extensionMonths" component="div" className="text-rose-600 text-xs mt-1" />
                                                        {values.extensionMonths && parseInt(values.extensionMonths, 10) > 0 && (
                                                            <p className="mt-1.5 text-xs text-slate-500">
                                                                New Expiry Date: <span className="font-semibold text-slate-800">{moment(lgRecord.expiry_date).add(parseInt(values.extensionMonths, 10), 'months').format(DISPLAY_DATE_FORMAT_MOMENT)}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                <div>
                                                    <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                                        Additional Notes (Optional)
                                                    </label>
                                                    <Field
                                                        as="textarea"
                                                        id="notes"
                                                        name="notes"
                                                        rows="3"
                                                        className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        disabled={isGracePeriod || isSubmitting}
                                                    />
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
                                                        className={`${buttonBaseClassNames} justify-center w-full sm:w-auto rounded-xl bg-blue-600 text-white hover:bg-blue-700 ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={isSubmitting || isGracePeriod}
                                                    >
                                                        {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                                                        {isSubmitting ? 'Processing...' : 'Extend LG'}
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

export default ExtendLGModal;