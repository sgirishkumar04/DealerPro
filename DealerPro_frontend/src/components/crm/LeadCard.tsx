import React from 'react';
import { Card, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import { MoreVertical, Phone, Mail, ArrowRight } from 'lucide-react';

export interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  createdAt: string;
}

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (id: number, status: string) => void;
}

export default function LeadCard({ lead, onStatusChange }: LeadCardProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const nextStatus = lead.status === 'NEW' ? 'FOLLOWUP' : lead.status === 'FOLLOWUP' ? 'CONVERTED' : null;

  return (
    <Card className="p-4 mb-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group">
      <div className="flex justify-between items-start mb-2">
        <Typography variant="subtitle1" className="font-bold text-slate-800 leading-tight">
          {lead.firstName} {lead.lastName}
        </Typography>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} className="text-slate-400">
          <MoreVertical size={16} />
        </IconButton>
      </div>
      
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Phone size={14} /> <span>{lead.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Mail size={14} /> <span className="truncate">{lead.email}</span>
        </div>
      </div>
      
      {lead.notes && (
        <Typography variant="caption" className="text-slate-400 block mb-3 line-clamp-2">
          {lead.notes}
        </Typography>
      )}

      {nextStatus && (
        <button 
          onClick={() => onStatusChange(lead.id, nextStatus)}
          className="w-full mt-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors border border-slate-200"
        >
          Move to {nextStatus} <ArrowRight size={14} />
        </button>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); onStatusChange(lead.id, 'NEW'); }}>Revert to NEW</MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onStatusChange(lead.id, 'FOLLOWUP'); }}>Set FOLLOWUP</MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onStatusChange(lead.id, 'CONVERTED'); }}>Mark CONVERTED</MenuItem>
      </Menu>
    </Card>
  );
}
