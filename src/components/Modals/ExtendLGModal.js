// frontend/src/components/Modals/ExtendLGModal.js
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

// Reusable component for tooltip during grace period, as seen in the first modal
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
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
                            <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
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
                                            Extend Letter of Guarantee: {lgRecord.lg_number}
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-gray-600 mb-4">
                                                Extend the expiry date for this LG.
                                            </p>
                                            <Formik
                                                initialValues={initialValues}
                                                validationSchema={ExtensionSchema}
                                                onSubmit={handleSubmit}
                                                enableReinitialize={true} 
                                            >
                                                {({ errors, touched, values }) => (
                                                    <Form className={`space-y-4 ${isGracePeriod ? 'opacity-50' : ''}`}>
                                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm">
                                                            Current Expiry Date: <strong>{moment(lgRecord.expiry_date).format(DISPLAY_DATE_FORMAT_MOMENT)}</strong> | Current LG Amount: <strong>{Number(lgRecord.lg_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {lgRecord.lg_currency?.iso_code}</strong>
                                                        </div>

                                                        <div className="mb-6">
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Extension Method <span className="text-red-500">*</span>
                                                            </label>
                                                            <div className="flex items-center space-x-4">
                                                                <label className="inline-flex items-center">
                                                                    <Field
                                                                        type="radio"
                                                                        className="form-radio text-blue-600"
                                                                        name="extensionMethod"
                                                                        value="date"
                                                                        disabled={isGracePeriod || isSubmitting}
                                                                    />
                                                                    <span className="ml-2 text-gray-700">Select Specific Date</span>
                                                                </label>
                                                                <label className="inline-flex items-center">
                                                                    <Field
                                                                        type="radio"
                                                                        className="form-radio text-blue-600"
                                                                        name="extensionMethod"
                                                                        value="months"
                                                                        disabled={isGracePeriod || isSubmitting}
                                                                    />
                                                                    <span className="ml-2 text-gray-700">Extend by Months</span>
                                                                </label>
                                                            </div>
                                                            <ErrorMessage name="extensionMethod" component="div" className="text-red-600 text-xs mt-1" />
                                                        </div>

                                                        {values.extensionMethod === 'date' && (
                                                            <div className="mb-6">
                                                                <label htmlFor="specificNewExpiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                                                                    New Expiry Date <span className="text-red-500">*</span>
                                                                </label>
                                                                <Field
                                                                    type="date"
                                                                    id="specificNewExpiryDate"
                                                                    name="specificNewExpiryDate"
                                                                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${errors.specificNewExpiryDate && touched.specificNewExpiryDate ? 'border-red-500' : 'border-gray-300'}`}
                                                                    min={moment(lgRecord.expiry_date).add(1, 'day').format(API_DATE_FORMAT)}
                                                                    disabled={isGracePeriod || isSubmitting}
                                                                />
                                                                <ErrorMessage name="specificNewExpiryDate" component="div" className="text-red-600 text-xs mt-1" />
                                                            </div>
                                                        )}

                                                        {values.extensionMethod === 'months' && (
                                                            <div className="mb-6">
                                                                <label htmlFor="extensionMonths" className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Number of Months to Extend <span className="text-red-500">*</span>
                                                                </label>
                                                                <Field
                                                                    type="number"
                                                                    id="extensionMonths"
                                                                    name="extensionMonths"
                                                                    placeholder="e.g., 3, 6, 12"
                                                                    min="1"
                                                                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${errors.extensionMonths && touched.extensionMonths ? 'border-red-500' : 'border-gray-300'}`}
                                                                    disabled={isGracePeriod || isSubmitting}
                                                                />
                                                                <ErrorMessage name="extensionMonths" component="div" className="text-red-600 text-xs mt-1" />
                                                                {values.extensionMonths && parseInt(values.extensionMonths, 10) > 0 && (
                                                                    <p className="mt-2 text-sm text-gray-500">
                                                                        New Expiry Date will be approximately:{' '}
                                                                        <span className="font-medium">
                                                                            {moment(lgRecord.expiry_date).add(parseInt(values.extensionMonths, 10), 'months').format(DISPLAY_DATE_FORMAT_MOMENT)}
                                                                        </span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="mb-6">
                                                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                                                                Additional Notes (Optional)
                                                            </label>
                                                            <Field
                                                                as="textarea"
                                                                id="notes"
                                                                name="notes"
                                                                rows="3"
                                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                disabled={isGracePeriod || isSubmitting}
                                                            />
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
                                                                    className={`${buttonBaseClassNames} sm:col-start-2 bg-blue-600 text-white hover:bg-blue-700 ${isSubmitting || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                    disabled={isSubmitting || isGracePeriod}
                                                                >
                                                                    {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Calendar className="h-5 w-5 mr-2" />}
                                                                    {isSubmitting ? 'Processing...' : 'Extend LG'}
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

export default ExtendLGModal;