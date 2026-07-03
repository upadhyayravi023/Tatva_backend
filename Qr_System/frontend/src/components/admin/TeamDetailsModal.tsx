import React from 'react';
import { X, Users } from 'lucide-react';
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

interface TeamDetailsModalProps {
  teamName: string;
  participants: Participant[];
  onClose: () => void;
}

const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({ teamName, participants, onClose }) => {
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
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Team Details: {teamName}</h2>
              <p className="text-sm text-slate-500 font-medium">{participants.length} Participant{participants.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
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

export default TeamDetailsModal;
