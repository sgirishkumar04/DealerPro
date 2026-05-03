import { createContext, useContext, useState, useEffect } from "react";
import { User, LoginCredentials, Role } from "../types/auth";
import { authService } from "../services/auth.service";
import { isTokenExpired } from "../utils/auth";
import { checkPermission, Permission } from "../utils/permissions";
import { AUTH } from "../utils/constants";
import { useAuthStore } from "../store/authStore";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  roles: Role[];
  role: Role | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check for existing token on mount and validate expiration
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH.tokenKey);
    const storedUser = localStorage.getItem(AUTH.userKey);
    
    if (storedToken && storedUser) {
      if (isTokenExpired(storedToken)) {
        localStorage.removeItem(AUTH.tokenKey);
        localStorage.removeItem(AUTH.userKey);
      } else {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    const userObj: User = {
      id: response.id.toString(),
      name: response.name,
      firstName: response.firstName || response.name.split(' ')[0],
      lastName: response.lastName || response.name.split(' ').slice(1).join(' '),
      email: response.email,
      roles: response.roles,
      role: response.roles[0],
      isActive: true
    };
    
    // Sync with Context State
    setToken(response.token);
    setUser(userObj);
    localStorage.setItem(AUTH.tokenKey, response.token);
    
    // Save user with token for authStore compatibility
    localStorage.setItem(AUTH.userKey, JSON.stringify({ ...userObj, token: response.token }));

    // Sync with Zustand Store (for Dashboard/Analytics compatibility)
    useAuthStore.getState().login({
      id: userObj.id,
      name: userObj.name,
      email: userObj.email,
      roles: userObj.roles,
      role: userObj.role,
      token: response.token
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH.tokenKey);
    localStorage.removeItem(AUTH.userKey);
    useAuthStore.getState().logout();
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.roles.some(r => checkPermission(r, permission));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        roles: user?.roles || [],
        role: user?.role || null,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};