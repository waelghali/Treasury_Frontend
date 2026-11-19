// frontend/src/pages/Reports/ReportsPage.js
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, BarChart, Clock, Truck,
  Package, Activity, PieChart, Hourglass, Send, ShieldCheck
} from 'lucide-react';

const reportIcons = {
  LayoutDashboard: LayoutDashboard,
  Clock: Clock,
  Hourglass: Hourglass,
  Truck: Truck,
  FileText: FileText,
  Package: Package,
  Activity: Activity,
  PieChart: PieChart,
  BarChart: BarChart,
  Send: Send,
  ShieldCheck: ShieldCheck,
};

function ReportsPage({ reports }) {
  const location = useLocation();

  if (!reports || reports.length === 0) {
    return (
      <div className="w-full min-w-0">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Reports &amp; Analytics</h2>
        <p className="text-slate-500 text-sm">No reports are enabled for your current module subscription.</p>
      </div>
    );
  }

  // Single report: render Outlet directly with zero extra chrome
  if (reports.length === 1) {
    return (
      <div className="w-full min-w-0">
        <Outlet />
      </div>
    );
  }

  // Multiple reports (e.g. LG Issuance + LG Custody): render clean module switcher + Outlet
  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xs print:hidden">
        <div className="text-xs text-slate-500">
          <span className="font-bold text-slate-800">Executive Reporting Suite:</span>{' '}
          Switch between subscribed treasury reporting modules
        </div>
        <div className="inline-flex flex-wrap rounded-xl p-1 bg-slate-100 border border-slate-200/80 gap-1">
          {reports.map((report) => {
            const IconComp = reportIcons[report.iconName] || BarChart;
            const isActive = location.pathname.endsWith(`/${report.path}`) || location.pathname.includes(`/${report.path}/`);
            return (
              <Link
                key={report.path}
                to={report.path}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title={report.description}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{report.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <Outlet />
    </div>
  );
}

export default ReportsPage;
