import { createContext, useContext, useState, useEffect } from "react";
import { User, LoginCredentials, Role } from "../types/auth";
import { authService } from "../services/auth.service";
import { isTokenExpired } from "../utils/auth";
import { checkPermission, Permission } from "../utils/permissions";
import { AUTH } from "../utils/constants";
import { useAuthStore } from "../store/authStore";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Fade 
} from "@mui/material";
import { ShieldAlert, LogOut, PhoneCall } from "lucide-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  roles: Role[] | null;
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
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiredUserData, setExpiredUserData] = useState<any>(null);

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

  // REAL-TIME EXPIRY CHECK: Periodically check if account has expired while logged in
  useEffect(() => {
    if (!user || showExpiryModal) return;

    const checkExpiry = async () => {
      try {
        // Fetch LATEST profile from backend to see if admin updated expiry
        const latestProfile = await authService.getCurrentUser();
        
        if (latestProfile.accountExpiresAt) {
          const expiryDate = new Date(latestProfile.accountExpiresAt);
          if (expiryDate < new Date()) {
            setExpiredUserData(latestProfile);
            setShowExpiryModal(true);
          }
        }
      } catch (err: any) {
        // If API returns 401 with the "expired" message we added in backend filter
        if (err.response?.status === 401 && err.response?.data?.message?.includes("expired")) {
          setExpiredUserData(user);
          setShowExpiryModal(true);
        }
      }
    };

    const interval = setInterval(checkExpiry, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [user, showExpiryModal]);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    const responseData = response as any;
    const rawRoles = response.roles || (responseData.role ? [responseData.role] : []);
    
    const userObj: any = {
      id: response.id.toString(),
      name: response.name,
      firstName: response.firstName || response.name.split(' ')[0],
      lastName: response.lastName || response.name.split(' ').slice(1).join(' '),
      email: response.email,
      roles: rawRoles,
      isActive: true,
      accountExpiresAt: responseData.accountExpiresAt || null
    };
    
    // Sync with Context State
    setToken(response.token);
    setUser(userObj);
    localStorage.setItem(AUTH.tokenKey, response.token);
    
    // Save user with token for authStore compatibility
    localStorage.setItem(AUTH.userKey, JSON.stringify({ ...userObj, token: response.token }));

    // Sync with Zustand Store
    useAuthStore.getState().login({
      id: userObj.id,
      name: userObj.name,
      email: userObj.email,
      roles: rawRoles,
      token: response.token,
      accountExpiresAt: userObj.accountExpiresAt
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH.tokenKey);
    localStorage.removeItem(AUTH.userKey);
    useAuthStore.getState().logout();
    setShowExpiryModal(false);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.roles?.some(r => checkPermission(r, permission)) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        roles: user?.roles || null,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}

      {/* Account Expiry Alert Modal */}
      <Dialog 
        open={showExpiryModal} 
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid #1e293b',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            maxWidth: '450px'
          }
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Box 
            sx={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              bgcolor: 'rgba(239, 68, 68, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}
          >
            <ShieldAlert size={32} color="#ef4444" />
          </Box>
          
          <DialogTitle sx={{ p: 0, mb: 1, fontWeight: '700', fontSize: '1.5rem' }}>
            Account Access Expired
          </DialogTitle>
          
          <DialogContent sx={{ p: 0, mb: 3 }}>
            <Typography variant="body1" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
              Hello <span style={{ color: '#fff', fontWeight: '600' }}>{expiredUserData?.name}</span>, your scheduled access period for this system has concluded.
            </Typography>
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <Typography variant="body2" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <PhoneCall size={14} /> Please contact your System Administrator to request an extension.
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 0, justifyContent: 'center' }}>
            <Button 
              fullWidth
              variant="contained" 
              onClick={logout}
              startIcon={<LogOut size={18} />}
              sx={{ 
                bgcolor: '#ef4444', 
                color: '#fff',
                py: 1.5,
                fontWeight: '600',
                textTransform: 'none',
                borderRadius: '8px',
                '&:hover': { bgcolor: '#dc2626' }
              }}
            >
              Back to Login Page
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </AuthContext.Provider>
  );
};