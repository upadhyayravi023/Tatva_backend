import React, { useState } from 'react';
import QRScannerCamera from '../components/scanner/QRScannerCamera';
import ScanResultOverlay from '../components/scanner/ScanResultOverlay';
import RegisterModal from '../components/scanner/RegisterModal';
import { api, type ActionType, type BreakType, type ScanResult } from '../api/api';
import { LogIn, LogOut, Coffee, Sunrise, Utensils, Scan, QrCode, Shield } from 'lucide-react';

const ScannerPage: React.FC = () => {
  const [mode, setMode] = useState<ActionType>('ENTRY');
  const [breakType, setBreakType] = useState<BreakType>('NONE');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [unknownQrId, setUnknownQrId] = useState<string | null>(null);
  const [exitConfirmData, setExitConfirmData] = useState<{qrId: string, breakType: BreakType, violationCount: number, isLimitReached: boolean} | null>(null);

  const handleScan = async (data: string) => {
    if (isLoading || result) return;
    setIsLoading(true);
    try {
      let res: ScanResult;
      switch (mode) {
        case 'INITIAL':
          res = await api.initialScan(data);
          break;
        case 'EXIT':
          const targetBreak = breakType === 'NONE' ? 'SHORT' : breakType;
          try {
            const statusRes = await api.getParticipantStatus(data);
            if (statusRes.success) {
              const stats = statusRes.data;
              const history = statusRes.data.history || [];
              let limitReached = false;
              if (targetBreak === 'SHORT' && stats.shortBreaksRemaining === 0) limitReached = true;
              if (targetBreak === 'LUNCH' && stats.lunchBreaksRemaining === 0) limitReached = true;
              if (targetBreak === 'BREAKFAST' && stats.breakfastBreaksRemaining === 0) limitReached = true;

              const violationCount = history.filter((l: any) => l.violationFlag && l.breakType === targetBreak).length;
              if (limitReached) {
                setExitConfirmData({ qrId: data, breakType: targetBreak as BreakType, violationCount, isLimitReached: true });
                setIsLoading(false);
                return; // Wait for user interaction
              } else if (violationCount > 0) {
                setExitConfirmData({ qrId: data, breakType: targetBreak as BreakType, violationCount, isLimitReached: false });
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            // Ignore error here and let the regular exitScan handle it gracefully
          }
          res = await api.exitScan(data, targetBreak);
          break;
        case 'ENTRY':
        default:
          res = await api.entryScan(data);
          break;
      }
      if (!res.success && res.message?.includes('not found')) {
        setUnknownQrId(data);
        setIsRegisterOpen(true);
        setResult(null);
      } else {
        setResult(res);
      }
    } catch (err: any) {
      setResult({ success: false, data: { qrId: data }, message: err.message || 'Network error.' });
    } finally {
      setIsLoading(false);
    }
  };

  const forceExit = async (qrId: string, bType: BreakType) => {
    setExitConfirmData(null);
    if (isLoading || result) return;
    setIsLoading(true);
    try {
      const res = await api.exitScan(qrId, bType);
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, data: { qrId }, message: err.message || 'Network error.' });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResult = () => setResult(null);

  const modeConfig = {
    ENTRY:   { label: 'Entry Mode',    color: 'text-emerald-400', dot: 'bg-emerald-400', hint: 'Scan QR code to log participant entry' },
    EXIT:    { label: 'Exit Mode',     color: 'text-rose-400',    dot: 'bg-rose-400',    hint: 'Select break type, then scan to exit' },
    INITIAL: { label: 'Initial Scan', color: 'text-blue-400',    dot: 'bg-blue-400',    hint: 'Scan for initial participant entry' },
  };
  const currentMode = modeConfig[mode];

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-[#0a0f1e]">

      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-800/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">ByteVerse</h1>
            <p className="text-xs text-slate-500 font-medium">Entry Management</p>
          </div>
        </div>

        {/* Live status chip */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          mode === 'ENTRY'   ? 'border-emerald-500/30 bg-emerald-500/10' :
          mode === 'EXIT'    ? 'border-rose-500/30 bg-rose-500/10' :
                               'border-blue-500/30 bg-blue-500/10'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${currentMode.dot}`} />
          <span className={`text-xs font-semibold ${currentMode.color}`}>{currentMode.label}</span>
        </div>
      </header>

      {/* Camera Viewport */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 py-2 min-h-0">
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.8)' }}
        >
          <QRScannerCamera onScan={handleScan} isLoading={isLoading} />

          {/* Animated scanning line */}
          {!isLoading && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent scanner-line-animation opacity-80" />
          )}

          {/* Premium corner reticle */}
          <div className="absolute inset-0 pointer-events-none custom-scanner-reticle-v2" />

          {/* Bottom vignette */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </div>

        {/* Context hint */}
        <p className="text-center text-slate-600 text-xs font-medium mt-3 tracking-wide">
          {currentMode.hint}
        </p>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex-none px-4 pb-10 pt-3 space-y-3">

        {/* Mode selector tabs */}
        <div className="bg-white/5 border border-white/[0.07] backdrop-blur-sm p-1.5 rounded-2xl flex gap-1.5">
          <ModeToggle
            icon={<Scan size={18} />} label="Initial Scan"
            isActive={mode === 'INITIAL'} activeClass="bg-blue-600 shadow-lg shadow-blue-600/30"
            onClick={() => setMode('INITIAL')}
          />
          <ModeToggle
            icon={<LogIn size={18} />} label="Entry"
            isActive={mode === 'ENTRY'} activeClass="bg-emerald-600 shadow-lg shadow-emerald-600/30"
            onClick={() => setMode('ENTRY')}
          />
          <ModeToggle
            icon={<LogOut size={18} />} label="Exit"
            isActive={mode === 'EXIT'} activeClass="bg-rose-600 shadow-lg shadow-rose-600/30"
            onClick={() => { setMode('EXIT'); setBreakType('SHORT'); }}
          />
        </div>

        {/* Break Type Picker */}
        {mode === 'EXIT' && (
          <div className="animate-in slide-in-from-bottom-3 fade-in duration-300 space-y-2">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest ml-1">Select Exit Type</p>
            <div className="grid grid-cols-2 gap-2.5">
              <BreakButton
                icon={<Coffee className="w-5 h-5" />}
                label="Short Break"
                sublabel="Max 4 allowed"
                isActive={breakType === 'SHORT'}
                activeClass="border-blue-500 bg-blue-500/10"
                inactiveClass="border-white/[0.07] bg-white/5"
                iconClass={breakType === 'SHORT' ? 'text-blue-400' : 'text-slate-600'}
                onClick={() => setBreakType('SHORT')}
              />
              <BreakButton
                icon={<Utensils className="w-5 h-5" />}
                label="Lunch Break"
                sublabel="Max 2 allowed"
                isActive={breakType === 'LUNCH'}
                activeClass="border-amber-500 bg-amber-500/10"
                inactiveClass="border-white/[0.07] bg-white/5"
                iconClass={breakType === 'LUNCH' ? 'text-amber-400' : 'text-slate-600'}
                onClick={() => setBreakType('LUNCH')}
              />
              <BreakButton
                icon={<Sunrise className="w-5 h-5" />}
                label="Breakfast"
                sublabel="Max 1 allowed"
                isActive={breakType === 'BREAKFAST'}
                activeClass="border-orange-500 bg-orange-500/10"
                inactiveClass="border-white/[0.07] bg-white/5"
                iconClass={breakType === 'BREAKFAST' ? 'text-orange-400' : 'text-slate-600'}
                onClick={() => setBreakType('BREAKFAST')}
              />
            </div>
          </div>
        )}

        {/* Footer brand */}
        <div className="flex items-center justify-center gap-2 py-1">
          <Shield className="w-3.5 h-3.5 text-slate-700" />
          <p className="text-slate-700 text-xs font-medium">ByteVerse · Secure Entry System</p>
        </div>
      </div>

      {/* Result / Register Overlays */}
      <ScanResultOverlay
        result={result}
        onClear={clearResult}
        onRegister={() => setIsRegisterOpen(true)}
      />
      {isRegisterOpen && (
        <RegisterModal
          isOpen={isRegisterOpen}
          onClose={() => { setIsRegisterOpen(false); setUnknownQrId(null); }}
          initialQrId={unknownQrId || result?.data?.qrId}
        />
      )}

      {/* Limit Confirmation Overlay */}
      {exitConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="mb-4">
              <h3 className="text-xl font-black text-rose-600 mb-1">
                {exitConfirmData.isLimitReached ? "Limit Reached!" : "Attention Required"}
              </h3>
              <p className="text-sm font-medium text-slate-500">
                {exitConfirmData.isLimitReached ? (
                  <>They have already hit the <span className="font-extrabold text-slate-800">{exitConfirmData.breakType}</span> break limit.</>
                ) : (
                  <>This participant is requesting a <span className="font-extrabold text-slate-800">{exitConfirmData.breakType}</span> break.</>
                )}
              </p>
            </div>
            
            <div className="bg-rose-50 border border-dashed border-rose-200 rounded-xl p-3 mb-5 flex items-center gap-3">
              <div className="bg-white text-rose-600 font-black h-10 w-10 flex items-center justify-center rounded-lg shadow-sm border border-rose-100 shrink-0">
                {exitConfirmData.violationCount}
              </div>
              <p className="text-sm font-semibold text-rose-900 leading-tight">
                previous <span className="font-bold">{exitConfirmData.breakType}</span> break violations on record for this volunteer.
              </p>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Do you still want to proceed?</p>
            
            <div className="flex gap-2.5">
              <button 
                onClick={() => setExitConfirmData(null)}
                className="flex-1 py-3 px-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => forceExit(exitConfirmData.qrId, exitConfirmData.breakType)}
                className="flex-[1.5] py-3 px-2 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4 ml-1" />
                Let Them Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────── */

interface ModeToggleProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  activeClass: string;
  onClick: () => void;
}
const ModeToggle = ({ icon, label, isActive, activeClass, onClick }: ModeToggleProps) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all duration-200 active:scale-95 ${
      isActive ? `${activeClass} text-white` : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="text-[10px] font-bold mt-1.5 uppercase tracking-wider">{label}</span>
  </button>
);

interface BreakButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  isActive: boolean;
  activeClass: string;
  inactiveClass: string;
  iconClass: string;
  onClick: () => void;
}
const BreakButton = ({ icon, label, sublabel, isActive, activeClass, inactiveClass, iconClass, onClick }: BreakButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 active:scale-95 text-left w-full ${
      isActive ? activeClass : inactiveClass
    }`}
  >
    <span className={`shrink-0 transition-colors ${iconClass}`}>{icon}</span>
    <div>
      <p className={`text-sm font-bold leading-none ${isActive ? 'text-white' : 'text-slate-300'}`}>{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{sublabel}</p>
    </div>
  </button>
);

export default ScannerPage;
