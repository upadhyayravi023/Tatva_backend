import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { Loader2, UserPlus, X, QrCode, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQrId?: string | null;
}

const INPUT_BASE = "w-full bg-[#0f1729] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition-all duration-200";
const LABEL_BASE = "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5";

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, initialQrId }) => {
  const [formData, setFormData] = useState({
    qrId: '',
    name: '',
    teamName: '',
    teamId: '',
    rollNumber: '',
    mobile: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-populate QR ID when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, qrId: initialQrId || '' }));
      setIsSuccess(false);
    }
  }, [isOpen, initialQrId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        teamId: formData.teamId || formData.teamName,
        teamName: formData.teamName,
      };
      const res = await api.register(payload);
      if (res.success) {
        setIsSuccess(true);
        toast.success('Participant registered successfully!');
        setTimeout(() => onClose(), 1800);
      } else {
        toast.error(res.error || res.message || 'Registration failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">

      {/* Success state */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-500 text-white animate-in zoom-in duration-300">
          <CheckCircle className="w-24 h-24 mb-4" />
          <h2 className="text-3xl font-black tracking-tight">Registered!</h2>
          <p className="text-emerald-100 mt-2 font-medium">{formData.name} is now in the system.</p>
        </div>
      )}

      <div className="w-full sm:max-w-md bg-[#0d1426] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-none tracking-tight">Register Participant</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Fill in the details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form id="reg-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* QR ID — auto-filled and readonly when scanned */}
          <div>
            <label className={LABEL_BASE}>QR Code ID</label>
            <div className="relative">
              <QrCode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
              <input
                required
                name="qrId"
                value={formData.qrId}
                onChange={handleChange}
                readOnly={!!initialQrId}
                className={`${INPUT_BASE} pl-10 ${initialQrId ? 'opacity-60 cursor-not-allowed font-mono text-blue-300 bg-blue-500/5 border-blue-500/20' : ''}`}
                placeholder="Scan QR or enter ID manually"
              />
            </div>
            {initialQrId && (
              <p className="text-xs text-blue-400/70 mt-1.5 ml-1 font-medium">Auto-filled from scanned QR code</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className={LABEL_BASE}>Full Name</label>
            <input
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={INPUT_BASE}
              placeholder="e.g. Alice"
              autoFocus={!initialQrId}
            />
          </div>

          {/* Roll + Mobile */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_BASE}>Roll Number</label>
              <input
                required
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                className={`${INPUT_BASE} uppercase`}
                placeholder="e.g. 22CS101"
              />
            </div>
            <div>
              <label className={LABEL_BASE}>Mobile</label>
              <input
                required
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                className={INPUT_BASE}
                placeholder="10-digit"
                type="tel"
                maxLength={10}
              />
            </div>
          </div>

          {/* Team Name */}
          <div>
            <label className={LABEL_BASE}>Team Name</label>
            <input
              required
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              className={INPUT_BASE}
              placeholder="e.g. Team Alpha"
            />
          </div>

        </form>

        {/* Submit Footer */}
        <div className="px-6 pb-8 pt-4 border-t border-white/[0.07] shrink-0">
          <button
            disabled={isLoading}
            type="submit"
            form="reg-form"
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</>
              : <><UserPlus className="w-5 h-5" /> Complete Registration</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
