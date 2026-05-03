import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AccessDenied from '../components/ui/AccessDenied';

interface RoleRouteProps {
  allowedRoles: string[];
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!user || (!allowedRoles.includes(user.role) && !allowedRoles.includes('ROLE_' + user.role))) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
