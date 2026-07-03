export type ActionType = 'ENTRY' | 'EXIT' | 'INITIAL';
export type BreakType = 'SHORT' | 'LUNCH' | 'BREAKFAST' | 'NONE';

export interface ScanResult {
  success: boolean;
  data: any;
  message?: string;
  violationAlert?: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = {
  // Participant Register Mock (Using fetch)
  register: async (data: any) => {
    const res = await fetch(`${API_BASE}/participants/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Initial Scan
  initialScan: async (qrId: string): Promise<ScanResult> => {
    try {
      const res = await fetch(`${API_BASE}/scan/initial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrId }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, data: { qrId }, message: data.error };
      }
      if (data.data && !data.data.qrId) {
        data.data.qrId = qrId;
      }
      return data;
    } catch (e: any) {
      return { success: false, data: { qrId }, message: 'Backend unreachable: ' + e.message };
    }
  },

  // Exit Scan
  exitScan: async (qrId: string, breakType: BreakType): Promise<ScanResult> => {
    try {
      const res = await fetch(`${API_BASE}/scan/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrId, breakType }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, data: { qrId }, message: data.error };
      }
      if (data.data && !data.data.qrId) {
        data.data.qrId = qrId;
      }
      return data;
    } catch (e: any) {
      return { success: false, data: { qrId }, message: 'Backend unreachable: ' + e.message };
    }
  },

  // Entry Scan (Triggers rules)
  entryScan: async (qrId: string): Promise<ScanResult> => {
    try {
      const res = await fetch(`${API_BASE}/scan/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrId }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, data: { qrId }, message: data.error };
      }
      if (data.data && !data.data.qrId) {
        data.data.qrId = qrId;
      }
      return data;
    } catch (e: any) {
      return { success: false, data: { qrId }, message: 'Backend unreachable: ' + e.message };
    }
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/admin/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  getParticipants: async () => {
    const res = await fetch(`${API_BASE}/admin/participants`);
    if (!res.ok) throw new Error('Failed to fetch participants');
    return res.json();
  },

  getParticipantStatus: async (qrId: string) => {
    const res = await fetch(`${API_BASE}/participants/${qrId}`);
    if (!res.ok) throw new Error('Failed to fetch participant status');
    return res.json();
  },

  getSettings: async () => {
    const res = await fetch(`${API_BASE}/admin/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (data: { maxShortBreaks?: number; maxShortBreakDurationMins?: number }) => {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }
};
