import React from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Scan } from 'lucide-react';

const TopNavbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        
        {/* Branding - Left */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
             <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight hidden sm:block">ByteVerse</span>
        </div>

        {/* Global Controls - Right */}
        <div className="flex items-center gap-4">
          <Link 
            to="/scanner" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-slate-800 hover:-translate-y-0.5 active:scale-95 transition-all font-medium text-sm"
          >
            <Scan className="w-4 h-4" />
            <span className="hidden sm:block">Scanner Mode</span>
          </Link>
          
          <div className="h-9 w-9 shrink-0 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-md cursor-pointer hover:ring-4 hover:ring-blue-100 transition-all">
            A
          </div>
        </div>
        
      </div>
    </nav>
  );
};

export default TopNavbar;
