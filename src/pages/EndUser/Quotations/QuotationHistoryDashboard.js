import apiClient from '../../../services/apiClient';
import ResultsView from './ResultsView';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { Check, X, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { BarChart3, Landmark, History, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';


export default function QuotationHistoryDashboard() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRfqId, setSelectedRfqId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const location = useLocation();

    const fetchData = async () => {
        try {
            // Detect Role
            const token = localStorage.getItem('jwt_token');
            if (token) {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role);

                // If admin, fetch pending approvals
                if (decoded.role === 'corporate_admin') {
                    const pendingRes = await apiClient.get('/corporate-admin/quotations/pending-approvals');
                    setPendingApprovals(pendingRes.data);
                }
            }

            // Fetch raw history
            const historyRes = await apiClient.get('/end-user/quotations/');
            setHistory(historyRes.data);

            // Check for rfq_id in URL for deep-linking
            const searchParams = new URLSearchParams(location.search);
            const rfqIdFromUrl = searchParams.get('rfq_id');
            if (rfqIdFromUrl) {
                setSelectedRfqId(rfqIdFromUrl);
            }

            // Fetch Stats for FX Spot from endpoint
            const statsRes = await apiClient.get('/end-user/quotations/stats?trade_type=FX_SPOT');
            setStats(statsRes.data);

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (rfqId) => {
        // Fetch RFQ details for time check if needed, or assume it's passed or available.
        // For simplicity, we can fetch the RFQ or rely on the pendingApprovals list if it has window_end.
        const rfq = pendingApprovals.find(r => r.id === rfqId);
        if (rfq && rfq.window_end) {
            const closingTime = new Date(rfq.window_end);
            const now = new Date();
            const diffMins = Math.round((closingTime - now) / 60000);

            if (diffMins < 0) {
                toast.error("The window for this quotation has already closed.");
                return;
            }
            if (diffMins < 30) {
                if (!window.confirm(`This quotation has only ${diffMins} minutes remaining. Are you sure you want to approve and release it?`)) {
                    return;
                }
            }
        }

        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/approve`);
            toast.success("Quotation approved and released to banks!");
            fetchData();
        } catch (err) {
            toast.error("Failed to approve quotation: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleReject = async (rfqId) => {
        if (!window.confirm("Are you sure you want to reject this quotation?")) return;
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/reject`);
            toast.success("Quotation rejected.");
            fetchData();
        } catch (err) {
            toast.error("Failed to reject quotation.");
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading historical data...</div>;

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 space-y-8 sm:space-y-12">
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Market Insights & History</h1>
                <p className="text-sm text-gray-500 mt-1">Review past performance and bank analytics.</p>
            </header>

            {/* Pending Approvals (Admin Only) */}
            {userRole === 'corporate_admin' && pendingApprovals.length > 0 && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-6 flex items-center gap-2">
                        <Bell size={14} className="animate-pulse" /> Action Required: Pending Approvals
                    </h3>
                    <div className="space-y-4">
                        {pendingApprovals.map((rfq) => (
                            <div key={rfq.id} className="bg-white p-6 rounded-3xl shadow-md border border-orange-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-sm font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{rfq.ref_no}</span>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}</span>
                                    </div>
                                    <div className="text-lg font-bold text-gray-900">
                                        {rfq.type === 'TBILL' ? `${rfq.direction} Quotation` : `${rfq.direction} ${rfq.amount.toLocaleString()} ${rfq.buy_currency}`}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Requested by {rfq.creator_name || 'End User'} • {new Date(rfq.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReject(rfq.id)}
                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold transition-all"
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(rfq.id)}
                                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-gray-200 transition-all"
                                    >
                                        <Check size={18} /> Approve & Release
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Bank Performance Stats */}
            {stats.length > 0 && (
                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2">
                        <BarChart3 size={14} /> Bank Performance Analytics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {stats.map((bank, index) => (
                            <div
                                key={bank.bank_id}
                                className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-black/5 animate-fade-in-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                        <Landmark size={16} />
                                    </div>
                                    <h4 className="font-bold text-sm truncate">{bank.bank_name}</h4>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Win Rate</label>
                                        <div className="flex items-end gap-2">
                                            <span className="text-xl sm:text-2xl font-bold">{bank.win_rate.toFixed(1)}%</span>
                                            <span className="text-xs text-gray-400 mb-1">({bank.total_won}/{bank.total_participated})</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${bank.win_rate}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <span className="block text-[8px] font-bold text-emerald-600 uppercase mb-0.5">1st</span>
                                            <span className="text-sm font-bold text-emerald-700">{bank.ranks[1]}</span>
                                        </div>
                                        <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100">
                                            <span className="block text-[8px] font-bold text-blue-600 uppercase mb-0.5">2nd</span>
                                            <span className="text-sm font-bold text-blue-700">{bank.ranks[2]}</span>
                                        </div>
                                        <div className="text-center p-2 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="block text-[8px] font-bold text-gray-600 uppercase mb-0.5">3rd</span>
                                            <span className="text-sm font-bold text-gray-700">{bank.ranks[3]}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Avg. Spread</span>
                                            <span className={`text-xs font-bold ${bank.avg_spread < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                +{bank.avg_spread.toFixed(3)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Historical RFQs List */}
            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4 sm:mb-6 flex items-center gap-2">
                    <History size={14} /> Historical Requests
                </h3>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Ref No</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Type</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Date</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Details</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase text-right">View</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {history.map((rfq) => (
                                    <tr key={rfq.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedRfqId(rfq.id)}>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm font-bold truncate max-w-[120px]">{rfq.ref_no}</td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap ${rfq.type === 'TBILL' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-gray-500 whitespace-nowrap">{new Date(rfq.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold whitespace-nowrap">
                                            {rfq.type === 'TBILL' ? rfq.direction : `${rfq.buy_currency}/${rfq.sell_currency}`}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap">
                                            {rfq.type === 'TBILL'
                                                ? `Min: ${new Intl.NumberFormat().format(rfq.min_ticket_amount || 0)}`
                                                : new Intl.NumberFormat().format(rfq.amount || 0)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap 
                                                    ${rfq.status === 'PENDING_APPROVAL' ? 'bg-orange-100 text-orange-700'
                                                        : rfq.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                                                            : rfq.status === 'REJECTED' ? 'bg-red-100 text-red-700'
                                                                : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {rfq.status === 'PENDING_APPROVAL' ? 'Needs Approval' : rfq.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedRfqId(rfq.id); }}
                                                className="p-1.5 sm:p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors inline-flex"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-gray-400 italic">No historical quotation data available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Selected RFQ Detail Modal */}
            {selectedRfqId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-hidden">
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up"
                    >
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate pr-4">RFQ Details: {history.find(r => r.id === selectedRfqId)?.ref_no}</h3>
                            <button
                                onClick={() => setSelectedRfqId(null)}
                                className="text-gray-400 hover:text-black hover:bg-gray-100 p-2 rounded-full transition-colors shrink-0"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/30">
                            <ResultsView rfqId={selectedRfqId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
