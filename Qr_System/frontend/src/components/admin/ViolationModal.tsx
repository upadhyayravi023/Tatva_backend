import React from 'react';
import { X, FileWarning } from 'lucide-react';
import ParticipantTable from './ParticipantTable';

interface Participant {
  id: string;
  name: string;
  team: string;
  rollNumber: string;
  inside: boolean;
  remainingShort: number;
  remainingLunch: number;
  remainingBreakfast: number;
  hasViolation: boolean;
  qrId: string;
}

interface ViolationModalProps {
  participants: Participant[];
  onClose: () => void;
}

const ViolationModal: React.FC<ViolationModalProps> = ({ participants, onClose }) => {
  // Prevent clicks inside the modal from closing it
  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-rose-200 bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg shrink-0">
              <FileWarning className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-rose-900 tracking-tight">Rule Violations</h2>
              <p className="text-sm text-rose-600 font-medium">{participants.length} Participant{participants.length !== 1 ? 's' : ''} have triggered flags</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <ParticipantTable data={participants} />
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViolationModal;
