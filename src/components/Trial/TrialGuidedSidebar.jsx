// src/components/Trial/TrialGuidedSidebar.jsx
import React from 'react';
import {
  Compass,
  Shield,
  Send,
  FileCheck,
  TrendingUp,
  CheckCircle2,
  Layers,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { TRIAL_GUIDED_NAV_ITEMS } from './trialSalesCatalog';
import { PERSONA_LABELS } from './useTrialExperience';

const ICON_MAP = {
  compass: Compass,
  shield: Shield,
  send: Send,
  fileCheck: FileCheck,
  trendingUp: TrendingUp,
};

export function TrialGuidedSidebar({
  isCollapsed = false,
  isDrawer = false,
  pathname = '',
  search = '',
  activeRole = 'end_user',
  sandboxStatus = null,
  moduleFlags = {},
  isSwitchingRole = false,
  onNavigateTarget,
  onUnlockFullMenu,
}) {
  const expanded = !isCollapsed || isDrawer;
  const pathLower = (pathname || '').toLowerCase();
  const stepsCompleted = sandboxStatus?.steps_completed || {};
  const daysLeft = sandboxStatus?.days_remaining;

  const visibleItems = TRIAL_GUIDED_NAV_ITEMS.filter((item) => {
    if (!item.moduleProp) return true;
    return moduleFlags[item.moduleProp] !== false;
  });

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      <div className="space-y-1.5">
        {expanded && (
          <div className="px-3 py-1.5 mb-2 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Easy Trial View
              </span>
            </div>
            {daysLeft != null && (
              <span className="text-[10px] font-bold text-emerald-200">{daysLeft}d left</span>
            )}
          </div>
        )}

        {visibleItems.map((item) => {
          const IconComp = ICON_MAP[item.icon] || Compass;
          const active = item.isActive(pathLower, search);
          const done = item.completedKey ? Boolean(stepsCompleted[item.completedKey]) : false;
          const targetPath = item.getPath(activeRole);

          return (
            <div key={item.id}>
              <button
                type="button"
                disabled={isSwitchingRole}
                onClick={() => onNavigateTarget(targetPath, item.requiredRole)}
                title={!expanded ? item.label : ''}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                  active
                    ? 'bg-blue-500/20 text-white border border-blue-400/35 shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.07] border border-transparent'
                }`}
              >
                <div className={`flex items-center min-w-0 ${!expanded ? 'mx-auto' : ''}`}>
                  <IconComp
                    className={`h-5 w-5 flex-shrink-0 ${
                      active ? 'text-blue-400' : done ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  {expanded && (
                    <div className="ml-3 min-w-0">
                      <div className="text-sm font-semibold leading-tight truncate">
                        {item.label}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {expanded && done && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                )}
              </button>

              {expanded && active && item.subItems && item.subItems.length > 0 && (
                <div className="mt-1 ml-6 pl-3 border-l border-white/15 space-y-0.5">
                  {item.subItems.map((sub) => {
                    const subPath = sub.getPath ? sub.getPath(activeRole) : sub.path;
                    const matchSet = Array.isArray(sub.matchPaths) ? sub.matchPaths : [subPath];
                    const subActive = matchSet.some(
                      (mp) => mp && pathLower === String(mp).toLowerCase()
                    );
                    return (
                      <button
                        key={sub.label}
                        type="button"
                        disabled={isSwitchingRole}
                        onClick={() => onNavigateTarget(subPath, sub.requiredRole || null)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer block truncate ${
                          subActive
                            ? 'bg-blue-500/20 text-blue-300 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Toggle: Show All 16 Menus */}
      <div className="pt-3 border-t border-white/10">
        <button
          type="button"
          onClick={onUnlockFullMenu}
          title={!expanded ? 'Show All Menus' : ''}
          className="w-full rounded-xl p-2.5 bg-white/[0.05] hover:bg-white/[0.11] border border-white/15 text-left transition-all cursor-pointer group"
        >
          <div className={`flex items-center ${!expanded ? 'justify-center' : 'gap-2.5'}`}>
            <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
            {expanded && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  Show All Menus
                </div>
                <div className="text-[10px] text-slate-400 leading-snug mt-0.5">
                  Open all 16 pages, Approvals, Reports &amp; Settings
                </div>
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

export function TrialFullModeSidebarHeader({
  isCollapsed = false,
  isDrawer = false,
  activeRole = 'end_user',
  personas = [],
  isSwitchingRole = false,
  onSwitchToGuided,
  onSwitchPersona,
}) {
  const expanded = !isCollapsed || isDrawer;

  if (!expanded) {
    return (
      <div className="mb-2 pb-2 border-b border-white/10 flex justify-center">
        <button
          type="button"
          onClick={onSwitchToGuided}
          title="Back to Easy Trial View"
          className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/30 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 p-2.5 rounded-xl bg-slate-950/55 border border-white/15 space-y-2">
      <button
        type="button"
        onClick={onSwitchToGuided}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-emerald-200 text-xs font-bold transition-colors cursor-pointer"
      >
        <span className="inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Easy View</span>
        </span>
        <span className="text-[10px] opacity-80">5 Menus</span>
      </button>

      {personas.length > 1 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-0.5">
            <Users className="w-3 h-3 text-amber-400" />
            <span>Switch User Role</span>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-lg border border-white/10">
            {personas.map((p) => {
              const selected = p.role === activeRole;
              return (
                <button
                  key={p.role}
                  type="button"
                  disabled={isSwitchingRole}
                  onClick={() => onSwitchPersona(p.role, null, false)}
                  className={`py-1 px-1.5 rounded text-[11px] font-bold transition-all cursor-pointer truncate ${
                    selected
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {PERSONA_LABELS[p.role] || p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
