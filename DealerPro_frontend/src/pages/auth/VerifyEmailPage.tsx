import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, TextField, Button, Typography, CircularProgress, Box } from '@mui/material';
import api from '../../services/api';
import toast from 'react-hot-toast';
import kiaLogo from '../../assets/logo_white.png';
import dmsLogo from '../../assets/dealerpro_white.png';

const verifySchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

type VerifyForm = z.infer<typeof verifySchema>;

export default function VerifyEmailPage() {
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
      toast.error('Email missing. Please sign up again.');
      navigate('/signup');
    }
  }, [location, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });

  const handleResend = async () => {
    try {
      await api.post('/api/v1/auth/resend-otp', { email });
      toast.success('New OTP sent to your email!');
    } catch (err: any) {
      toast.error('Failed to resend OTP. Please try again.');
    }
  };

  const onSubmit = async (data: VerifyForm) => {
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/verify-email', {
        email,
        otp: data.otp,
      });
      toast.success('Email verified successfully! You can now sign in.');
      navigate('/login');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Verification failed. Please try again.';
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
        .verify-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0d1117 0%, #161c26 50%, #0d1117 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }
        .verify-inner {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          animation: fadeInDown 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        .verify-card {
          border-radius: 16px !important;
          background: rgba(255,255,255,0.97) !important;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55) !important;
          animation: fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .verify-form {
          padding: 32px;
          text-align: center;
        }
        .verify-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .verify-logo-img {
          height: 32px;
        }
        .verify-logo-divider {
          width: 1px;
          height: 30px;
          background: rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="verify-root">
        <div className="verify-inner">
          <Card className="verify-card">
            <div className="verify-form">
              <div className="verify-logo-row">
                <img src={kiaLogo} alt="KIA" className="verify-logo-img" />
                <div className="verify-logo-divider" />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#C8102E' }}>DealerPro</Typography>
              </div>

              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                Verify Your Email
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                We've sent a 6-digit verification code to <strong>{email}</strong>. 
                Please enter it below to activate your account.
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
                    mb: 3,
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '8px', fontWeight: 700, fontSize: '1.2rem' } }}
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
                    mb: 2,
                    '&:hover': { bgcolor: '#9B0C23' },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Verify Account'}
                </Button>

                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Didn't receive the code?{' '}
                  <Box
                    component="span"
                    onClick={handleResend}
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
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
