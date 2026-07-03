import React from 'react';
import { ChevronRight } from 'lucide-react';

interface TeamStat {
  teamName: string;
  totalMembers: number;
  currentlyInside: number;
}

interface Props {
  data: TeamStat[];
  onTeamClick?: (teamName: string) => void;
}

const statusConfig = (team: TeamStat) => {
  if (team.currentlyInside === team.totalMembers) return { label: 'All Present', cls: 'bg-emerald-100 text-emerald-700' };
  if (team.currentlyInside === 0) return { label: 'All Outside', cls: 'bg-rose-100 text-rose-700' };
  return { label: 'Partial', cls: 'bg-amber-100 text-amber-700' };
};

const TeamStatsTable: React.FC<Props> = ({ data, onTeamClick }) => {
  const clickable = !!onTeamClick;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-sm">

      {/* ── Mobile Card View (< md) ─────────────────────────────── */}
      <div className="md:hidden divide-y divide-slate-100">
        {data.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-400 text-sm">No teams found.</p>
        )}
        {data.map((team, idx) => {
          const { label, cls } = statusConfig(team);
          return (
            <div
              key={idx}
              onClick={() => onTeamClick?.(team.teamName)}
              className={`flex items-center justify-between px-4 py-3.5 gap-3 ${clickable ? 'cursor-pointer active:bg-slate-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 truncate">{team.teamName}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {team.currentlyInside}/{team.totalMembers} inside
                </p>
              </div>
              {clickable && <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />}
            </div>
          );
        })}
      </div>

      {/* ── Desktop Table View (≥ md) ───────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-3.5 font-semibold text-slate-600">Team Name</th>
              <th className="px-5 py-3.5 font-semibold text-slate-600">Total</th>
              <th className="px-5 py-3.5 font-semibold text-slate-600">Inside</th>
              <th className="px-5 py-3.5 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((team, idx) => {
              const { label, cls } = statusConfig(team);
              return (
                <tr
                  key={idx}
                  className={`transition-colors ${clickable ? 'hover:bg-slate-50 cursor-pointer' : 'hover:bg-slate-50/50'}`}
                  onClick={() => onTeamClick?.(team.teamName)}
                >
                  <td className="px-5 py-3.5 font-bold text-slate-900">{team.teamName}</td>
                  <td className="px-5 py-3.5 text-slate-600">{team.totalMembers}</td>
                  <td className="px-5 py-3.5 text-slate-600">{team.currentlyInside}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No teams found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamStatsTable;
