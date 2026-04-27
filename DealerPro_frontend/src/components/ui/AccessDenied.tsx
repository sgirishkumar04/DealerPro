import { ShieldAlert } from 'lucide-react';
import { Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-red-50 p-6 rounded-full mb-6">
        <ShieldAlert size={80} className="text-[#C8102E]" />
      </div>
      <Typography variant="h3" className="font-bold text-slate-800 mb-2 mt-4 text-center">Access Denied</Typography>
      <Typography variant="body1" className="text-slate-500 max-w-md text-center mb-8">
        You do not have the required permissions to view this module. If you believe this is a mistake, please contact your administrator.
      </Typography>
      <Button 
        variant="outlined" 
        onClick={() => navigate('/dashboard')}
        sx={{ borderColor: '#C8102E', color: '#C8102E', '&:hover': { borderColor: '#a30c25', bgcolor: 'transparent' } }}
      >
        Return to Dashboard
      </Button>
    </div>
  );
}
