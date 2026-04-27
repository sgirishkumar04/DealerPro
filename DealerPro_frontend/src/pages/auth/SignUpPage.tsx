import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Card, TextField, Button, Typography, CircularProgress,
  MenuItem, Select, InputLabel, FormControl, FormHelperText, Autocomplete, Chip
} from '@mui/material';
import api from '../../services/api';
import toast from 'react-hot-toast';
import kiaLogo from '../../assets/logo_white.png';
import dmsLogo from '../../assets/dealerpro_white.png';

const roleOptions = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DEALER'] as const;

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=_!])/,
      'Must contain uppercase, lowercase, digit, and special character (@#$%^&+=_!)'),
  roleName: z.enum(roleOptions).refine((val) => !!val, {
    message: 'Please select a role',
  }),
  managerId: z.number().optional(),
  dealerIds: z.array(z.number()).optional(),
});

interface Manager {
  id: number;
  name: string;
  email: string;
  phone?: string;
  managerUniqueId?: string;
}

interface Dealer {
  id: number;
  name: string;
  email: string;
  location?: string;
  contactNumber?: string;
  status?: string;
}

type SignupForm = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { roleName: 'ROLE_DEALER', dealerIds: [] }
  });

  const selectedRole = watch('roleName');

  // Fetch managers for dealer signup
  const { data: managersData } = useQuery({
    queryKey: ['managers-signup'],
    queryFn: async () => {
      const { data } = await api.get('/api/managers?page=0&size=100');
      return data.data;
    },
    enabled: selectedRole === 'ROLE_DEALER',
  });

  const managers = managersData?.content || [];

  // Fetch dealers for manager signup
  const { data: dealersData } = useQuery({
    queryKey: ['dealers-signup'],
    queryFn: async () => {
      const { data } = await api.get('/api/dealers?page=0&size=100');
      return data.data;
    },
    enabled: selectedRole === 'ROLE_MANAGER',
  });

  const dealers = dealersData?.content || [];

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      // Clean up payload based on role
      const payload: any = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        roleName: data.roleName,
      };

      if (data.roleName === 'ROLE_DEALER' && data.managerId) {
        payload.managerId = data.managerId;
      }

      if (data.roleName === 'ROLE_MANAGER' && data.dealerIds && data.dealerIds.length > 0) {
        payload.dealerIds = data.dealerIds;
      }

      await api.post('/api/auth/signup', payload);
      toast.success('Account created successfully!');
      navigate('/login');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Signup failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes subtlePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,16,46,0.35); }
          50%       { box-shadow: 0 0 0 10px rgba(200,16,46,0); }
        }

        .signup-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0d1117 0%, #161c26 50%, #0d1117 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }

        .signup-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .signup-root::after {
          content: '';
          position: absolute;
          top: -120px;
          right: -120px;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,16,46,0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .signup-inner {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          animation: fadeInDown 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }

        .signup-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
          gap: 16px;
          animation: fadeInDown 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s both;
        }

        .signup-logo-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .signup-logo-divider {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.2);
          border-radius: 1px;
        }

        .signup-logo-img {
          height: 32px;
          width: auto;
          object-fit: contain;
          filter: brightness(1) drop-shadow(0 2px 8px rgba(200,16,46,0.3));
        }

        .signup-logo-img.dms {
          height: 26px;
        }

        .signup-subtitle {
          color: #64748b !important;
          font-size: 13px !important;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 500 !important;
        }

        .signup-card {
          border-radius: 16px !important;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07) !important;
          background: rgba(255,255,255,0.97) !important;
          animation: fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }

        .signup-form {
          padding: 32px;
        }

        @media (max-width: 480px) {
          .signup-form {
            padding: 24px 20px;
          }
          .signup-inner {
            max-width: 100%;
          }
          .signup-logo-img { height: 26px; }
          .signup-logo-img.dms { height: 21px; }
          .signup-logo-divider { height: 28px; }
        }

        .signup-form-title {
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #64748b !important;
          text-align: center;
          margin-bottom: 24px !important;
          letter-spacing: 0.01em;
        }

        .signup-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .signup-submit-btn {
          width: 100%;
          animation: subtlePulse 3s ease-in-out infinite;
        }

        .signup-signin-row {
          text-align: center;
          padding-top: 16px;
        }
      `}</style>

      <div className="signup-root">
        <div className="signup-inner">

          {/* Header with logos */}
          <div className="signup-header">
            <div className="signup-logo-row">
              <img src={kiaLogo} alt="KIA" className="signup-logo-img" />
              <div className="signup-logo-divider" />
              <img src={dmsLogo} alt="DMS" className="signup-logo-img dms" />
            </div>
            <Typography className="signup-subtitle">Create your account</Typography>
          </div>

          {/* Card */}
          <Card className="signup-card">
            <form onSubmit={handleSubmit(onSubmit)} className="signup-form">
              <Typography className="signup-form-title">
                Create New Account
              </Typography>

              <div className="signup-fields">
                {/* ROLE SELECTION - FIRST */}
                <FormControl fullWidth error={!!errors.roleName}>
                  <InputLabel sx={{ '&.Mui-focused': { color: '#C8102E' } }}>Role</InputLabel>
                  <Select
                    value={selectedRole}
                    label="Role"
                    onChange={(e) => setValue('roleName', e.target.value as SignupForm['roleName'])}
                    sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' } }}
                  >
                    <MenuItem value="ROLE_DEALER">Dealer</MenuItem>
                    <MenuItem value="ROLE_MANAGER">Manager</MenuItem>
                    <MenuItem value="ROLE_ADMIN">Admin</MenuItem>
                  </Select>
                  {errors.roleName && <FormHelperText>{errors.roleName.message}</FormHelperText>}
                </FormControl>

                <TextField
                  {...register('name')}
                  fullWidth
                  label="Full Name"
                  variant="outlined"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                />

                <TextField
                  {...register('email')}
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                />

                <TextField
                  {...register('phone')}
                  fullWidth
                  label="Phone Number"
                  variant="outlined"
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                />

                <TextField
                  {...register('password')}
                  fullWidth
                  type="password"
                  label="Password"
                  variant="outlined"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                />

                {/* DEALER-SPECIFIC: Manager ID with Search */}
                {selectedRole === 'ROLE_DEALER' && (
                  <Controller
                    name="managerId"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={managers}
                        getOptionLabel={(option: Manager) => `Manager ID: ${option.id}`}
                        value={managers.find((m: Manager) => m.id === field.value) || null}
                        onChange={(_, newValue) => {
                          field.onChange(newValue ? newValue.id : undefined);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Manager ID"
                            placeholder="Search and select manager..."
                            error={!!errors.managerId}
                            helperText={errors.managerId?.message || 'Required: Select the manager you will report to'}
                            sx={{
                              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                              '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                            }}
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-popupIndicator': { color: '#C8102E' },
                          '& .MuiAutocomplete-clearIndicator': { color: '#C8102E' },
                        }}
                      />
                    )}
                  />
                )}

                {/* MANAGER-SPECIFIC: Multiple Dealer Selection with Search */}
                {selectedRole === 'ROLE_MANAGER' && (
                  <Controller
                    name="dealerIds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={dealers}
                        getOptionLabel={(option: Dealer) => `Dealer ID: ${option.id}`}
                        value={dealers.filter((d: Dealer) => field.value?.includes(d.id)) || []}
                        onChange={(_, newValue) => {
                          field.onChange(newValue.map((d: Dealer) => d.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Choose Dealers"
                            placeholder="Search and select dealers..."
                            error={!!errors.dealerIds}
                            helperText={errors.dealerIds?.message || 'Select dealers you will manage'}
                            sx={{
                              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                              '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                            }}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option: Dealer, index: number) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                              <Chip
                                label={`ID: ${option.id}`}
                                {...tagProps}
                                key={key}
                                size="small"
                                sx={{ borderRadius: '4px' }}
                              />
                            );
                          })
                        }
                        sx={{
                          '& .MuiAutocomplete-popupIndicator': { color: '#C8102E' },
                          '& .MuiAutocomplete-clearIndicator': { color: '#C8102E' },
                        }}
                      />
                    )}
                  />
                )}
              </div>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                className="signup-submit-btn"
                disabled={isLoading}
                sx={{
                  bgcolor: '#C8102E',
                  color: 'white',
                  padding: '13px 0',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  letterSpacing: '0.02em',
                  boxShadow: '0 4px 14px 0 rgba(200, 16, 46, 0.39)',
                  '&:hover': { bgcolor: '#9B0C23', boxShadow: '0 6px 20px rgba(200, 16, 46, 0.3)' },
                  '&:disabled': { bgcolor: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' },
                }}
              >
                {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create Account'}
              </Button>

              <div className="signup-signin-row">
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{ color: '#C8102E', fontWeight: 600, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Sign in
                  </Link>
                </Typography>
              </div>
            </form>
          </Card>

        </div>
      </div>
    </>
  );
}