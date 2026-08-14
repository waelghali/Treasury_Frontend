import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, FileText, Upload, AlertCircle, RefreshCw, Archive } from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

export default function CancelLiquidationModal({ lg, onClose, onSuccess }) {
  const [targetOutcome, setTargetOutcome] = useState('REACTIVATE'); // 'REACTIVATE' | 'RELEASE'
  const [settlementRef, setSettlementRef] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [supportFile, setSupportFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!settlementRef.trim()) {
      toast.error('Please enter a Settlement Reference number.');
      return;
    }

    setSubmitting(true);
    try {
      let supportingDocs = [];
      if (supportFile) {
        const uploadFd = new FormData();
        uploadFd.append('file', supportFile);
        const uploadRes = await apiRequest('/issuance/maintenance/upload-document', 'POST', uploadFd);
        supportingDocs = [{ uri: uploadRes.uri, file_name: uploadRes.file_name }];
      }

      await apiRequest(`/issuance/issued-lgs/${lg.id}/maintenance`, 'POST', {
        action_type: 'CANCEL_LIQUIDATION',
        action_data: {
          target_outcome: targetOutcome,
          settlement_reference: settlementRef,
          settlement_date: settlementDate,
          original_lg_returned_from_bank: false, // Default false until bank acknowledgment
          supporting_documents: supportingDocs,
        },
        notes: notes || null,
      });

      toast.success('Cancellation of Liquidation Demand submitted for Maker-Checker approval!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || 'Failed to submit liquidation cancellation request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/30 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Withdraw / Cancel Liquidation Demand</h2>
              <p className="text-xs text-amber-100 font-medium">LG Ref: {lg?.lg_ref_number || lg?.bank_lg_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-amber-100 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Informational Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              This action generates an official Bank Instruction Letter to cancel/withdraw the pending liquidation demand following a settlement with the beneficiary. This request routes through the <strong>Approval Matrix</strong>.
            </p>
          </div>

          {/* Target Post-Cancellation Outcome Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Target Guarantee Outcome *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Re-Activate */}
              <div
                onClick={() => setTargetOutcome('REACTIVATE')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  targetOutcome === 'REACTIVATE'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${targetOutcome === 'REACTIVATE' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-sm text-slate-800">Re-Activate LG</span>
                  </div>
                  {targetOutcome === 'REACTIVATE' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Beneficiary agreed to withdraw claim. LG returns to <strong>ACTIVE</strong> status; physical paper returned to beneficiary.
                </p>
              </div>

              {/* Option B: Release */}
              <div
                onClick={() => setTargetOutcome('RELEASE')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  targetOutcome === 'RELEASE'
                    ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Archive className={`w-4 h-4 ${targetOutcome === 'RELEASE' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-sm text-slate-800">Cancel & Release LG</span>
                  </div>
                  {targetOutcome === 'RELEASE' && <CheckCircle className="w-4 h-4 text-rose-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Beneficiary surrenders guarantee. LG transitions to <strong>RELEASED</strong> status, releasing credit line headroom.
                </p>
              </div>
            </div>
          </div>

          {/* Settlement Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                Settlement Reference / Agreement # *
              </label>
              <input
                type="text"
                required
                value={settlementRef}
                onChange={(e) => setSettlementRef(e.target.value)}
                placeholder="e.g. SETTLE-2026-0814"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                Settlement Date *
              </label>
              <input
                type="date"
                required
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
              Cancellation Notes & Reason
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide commercial context for withdrawing the liquidation demand..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Beneficiary Settlement Document Upload */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
              Beneficiary Settlement Agreement / Waiver Document (Optional)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSupportFile(e.target.files[0])}
                className="hidden"
                id="settlement-file-upload"
              />
              <label htmlFor="settlement-file-upload" className="cursor-pointer flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {supportFile ? supportFile.name : 'Upload Beneficiary Waiver or Settlement Agreement'}
                </span>
                <span className="text-[10px] text-slate-400">PDF or Images up to 10MB</span>
              </label>
            </div>
          </div>

          {/* Form Action Buttons */}
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
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
            >
              {submitting ? 'Submitting Request...' : 'Submit Cancellation Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
