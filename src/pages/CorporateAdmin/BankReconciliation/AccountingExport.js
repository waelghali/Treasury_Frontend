import React from 'react';
import { Download, FileSpreadsheet, Lock, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AccountingExport = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Accounting Export</h1>
                <p className="text-gray-500 mt-1">Review reconciled transactions and generate general ledger export files.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Finalized</h3>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900">1,204</div>
                    <p className="text-xs text-gray-500 mt-1">Transactions ready for export</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Unclassified</h3>
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 text-amber-600">12</div>
                    <p className="text-xs text-gray-500 mt-1">Missing GL mapping</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Locked</h3>
                        <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900">0</div>
                    <p className="text-xs text-gray-500 mt-1">Previously exported</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                </div>
                <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-gray-900">Generate GL Journal</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Download a CSV template compatible with your accounting system. All transactions will be marked as "Exported" and locked to prevent duplicates.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                    <button className="flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                        <Download className="w-4 h-4 mr-2" />
                        Export to CSV
                    </button>
                    <button className="flex items-center justify-center px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all">
                        Preview Data
                    </button>
                </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-200 space-x-3">
                <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500">
                    Phase 1 supports direct CSV export. API integrations for SAP, Oracle, and Microsoft Dynamics are planned for Phase 2.
                </p>
            </div>
        </div>
    );
};

export default AccountingExport;
