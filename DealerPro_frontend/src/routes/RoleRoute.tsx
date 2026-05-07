import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AccessDenied from '../components/ui/AccessDenied';

interface RoleRouteProps {
  allowedRoles: string[];
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  const hasPermission = user?.roles?.some(r => 
    allowedRoles.includes(r) || allowedRoles.includes(r.replace('ROLE_', ''))
  );

  if (!user || !hasPermission) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
