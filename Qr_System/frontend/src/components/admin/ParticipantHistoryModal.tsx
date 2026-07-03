import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { X, Loader2, Clock, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ParticipantHistoryModalProps {
  qrId: string;
  onClose: () => void;
}

const ParticipantHistoryModal: React.FC<ParticipantHistoryModalProps> = ({ qrId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.getParticipantStatus(qrId);
        if (response.success) {
          setData(response.data);
        } else {
          toast.error(response.message || 'Failed to fetch history');
          onClose();
        }
      } catch (err: any) {
        toast.error(err.message || 'Error fetching history');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [qrId, onClose]);

  if (!qrId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Tracking History</h2>
            {data && (
              <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">
                {data.participant.name} &bull; {data.participant.rollNumber}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {loading ? (
            <div className="flex justify-center py-10 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : !data || !data.history || data.history.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">No scanning history found.</div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {data.history.map((log: any, index: number) => {
                const dateObj = new Date(log.timestamp);
                const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const isEntry = log.scanType === 'ENTRY';
                
                return (
                  <div key={log._id || index} className="relative pl-6">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[17px] top-1 flex items-center justify-center w-8 h-8 rounded-full border-4 border-white shadow-sm ${isEntry ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {isEntry ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5 ml-0.5" />}
                    </div>
                    
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 relative">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {isEntry ? 'Entry' : 'Exit'} 
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            log.breakType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 
                            log.breakType === 'LUNCH' ? 'bg-amber-100 text-amber-700' : 
                            log.breakType === 'BREAKFAST' ? 'bg-orange-100 text-orange-700' : 
                            log.breakType === 'SLEEP' ? 'bg-indigo-100 text-indigo-700' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {log.breakType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <span>{dateStr}</span>
                          <span className="text-slate-300">&bull;</span>
                          <time className="flex items-center gap-1 text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-slate-400"/> {timeStr}
                          </time>
                        </div>
                      </div>
                      
                      {isEntry && log.breakDurationMins !== undefined && (
                        <div className="mt-2.5 text-[11px] font-semibold px-2 py-1 bg-slate-50 text-slate-600 rounded-md inline-flex items-center border border-slate-200 shadow-sm">
                          Time outside: <span className="ml-1 text-slate-800">{log.breakDurationMins} min</span>
                        </div>
                      )}
                      
                      {log.violationFlag && (
                        <div className="mt-2.5 text-[11px] font-semibold px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-md flex items-start gap-1.5 border border-rose-200 shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                          <span>{log.violationReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantHistoryModal;
