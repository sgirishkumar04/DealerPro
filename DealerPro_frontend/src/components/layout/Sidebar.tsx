import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CarFront, Calculator, Users, Wrench, PackageSearch,
  IndianRupee, BarChart3, ShieldAlert, LogOut, X, ChevronRight, FileText
} from 'lucide-react';

const KIA_MIDNIGHT_BLACK = '#0a0f1e';
const KIA_ACCENT = '#C8102E';
const KIA_HOVER_BG = '#1a2236';
const KIA_ACTIVE_BG = '#C8102E';
const KIA_TEXT = '#e2e8f0';
const KIA_TEXT_MUTED = '#64748b';
const KIA_BORDER = '#1e2d45';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) setCollapsed(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [mobileOpen]);

  // Global keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        navigate('/test-drives');
      } else if (event.ctrlKey && event.key === 'o') {
        event.preventDefault();
        navigate('/audit-logs');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!user) return null;
  console.log('Sidebar Debug - User Roles:', user.roles);

  const roles = (user?.roles || []);
  const hasRole = (r: string) => {
    return roles.some(role => 
      role === r || 
      role === `ROLE_${r}` || 
      role.replace('ROLE_', '') === r
    );
  };
  const hasAnyRole = (rs: string[]) => rs.some(r => hasRole(r));

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/inventory', icon: <CarFront size={20} />, label: 'Inventory' },
    { to: '/sales', icon: <Calculator size={20} />, label: 'Sales' },
    { to: '/leads', icon: <Users size={20} />, label: 'Leads' },
    { to: '/test-drives', icon: <CarFront size={20} />, label: 'Test Drives' },
    { to: '/service', icon: <Wrench size={20} />, label: 'Service' },
    { to: '/parts', icon: <PackageSearch size={20} />, label: 'Parts' },
    { to: '/audit-logs', icon: <FileText size={20} />, label: 'Audit Logs' },
    ...(hasAnyRole(['ADMIN', 'MANAGER'])
      ? [{ to: '/finance', icon: <IndianRupee size={20} />, label: 'Finance' }]
      : []),
    ...(hasAnyRole(['ADMIN', 'MANAGER'])
      ? [{ to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' }]
      : []),
    ...(hasRole('ADMIN')
      ? [{ to: '/admin', icon: <ShieldAlert size={20} />, label: 'Admin Panel' }]
      : []),
  ];

  const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
    const isActive = location.pathname.startsWith(to);
    const handleClick = () => {
      if (isMobile) setMobileOpen(false);
    };
    return (
      <NavLink
        to={to}
        onClick={handleClick}
        title={collapsed && !isMobile ? label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed && !isMobile ? '0' : '12px',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          padding: collapsed && !isMobile ? '12px' : '11px 16px',
          margin: '2px 8px',
          borderRadius: '10px',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
          background: isActive ? KIA_ACTIVE_BG : 'transparent',
          color: isActive ? '#ffffff' : KIA_TEXT,
          fontWeight: isActive ? '600' : '400',
          fontSize: '14px',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = KIA_HOVER_BG;
        }}
        onMouseLeave={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <span style={{ flexShrink: 0, color: isActive ? '#fff' : KIA_TEXT_MUTED, display: 'flex' }}>
          {icon}
        </span>
        {(!collapsed || isMobile) && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div
      style={{
        width: isMobile ? '75vw' : collapsed ? '72px' : '240px',
        maxWidth: isMobile ? '320px' : undefined,
        height: '100vh',
        background: KIA_MIDNIGHT_BLACK,
        borderRight: `1px solid ${KIA_BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        boxShadow: isMobile ? '4px 0 32px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      <div
        style={{
          padding: collapsed && !isMobile ? '20px 0' : '20px 16px',
          borderBottom: `1px solid ${KIA_BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          minHeight: '72px',
          gap: '8px',
        }}
      >
        {(!collapsed || isMobile) && (
          <img
            src="/src/assets/dealerpro_white.png"
            alt="DMS Logo"
            style={{ height: '32px', objectFit: 'contain', maxWidth: '140px' }}
          />
        )}
        {collapsed && !isMobile && (
          <img
            src="/src/assets/dealerpro_white.png"
            alt="DMS Logo"
            style={{ height: '28px', width: '28px', objectFit: 'contain' }}
          />
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: KIA_TEXT_MUTED,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '6px',
              transition: 'color 0.2s, background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#fff';
              (e.currentTarget as HTMLElement).style.background = KIA_HOVER_BG;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = KIA_TEXT_MUTED;
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRight
              size={18}
              style={{
                transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.3s ease',
              }}
            />
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: KIA_TEXT_MUTED,
              display: 'flex',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '8px', paddingBottom: '8px' }}>
        {navItems.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Logout */}
      <div style={{ borderTop: `1px solid ${KIA_BORDER}`, padding: '8px' }}>
        <button
          onClick={() => { logout(); if (isMobile) setMobileOpen(false); }}
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            gap: collapsed && !isMobile ? '0' : '12px',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            padding: collapsed && !isMobile ? '12px' : '11px 16px',
            borderRadius: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: KIA_TEXT_MUTED,
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(200,16,46,0.12)';
            (e.currentTarget as HTMLElement).style.color = KIA_ACCENT;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = KIA_TEXT_MUTED;
          }}
          title={collapsed && !isMobile ? 'Logout' : undefined}
        >
          <LogOut size={20} style={{ flexShrink: 0 }} />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  // ── MOBILE ───────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* sidebar.png trigger — fixed top-left, visible when drawer is closed */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{
              position: 'fixed',
              top: '14px',
              left: '14px',
              zIndex: 50,
              background: 'transparent',
              border: 'none',
              padding: '0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
            }}
          >
            <img
              src="/src/assets/sidebar_white.png"
              alt="Menu"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          </button>
        )}

        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 48,
              backdropFilter: 'blur(2px)',
            }}
          />
        )}

        {/* Slide-in drawer */}
        <div
          ref={sidebarRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            zIndex: 49,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // ── DESKTOP / TABLET ──────────────────────────────────────────────────────────
  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
        width: collapsed ? '72px' : '240px',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 40,
      }}
    >
      {sidebarContent}
    </aside>
  );
}