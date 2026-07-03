import React from 'react';
import { Search, SlidersHorizontal, XCircle } from 'lucide-react';

export type FilterStatusType = 'ALL' | 'INSIDE' | 'OUTSIDE';
export type FilterViolationType = 'ALL' | 'ONLY_VIOLATORS';

interface FilterControlsProps {
  search: string;
  setSearch: (val: string) => void;
  status: FilterStatusType;
  setStatus: (val: FilterStatusType) => void;
  violation: FilterViolationType;
  setViolation: (val: FilterViolationType) => void;
  className?: string;
}

const SELECT_CLASS = "text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-white transition-all duration-200 cursor-pointer w-full";

const FilterControls: React.FC<FilterControlsProps> = ({
  search, setSearch, status, setStatus, violation, setViolation, className = ""
}) => {
  const hasFilters = search !== '' || status !== 'ALL' || violation !== 'ALL';

  return (
    <div className={`bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-xl p-3 sm:p-4 space-y-3 ${className}`}>

      {/* Search bar — full width always */}
      <div className="relative w-full group">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Search by Name, Team, or QR ID..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:bg-white transition-all duration-300"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Filter:</span>
        </div>

        <select
          className={`${SELECT_CLASS} flex-1 min-w-[130px]`}
          value={status}
          onChange={(e) => setStatus(e.target.value as FilterStatusType)}
        >
          <option value="ALL">All Status</option>
          <option value="INSIDE">Inside Venue</option>
          <option value="OUTSIDE">Outside Venue</option>
        </select>

        <select
          className={`${SELECT_CLASS} flex-1 min-w-[130px]`}
          value={violation}
          onChange={(e) => setViolation(e.target.value as FilterViolationType)}
        >
          <option value="ALL">All Records</option>
          <option value="ONLY_VIOLATORS">Flags Only</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatus('ALL'); setViolation('ALL'); }}
            className="flex items-center gap-1 shrink-0 px-2.5 py-2 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
          >
            <XCircle className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterControls;
