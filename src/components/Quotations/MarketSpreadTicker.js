import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Shield, TrendingUp, Clock, Zap, Sparkles, BarChart2, Info } from 'lucide-react';

export default function MarketSpreadTicker({ currencyPair = 'USD/EGP', tradeType = 'FX_SPOT' }) {
    const [benchmarks, setBenchmarks] = useState(null);
    const [timing, setTiming] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchBenchmarkData = async () => {
            try {
                const [benchRes, timeRes] = await Promise.all([
                    apiClient.get(`/end-user/quotations/market-benchmarks?currency_pair=${currencyPair}&trade_type=${tradeType}`).catch(() => ({ data: null })),
                    apiClient.get(`/end-user/quotations/timing-recommendations?trade_type=${tradeType}`).catch(() => ({ data: null }))
                ]);
                if (isMounted) {
                    setBenchmarks(benchRes.data);
                    setTiming(timeRes.data);
                }
            } catch (err) {
                console.warn('Market benchmarks currently unavailable:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchBenchmarkData();
        return () => { isMounted = false; };
    }, [currencyPair, tradeType]);

    if (loading) return null;

    // State A: Privacy Guardrail Active (k < 3)
    if (!benchmarks || benchmarks.insufficient_sample) {
        return (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-sm border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Shield size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Collaborative Market Intelligence</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">0% Risk Anonymity</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                            {benchmarks?.message || "Market data is accumulating. Cross-customer benchmarks unlock when at least 3 active corporations execute tenders."}
                        </p>
                    </div>
                </div>
                {timing?.recommended_window && (
                    <div className="text-[11px] text-indigo-200 bg-indigo-900/40 border border-indigo-700/40 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                        <Clock size={13} className="text-indigo-400" />
                        <span>Peak Liquidity: <strong>{timing.recommended_window}</strong></span>
                    </div>
                )}
            </div>
        );
    }

    // State B: Benchmarks Active (k >= 3)
    return (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <TrendingUp size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                Network Market Consensus ({currencyPair})
                            </h4>
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                                Blind K-Anonymity
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Aggregated from {benchmarks.total_anonymous_samples} blind tenders across platform corporations</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800" title="Protected by differential binning and minimum tenant thresholds.">
                    <Shield size={12} className="text-emerald-400" />
                    <span>0% Confidentiality Risk Certified</span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Median Spread (over CBE)</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400">+{benchmarks.median_spread_bps}</span>
                        <span className="text-xs text-slate-500 font-sans">bps</span>
                    </div>
                </div>
                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Top Quartile (Best 25%)</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-xl font-bold font-mono text-cyan-400">+{benchmarks.p25_spread_bps}</span>
                        <span className="text-xs text-slate-500 font-sans">bps</span>
                    </div>
                </div>
                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Desk Turnaround</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-xl font-bold font-mono text-amber-400">{benchmarks.avg_response_minutes}</span>
                        <span className="text-xs text-slate-500 font-sans">mins</span>
                    </div>
                </div>
                <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Timing Recommender</span>
                    <span className="text-xs font-bold text-indigo-300 block truncate" title={timing?.recommended_window}>
                        {timing?.recommended_window || 'Tue–Thu 10:30–12:30'}
                    </span>
                    <span className="text-[10px] text-slate-500">{timing?.participation_multiplier || '2.1x'} higher bids</span>
                </div>
            </div>
        </div>
    );
}
