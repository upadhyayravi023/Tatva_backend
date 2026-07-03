import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { ScanResult } from '../../api/api';

interface ScanResultOverlayProps {
  result: ScanResult | null;
  onClear: () => void;
  onRegister?: () => void;
}

const ScanResultOverlay: React.FC<ScanResultOverlayProps> = ({ result, onClear, onRegister }) => {
  if (!result) return null;

  const isViolation = !result.success; // Only treat it as an error if the request actually failed
  const bgColor = isViolation ? 'bg-red-500' : (result.violationAlert ? 'bg-amber-500' : 'bg-emerald-500');
  const Icon = isViolation ? XCircle : CheckCircle;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${bgColor} text-white p-6 animate-in fade-in zoom-in duration-200`}>
       <Icon className="w-32 h-32 mb-6" />
       <h1 className="text-4xl font-black mb-2 text-center uppercase tracking-wide">
         {isViolation ? 'Error Detected' : (result.violationAlert ? 'Violation Flagged!' : 'Scan Successful')}
       </h1>
       
       <div className="text-center mt-4">
         <p className="text-xl font-medium mb-1">
            {result.data?.qrId || 'Unknown QR ID'}
         </p>
         <p className="text-lg opacity-90 mt-4 max-w-sm">
           {result.message}
         </p>
         {result.violationAlert && (
           <div className="mt-6 bg-white text-red-600 px-5 py-3 rounded-xl shadow-lg border-2 border-red-200">
             <p className="text-sm font-bold uppercase tracking-wider mb-1 text-red-400">System Alert</p>
             <p className="text-lg font-black leading-tight">{result.violationAlert}</p>
           </div>
         )}
       </div>

       <div className="flex flex-col gap-3 mt-12 w-full max-w-xs mx-auto">
         {onRegister && result.message?.includes('not found') && (
           <button 
             className="bg-blue-600 text-white font-bold text-xl py-4 rounded-full shadow-xl active:scale-95 transition-transform"
             onClick={onRegister}
           >
             Register New
           </button>
         )}
         <button 
           className="bg-white text-black font-bold text-xl py-4 rounded-full shadow-xl active:scale-95 transition-transform"
           onClick={onClear}
         >
           Scan Next
         </button>
       </div>
    </div>
  );
};

export default ScanResultOverlay;
