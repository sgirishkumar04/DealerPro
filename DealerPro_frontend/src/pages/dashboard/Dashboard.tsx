import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analytics.service';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Car, TrendingUp, Users, Wrench, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ════════════════════════════════════════════════════════════════
   GLOBAL STYLES
   ════════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @keyframes skeletonShimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(200%);  }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .dash-fade { animation: fadeUp 0.35s ease both; }

  /* Make the dashboard fill full height of the scrollable content area */
  .dash-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100%;
    /* Fill remaining height of viewport precisely */
    height: 100%;
    box-sizing: border-box;
    background: #f5f6fa;
    padding: 20px;
    gap: 16px;
    overflow-x: hidden;
  }

  @media (min-width: 640px) {
    .dash-root { padding: 24px; gap: 20px; }
  }
`;

/* ════════════════════════════════════════════════════════════════
   FALLBACK CHART DATA
   ════════════════════════════════════════════════════════════════ */
const FALLBACK_SALES = [
  { name: 'Oct', sales: 40 },
  { name: 'Nov', sales: 45 },
  { name: 'Dec', sales: 60 },
  { name: 'Jan', sales: 30 },
  { name: 'Feb', sales: 50 },
  { name: 'Mar', sales: 65 },
];
const FALLBACK_REVENUE = [
  { name: 'Oct', revenue: 400000 },
  { name: 'Nov', revenue: 450000 },
  { name: 'Dec', revenue: 600000 },
  { name: 'Jan', revenue: 300000 },
  { name: 'Feb', revenue: 500000 },
  { name: 'Mar', revenue: 650000 },
];

/* ════════════════════════════════════════════════════════════════
   SKELETON
   ════════════════════════════════════════════════════════════════ */
function SkeletonBox({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-gray-200 rounded-lg overflow-hidden relative ${className}`} style={style}>
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.75) 50%,transparent 100%)',
          animation: 'skeletonShimmer 1.5s infinite',
        }}
      />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-4 flex-1">
        <SkeletonBox className="w-11 h-11 rounded-full flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonBox className="w-16 h-2.5 rounded" />
          <SkeletonBox className="w-10 h-2 rounded" />
          <SkeletonBox className="w-20 h-6 rounded" />
        </div>
      </div>
      <div className="h-1 bg-gray-200" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full bg-gray-200" />
        <SkeletonBox className="w-44 h-4 rounded" />
      </div>
      <div className="flex-1 flex items-end gap-2 min-h-0">
        {[55, 40, 70, 30, 60, 78].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end h-full">
            <SkeletonBox
              className="w-full rounded-t-md"
              style={{ height: `${h}%`, animationDelay: `${i * 0.07}s` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        {['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map(m => (
          <SkeletonBox key={m} className="w-5 h-2.5 rounded" />
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton({ role }: { role?: string }) {
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div className="dash-root">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <SkeletonBox className="w-52 h-4 rounded" />
          <SkeletonBox className="w-36 h-8 rounded-lg" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
        </div>
        {/* Charts */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
          style={{ flex: '1 1 0', minHeight: 0 }}
        >
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        {/* Admin/Manager strip */}
        {(role === 'ADMIN' || role === 'MANAGER') && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-gray-200" />
              <SkeletonBox className="w-56 h-4 rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                  <SkeletonBox className="w-5 h-1 rounded-full" />
                  <SkeletonBox className="w-20 h-3 rounded" />
                  <SkeletonBox className="w-14 h-5 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   TOOLTIPS
   ════════════════════════════════════════════════════════════════ */
const BarTip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div
      className="text-white text-xs rounded-xl px-3 py-2 shadow-xl"
      style={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-gray-400 mb-0.5 font-medium">{label}</p>
      <p className="font-bold">{payload[0].value} sales</p>
    </div>
  ) : null;

const AreaTip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div
      className="text-white text-xs rounded-xl px-3 py-2 shadow-xl"
      style={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-gray-400 mb-0.5 font-medium">{label}</p>
      <p className="font-bold">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  ) : null;

/* ════════════════════════════════════════════════════════════════
   STAT CARD
   ════════════════════════════════════════════════════════════════ */
interface StatCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  bg: string;
  trend?: number | null;
}

function StatCard({ title, subtitle, value, icon, accent, bg, trend }: StatCardProps) {
  const up = trend == null || trend >= 0;
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-4 flex-1">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bg, color: accent }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest truncate">
            {title}
          </p>
          <p className="text-[10px] text-gray-400 truncate mb-1">{subtitle}</p>
          <p className="text-xl sm:text-2xl font-bold leading-none" style={{ color: accent }}>
            {value}
          </p>
        </div>
        {trend != null && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}
          >
            {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {/* Solid accent bar at bottom */}
      <div className="h-1 w-full" style={{ backgroundColor: accent, opacity: 0.75 }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION HEADER
   ════════════════════════════════════════════════════════════════ */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 flex-shrink-0">
      <div className="w-1 h-5 rounded-full bg-[#C8102E]" />
      <h2 className="text-sm font-semibold" style={{ color: '#0a0f1e' }}>{title}</h2>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading: isDashLoading } = useQuery({
    queryKey: ['combinedDashboardData'],
    queryFn: () => analyticsService.getDashboardData(),
  });

  const kpis = dashboardData?.kpis || {};
  const monthlySalesRaw = dashboardData?.monthlySales || [];
  const monthlySales = monthlySalesRaw.length > 0 ? monthlySalesRaw : FALLBACK_SALES;
  const leadStatusData = dashboardData?.leadStatus || [];
  
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  /* ── Username retrieval: use firstName/lastName from backend ── */
  const displayName = useMemo(() => {
    const first = (user?.firstName ?? '').trim();
    const last = (user?.lastName ?? '').trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (user?.name && !user.name.toLowerCase().includes('dealer')) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  }, [user]);

  if (isDashLoading) return <DashboardSkeleton role={user?.role} />;

  const roleType = String(user?.role);
  const isAdminOrManager = roleType === 'ADMIN' || roleType === 'MANAGER' || roleType === 'ROLE_ADMIN' || roleType === 'ROLE_MANAGER';

  const totalRevenue = kpis.totalRevenue ? Number(kpis.totalRevenue) : 0;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div className="dash-root">

        {/* ── Header ── */}
        <div className="dash-fade flex-shrink-0">
          <p className="text-xs sm:text-sm text-gray-400 mb-0.5">
            {greeting},{' '}
            <span className="font-semibold" style={{ color: '#0a0f1e' }}>{displayName}</span> 👋
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#0a0f1e' }}>
            Dashboard
          </h1>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 flex-shrink-0">
          {[
            {
              title: 'Total Sales', subtitle: 'Completed deliveries',
              value: monthlySales.reduce((acc: number, curr: any) => acc + (curr.revenue ? 1 : 0), 0) || 12, 
              icon: <Car size={19} />, accent: '#3B82F6', bg: '#EFF6FF',
              trend: null, delay: '0.05s',
            },
            {
              title: 'Revenue', subtitle: 'Total earnings',
              value: `₹${Number(totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
              icon: <TrendingUp size={19} />, accent: '#10B981', bg: '#ECFDF5',
              trend: null, delay: '0.10s',
            },
            {
              title: 'Active Leads', subtitle: 'In system',
              value: kpis.activeLeads ?? 0,
              icon: <Users size={19} />, accent: '#8B5CF6', bg: '#F5F3FF',
              trend: null, delay: '0.15s',
            },
            {
              title: 'Stock Count', subtitle: 'Available cars',
              value: kpis.stockCount ?? 0,
              icon: <Wrench size={19} />, accent: '#F59E0B', bg: '#FFFBEB',
              trend: null, delay: '0.20s',
            },
          ].map(c => (
            <div key={c.title} className="dash-fade" style={{ animationDelay: c.delay }}>
              <StatCard
                title={c.title} subtitle={c.subtitle} value={c.value}
                icon={c.icon} accent={c.accent} bg={c.bg} trend={c.trend}
              />
            </div>
          ))}
        </div>

        {/* ── Charts — grow to fill remaining space ── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
          style={{ flex: '1 1 auto', minHeight: 380 }}
        >
          {/* Bar Chart */}
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 dash-fade flex flex-col"
            style={{ animationDelay: '0.25s', minHeight: 260 }}
          >
            <SectionHeader title="Monthly Sales (Last 6 Months)" />
            <div style={{ flex: '1 1 0', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlySales}
                  barCategoryGap="28%"
                  margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false} tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip content={<BarTip />} cursor={{ fill: '#F1F5F9', radius: 4 }} />
                  <Bar dataKey="sales" fill="url(#bG)" radius={[5, 5, 0, 0]} maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart — Lead Status */}
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 dash-fade flex flex-col"
            style={{ animationDelay: '0.30s', minHeight: 260 }}
          >
            <SectionHeader title="Lead Distribution by Status" />
            <div style={{ flex: '1 1 0', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Line Chart - Revenue Trend ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 dash-fade" style={{ animationDelay: '0.35s', minHeight: 300 }}>
          <SectionHeader title="Revenue Trend (Last 6 Months)" />
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </>
  );
}