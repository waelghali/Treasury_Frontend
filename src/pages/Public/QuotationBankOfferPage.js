import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Clock, Landmark, AlertCircle, CheckCircle2, TrendingUp, FileText } from 'lucide-react';
import './quotation-animations.css';

// Base URL for API calls. If you use a custom environment variable, replace this.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function QuotationBankOfferPage() {
    const { token } = useParams();
    const [rfq, setRfq] = useState(null);
    const [error, setError] = useState(null);
    const [price, setPrice] = useState('');
    const [tbillLines, setTbillLines] = useState([{ settlementDate: '', maturityDate: '', discountRate: '', maxAmount: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ label: '', status: 'PRE' });
    const [resultStatus, setResultStatus] = useState(null);
    const [timeOffset, setTimeOffset] = useState(0);

    const fetchRfq = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/${token}`);
            const data = res.data;

            const serverTime = new Date(data.serverTime).getTime();
            const localTime = Date.now();
            setTimeOffset(serverTime - localTime);
            setRfq(data);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to load RFQ');
        }
    }, [token]);

    const checkResult = useCallback(async () => {
        if (!rfq) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/public-quotation/${token}/result`);
            const status = res.data.status;

            if (status === 'WINNER') {
                setResultStatus('WINNER');
            } else if (status === 'AWAITING_MANUAL_SELECTION') {
                setResultStatus('AWAITING_SELECTION');
            } else if (status === 'NOT_SELECTED') {
                setResultStatus('NOT_SELECTED');
            }
        } catch (err) {
            console.error(err);
        }
    }, [rfq, token]);

    useEffect(() => {
        // We check results if the window is closed OR if we just submitted.
        // We also check if we have existing offers (already submitted previously)
        const hasSubmitted = submitted || (rfq?.offers && rfq.offers.length > 0);

        if (timeLeft.status === 'CLOSED') {
            checkResult();
            const interval = setInterval(checkResult, 10000);
            return () => clearInterval(interval);
        }
    }, [timeLeft.status, submitted, rfq?.offers, checkResult]);

    useEffect(() => {
        fetchRfq();
    }, [fetchRfq]);

    useEffect(() => {
        if (!rfq) return;

        const timer = setInterval(() => {
            const now = new Date(Date.now() + timeOffset);
            const start = new Date(rfq.window_start);
            const end = new Date(rfq.window_end);

            if (now < start) {
                const diff = Math.floor((start.getTime() - now.getTime()) / 1000);
                const mins = Math.floor(diff / 60);
                const secs = diff % 60;
                setTimeLeft({ label: `Starts in ${mins}:${secs.toString().padStart(2, '0')}`, status: 'PRE' });
            } else if (now >= start && now <= end) {
                const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
                const mins = Math.floor(diff / 60);
                const secs = diff % 60;
                setTimeLeft({ label: `Window Closes in ${mins}:${secs.toString().padStart(2, '0')}`, status: 'OPEN' });
            } else {
                setTimeLeft({ label: 'Window Closed', status: 'CLOSED' });
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [rfq, timeOffset]);

    useEffect(() => {
        if (!rfq) return;

        if (rfq.type === 'TBILL') {
            const isSettlementFixed = rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end);
            const isMaturityFixed = rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end);

            if (rfq.offers && rfq.offers.length > 0) {
                setTbillLines(rfq.offers.map((o) => ({
                    settlementDate: o.settlement_date,
                    maturityDate: o.maturity_date,
                    discountRate: o.discount_rate.toString(),
                    maxAmount: o.max_amount.toString()
                })));
            } else {
                setTbillLines([{
                    settlementDate: isSettlementFixed ? rfq.settlement_date_start : '',
                    maturityDate: isMaturityFixed ? rfq.maturity_date_start : '',
                    discountRate: '',
                    maxAmount: ''
                }]);
            }
        } else if (rfq.type === 'FX_SPOT' && rfq.offers && rfq.offers.length > 0) {
            setPrice(rfq.offers[0].price.toString());
        }

        // Sync submitted state with backend data
        if (rfq.offers && rfq.offers.length > 0) {
            setSubmitted(true);
        }
    }, [rfq]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (timeLeft.status !== 'OPEN') return;

        setIsSubmitting(true);
        try {
            const isTBill = rfq.type === 'TBILL';
            const endpoint = isTBill ? '/api/v1/public-quotation/tbill-offer' : '/api/v1/public-quotation/offer';

            const body = isTBill
                ? { token, lines: tbillLines.map(l => ({ ...l, discountRate: parseFloat(l.discountRate), maxAmount: parseFloat(l.maxAmount) })) }
                : { token, price: parseFloat(price) };

            await axios.post(`${API_BASE_URL}${endpoint}`, body);
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addTbillLine = () => {
        const isSettlementFixed = rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end);
        const isMaturityFixed = rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end);

        setTbillLines([...tbillLines, {
            settlementDate: isSettlementFixed ? rfq.settlement_date_start : '',
            maturityDate: isMaturityFixed ? rfq.maturity_date_start : '',
            discountRate: '',
            maxAmount: ''
        }]);
    };

    const removeTbillLine = (index) => {
        setTbillLines(tbillLines.filter((_, i) => i !== index));
    };

    const updateTbillLine = (index, field, value) => {
        const newLines = [...tbillLines];
        newLines[index] = { ...newLines[index], [field]: value };
        setTbillLines(newLines);
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gray-50/50">
                <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-red-100 text-center max-w-md w-full animate-fade-in-up">
                    <AlertCircle className="mx-auto text-red-500 mb-6" size={48} />
                    <h2 className="text-xl sm:text-2xl font-semibold mb-2">Access Denied</h2>
                    <p className="text-gray-500 text-sm sm:text-base break-words">{error}</p>
                </div>
            </div>
        );
    }

    if (!rfq) return <div className="p-8 text-center text-gray-500 animate-pulse mt-20">Loading Secure Quotation Link...</div>;

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 py-10 sm:py-16">
            {resultStatus && (
                <div
                    className={`mb-8 p-6 rounded-3xl border text-center animate-fade-in-up ${resultStatus === 'WINNER' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                >
                    {resultStatus === 'WINNER' ? (
                        <div className="flex flex-col items-center">
                            <CheckCircle2 className="mb-2 text-emerald-500" size={32} />
                            <h2 className="text-xl font-bold">You have been selected!</h2>
                            <p className="text-sm">Our treasury team will contact you shortly for execution.</p>
                        </div>
                    ) : resultStatus === 'AWAITING_SELECTION' ? (
                        <div className="flex flex-col items-center">
                            <Clock className="mb-2 text-amber-500 animate-spin-slow" size={32} />
                            <h2 className="text-xl font-bold">Selection in Progress</h2>
                            <p className="text-sm">Thank you for your quote. The customer is currently evaluating all bids.</p>
                        </div>
                    ) : resultStatus === 'INDICATIVE_ONLY' ? (
                        <div className="flex flex-col items-center">
                            <h2 className="text-xl font-bold text-gray-800">Indicative Quotation Completed</h2>
                            <p className="text-sm text-gray-500 mt-1">Thank you for providing reference market pricing for this request.</p>
                        </div>
                    ) : resultStatus === 'INCONCLUSIVE' ? (
                        <div className="flex flex-col items-center">
                            <h2 className="text-xl font-bold text-gray-800">Quotation Completed</h2>
                            <p className="text-sm text-gray-500 mt-1">Thank you for your submission. This request closed without execution.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <h2 className="text-xl font-bold">Quotation Completed</h2>
                            <p className="text-sm">Thank you for your quote. Another counterparty was selected for this trade.</p>
                        </div>
                    )}
                </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 sm:mb-12 gap-6 hover-group">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                        <Landmark size={28} className="sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-light tracking-tight truncate max-w-[200px] sm:max-w-md">{rfq.bank_name}</h1>
                        <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-widest font-medium">Quotation Portal</p>
                    </div>
                </div>
                <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-mono text-sm sm:text-lg font-bold shadow-sm border shrink-0 transition-colors w-full sm:w-auto text-center ${timeLeft.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' :
                    timeLeft.status === 'PRE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                    {timeLeft.label}
                </div>
            </div>

            <div className="mb-6 p-4 sm:p-6 bg-gray-50/80 rounded-2xl border border-gray-100 animate-fade-in-up flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Requested By</p>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{rfq.customer_name}</h2>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">RFQ Reference</p>
                    <p className="text-sm font-mono font-bold text-black bg-white px-3 py-1.5 rounded-lg border border-gray-200">{rfq.ref_no}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                <div className="md:col-span-2 space-y-6 sm:space-y-8 order-2 md:order-1">
                    <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-black/5 animate-fade-in-up hover:border-black/10 transition-colors">
                        <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <TrendingUp size={14} /> Trade Specifications
                        </h3>

                        <div className="grid grid-cols-2 gap-y-6 sm:gap-y-8 gap-x-6 sm:gap-x-12">
                            {rfq.type === 'TBILL' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Direction</label>
                                        <p className="text-xl sm:text-2xl font-semibold">{rfq.direction}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Min Ticket Amount</label>
                                        <p className="text-xl sm:text-2xl font-semibold">{new Intl.NumberFormat().format(rfq.min_ticket_amount)}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Settlement Date</label>
                                        <p className="text-base sm:text-lg font-medium">
                                            {new Date(rfq.settlement_date_start).toLocaleDateString()}
                                            {rfq.settlement_date_end ? ` to ${new Date(rfq.settlement_date_end).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Maturity Date</label>
                                        <p className="text-base sm:text-lg font-medium">
                                            {new Date(rfq.maturity_date_start).toLocaleDateString()}
                                            {rfq.maturity_date_end ? ` to ${new Date(rfq.maturity_date_end).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Currency Pair</label>
                                        <p className="text-xl sm:text-2xl font-semibold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-xl inline-block border border-emerald-100">{rfq.buy_currency} / {rfq.sell_currency}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Amount to Buy</label>
                                        <p className="text-xl sm:text-2xl font-semibold">{new Intl.NumberFormat().format(rfq.amount)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Value Date</label>
                                        <p className="text-base sm:text-lg font-medium">{new Date(rfq.value_date).toLocaleDateString()}</p>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-[10px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Base Type</label>
                                <p className="text-base sm:text-lg font-medium">{rfq.quotation_base}</p>
                            </div>
                        </div>

                        {rfq.document_path && (
                            <div className="mt-8 p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="text-gray-400 shrink-0" size={20} />
                                    <span className="text-xs sm:text-sm font-medium text-gray-600 line-clamp-1">Supporting Document Attached</span>
                                </div>
                                <button className="text-[10px] sm:text-xs font-bold text-black hover:text-gray-600 underline uppercase tracking-wider transition-colors shrink-0">Download</button>
                            </div>
                        )}
                    </section>

                    {submitted && (
                        <div className="bg-emerald-50 p-6 sm:p-8 rounded-3xl border border-emerald-100 text-center animate-fade-in-up mb-6">
                            <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
                            <h2 className="text-xl sm:text-2xl font-semibold text-emerald-900 mb-2">Offer Secured</h2>
                            <p className="text-sm sm:text-base text-emerald-700">Thank you. Your {rfq.type === 'TBILL' ? 'multi-line quote' : 'price'} has been securely recorded.</p>
                        </div>
                    )}

                    <section
                        className={`p-6 sm:p-8 rounded-3xl shadow-xl transition-all duration-300 animate-fade-in-up order-1 md:order-2 ${timeLeft.status === 'OPEN' ? 'bg-white border-2 border-black' : 'bg-gray-50 border border-gray-100 opacity-50'
                            }`}
                    >
                        <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={14} /> {rfq.type === 'TBILL' ? 'T-Bill Quotation Lines' : 'Your Price Offer'}
                            </div>
                            {rfq.type === 'TBILL' && timeLeft.status === 'OPEN' && rfq.direction === 'Buy' &&
                                !(rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end) &&
                                    rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end)) && (
                                    <button
                                        type="button"
                                        onClick={addTbillLine}
                                        className="text-[10px] font-bold bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-all w-full sm:w-auto"
                                    >
                                        + Add Line
                                    </button>
                                )}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            {rfq.type === 'TBILL' ? (
                                <div className="space-y-6 mb-8">
                                    {tbillLines.map((line, index) => (
                                        <div key={index} className="p-4 sm:p-5 bg-gray-50 rounded-2xl border border-gray-200 relative group transition-all hover:border-black/10">
                                            {tbillLines.length > 1 && timeLeft.status === 'OPEN' && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeTbillLine(index)}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                >
                                                    ×
                                                </button>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Settlement Date</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        disabled={timeLeft.status !== 'OPEN' || (rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end))}
                                                        className={`w-full bg-white border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-black transition-colors ${rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end) ? 'opacity-70 bg-gray-50' : ''}`}
                                                        value={line.settlementDate}
                                                        onChange={e => updateTbillLine(index, 'settlementDate', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Maturity Date</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        disabled={timeLeft.status !== 'OPEN' || (rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end))}
                                                        className={`w-full bg-white border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-black transition-colors ${rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end) ? 'opacity-70 bg-gray-50' : ''}`}
                                                        value={line.maturityDate}
                                                        onChange={e => updateTbillLine(index, 'maturityDate', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Discount Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        required
                                                        disabled={timeLeft.status !== 'OPEN'}
                                                        placeholder="e.g. 18.5"
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-bold outline-none focus:border-black transition-colors"
                                                        value={line.discountRate}
                                                        onChange={e => updateTbillLine(index, 'discountRate', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Max Amount</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        disabled={timeLeft.status !== 'OPEN'}
                                                        placeholder="0.00"
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-bold outline-none focus:border-black transition-colors"
                                                        value={line.maxAmount}
                                                        onChange={e => updateTbillLine(index, 'maxAmount', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="relative mb-6 sm:mb-8">
                                    <input
                                        type="number"
                                        step="0.00001"
                                        required
                                        disabled={timeLeft.status !== 'OPEN' || isSubmitting}
                                        placeholder="Enter exchange rate (e.g. 1.0842)"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 sm:px-6 py-4 sm:py-5 text-lg sm:text-xl font-bold focus:ring-4 focus:ring-black/5 transition-all outline-none disabled:cursor-not-allowed placeholder:text-xs placeholder:sm:text-sm placeholder:font-normal placeholder:text-gray-400"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                    />
                                    <div className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-lg sm:text-xl">
                                        {rfq.sell_currency}
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={timeLeft.status !== 'OPEN' || isSubmitting || (rfq.type === 'TBILL' ? tbillLines.some(l => !l.discountRate || !l.maxAmount) : !price)}
                                className="w-full py-4 sm:py-5 bg-black text-white rounded-2xl sm:rounded-3xl font-bold text-base sm:text-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
                            >
                                {isSubmitting ? 'Submitting...' : timeLeft.status === 'PRE' ? 'Waiting for Window' : timeLeft.status === 'CLOSED' ? 'Window Closed' : (submitted ? 'Update Offer' : 'Submit Offer')}
                            </button>
                            {submitted && timeLeft.status === 'OPEN' && (
                                <p className="text-center text-[10px] sm:text-xs text-emerald-600 font-bold mt-4 px-2">
                                    Offer reliably recorded. You can amend it until the window closes.
                                </p>
                            )}
                        </form>
                    </section>
                </div>

                <div className="md:col-span-1 order-3">
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 sticky top-8 animate-fade-in-up">
                        <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <Clock size={14} /> Guidelines
                        </h3>
                        <ul className="space-y-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-black text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">!</span>
                                <span className="font-semibold text-black">
                                    {rfq.quotation_base === 'Execution'
                                        ? 'This is an EXECUTION request. Your submitted price is binding if selected.'
                                        : 'This is an INDICATIVE request. Your price will be used for market discovery.'}
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-500">1</span>
                                Review the trade specifications fully before quoting.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-500">2</span>
                                The input field will activate exactly when the window starts.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-500">3</span>
                                You have <strong>{Math.floor((new Date(rfq.window_end).getTime() - new Date(rfq.window_start).getTime()) / 1000)} seconds</strong> to submit your best price.
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-500">4</span>
                                Once the window closes, no further revisions are possible.
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
