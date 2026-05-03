import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, TextField, Button, Typography, CircularProgress, Box } from '@mui/material';
import api from '../../services/api';
import toast from 'react-hot-toast';
import kiaLogo from '../../assets/logo_white.png';
import dmsLogo from '../../assets/dealerpro_white.png';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/forgot-password', {
        email: data.email,
      });
      toast.success('OTP sent to your email!');
      navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Request failed. Please try again.';
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
        .forgot-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0d1117 0%, #161c26 50%, #0d1117 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }
        .forgot-inner {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          animation: fadeInDown 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        .forgot-card {
          border-radius: 16px !important;
          background: rgba(255,255,255,0.97) !important;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55) !important;
          animation: fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .forgot-form {
          padding: 32px;
          text-align: center;
        }
        .forgot-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .forgot-logo-img {
          height: 32px;
        }
      `}</style>

      <div className="forgot-root">
        <div className="forgot-inner">
          <Card className="forgot-card">
            <div className="forgot-form">
              <div className="forgot-logo-row">
                <img src={kiaLogo} alt="KIA" className="forgot-logo-img" />
              </div>

              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                Forgot Password?
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Enter your registered email and we'll send you an OTP to reset your password.
              </Typography>

              <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                  {...register('email')}
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  error={!!errors.email}
                  helperText={errors.email?.message}
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
                    '&:hover': { bgcolor: '#9B0C23' },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send OTP'}
                </Button>

                <Box sx={{ mt: 3 }}>
                  <Link to="/login" style={{ color: '#C8102E', textDecoration: 'none', fontWeight: 600 }}>
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
