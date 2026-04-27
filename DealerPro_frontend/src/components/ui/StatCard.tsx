import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  color = 'red',
}) => {
  const colorClasses = {
    red: 'from-kia-red/20 to-kia-red/5 text-kia-red',
    blue: 'from-info/20 to-info/5 text-info',
    green: 'from-success/20 to-success/5 text-success',
    yellow: 'from-warning/20 to-warning/5 text-warning',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
  };
  
  return (
    <div className="group relative overflow-hidden rounded-xl bg-kia-dark border border-kia-grey hover:border-kia-red transition-all duration-300 card-hover">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-kia-silver mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-kia-white mb-2">{value}</h3>
            
            {trend && (
              <div className="flex items-center gap-1">
                {trend.isPositive ? (
                  <TrendingUp size={16} className="text-success" />
                ) : (
                  <TrendingDown size={16} className="text-danger" />
                )}
                <span className={`text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-kia-silver ml-1">vs last month</span>
              </div>
            )}
            
            {description && (
              <p className="text-xs text-kia-silver mt-2">{description}</p>
            )}
          </div>
          
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
            <Icon size={24} className="text-current" />
          </div>
        </div>
      </div>
      
      {/* Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </div>
  );
};
