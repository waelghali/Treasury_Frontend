import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import {
  Loader2, Plus, Building2, TrendingUp, AlertCircle,
  Settings2, Archive, RotateCcw, Eye, EyeOff,
  Landmark, ShieldCheck, Coins, Globe, ArrowUpRight, Clock,
  FolderOpen, Paperclip, Trash2, Edit3, ChevronDown, ChevronUp,
  FileSearch, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import FacilityFormModal from '../../components/Modals/FacilityFormModal';

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [projects, setProjects] = useState([]);
  const [showProjects, setShowProjects] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', project_type: 'PROJECT', reference_number: '', status: 'ACTIVE' });
  const [showNewForm, setShowNewForm] = useState(false);
  const [agreementResult, setAgreementResult] = useState(null);
  const [analyzingFacility, setAnalyzingFacility] = useState(null);
  const agreementInputRefs = {};

  const handleAnalyzeAgreement = async (facilityId, file) => {
    if (!file) return;
    setAnalyzingFacility(facilityId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest(`/facilities/${facilityId}/analyze-agreement`, 'POST', formData, true);
      setAgreementResult({ facilityId, ...res });
    } catch (err) {
      setAgreementResult({ facilityId, status: 'ERROR', message: err.message || 'Analysis failed' });
    } finally {
      setAnalyzingFacility(null);
    }
  };

  useEffect(() => {
    fetchFacilities();
    fetchProjects();
  }, [showArchived]);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/facilities/?include_archived=${showArchived}`, 'GET');
      setFacilities(data);
    } catch (err) {
      console.error("Failed to fetch facilities", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (facility) => {
    setSelectedFacility(facility);
    setShowModal(true);
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Archive this facility? It will be hidden from issuance workflows.")) return;
    try {
      await apiRequest(`/facilities/${id}`, 'DELETE');
      fetchFacilities();
    } catch (err) { alert("Failed to archive facility"); }
  };

  const handleRestore = async (id) => {
    try {
      await apiRequest(`/facilities/${id}/restore`, 'POST');
      fetchFacilities();
    } catch (err) { alert("Failed to restore facility"); }
  };

  // --- Projects CRUD ---
  const fetchProjects = async () => {
    try {
      const data = await apiRequest('/corporate-admin/projects/', 'GET');
      setProjects(data || []);
    } catch (err) { console.error('Failed to fetch projects', err); }
  };
  const handleSaveProject = async () => {
    if (!newProject.name.trim()) return;
    try {
      await apiRequest('/corporate-admin/projects/', 'POST', newProject);
      setNewProject({ name: '', project_type: 'PROJECT', reference_number: '', status: 'ACTIVE' });
      setShowNewForm(false);
      fetchProjects();
    } catch (err) { alert('Failed to save project'); }
  };
  const handleUpdateProject = async (proj) => {
    try {
      await apiRequest(`/corporate-admin/projects/${proj.id}`, 'PUT', proj);
      setEditingProject(null);
      fetchProjects();
    } catch (err) { alert('Failed to update project'); }
  };
  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await apiRequest(`/corporate-admin/projects/${id}`, 'DELETE');
      fetchProjects();
    } catch (err) { alert('Failed to delete project'); }
  };

  // Stats calculation
  const stats = {
    activeCount: facilities.filter(f => f.status === 'ACTIVE').length,
    multiCcyCount: facilities.filter(f => f.multi_currency_allowed).length,
    fxSuspendedCount: facilities.filter(f => f.status === 'FX_SUSPENDED').length
  };

  // Group facility limits by currency
  const limitsByCurrency = {};
  facilities.forEach(f => {
    const code = f.currency?.iso_code || 'N/A';
    limitsByCurrency[code] = (limitsByCurrency[code] || 0) + (Number(f.total_limit_amount) || 0);
  });

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Landmark className="text-blue-600" size={32} />
            Bank Facilities
          </h1>
          <p className="text-slate-500 font-medium">Global credit lines and issuance governance</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 font-black text-[11px] uppercase tracking-wider transition-all shadow-sm ${showArchived ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
          >
            {showArchived ? <EyeOff size={16} /> : <Eye size={16} />}
            {showArchived ? "Hide Archived" : "Show Archived"}
          </button>

          <button
            onClick={() => { setSelectedFacility(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-xl hover:shadow-blue-500/20"
          >
            <Plus size={16} strokeWidth={3} />
            Create Facility
          </button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={20} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Facility Limits</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(limitsByCurrency).map(([code, amount]) => (
              <span key={code} className="text-lg font-black text-slate-900">{code} <span className="text-base">{amount.toLocaleString()}</span></span>
            ))}
            {Object.keys(limitsByCurrency).length === 0 && <span className="text-lg font-black text-slate-400">—</span>}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><ShieldCheck size={20} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Lines</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.activeCount} <span className="text-sm font-bold text-slate-400 uppercase">Facilities</span></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Coins size={20} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Multi-Currency</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.multiCcyCount} <span className="text-sm font-bold text-slate-400 uppercase">Enabled</span></div>
        </div>
        {stats.fxSuspendedCount > 0 && (
          <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-200 shadow-sm col-span-full md:col-span-1">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl"><AlertCircle size={20} /></div>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">FX Suspended</span>
            </div>
            <div className="text-2xl font-black text-red-700">{stats.fxSuspendedCount} <span className="text-sm font-bold text-red-400 uppercase">Facilities</span></div>
            <p className="text-[10px] text-red-500 mt-1 font-bold">Auto-suspended due to FX rate breach</p>
          </div>
        )}
      </div>

      {/* PROJECTS MANAGEMENT (collapsible) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <button onClick={() => setShowProjects(!showProjects)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><FolderOpen size={18} /></div>
            <div className="text-left">
              <span className="font-black text-slate-900 text-sm">Projects & Contracts</span>
              <span className="text-[10px] text-slate-400 ml-2 font-bold">{projects.length} registered</span>
            </div>
          </div>
          {showProjects ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>
        {showProjects && (
          <div className="border-t border-slate-100 p-5 space-y-3">
            {projects.map(p => (
              editingProject?.id === p.id ? (
                <div key={p.id} className="flex items-center gap-2 bg-orange-50 p-3 rounded-xl border border-orange-200">
                  <input className="flex-1 px-2 py-1 border rounded text-[11px] font-bold" value={editingProject.name} onChange={e => setEditingProject({ ...editingProject, name: e.target.value })} />
                  <select className="px-2 py-1 border rounded text-[11px] font-bold" value={editingProject.project_type} onChange={e => setEditingProject({ ...editingProject, project_type: e.target.value })}>
                    <option value="PROJECT">Project</option><option value="CONTRACT">Contract</option><option value="PURCHASE_ORDER">Purchase Order</option><option value="TENDER">Tender</option><option value="OTHER">Other</option>
                  </select>
                  <select className="px-2 py-1 border rounded text-[11px] font-bold" value={editingProject.status} onChange={e => setEditingProject({ ...editingProject, status: e.target.value })}>
                    <option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
                  </select>
                  <button onClick={() => handleUpdateProject(editingProject)} className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold rounded-lg">Save</button>
                  <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
              ) : (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-3">
                    <Paperclip size={14} className="text-orange-400" />
                    <span className="text-[12px] font-bold text-slate-800">{p.name}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{p.project_type}</span>
                    {p.reference_number && <span className="text-[9px] text-slate-400 font-bold">#{p.reference_number}</span>}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : p.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingProject({ ...p })} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteProject(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            ))}
            {showNewForm ? (
              <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-xl border border-orange-200">
                <input placeholder="Project name" className="flex-1 px-2 py-1 border rounded text-[11px] font-bold" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
                <select className="px-2 py-1 border rounded text-[11px] font-bold" value={newProject.project_type} onChange={e => setNewProject({ ...newProject, project_type: e.target.value })}>
                  <option value="PROJECT">Project</option><option value="CONTRACT">Contract</option><option value="PO">PO</option><option value="TENDER">Tender</option><option value="OTHER">Other</option>
                </select>
                <input placeholder="Ref #" className="w-24 px-2 py-1 border rounded text-[11px] font-bold" value={newProject.reference_number} onChange={e => setNewProject({ ...newProject, reference_number: e.target.value })} />
                <button onClick={handleSaveProject} className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold rounded-lg">Add</button>
                <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
            ) : (
              <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 text-[11px] font-bold text-orange-600 hover:text-orange-700 px-3 py-2">
                <Plus size={14} /> Add Project / Contract
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Syncing Facility Data...</p>
        </div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner">
          <Building2 className="mx-auto text-slate-200 mb-4" size={64} />
          <p className="text-slate-500 font-bold">No facilities found. Initialize a new credit line to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {facilities.map(fac => {
            const total = Number(fac.total_limit_amount) || 0;
            const utilized = Number(fac.utilized_amount) || 0;
            const pct = total > 0 ? (utilized / total) * 100 : 0;
            const isFxSuspended = fac.status === 'FX_SUSPENDED';
            const isArchived = fac.status === 'ARCHIVED' || fac.status === 'SUSPENDED' || isFxSuspended;

            return (
              <div key={fac.id} className={`group bg-white rounded-[2rem] shadow-sm border-2 transition-all hover:shadow-2xl hover:-translate-y-1 ${isArchived ? 'opacity-75 grayscale border-slate-200' : 'border-white hover:border-blue-100'}`}>
                <div className="p-6">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className={`p-4 rounded-2xl shadow-inner ${isArchived ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white group-hover:bg-blue-600 transition-colors'}`}>
                        <Landmark size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 leading-tight tracking-tight text-lg">{fac.facility_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">{fac.bank?.name}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{fac.currency?.iso_code}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isArchived ? (
                        <>
                          <input
                            type="file" accept=".pdf" style={{ display: 'none' }}
                            ref={el => agreementInputRefs[fac.id] = el}
                            onChange={e => { handleAnalyzeAgreement(fac.id, e.target.files[0]); e.target.value = ''; }}
                          />
                          <button
                            onClick={() => agreementInputRefs[fac.id]?.click()}
                            disabled={analyzingFacility === fac.id}
                            title="Verify facility agreement with AI"
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                          >
                            {analyzingFacility === fac.id ? <Loader2 size={18} className="animate-spin" /> : <FileSearch size={18} />}
                          </button>
                          <button onClick={() => handleEdit(fac)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Settings2 size={18} /></button>
                          <button onClick={() => handleArchive(fac.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Archive size={18} /></button>
                        </>
                      ) : (
                        <button onClick={() => handleRestore(fac.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><RotateCcw size={18} /></button>
                      )}
                    </div>
                  </div>

                  {/* Utilization Meter */}
                  <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400 flex items-center gap-1"><ArrowUpRight size={12} /> Utilization</span>
                      <span className={pct > 90 ? 'text-red-600' : 'text-slate-900'}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 rounded-full ${pct > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Limit</span>
                      <span className="text-sm font-black text-slate-700">{fac.currency?.iso_code} {total.toLocaleString()}</span>
                    </div>
                    {/* 🧠 Burn Rate Projection */}
                    {pct > 0 && pct < 100 && fac.start_date && (() => {
                      const startDate = new Date(fac.start_date);
                      const now = new Date();
                      const monthsElapsed = Math.max(1, (now - startDate) / (1000 * 60 * 60 * 24 * 30));
                      const burnRatePerMonth = utilized / monthsElapsed;
                      const remaining = total - utilized;
                      const monthsToFull = burnRatePerMonth > 0 ? remaining / burnRatePerMonth : Infinity;

                      if (monthsToFull > 0 && monthsToFull < 120) {
                        const fullDate = new Date(now);
                        fullDate.setMonth(fullDate.getMonth() + Math.ceil(monthsToFull));
                        const monthName = fullDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                        const isUrgent = monthsToFull <= 3;
                        const isSoon = monthsToFull <= 6;

                        return (
                          <div className={`flex items-center gap-2 mt-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                            isUrgent ? 'bg-red-50 text-red-700 border border-red-100' :
                            isSoon ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            <span className="shrink-0">{isUrgent ? '🔥' : isSoon ? '📈' : '📊'}</span>
                            <span>
                              At current pace, fully utilized by <strong>{monthName}</strong>
                              <span className="ml-1 opacity-70">({Math.ceil(monthsToFull)} mo remaining)</span>
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${fac.multi_currency_allowed ? 'border-blue-100 bg-blue-50/50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>
                      <Coins size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Multi-CCY</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${fac.allow_cross_border ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}>
                      <Globe size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Cross-Border</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${fac.fx_breach_auto_suspend ? 'border-amber-100 bg-amber-50/50 text-amber-700' : 'border-slate-100 text-slate-400'}`}>
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">FX Protection</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${fac.review_date ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-100 text-slate-400'}`}>
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Next Review</span>
                    </div>
                  </div>

                  {/* Sub-Limits Peek */}
                  <div className="space-y-2 border-t border-slate-100 pt-5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Sub-Limit Allocation</h4>
                    {fac.sub_limits && fac.sub_limits.slice(0, 3).map(sl => (
                      <div key={sl.id} className="flex justify-between items-center text-[11px] p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <span className="text-slate-600 font-bold">{sl.limit_name || 'General Allocation'}</span>
                        <span className="text-slate-900 font-black">{Number(sl.limit_amount).toLocaleString()}</span>
                      </div>
                    ))}
                    {fac.sub_limits?.length > 3 && (
                      <div className="text-center pt-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase">+{fac.sub_limits.length - 3} More Allocations</span>
                      </div>
                    )}
                  </div>
                </div>
                {isFxSuspended && (
                  <div className="bg-red-100 py-2.5 text-center text-[10px] font-black text-red-700 uppercase tracking-widest rounded-b-[2rem] flex items-center justify-center gap-2">
                    <AlertCircle size={14} /> FX Rate Breach — Facility Auto-Suspended
                  </div>
                )}
                {isArchived && !isFxSuspended && (
                  <div className="bg-slate-100 py-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest rounded-b-[2rem]">
                    Facility Inactive / Archived
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* H1: Agreement Analysis Result Panel */}
      {agreementResult && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setAgreementResult(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileSearch size={20} className="text-violet-600" />
                  Agreement Verification
                </h3>
                <button onClick={() => setAgreementResult(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {agreementResult.status === 'TOO_LARGE' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-sm font-semibold text-amber-800">{agreementResult.message}</p>
                </div>
              )}
              {agreementResult.status === 'ERROR' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                  <XCircle className="text-red-600 shrink-0" size={20} />
                  <p className="text-sm font-semibold text-red-800">{agreementResult.message}</p>
                </div>
              )}
              {agreementResult.status === 'OK' && (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-bold text-slate-600">
                      {agreementResult.mismatches === 0
                        ? '✅ All compared fields match the agreement'
                        : `⚠️ ${agreementResult.mismatches} potential mismatch${agreementResult.mismatches > 1 ? 'es' : ''} found`
                      }
                    </span>
                  </div>
                  {agreementResult.comparison?.map((c, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                      c.match ? 'border-green-100 bg-green-50/50' : 'border-amber-100 bg-amber-50/50'
                    }`}>
                      {c.match ? <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />}
                      <div className="flex-1">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{c.label}</p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs"><span className="text-slate-400">System:</span> <span className="font-bold text-slate-700">{c.current_value || '—'}</span></span>
                          <span className="text-xs"><span className="text-slate-400">Agreement:</span> <span className="font-bold text-slate-700">{c.agreement_value}</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {agreementResult.special_terms?.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Special Terms Detected</p>
                      <ul className="space-y-1">
                        {agreementResult.special_terms.map((t, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="text-violet-500 mt-0.5">•</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 italic text-center pt-2">This is an advisory AI analysis — for reference only</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <FacilityFormModal
          facility={selectedFacility}
          onClose={() => { setShowModal(false); setSelectedFacility(null); }}
          onSuccess={() => { fetchFacilities(); setShowModal(false); }}
        />
      )}
    </div>
  );
}