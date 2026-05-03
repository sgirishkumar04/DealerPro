import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, TextField, Button, Typography, CircularProgress, Box } from '@mui/material';
import api from '../../services/api';
import toast from 'react-hot-toast';
import kiaLogo from '../../assets/logo_white.png';

const resetSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=_!])/, 
      'Must contain uppercase, lowercase, digit, and special character'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      toast.error('Email missing. Please try again.');
      navigate('/forgot-password');
    }
  }, [location, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/reset-password', {
        email,
        otp: data.otp,
        newPassword: data.newPassword
      });
      toast.success('Password reset successfully! Please sign in with your new password.');
      navigate('/login');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Reset failed. Please try again.';
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
        .reset-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0d1117 0%, #161c26 50%, #0d1117 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }
        .reset-inner {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          animation: fadeInDown 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        .reset-card {
          border-radius: 16px !important;
          background: rgba(255,255,255,0.97) !important;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55) !important;
          animation: fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .reset-form {
          padding: 32px;
          text-align: center;
        }
        .reset-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }
        .reset-logo-img {
          height: 32px;
        }
      `}</style>

      <div className="reset-root">
        <div className="reset-inner">
          <Card className="reset-card">
            <div className="reset-form">
              <div className="reset-logo-row">
                <img src={kiaLogo} alt="KIA" className="reset-logo-img" />
              </div>

              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                Reset Password
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Enter the OTP sent to <strong>{email}</strong> and your new password.
              </Typography>

              <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                  {...register('otp')}
                  fullWidth
                  label="6-Digit OTP"
                  variant="outlined"
                  placeholder="000000"
                  error={!!errors.otp}
                  helperText={errors.otp?.message}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '4px', fontWeight: 700 } }}
                />

                <TextField
                  {...register('newPassword')}
                  fullWidth
                  type="password"
                  label="New Password"
                  variant="outlined"
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                />

                <TextField
                  {...register('confirmPassword')}
                  fullWidth
                  type="password"
                  label="Confirm Password"
                  variant="outlined"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    bgcolor: '#C8102E',
                    color: 'white',
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: '8px',
                    mb: 3,
                    '&:hover': { bgcolor: '#9B0C23' },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Reset Password'}
                </Button>

                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                  Didn't receive the code?{' '}
                  <Box
                    component="span"
                    onClick={async () => {
                      try {
                        await api.post('/api/v1/auth/forgot-password', { email });
                        toast.success('New OTP sent to your email!');
                      } catch (err: any) {
                        toast.error('Failed to resend OTP. Please try again.');
                      }
                    }}
                    sx={{
                      color: '#C8102E',
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    Resend Code
                  </Box>
                </Typography>

                <Box>
                  <Link to="/login" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#C8102E')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                  >
                    Back to Login
                  </Link>
                </Box>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
