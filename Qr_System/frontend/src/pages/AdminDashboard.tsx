import React, { useEffect, useState } from 'react';
import TopNavbar from '../components/admin/TopNavbar';
import StatCard from '../components/admin/StatCard';
import ParticipantTable from '../components/admin/ParticipantTable';
import TeamStatsTable from '../components/admin/TeamStatsTable';
import SettingsPanel from '../components/admin/SettingsPanel';
import TeamDetailsModal from '../components/admin/TeamDetailsModal';
import ViolationModal from '../components/admin/ViolationModal';
import FilterControls, { type FilterStatusType, type FilterViolationType } from '../components/admin/FilterControls';
import ParticipantHistoryModal from '../components/admin/ParticipantHistoryModal';
import { api } from '../api/api';
import { Users, FileWarning, Fingerprint, Loader2, LayoutList, ShieldHalf, Settings, Search } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>('ALL');
  const [filterViolation, setFilterViolation] = useState<FilterViolationType>('ALL');
  const [activeTab, setActiveTab] = useState<'roster' | 'teams' | 'config'>('roster');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [selectedHistoryQrId, setSelectedHistoryQrId] = useState<string | null>(null);
  const [teamFilterStatus, setTeamFilterStatus] = useState<'ALL' | 'INSIDE' | 'OUTSIDE' | 'PARTIAL'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, partsRes] = await Promise.all([
          api.getDashboardStats(),
          api.getParticipants()
        ]);
        setStats(statsRes.data);
        setParticipants(partsRes.data);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredParticipants = participants.filter(p => {
    // 1. Search Filter
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.qrId.toLowerCase().includes(search.toLowerCase()) ||
                          p.team.toLowerCase().includes(search.toLowerCase());
    
    // 2. Status Filter
    const matchesStatus = filterStatus === 'ALL' || 
                          (filterStatus === 'INSIDE' && p.inside) ||
                          (filterStatus === 'OUTSIDE' && !p.inside);
                          
    // 3. Violation Filter
    const matchesViolation = filterViolation === 'ALL' || 
                             (filterViolation === 'ONLY_VIOLATORS' && p.hasViolation);
                             
    return matchesSearch && matchesStatus && matchesViolation;
  });

  const teamStats = Object.values(participants.reduce((acc, p) => {
    if (!acc[p.team]) acc[p.team] = { teamName: p.team, totalMembers: 0, currentlyInside: 0 };
    acc[p.team].totalMembers++;
    if (p.inside) acc[p.team].currentlyInside++;
    return acc;
  }, {} as Record<string, any>));

  const filteredTeamStats = teamStats.filter((t: any) => {
    const matchesSearch = t.teamName.toLowerCase().includes(search.toLowerCase());
    let matchesStatus = true;
    if (teamFilterStatus === 'INSIDE') {
      matchesStatus = t.currentlyInside === t.totalMembers;
    } else if (teamFilterStatus === 'OUTSIDE') {
      matchesStatus = t.currentlyInside === 0;
    } else if (teamFilterStatus === 'PARTIAL') {
      matchesStatus = t.currentlyInside > 0 && t.currentlyInside < t.totalMembers;
    }
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <TopNavbar />
      
      <main className="flex-1 w-full relative">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
              <p className="text-sm sm:text-base text-slate-500 font-medium tracking-tight mt-1">Manage participants and monitor live status.</p>
            </div>
          </div>

          {isLoading ? (
             <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
                 <button onClick={() => setActiveTab('roster')} className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap ${activeTab === 'roster' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-0.5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                   <LayoutList className="w-4 h-4 shrink-0" /> <span>Roster</span>
                 </button>
                 <button onClick={() => setActiveTab('teams')} className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap ${activeTab === 'teams' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 -translate-y-0.5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                   <ShieldHalf className="w-4 h-4 shrink-0" /> <span>Teams</span>
                 </button>
                 <button onClick={() => setActiveTab('config')} className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap ${activeTab === 'config' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 -translate-y-0.5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                   <Settings className="w-4 h-4 shrink-0" /> <span>Rules</span>
                 </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard 
                   title="Total Registered" 
                   value={stats?.totalRegistered || 0} 
                   icon={<Users className="w-5 h-5 text-blue-600" />} 
                   trend="vs last year" trendUp 
                />
                <StatCard 
                   title="Currently Inside" 
                   value={stats?.currentlyInside || 0} 
                   icon={<Fingerprint className="w-5 h-5 text-emerald-600" />} 
                />
                <StatCard 
                   title="Total Violations" 
                   value={stats?.totalViolationsLogged || 0} 
                   icon={<FileWarning className="w-5 h-5 text-rose-600" />} 
                   className="border-rose-100 bg-rose-50/30 ring-1 ring-transparent hover:ring-rose-200"
                   onClick={() => setIsViolationModalOpen(true)}
                />
              </div>

              {/* Dynamic Content Area */}
              <div>
                {activeTab === 'roster' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                    {/* Filter Action Bar */}
                    <FilterControls 
                      search={search}
                      setSearch={setSearch}
                      status={filterStatus}
                      setStatus={setFilterStatus}
                      violation={filterViolation}
                      setViolation={setFilterViolation}
                    />

                    <div className="flex items-center justify-between mt-4 mb-2">
                      <h2 className="text-lg font-bold text-slate-900">Participant Details</h2>
                    </div>
                    <ParticipantTable data={filteredParticipants} onParticipantClick={setSelectedHistoryQrId} />
                  </div>
                )}

                {activeTab === 'teams' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                    {/* Contextual Search and Filter for Teams */}
                    <div className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300">
                      <div className="relative w-full sm:max-w-md flex-shrink-0 group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Search Team Overview..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 hover:bg-white transition-all duration-300 shadow-inner"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center shrink-0 w-full sm:w-auto">
                        <span className="text-sm font-semibold text-slate-500 mr-3 hidden sm:block">Status</span>
                        <select 
                          value={teamFilterStatus}
                          onChange={(e) => setTeamFilterStatus(e.target.value as any)}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/50 hover:bg-white cursor-pointer shadow-sm transition-colors"
                        >
                          <option value="ALL">All Teams</option>
                          <option value="INSIDE">100% Inside</option>
                          <option value="PARTIAL">Partial Inside</option>
                          <option value="OUTSIDE">100% Outside</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-slate-900">Live Team Presence</h2>
                    </div>
                    <TeamStatsTable data={filteredTeamStats as any} onTeamClick={setSelectedTeam} />
                  </div>
                )}

                {activeTab === 'config' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <SettingsPanel />
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      {selectedTeam && (
        <TeamDetailsModal 
          teamName={selectedTeam} 
          participants={participants.filter(p => p.team === selectedTeam)} 
          onClose={() => setSelectedTeam(null)} 
        />
      )}

      {isViolationModalOpen && (
        <ViolationModal 
          participants={participants.filter(p => p.hasViolation)} 
          onClose={() => setIsViolationModalOpen(false)} 
        />
      )}

      {selectedHistoryQrId && (
        <ParticipantHistoryModal 
          qrId={selectedHistoryQrId} 
          onClose={() => setSelectedHistoryQrId(null)} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;
