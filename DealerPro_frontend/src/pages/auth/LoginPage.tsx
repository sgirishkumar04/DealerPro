import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, TextField, Button, Typography, CircularProgress, Alert, Box } from '@mui/material';
import { Lock as LockIcon, Timer as TimerIcon } from '@mui/icons-material';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import kiaLogo from '../../assets/logo_white.png';
import dmsLogo from '../../assets/dealerpro_white.png';
import api from '../../services/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number>(0);
  const [fieldError, setFieldError] = useState<'email' | 'password' | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Countdown timer for account lock
  useEffect(() => {
    if (lockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setLockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsAccountLocked(false);
            setErrorMessage('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockTimeRemaining]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const parseErrorMessage = (message: string) => {
    // Check if account is locked
    if (message.includes('locked') || message.includes('Locked')) {
      setIsAccountLocked(true);

      // Extract time from message like "try again in 4 minute(s) and 15 second(s)"
      const minuteMatch = message.match(/(\d+)\s*minute/);
      const secondMatch = message.match(/(\d+)\s*second/);

      const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
      const totalSeconds = (minutes * 60) + seconds;

      setLockTimeRemaining(totalSeconds);
      setErrorMessage('Your account has been locked due to multiple failed login attempts.');
      return;
    }

    // Check for remaining attempts
    const attemptsMatch = message.match(/(\d+)\s*attempt\(s\)\s*remaining/);
    if (attemptsMatch) {
      const attempts = parseInt(attemptsMatch[1]);
      setRemainingAttempts(attempts);

      // Determine which field is incorrect
      if (message.toLowerCase().includes('email')) {
        setFieldError('email');
        setErrorMessage('Email address not found.');
      } else {
        setFieldError('password');
        setErrorMessage('Incorrect password. Please try again.');
      }
      return;
    }

    // Generic invalid credentials
    if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('password')) {
      setFieldError('password');
      setErrorMessage('Incorrect email or password.');
    } else if (message.toLowerCase().includes('verify your email')) {
      setErrorMessage(message);
    } else {
      setErrorMessage(message);
    }
  };

  const handleClickVerify = async () => {
    const email = watch('email');
    if (!email) return;
    try {
      await api.post('/api/v1/auth/resend-otp', { email });
      toast.success('New OTP sent to your email!');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error('Failed to resend OTP. Please try again.');
    }
  };

  // ✅ DETACHED click handler — completely avoids any form/browser submit
  const handleLoginClick = () => {
    if (isAccountLocked || isLoading) return;

    if (!captchaToken) {
      setErrorMessage('Please complete the reCAPTCHA verification');
      return;
    }

    // handleSubmit() runs zod validation first, then calls our async fn
    handleSubmit(async (data: LoginForm) => {
      setIsLoading(true);
      setErrorMessage('');
      setFieldError(null);
      setRemainingAttempts(null);

      try {
        await authLogin({ email: data.email, password: data.password });
        toast.success('Login Successful');
        navigate('/dashboard');
      } catch (err: any) {
        const message = err.response?.data?.message || 'Login failed';
        parseErrorMessage(message);
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        // Don't reset the form - keep email and password values
      } finally {
        setIsLoading(false);
      }
    })();
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

        .login-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0d1117 0%, #161c26 50%, #0d1117 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle background grid */
        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* Red glow orb top-right */
        .login-root::after {
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

        .login-inner {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          animation: fadeInDown 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* ── Logo header ── */
        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
          gap: 16px;
          animation: fadeInDown 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s both;
        }

        .login-logo-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .login-logo-divider {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.2);
          border-radius: 1px;
        }

        .login-logo-img {
          height: 32px;
          width: auto;
          object-fit: contain;
          filter: brightness(1) drop-shadow(0 2px 8px rgba(200,16,46,0.3));
        }

        .login-logo-img.dms {
          height: 26px;
        }

        .login-subtitle {
          color: #64748b !important;
          font-size: 13px !important;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 500 !important;
        }

        /* ── Card ── */
        .login-card {
          border-radius: 16px !important;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07) !important;
          background: rgba(255,255,255,0.97) !important;
          animation: fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }

        /* ── Form ── */
        .login-form {
          padding: 32px;
        }

        @media (max-width: 480px) {
          .login-form {
            padding: 24px 20px;
          }
          .login-inner {
            max-width: 100%;
          }
          .login-logo-img { height: 26px; }
          .login-logo-img.dms { height: 21px; }
          .login-logo-divider { height: 28px; }
        }

        .login-form-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
          text-align: center;
          margin-bottom: 28px !important;
          letter-spacing: 0.01em;
        }

        .login-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .login-captcha-wrap {
          display: flex;
          justify-content: center;
          margin: 4px 0 20px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .login-submit-btn {
          width: 100%;
          padding: 13px 0 !important;
          font-size: 0.95rem !important;
          font-weight: 600 !important;
          text-transform: none !important;
          border-radius: 8px !important;
          letter-spacing: 0.02em;
          animation: subtlePulse 3s ease-in-out infinite;
        }

        .login-signup-row {
          text-align: center;
          padding-top: 16px;
        }
      `}</style>

      <div className="login-root">
        <div className="login-inner">

          {/* Header with logos */}
          <div className="login-header">
            <div className="login-logo-row">
              <img src={kiaLogo} alt="KIA" className="login-logo-img" />
              <div className="login-logo-divider" />
              <img src={dmsLogo} alt="DMS" className="login-logo-img dms" />
            </div>
            <Typography className="login-subtitle">DealerPro</Typography>
          </div>

          {/* ✅ Card uses <div> NOT <form> — eliminates all browser-native submit/reload */}
          <Card className="login-card">
            <div className="login-form">
              <Typography className="login-form-title">
                Sign In
              </Typography>

              <div className="login-fields">
                <TextField
                  {...register('email')}
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  autoComplete="username"
                  error={!!errors.email || fieldError === 'email'}
                  helperText={errors.email?.message || (fieldError === 'email' ? 'Email not found' : '')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLoginClick(); }}
                  sx={{
                    '& .MuiOutlinedInput-root': { bgcolor: 'white' },
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
                  autoComplete="current-password"
                  error={!!errors.password || fieldError === 'password'}
                  helperText={errors.password?.message || (fieldError === 'password' ? 'Incorrect password' : '')}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLoginClick(); }}
                  sx={{
                    '& .MuiOutlinedInput-root': { bgcolor: 'white' },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#C8102E' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#C8102E' },
                  }}
                />
                <Box sx={{ textAlign: 'right', mt: -1 }}>
                  <Link to="/forgot-password" style={{ color: '#C8102E', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Forgot Password?
                  </Link>
                </Box>
              </div>

              {/* ✅ Error Message — shows invalid credentials + remaining attempts */}
              {errorMessage && !isAccountLocked && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 2,
                    borderRadius: '8px',
                    '& .MuiAlert-message': { width: '100%' }
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {errorMessage}
                    </Typography>
                    {errorMessage.toLowerCase().includes('verify your email') && (
                      <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
                         Please contact admin to enable your account.
                      </Typography>
                    )}
                    {remainingAttempts !== null && (
                      <Typography variant="caption" sx={{ color: 'error.dark' }}>
                        {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before account lock
                      </Typography>
                    )}
                  </Box>
                </Alert>
              )}

              {/* Account Locked Warning */}
              {isAccountLocked && lockTimeRemaining > 0 && (
                <Alert
                  severity="warning"
                  icon={<LockIcon />}
                  sx={{
                    mb: 2,
                    borderRadius: '8px',
                    bgcolor: '#fff3e0',
                    border: '1px solid #ffb74d',
                    '& .MuiAlert-message': { width: '100%' }
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#e65100' }}>
                      Account Locked
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5, color: '#ef6c00' }}>
                      Too many failed login attempts. Please wait before trying again.
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'rgba(255, 152, 0, 0.1)',
                        padding: '8px 12px',
                        borderRadius: '6px'
                      }}
                    >
                      <TimerIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 700,
                          color: '#e65100',
                          fontFamily: 'monospace',
                          fontSize: '1.1rem'
                        }}
                      >
                        {formatTime(lockTimeRemaining)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#ef6c00', ml: 'auto' }}>
                        Time remaining
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              )}

              <div className="login-captcha-wrap">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                  onChange={(token: string | null) => {
                    setCaptchaToken(token);
                    if (errorMessage === 'Please complete the reCAPTCHA verification') {
                      setErrorMessage('');
                    }
                  }}
                  theme="light"
                />
              </div>

              {/* ✅ type="button" + onClick — NEVER submits a form, NEVER reloads */}
              <Button
                type="button"
                fullWidth
                variant="contained"
                className="login-submit-btn"
                onClick={handleLoginClick}
                disabled={isLoading || !captchaToken || isAccountLocked}
                sx={{
                  bgcolor: isAccountLocked ? '#bdbdbd' : '#C8102E',
                  color: 'white',
                  padding: '13px 0',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  letterSpacing: '0.02em',
                  boxShadow: isAccountLocked ? 'none' : '0 4px 14px 0 rgba(200, 16, 46, 0.39)',
                  '&:hover': {
                    bgcolor: isAccountLocked ? '#bdbdbd' : '#9B0C23',
                    boxShadow: isAccountLocked ? 'none' : '0 6px 20px rgba(200, 16, 46, 0.3)'
                  },
                  '&:disabled': { bgcolor: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : isAccountLocked ? (
                  'Account Locked'
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="login-signup-row">
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Don't have an account?{' '}
                  <Link to="/signup" style={{ color: '#C8102E', fontWeight: 600, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Sign up
                  </Link>
                </Typography>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </>
  );
}