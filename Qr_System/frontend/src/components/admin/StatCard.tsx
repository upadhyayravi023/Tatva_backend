import React from 'react';


interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, className = "", onClick }) => {
  const interactiveClasses = onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all active:scale-95" : "";
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col ${interactiveClasses} ${className}`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
        <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
          {icon}
        </div>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-slate-900">{value}</h2>
        {trend && (
           <p className={`text-xs mt-2 font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
             {trendUp ? '↑' : '↓'} {trend}
           </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
