import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AccessDenied from '../components/ui/AccessDenied';

interface RoleRouteProps {
  allowedRoles: string[];
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  const hasAccess = user?.roles.some(role => 
    allowedRoles.includes(role) || allowedRoles.includes(role.replace('ROLE_', ''))
  );

  if (!user || !hasAccess) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
