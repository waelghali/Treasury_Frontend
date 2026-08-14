import React, { useState, useEffect } from 'react';
import { X, DollarSign, Building2, Calendar, FileText, CheckCircle } from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

export default function RecordLiquidationFundsModal({ lg, onClose, onSuccess }) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [valueDate, setValueDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionRef, setTransactionRef] = useState('');
  const [liquidatedAmount, setLiquidatedAmount] = useState(lg?.current_amount || lg?.bank_lg_amount || '');
  const [bankCharges, setBankCharges] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await apiRequest('/issuance/bank-accounts', 'GET');
        setBankAccounts(data || []);
        if (data && data.length > 0) {
          setBankAccountId(String(data[0].id));
        }
      } catch (err) { /* silent */ }
    };
    fetchAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bankAccountId) {
      toast.error('Please select a target Bank Account.');
      return;
    }
    if (!transactionRef.trim()) {
      toast.error('Please enter the Swift / Transaction reference.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/issuance/issued-lgs/${lg.id}/record-liquidation-funds`, 'POST', {
        bank_account_id: parseInt(bankAccountId, 10),
        value_date: valueDate,
        transaction_ref: transactionRef,
        liquidated_amount: parseFloat(liquidatedAmount),
        bank_charges: parseFloat(bankCharges) || 0,
        notes: notes || null,
      });

      toast.success('Completed liquidation fund receipt details recorded successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || 'Failed to record liquidation funds.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/40 rounded-xl">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Record Liquidation Fund Receipt</h2>
              <p className="text-xs text-emerald-100 font-medium">LG Ref: {lg?.lg_ref_number || lg?.bank_lg_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
              Credited / Debited Bank Account *
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              required
            >
              <option value="">Select Bank Account...</option>
              {bankAccounts.map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.account_name} — {acct.account_number} ({acct.bank?.name || 'Bank'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Value Date *
              </label>
              <input
                type="date"
                required
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Swift / Txn Reference *
              </label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. SWIFT-2026-9901"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Liquidated Amount ({lg?.currency_code || 'USD'}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={liquidatedAmount}
                onChange={(e) => setLiquidatedAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Bank Deducted Fees / Charges
              </label>
              <input
                type="number"
                step="0.01"
                value={bankCharges}
                onChange={(e) => setBankCharges(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
              Treasury / Voucher Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Accounting voucher reference or notes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-lg shadow-emerald-700/20 transition-all flex items-center gap-2"
            >
              {submitting ? 'Saving Funds Data...' : 'Save Fund Receipt Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
