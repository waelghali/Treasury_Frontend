import React, { useState, useEffect } from 'react';
import { Plus, Send, FileText, CheckCircle2, Clock, Landmark, DollarSign, Copy, ExternalLink, Mail } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import ResultsView from './ResultsView';

export default function QuotationRequestDashboard() {
    const [banks, setBanks] = useState([]);
    const [selectedBanks, setSelectedBanks] = useState([]);
    const [formData, setFormData] = useState({
        type: 'FX_SPOT',
        direction: 'Buy',
        valueDate: '',
        amount: '',
        minTicketAmount: '',
        buyCurrency: 'USD',
        sellCurrency: 'EGP',
        settlementDateStart: '',
        settlementDateEnd: '',
        maturityDateStart: '',
        maturityDateEnd: '',
        evalRate: '',
        windowStart: '',
        windowDuration: '60',
        quotationBase: 'Execution',
        maxTolerancePercent: '0.5',
        tokenValidityHours: '24',
    });
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdRfq, setCreatedRfq] = useState(null);

    useEffect(() => {
        // Fetch banks configured for this customer, dynamically filtering by the currently selected trade type (FX_SPOT or TBILL)
        apiClient.get(`/end-user/quotations/banks?trade_type=${formData.type}`)
            .then(res => setBanks(res.data))
            .catch(err => console.error("Error fetching banks", err));

        // Clear previously selected banks when the trade type changes so we don't accidentally send TBILL banks to an FX RFQ
        setSelectedBanks([]);
    }, [formData.type]);

    const handleBankToggle = async (bank) => {
        if (selectedBanks.find(b => b.id === bank.bank_id)) { // Adjusted ID tracking
            setSelectedBanks(selectedBanks.filter(b => b.id !== bank.bank_id));
        } else {
            const base = formData.quotationBase || 'Execution';
            let fetchedCosts = { costMin: 0, costPercent: 0, costMax: 0, costFlat: 0, quotationBase: base };
            try {
                const res = await apiClient.get(`/end-user/quotations/banks/latest-costs?bank_id=${bank.bank_id}`);
                if (res.data) {
                    fetchedCosts = {
                        costMin: res.data.cost_min ?? 0,
                        costPercent: res.data.cost_percent ?? 0,
                        costMax: res.data.cost_max ?? 0,
                        costFlat: res.data.cost_flat ?? 0,
                        quotationBase: res.data.quotation_base || base
                    };
                }
            } catch (err) {
                console.warn('Could not fetch latest bank costs:', err);
            }

            const activeBase = fetchedCosts.quotationBase || base;
            setSelectedBanks([
                ...selectedBanks, 
                { 
                    id: bank.bank_id, 
                    name: bank.bank?.name || `Bank ${bank.bank_id}`, 
                    emails: bank.emails, 
                    costMin: fetchedCosts.costMin, 
                    costPercent: fetchedCosts.costPercent, 
                    costMax: fetchedCosts.costMax, 
                    costFlat: fetchedCosts.costFlat,
                    quotationBase: activeBase,
                    isDocumentVisible: activeBase === 'Execution'
                }
            ]);
        }
    };

    const updateBankCost = (bankId, field, value) => {
        setSelectedBanks(selectedBanks.map(b => {
            if (b.id !== bankId) return b;
            if (field === 'quotationBase') {
                return {
                    ...b,
                    quotationBase: value,
                    isDocumentVisible: value === 'Execution'
                };
            }
            return { ...b, [field]: value };
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (selectedBanks.length === 1) {
            if (!window.confirm("You have only selected 1 bank. It is recommended to select multiple banks for competitive pricing. Do you want to proceed?")) {
                setIsSubmitting(false);
                return;
            }
        }

        const windowStart = new Date(formData.windowStart);
        const windowEnd = new Date(windowStart.getTime() + parseInt(formData.windowDuration) * 1000);

        // Time Safety Check: If closing_time is less than 30 mins from now
        const now = new Date();
        const diffMins = Math.round((windowEnd - now) / 60000);
        if (diffMins < 30) {
            const msg = diffMins < 0
                ? "This quotation's window is already in the past. Are you sure you want to proceed?"
                : `This quotation has only ${diffMins} minutes remaining before it closes. Are you sure you want to proceed?`;
            if (!window.confirm(msg)) {
                setIsSubmitting(false);
                return;
            }
        }

        let uploadedDocs = [];
        if (files && files.length > 0) {
            try {
                const uploadData = new FormData();
                files.forEach(f => uploadData.append('files', f));
                const uploadRes = await apiClient.post('/end-user/quotations/upload-documents', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data && uploadRes.data.documents) {
                    uploadedDocs = uploadRes.data.documents;
                }
            } catch (uploadErr) {
                console.error('Document upload failed:', uploadErr);
                alert('Warning: Failed to upload attached documents.');
            }
        }

        // Prepare JSON payload according to backend schema
        const payload = {
            type: formData.type,
            direction: formData.direction || null,
            valueDate: formData.valueDate || null,
            amount: formData.amount ? parseFloat(formData.amount) : null,
            minTicketAmount: formData.minTicketAmount ? parseFloat(formData.minTicketAmount) : null,
            buyCurrency: formData.buyCurrency || null,
            sellCurrency: formData.sellCurrency || null,
            settlementDateStart: formData.settlementDateStart || null,
            settlementDateEnd: formData.settlementDateEnd || null,
            maturityDateStart: formData.maturityDateStart || null,
            maturityDateEnd: formData.maturityDateEnd || null,
            evalRate: formData.evalRate ? parseFloat(formData.evalRate) : null,
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            quotationBase: formData.quotationBase || null,
            maxTolerancePercent: formData.maxTolerancePercent ? parseFloat(formData.maxTolerancePercent) : null,
            documentPath: uploadedDocs.length > 0 ? JSON.stringify(uploadedDocs) : null,
            selectedBanks: JSON.stringify(selectedBanks),
            token_validity_hours: parseInt(formData.tokenValidityHours)
        };

        try {
            const res = await apiClient.post('/end-user/quotations/', payload);
            console.log('RFQ Created:', res.data);
            setCreatedRfq(res.data);
        } catch (err) {
            console.error('RFQ Submission Error:', err);
            window.alert(`Error: ${err.message || 'Submission failed'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (createdRfq) {
        return (
            <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div
                        className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-xl border border-gray-100 h-fit transition-all duration-500 ease-out transform translate-y-0 opacity-100"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-semibold">RFQ Active</h2>
                        </div>
                        <div className="mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reference Number</label>
                            <p className="text-base sm:text-lg font-mono font-bold text-black break-all">{createdRfq.ref_no || 'Generating...'}</p>
                        </div>
                        <p className="text-gray-600 mb-8 text-sm">
                            Secure tokens generated for {selectedBanks.length} banks. Monitoring submissions in real-time.
                        </p>
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                            {createdRfq.assignments?.map((a) => {
                                const bank = selectedBanks.find(b => b.id === a.bankId);
                                // Adjusting link to point to the public portal segment
                                const publicRoute = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;
                                const link = `${publicRoute}/public-quotation/${a.token}`;
                                return (
                                    <div key={a.token} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                            <span className="font-medium text-sm text-gray-800">{bank?.name || `Bank ${a.bankId}`}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <input
                                                readOnly
                                                value={link}
                                                className="flex-1 min-w-[150px] bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] sm:text-xs font-mono text-gray-400"
                                            />
                                            <button
                                                onClick={() => window.open(link, '_blank')}
                                                title="Open Link"
                                                className="p-2 sm:px-3 sm:py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(link);
                                                    window.alert('Link copied to clipboard');
                                                }}
                                                title="Copy Link"
                                                className="p-2 sm:px-3 sm:py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors shrink-0"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const startTime = new Date(formData.windowStart).toLocaleString();
                                                    const duration = formData.windowDuration;
                                                    const refNo = createdRfq.ref_no || '';
                                                    const isTBill = formData.type === 'TBILL';
                                                    const subject = encodeURIComponent(isTBill
                                                        ? `T-Bill RFQ: ${refNo} - ${formData.direction} - Min Ticket: ${formData.minTicketAmount}`
                                                        : `RFQ: ${refNo} - ${formData.buyCurrency}/${formData.sellCurrency} - ${formData.amount}`
                                                    );
                                                    const body = encodeURIComponent(isTBill
                                                        ? `Dear FX/Treasury Desk,\n\nWe are requesting a T-Bill quote for the following:\n\nREFERENCE: ${refNo}\n- Direction: ${formData.direction}\n- Min Ticket Amount: ${formData.minTicketAmount}\n- Settlement: ${formData.settlementDateStart}${formData.settlementDateEnd ? ` to ${formData.settlementDateEnd}` : ''}\n- Maturity: ${formData.maturityDateStart}${formData.maturityDateEnd ? ` to ${formData.maturityDateEnd}` : ''}\n\nQUOTATION WINDOW:\n- Starts at: ${startTime}\n- Duration: ${duration} seconds\n\nPlease provide your quote via our secure portal:\n${link}\n\nBest regards,\nTreasury Team`
                                                        : `Dear FX Desk,\n\nWe are requesting a price for the following transaction:\n\nREFERENCE: ${refNo}\n- Pair: ${formData.buyCurrency}/${formData.sellCurrency}\n- Amount to Buy: ${formData.amount}\n- Value Date: ${formData.valueDate}\n- Type: ${formData.quotationBase}\n\nQUOTATION WINDOW:\n- Starts at: ${startTime}\n- Duration: ${duration} seconds\n\nPlease provide your best quote via our secure portal:\n${link}\n\nBest regards,\nTreasury Team`
                                                    );
                                                    const mailtoUrl = `mailto:${bank?.emails}?subject=${subject}&body=${body}`;

                                                    window.open(mailtoUrl, '_blank');
                                                }}
                                                title="Send Email"
                                                className="p-2 sm:px-3 sm:py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
                                            >
                                                <Mail size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCreatedRfq(null)}
                            className="mt-8 w-full py-3 sm:py-4 border-2 border-black rounded-2xl font-medium hover:bg-black hover:text-white transition-all text-sm"
                        >
                            Create New RFQ
                        </button>
                    </div>

                    <div className="lg:col-span-2">
                        <ResultsView rfqId={createdRfq.rfq_id} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8">
            <header className="mb-8 sm:mb-12">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Quotation Request</h1>
                <div className="flex flex-wrap gap-2 sm:gap-4 mt-6">
                    {['FX_SPOT', 'TBILL'].map(type => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: type })}
                            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border-2 flex-grow sm:flex-grow-0 ${formData.type === type
                                ? 'bg-black border-black text-white'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                }`}
                        >
                            {type === 'FX_SPOT' ? 'FX Spot' : 'Treasury Bills (T-Bills)'}
                        </button>
                    ))}
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: RFQ Details */}
                <div className="xl:col-span-1 space-y-6">
                    <section className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2">
                            <FileText size={14} /> {formData.type === 'TBILL' ? 'T-Bill Details' : 'Trade Details'}
                        </h3>

                        <div className="space-y-5">
                            {formData.type === 'TBILL' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Direction</label>
                                        <div className="flex gap-2">
                                            {['Buy', 'Sell'].map(dir => (
                                                <button
                                                    key={dir}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, direction: dir })}
                                                    className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${formData.direction === dir
                                                        ? 'bg-black text-white'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {dir}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Total Amount</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    type="number"
                                                    required
                                                    placeholder="0.00"
                                                    className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                    value={formData.amount}
                                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Min Ticket Amount</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    type="number"
                                                    required
                                                    placeholder="0.00"
                                                    className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                    value={formData.minTicketAmount}
                                                    onChange={e => setFormData({ ...formData, minTicketAmount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                Settlement Date {formData.direction === 'Sell' ? '(Fixed)' : '(Exact or Start)'}
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.settlementDateStart}
                                                onChange={e => setFormData({ ...formData, settlementDateStart: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold text-gray-400 uppercase mb-1 ${formData.direction === 'Sell' ? 'opacity-30' : ''}`}>
                                                Settlement Range End (Optional)
                                            </label>
                                            <input
                                                type="date"
                                                disabled={formData.direction === 'Sell'}
                                                className={`w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all ${formData.direction === 'Sell' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                value={formData.direction === 'Sell' ? '' : formData.settlementDateEnd}
                                                onChange={e => setFormData({ ...formData, settlementDateEnd: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                Maturity Date {formData.direction === 'Sell' ? '(Fixed)' : '(Exact or Start)'}
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.maturityDateStart}
                                                onChange={e => setFormData({ ...formData, maturityDateStart: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold text-gray-400 uppercase mb-1 ${formData.direction === 'Sell' ? 'opacity-30' : ''}`}>
                                                Maturity Range End (Optional)
                                            </label>
                                            <input
                                                type="date"
                                                disabled={formData.direction === 'Sell'}
                                                className={`w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all ${formData.direction === 'Sell' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                value={formData.direction === 'Sell' ? '' : formData.maturityDateEnd}
                                                onChange={e => setFormData({ ...formData, maturityDateEnd: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {formData.direction === 'Buy' && (formData.settlementDateEnd || formData.maturityDateEnd) && (
                                        <div className="animate-fade-in-up">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Evaluation Interest Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                required
                                                placeholder="e.g. 18.5"
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.evalRate}
                                                onChange={e => setFormData({ ...formData, evalRate: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Value Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                            value={formData.valueDate}
                                            onChange={e => setFormData({ ...formData, valueDate: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount to Buy</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buy Pair</label>
                                            <select
                                                className="w-full bg-gray-50 border-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.buyCurrency}
                                                onChange={e => setFormData({ ...formData, buyCurrency: e.target.value })}
                                            >
                                                <option>EGP</option><option>USD</option><option>EUR</option><option>GBP</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sell Pair</label>
                                            <select
                                                className="w-full bg-gray-50 border-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.sellCurrency}
                                                onChange={e => setFormData({ ...formData, sellCurrency: e.target.value })}
                                            >
                                                <option>USD</option><option>EGP</option><option>EUR</option><option>GBP</option>
                                            </select>
                                        </div>
                                    </div>

                                     <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Default Quotation Base</label>
                                        <div className="flex gap-2">
                                            {['Execution', 'Indicative'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, quotationBase: type })}
                                                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${formData.quotationBase === type
                                                        ? 'bg-black text-white'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Max Tolerance (%) for Execution vs Indicative</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.50"
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.maxTolerancePercent}
                                                onChange={e => setFormData({ ...formData, maxTolerancePercent: e.target.value })}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">If Execution rate exceeds Indicative rate by more than this %, RFQ will close without a winner.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Time Window Section */}
                    <section className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2">
                            <Clock size={14} /> Time Window & Validity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                    value={formData.windowStart}
                                    onChange={e => setFormData({ ...formData, windowStart: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duration</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                        value={formData.windowDuration}
                                        onChange={e => setFormData({ ...formData, windowDuration: e.target.value })}
                                    >
                                        <option value="30">30s</option>
                                        <option value="60">1m</option>
                                        <option value="120">2m</option>
                                        <option value="300">5m</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link Validity</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                        value={formData.tokenValidityHours}
                                        onChange={e => setFormData({ ...formData, tokenValidityHours: e.target.value })}
                                    >
                                        <option value="1">1 Hour</option>
                                        <option value="3">3 Hours</option>
                                        <option value="12">12 Hours</option>
                                        <option value="24">24 Hours</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Documents Section */}
                    <section className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                            <FileText size={14} /> Supporting Documents
                        </h3>
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-black/20 hover:bg-gray-50 transition-all cursor-pointer relative overflow-hidden group">
                            <input
                                type="file"
                                multiple
                                className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-10"
                                onChange={e => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setFiles(prev => [...prev, ...Array.from(e.target.files)]);
                                    }
                                }}
                            />
                            <Plus className="mx-auto text-gray-300 group-hover:text-black mb-2 transition-colors" />
                            <p className="text-xs sm:text-sm text-gray-500">Click or drag to attach files (Multiple allowed)</p>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((f, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                                        <span className="flex items-center gap-2 truncate text-gray-700 font-medium">
                                            <FileText size={14} className="text-gray-400 shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-700 p-1 rounded font-bold text-xs shrink-0"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Bank Selection */}
                <div className="xl:col-span-2 space-y-6">
                    <section className="bg-white p-5 sm:p-8 rounded-xl border border-gray-100 min-h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6 sm:mb-8">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                <Landmark size={14} /> Bank Selection & Costs
                            </h3>
                            <span className="text-xs font-medium bg-black text-white px-3 py-1 rounded-full">
                                {selectedBanks.length} Selected
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 flex-1">
                            {banks.map(bank => {
                                const isSelected = selectedBanks.find(b => b.id === bank.bank_id);
                                return (
                                    <div
                                        key={bank.id}
                                        className={`p-4 sm:p-6 rounded-2xl border transition-all h-fit ${isSelected ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Landmark size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-sm sm:text-base truncate">{bank.bank?.name || `Bank ${bank.bank_id}`}</h4>
                                                    <p className="text-[10px] sm:text-xs text-gray-400 truncate">{bank.emails}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleBankToggle(bank)}
                                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${isSelected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-black text-white hover:bg-gray-800'
                                                    }`}
                                            >
                                                {isSelected ? 'Remove' : 'Select'}
                                            </button>
                                        </div>

                                         {isSelected && (
                                            <div className="animate-fade-in-up space-y-3 pt-4 mt-2 border-t border-gray-200">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div>
                                                        <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Min Cost</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black"
                                                            value={isSelected.costMin}
                                                            onChange={e => updateBankCost(bank.bank_id, 'costMin', parseFloat(e.target.value))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Cost %</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black"
                                                            value={isSelected.costPercent}
                                                            onChange={e => updateBankCost(bank.bank_id, 'costPercent', parseFloat(e.target.value))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Max Cost</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black"
                                                            value={isSelected.costMax}
                                                            onChange={e => updateBankCost(bank.bank_id, 'costMax', parseFloat(e.target.value))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Flat Fee</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black"
                                                            value={isSelected.costFlat}
                                                            onChange={e => updateBankCost(bank.bank_id, 'costFlat', parseFloat(e.target.value))}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Base Type:</label>
                                                        <select
                                                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-black"
                                                            value={isSelected.quotationBase || formData.quotationBase}
                                                            onChange={e => updateBankCost(bank.bank_id, 'quotationBase', e.target.value)}
                                                        >
                                                            <option value="Execution">Execution</option>
                                                            <option value="Indicative">Indicative</option>
                                                        </select>
                                                    </div>

                                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-600 font-medium select-none">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-black focus:ring-black"
                                                            checked={isSelected.isDocumentVisible !== false}
                                                            onChange={e => updateBankCost(bank.bank_id, 'isDocumentVisible', e.target.checked)}
                                                        />
                                                        Document Visible
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {banks.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-400 italic">
                                    No quotation banks configured for this entity.
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || selectedBanks.length === 0}
                            className="mt-8 w-full py-4 sm:py-5 bg-black text-white rounded-3xl font-semibold text-base sm:text-lg flex items-center justify-center gap-3 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-black/10 shrink-0"
                        >
                            <Send size={20} />
                            {isSubmitting ? 'Processing...' : 'Submit Request for Quotation'}
                        </button>
                    </section>
                </div>
            </form>
        </div>
    );
}
