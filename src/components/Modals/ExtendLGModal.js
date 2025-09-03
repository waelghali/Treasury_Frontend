// frontend/src/components/Modals/ExtendLGModal.js
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { apiRequest } from 'services/apiService.js';
import { XCircle, Loader2, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

// Note: Removed react-datepicker imports and related code to align with LGAmendModal.js
// The component now uses a standard HTML input type="date"
// react-datepicker imports
// import DatePicker, { registerLocale } from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
// import { enGB } from 'date-fns/locale';
// registerLocale('en-GB', enGB);

// A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

// No longer needed with standard HTML input
// const CustomDateInput = React.forwardRef(({ value, onClick, onChange, placeholder, className, disabled }, ref) => (
//     <input
//         type="text"
//         className={className}
//         onClick={onClick}
//         onChange={onChange}
//         value={value}
//         placeholder={placeholder}
//         ref={ref}
//         disabled={disabled}
//     />
// ));

function ExtendLGModal({ lgRecord, onClose, onSuccess, isGracePeriod }) {
  const [extensionMethod, setExtensionMethod] = useState('date');
  const [specificNewExpiryDate, setSpecificNewExpiryDate] = useState('');
  const [extensionMonths, setExtensionMonths] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const DISPLAY_DATE_FORMAT_MOMENT = 'DD-MMM-YYYY';
  const API_DATE_FORMAT = 'YYYY-MM-DD';

  useEffect(() => {
	if (lgRecord && lgRecord.expiry_date) {
        // Set the initial date in YYYY-MM-DD format for the input field
        const proposedDate = moment(lgRecord.expiry_date).add(lgRecord.lg_period_months, 'months');
        const minValidDate = moment(lgRecord.expiry_date).add(1, 'day');
        
        const finalProposedDate = proposedDate.isAfter(minValidDate) ? proposedDate : minValidDate;
        setSpecificNewExpiryDate(finalProposedDate.format(API_DATE_FORMAT));

	  if (lgRecord.lg_period_months) {
		setExtensionMonths(lgRecord.lg_period_months);
	  }
	}
  }, [lgRecord]);

  const handleMethodChange = (e) => {
    if (isGracePeriod) return;
    setExtensionMethod(e.target.value);
    setError('');
  };

  const handleExtensionMonthsChange = (e) => {
    if (isGracePeriod) return;
    const value = e.target.value;
    if (value === '' || /^[1-9]\d*$/.test(value)) {
      setExtensionMonths(value);
    }
  };

  const formatAmount = (amount, currencySymbol) => {
    if (amount === null || currencySymbol === null || currencySymbol === undefined || isNaN(parseFloat(amount))) {
      return 'N/A';
    }
    try {
      const num = parseFloat(amount);
      const formattedNumber = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      return `${currencySymbol} ${formattedNumber}`;
    } catch (e) {
      console.error("Error formatting currency:", e);
      return `${currencySymbol} ${parseFloat(amount).toFixed(2)}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isGracePeriod) {
        toast.warn("This action is disabled during your subscription's grace period.");
        return;
    }
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    let finalNewExpiryDateMoment = null;

    if (extensionMethod === 'date') {
        const newDate = specificNewExpiryDate;
        if (!newDate) {
            setError('New Expiry Date is required.');
            setIsLoading(false);
            return;
        }
        finalNewExpiryDateMoment = moment(newDate, API_DATE_FORMAT);
    } else {
      const months = parseInt(extensionMonths, 10);
      if (isNaN(months) || months <= 0) {
        setError('Number of extension months must be a positive integer.');
        setIsLoading(false);
        return;
      }
      finalNewExpiryDateMoment = moment(lgRecord.expiry_date).add(months, 'months');
    }

    const currentExpiryDateActual = moment(lgRecord.expiry_date);
    if (finalNewExpiryDateMoment.isSameOrBefore(currentExpiryDateActual, 'day')) {
      setError('New Expiry Date must be after the current Expiry Date.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest(
        `/end-user/lg-records/${lgRecord.id}/extend`,
        'POST',
        { new_expiry_date: finalNewExpiryDateMoment.format(API_DATE_FORMAT) }
      );
      setSuccessMessage(`LG Record ${response.lg_record.lg_number} successfully extended to ${moment(response.lg_record.expiry_date).format(DISPLAY_DATE_FORMAT_MOMENT)}.`);

      onSuccess(response.lg_record, response.latest_instruction_id);
      onClose();
      
    } catch (err) {
      console.error('Failed to extend LG:', err);
      const errorMessage = err.detail || err.message || 'An unexpected error occurred.';
      setError(`Failed to extend LG. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
          title="Close"
        >
          <XCircle className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Extend Letter of Guarantee</h2>
        <p className="text-gray-600 mb-6">
          Extend the expiry date for LG Number: <span className="font-medium text-gray-900">{lgRecord.lg_number}</span>
        </p>
        <p className="text-gray-600 mb-6">
          LG Amount: <span className="font-medium text-gray-900">{formatAmount(lgRecord.lg_amount, lgRecord.lg_currency.symbol)}</span>
        </p>

        <div className="mb-4">
          <label htmlFor="currentExpiryDate" className="block text-sm font-medium text-gray-700 mb-1">
            Current Expiry Date
          </label>
          <div className="mt-1 flex items-center border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 text-gray-700">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <span>{moment(lgRecord.expiry_date).format(DISPLAY_DATE_FORMAT_MOMENT)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={isGracePeriod ? 'opacity-50' : ''}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extension Method <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600"
                  name="extensionMethod"
                  value="date"
                  checked={extensionMethod === 'date'}
                  onChange={handleMethodChange}
                  disabled={isGracePeriod}
                />
                <span className="ml-2 text-gray-700">Select Specific Date</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600"
                  name="extensionMethod"
                  value="months"
                  checked={extensionMethod === 'months'}
                  onChange={handleMethodChange}
                  disabled={isGracePeriod}
                />
                <span className="ml-2 text-gray-700">Extend by Months</span>
              </label>
            </div>
          </div>

          {extensionMethod === 'date' && (
            <div className="mb-6">
              <label htmlFor="specificNewExpiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                New Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="specificNewExpiryDate"
                name="specificNewExpiryDate"
                value={specificNewExpiryDate}
                onChange={(e) => setSpecificNewExpiryDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                min={moment(lgRecord.expiry_date).add(1, 'day').format(API_DATE_FORMAT)}
                disabled={isGracePeriod}
              />
            </div>
          )}

          {extensionMethod === 'months' && (
            <div className="mb-6">
              <label htmlFor="extensionMonths" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Months to Extend <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="extensionMonths"
                name="extensionMonths"
                value={extensionMonths}
                onChange={handleExtensionMonthsChange}
                placeholder="e.g., 3, 6, 12"
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                disabled={isGracePeriod}
              />
              {extensionMonths && parseInt(extensionMonths, 10) > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  New Expiry Date will be approximately:{' '}
                  <span className="font-medium">
                    {moment(lgRecord.expiry_date).add(parseInt(extensionMonths, 10), 'months').format(DISPLAY_DATE_FORMAT_MOMENT)}
                  </span>
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`w-full justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} sm:col-start-1`}
              disabled={isLoading}
            >
              Cancel
            </button>
            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
              <button
                type="submit"
                className={`w-full justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 flex items-center justify-center ${isLoading || isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''} sm:col-start-2`}
                disabled={isLoading || isGracePeriod}
              >
                {isLoading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                Extend LG
              </button>
            </GracePeriodTooltip>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExtendLGModal;