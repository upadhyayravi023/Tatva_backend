import React from 'react';
import { Settings as SettingsIcon, Coffee, Utensils, Sunrise, Hash, Timer, Lock } from 'lucide-react';

const SettingsPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-100">
        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl relative">
          <SettingsIcon className="w-5 h-5" />
          <div className="absolute -bottom-1 -right-1 bg-slate-800 text-white rounded-full p-0.5 border-2 border-white">
            <Lock className="w-2.5 h-2.5" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rule Engine Configuration</h2>
          <p className="text-sm text-slate-500 mt-0.5">Global break limits are fixed by administration. Enforced strictly at scanners.</p>
        </div>
      </div>

      <div className="space-y-8">

        {/* ── Short Break Section ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Short Break Rules</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pl-4 sm:pl-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Hash className="w-3.5 h-3.5" />
                <label className="text-sm font-semibold">Maximum Count</label>
              </div>
              <p className="text-xs text-slate-400">Total short breaks allowed.</p>
              <div className="mt-2 text-xl font-black text-slate-800">4 <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-1">breaks</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Timer className="w-3.5 h-3.5" />
                <label className="text-sm font-semibold">Max Duration Per Break</label>
              </div>
              <p className="text-xs text-slate-400">Violation flagged if exceeded.</p>
              <div className="mt-2 text-xl font-black text-slate-800">30 <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-1">mins</span></div>
            </div>
          </div>
        </div>

        {/* ── Lunch Break Section ── */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Lunch Break Rules</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pl-4 sm:pl-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Hash className="w-3.5 h-3.5" />
                <label className="text-sm font-semibold">Maximum Count</label>
              </div>
              <p className="text-xs text-slate-400">Total lunch breaks allowed.</p>
              <div className="mt-2 text-xl font-black text-slate-800">2 <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-1">breaks</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Timer className="w-3.5 h-3.5" />
                <label className="text-sm font-semibold">Max Duration Per Break</label>
              </div>
              <p className="text-xs text-slate-400">Violation flagged if exceeded.</p>
              <div className="mt-2 text-xl font-black text-slate-800">45 <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-1">mins</span></div>
            </div>
          </div>
        </div>

        {/* ── Breakfast Break Section ── */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Sunrise className="w-4 h-4 text-orange-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Breakfast Break Rules</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pl-4 sm:pl-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Hash className="w-3.5 h-3.5" />
                <label className="text-sm font-semibold">Maximum Count</label>
              </div>
              <p className="text-xs text-slate-400">Total breakfast breaks allowed.</p>
              <div className="mt-2 text-xl font-black text-slate-800">1 <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-1">break</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Timer className="w-3.5 h-3.5" />
                <label className="text-sm font-semibold">Max Duration Per Break</label>
              </div>
              <p className="text-xs text-slate-400">Violation flagged if exceeded.</p>
              <div className="mt-2 text-xl font-black text-slate-800">45 <span className="text-sm font-medium text-slate-500 uppercase tracking-widest pl-1">mins</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
