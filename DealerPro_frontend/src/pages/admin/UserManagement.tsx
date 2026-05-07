import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, Chip, Checkbox, FormControlLabel, Box, Typography,
  CircularProgress, Alert, Snackbar, TextField, InputAdornment, IconButton,
  Switch, TablePagination
} from '@mui/material';
import { Shield, Search, Power, PowerOff, CheckCircle2, XCircle, Users } from 'lucide-react';

const KIA_MIDNIGHT_BLACK = '#0a0f1e';
const KIA_ACCENT = '#C8102E';
const KIA_TEXT = '#e2e8f0';

interface UserData {
  id: number;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  accountExpiresAt: string | null;
}

const AVAILABLE_ROLES = ['ADMIN', 'MANAGER', 'DEALER'];

export default function UserManagement() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(new Date());
  
  // Update current time every 10 seconds for real-time status labels
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);

  const fetchUsers = async (searchQuery = '', pageNum = 0, pageSize = 10) => {
    try {
      let url = `http://localhost:8083/api/v1/admin/users?page=${pageNum}&size=${pageSize}`;
      let method = 'GET';
      let body: any = null;

      if (searchQuery) {
        url = 'http://localhost:8083/api/v1/admin/users/search';
        method = 'POST';
        body = JSON.stringify({
          query: searchQuery,
          page: pageNum,
          size: pageSize
        });
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.content);
        setTotalElements(data.data.totalElements);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(searchTerm, page, rowsPerPage);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage]);

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRoleToggle = async (userId: number, roleName: string, currentRoles: string[]) => {
    let newRoles: string[];
    const normalizedRole = roleName.startsWith('ROLE_') ? roleName : `ROLE_${roleName}`;
    
    if (currentRoles.includes(normalizedRole)) {
      newRoles = currentRoles.filter(r => r !== normalizedRole);
    } else {
      newRoles = [...currentRoles, normalizedRole];
    }

    try {
      const response = await fetch(`http://localhost:8083/api/v1/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify(newRoles)
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, roles: data.data.roles } : u));
        setSuccessMsg(`Roles updated for ${users.find(u => u.id === userId)?.name}`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update roles');
    }
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8083/api/v1/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
        setSuccessMsg(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const handleExpiryChange = async (userId: number, date: string) => {
    try {
      const response = await fetch(`http://localhost:8083/api/v1/admin/users/${userId}/expiry`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ expiryDate: date })
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, accountExpiresAt: data.data.accountExpiresAt } : u));
        setSuccessMsg(`Expiry updated for ${users.find(u => u.id === userId)?.name}`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update account expiry');
    }
  };

  if (loading && searchTerm === '' && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress sx={{ color: KIA_ACCENT }} />
      </Box>
    );
  }

  return (
    <Box p={4} sx={{ background: '#060c1a', minHeight: '100vh' }}>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={2}>
          <Shield size={32} color={KIA_ACCENT} />
          <Typography variant="h4" fontWeight="700" sx={{ color: '#fff' }}>
            User Management
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={3}>
          <Box display="flex" alignItems="center" gap={1} sx={{ background: 'rgba(255,255,255,0.03)', px: 2, py: 1, borderRadius: '8px', border: '1px solid #1e2d45' }}>
            <Users size={18} color={KIA_ACCENT} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>Total Users: <span style={{ color: '#fff', fontWeight: '700' }}>{totalElements}</span></Typography>
          </Box>
          
          <TextField
            placeholder="Search name or email..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page on search
            }}
            sx={{
              width: '350px',
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                background: KIA_MIDNIGHT_BLACK,
                '& fieldset': { borderColor: '#1e2d45' },
                '&:hover fieldset': { borderColor: KIA_ACCENT },
                '&.Mui-focused fieldset': { borderColor: KIA_ACCENT },
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#64748b" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ background: KIA_MIDNIGHT_BLACK, borderRadius: '12px 12px 0 0', border: '1px solid #1e2d45', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', borderBottom: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: '2px solid #1e2d45' }}>
              <TableCell sx={{ color: '#64748b', fontWeight: '600', py: 2 }}>User</TableCell>
              <TableCell sx={{ color: '#64748b', fontWeight: '600', py: 2 }}>Current Roles</TableCell>
              <TableCell sx={{ color: '#64748b', fontWeight: '600', py: 2 }}>Account Expiry</TableCell>
              <TableCell sx={{ color: '#64748b', fontWeight: '600', py: 2 }}>Assign Roles</TableCell>
              <TableCell sx={{ color: '#64748b', fontWeight: '600', py: 2 }}>Status & Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} sx={{ borderBottom: '1px solid #1e2d45', '&:hover': { background: '#1a2236' }, transition: 'all 0.2s' }}>
                <TableCell>
                  <Box>
                    <Typography fontWeight="600" sx={{ color: '#fff' }}>{user.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>{user.email}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {user.roles.map(r => (
                      <Chip 
                        key={r} 
                        label={r.replace('ROLE_', '')} 
                        size="small" 
                        sx={{ background: KIA_ACCENT, color: '#fff', fontWeight: '600', fontSize: '0.7rem' }} 
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <input 
                      type="datetime-local" 
                      value={user.accountExpiresAt ? user.accountExpiresAt.substring(0, 16) : ''}
                      onChange={(e) => handleExpiryChange(user.id, e.target.value)}
                      style={{
                        background: '#060c1a',
                        color: '#fff',
                        border: '1px solid #1e2d45',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                    {user.accountExpiresAt && (
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', color: new Date(user.accountExpiresAt) < now ? '#ef4444' : '#64748b', fontWeight: '600' }}>
                          {new Date(user.accountExpiresAt) < now ? 'Expired' : 'Scheduled'}
                        </Typography>
                        {new Date(user.accountExpiresAt) < now && (
                          <Button 
                            size="small" 
                            variant="text" 
                            onClick={() => handleExpiryChange(user.id, '')}
                            sx={{ 
                              p: 0, 
                              minWidth: 'auto', 
                              color: '#22c55e', 
                              fontSize: '0.65rem', 
                              textTransform: 'none',
                              '&:hover': { background: 'transparent', textDecoration: 'underline' }
                            }}
                          >
                            Reactivate Now
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={2}>
                    {AVAILABLE_ROLES.map(role => (
                      <FormControlLabel
                        key={role}
                        control={
                          <Checkbox 
                            size="small"
                            checked={user.roles.includes(`ROLE_${role}`) || user.roles.includes(role)}
                            onChange={() => handleRoleToggle(user.id, role, user.roles)}
                            sx={{ 
                              color: '#1e2d45', 
                              '&.Mui-checked': { color: KIA_ACCENT } 
                            }}
                          />
                        }
                        label={<Typography variant="caption" sx={{ color: KIA_TEXT }}>{role}</Typography>}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip 
                      icon={user.isActive ? <CheckCircle2 size={14} color="#22c55e" /> : <XCircle size={14} color="#ef4444" />}
                      label={user.isActive ? 'Active' : 'Inactive'} 
                      size="small"
                      sx={{ 
                        background: user.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: user.isActive ? '#22c55e' : '#ef4444',
                        border: `1px solid ${user.isActive ? '#22c55e' : '#ef4444'}`,
                        minWidth: '90px'
                      }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      startIcon={user.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                      sx={{
                        borderColor: user.isActive ? '#ef4444' : '#22c55e',
                        color: user.isActive ? '#ef4444' : '#22c55e',
                        '&:hover': {
                          background: user.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          borderColor: user.isActive ? '#ef4444' : '#22c55e',
                        },
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        px: 2
                      }}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalElements}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        sx={{
          background: KIA_MIDNIGHT_BLACK,
          color: '#64748b',
          border: '1px solid #1e2d45',
          borderRadius: '0 0 12px 12px',
          '& .MuiTablePagination-actions': { color: '#fff' },
          '& .MuiTablePagination-select': { color: '#fff' },
          '& .MuiTablePagination-displayedRows': { color: '#fff' }
        }}
      />

      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
