import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuthStore } from '../../store/authStore';

export default function Layout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Ctrl (or Cmd on Mac) is pressed
      if (!event.ctrlKey && !event.metaKey) return;

      // Prevent default browser shortcuts
      const key = event.key.toLowerCase();
      
      // Check user role
      const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || 
                               user?.role === 'ROLE_MANAGER' || user?.role === 'ROLE_ADMIN';
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';

      switch (key) {
        case 'd':
          event.preventDefault();
          navigate('/dashboard');
          break;
        case 'i':
          event.preventDefault();
          navigate('/inventory');
          break;
        case 's':
          event.preventDefault();
          navigate('/sales');
          break;
        case 'l':
          event.preventDefault();
          navigate('/leads');
          break;
        case 't':
          event.preventDefault();
          navigate('/test-drives');
          break;
        case 'e':
          event.preventDefault();
          navigate('/service');
          break;
        case 'p':
          event.preventDefault();
          navigate('/parts');
          break;
        case 'f':
          if (isManagerOrAdmin) {
            event.preventDefault();
            navigate('/finance');
          }
          break;
        case 'a':
          if (isManagerOrAdmin) {
            event.preventDefault();
            navigate('/analytics');
          }
          break;
        case 'm':
          if (isAdmin) {
            event.preventDefault();
            navigate('/admin');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, user]);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: '#060c1a' }}>
      {/*
        Sidebar handles all its own responsive logic internally:
        - Desktop/tablet (md+): renders as a sticky aside in the flex row
        - Mobile (<md): renders as a fixed slide-in drawer with its own
          sidebar_white.png trigger button fixed at top-left
      */}
      <Sidebar />

      {/* Right column: Navbar stacked above scrollable page content */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}