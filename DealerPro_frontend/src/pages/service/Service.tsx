import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, TextField, IconButton, Chip, Badge, Drawer, Divider,
  ToggleButton, ToggleButtonGroup, Tooltip, Paper, Stack, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, CheckCircle, Wrench, SlidersHorizontal, X, ArrowUpDown,
  ArrowUp, ArrowDown, Filter, RotateCcw, Check, FileText, Download, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import DocumentManager from '../../components/DocumentManager';

const sSchema = z.object({
  vehicleId: z.number().min(1, 'Please select a vehicle'),
  description: z.string().min(10, 'Please provide at least 10 characters describing the issue')
});

interface KiaCar {
  id: number;
  displayName: string;
  modelName: string;
  variant: string;
  color: string;
  price: number;
}

// ─── Filter/Sort Types ────────────────────────────────────────────────────────
type FilterOperator = 'contains' | 'equals' | 'startsWith' | 'gt' | 'lt' | 'gte' | 'lte';
type SortDirection = 'asc' | 'desc';

interface ActiveFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

interface ActiveSort {
  id: string;
  field: string;
  direction: SortDirection;
}

interface ColumnDef {
  field: string;
  headerName: string;
  type?: 'string' | 'number' | 'date';
}

const STRING_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
];
const NUMBER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: '= Equals' },
  { value: 'gt', label: '> Greater than' },
  { value: 'lt', label: '< Less than' },
  { value: 'gte', label: '>= At least' },
  { value: 'lte', label: '<= At most' },
];

function applyFilter(row: any, filter: ActiveFilter): boolean {
  const raw = row[filter.field];
  const cellVal = raw === null || raw === undefined ? '' : String(raw).toLowerCase();
  const filterVal = filter.value.toLowerCase().trim();
  if (!filterVal) return true;
  switch (filter.operator) {
    case 'contains': return cellVal.includes(filterVal);
    case 'equals': return cellVal === filterVal;
    case 'startsWith': return cellVal.startsWith(filterVal);
    case 'gt': return parseFloat(String(raw)) > parseFloat(filter.value);
    case 'lt': return parseFloat(String(raw)) < parseFloat(filter.value);
    case 'gte': return parseFloat(String(raw)) >= parseFloat(filter.value);
    case 'lte': return parseFloat(String(raw)) <= parseFloat(filter.value);
    default: return true;
  }
}

function applySort(data: any[], sorts: ActiveSort[]): any[] {
  if (!sorts.length) return data;
  return [...data].sort((a, b) => {
    for (const sort of sorts) {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
      }
      if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

// ─── Toolbar Drawer ───────────────────────────────────────────────────────────
interface ToolbarDrawerProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  filters: ActiveFilter[];
  sorts: ActiveSort[];
  onFiltersChange: (f: ActiveFilter[]) => void;
  onSortsChange: (s: ActiveSort[]) => void;
}

function ToolbarDrawer({ open, onClose, columns, filters, sorts, onFiltersChange, onSortsChange }: ToolbarDrawerProps) {
  const [localFilters, setLocalFilters] = useState<ActiveFilter[]>(filters);
  const [localSorts, setLocalSorts] = useState<ActiveSort[]>(sorts);

  const handleOpen = () => {
    setLocalFilters(filters);
    setLocalSorts(sorts);
  };

  const addFilter = () => {
    setLocalFilters(prev => [...prev, {
      id: crypto.randomUUID(),
      field: columns[0]?.field || '',
      operator: 'contains',
      value: ''
    }]);
  };

  const removeFilter = (id: string) => setLocalFilters(prev => prev.filter(f => f.id !== id));

  const updateFilter = (id: string, patch: Partial<ActiveFilter>) =>
    setLocalFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  const addSort = () => {
    const usedFields = localSorts.map(s => s.field);
    const available = columns.find(c => !usedFields.includes(c.field));
    setLocalSorts(prev => [...prev, {
      id: crypto.randomUUID(),
      field: available?.field || columns[0]?.field || '',
      direction: 'asc'
    }]);
  };

  const removeSort = (id: string) => setLocalSorts(prev => prev.filter(s => s.id !== id));

  const updateSort = (id: string, patch: Partial<ActiveSort>) =>
    setLocalSorts(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const handleApply = () => {
    onFiltersChange(localFilters.filter(f => f.value.trim() !== ''));
    onSortsChange(localSorts);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters([]);
    setLocalSorts([]);
    onFiltersChange([]);
    onSortsChange([]);
    onClose();
  };

  const getOperators = (field: string) => {
    const col = columns.find(c => c.field === field);
    return col?.type === 'number' ? NUMBER_OPERATORS : STRING_OPERATORS;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100vw', sm: 420 }, borderRadius: 0, bgcolor: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)' }
      }}
      SlideProps={{ onEnter: handleOpen }}
    >
      <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0a0f1e' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SlidersHorizontal size={18} color="#fff" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
            Filter & Sort
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}>
          <X size={18} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
        {/* Filters */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Filter size={15} color="#64748b" />
              <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.08em' }}>Filters</Typography>
              {localFilters.length > 0 && (
                <Chip label={localFilters.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#0a0f1e', color: '#fff', borderRadius: '4px' }} />
              )}
            </Box>
            <Button size="small" onClick={addFilter} startIcon={<Plus size={13} />}
              sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#0a0f1e', borderRadius: 0, border: '1px solid #0a0f1e', px: 1.5, py: 0.5, '&:hover': { bgcolor: '#0a0f1e', color: '#fff' } }}>
              Add Filter
            </Button>
          </Box>
          {localFilters.length === 0 && (
            <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>No filters applied. Click "Add Filter" to start.</Typography>
            </Box>
          )}
          <Stack spacing={1.5}>
            {localFilters.map((filter, idx) => {
              const ops = getOperators(filter.field);
              return (
                <Paper key={filter.id} elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderLeft: '3px solid #0a0f1e', borderRadius: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rule {idx + 1}</Typography>
                    <IconButton size="small" onClick={() => removeFilter(filter.id)} sx={{ color: '#ef4444', p: 0.5 }}><X size={14} /></IconButton>
                  </Box>
                  <Stack spacing={1}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.8rem' }}>Column</InputLabel>
                      <Select value={filter.field} label="Column"
                        onChange={e => {
                          const newField = e.target.value as string;
                          const ops2 = getOperators(newField);
                          updateFilter(filter.id, { field: newField, operator: ops2[0].value, value: '' });
                        }}
                        sx={{ borderRadius: 0, fontSize: '0.85rem' }}>
                        {columns.map(col => <MenuItem key={col.field} value={col.field} sx={{ fontSize: '0.85rem' }}>{col.headerName}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.8rem' }}>Condition</InputLabel>
                      <Select value={filter.operator} label="Condition"
                        onChange={e => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                        sx={{ borderRadius: 0, fontSize: '0.85rem' }}>
                        {ops.map(op => <MenuItem key={op.value} value={op.value} sx={{ fontSize: '0.85rem' }}>{op.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Value" value={filter.value}
                      onChange={e => updateFilter(filter.id, { value: e.target.value })}
                      fullWidth
                      placeholder={columns.find(c => c.field === filter.field)?.type === 'number' ? 'e.g. 5' : 'e.g. Seltos'}
                      InputProps={{ sx: { borderRadius: 0, fontSize: '0.85rem' } }}
                      InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                    />
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Sorts */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowUpDown size={15} color="#64748b" />
              <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.08em' }}>Sort Order</Typography>
              {localSorts.length > 0 && (
                <Chip label={localSorts.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#0a0f1e', color: '#fff', borderRadius: '4px' }} />
              )}
            </Box>
            <Button size="small" onClick={addSort} startIcon={<Plus size={13} />}
              disabled={localSorts.length >= columns.length}
              sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#0a0f1e', borderRadius: 0, border: '1px solid #0a0f1e', px: 1.5, py: 0.5, '&:hover': { bgcolor: '#0a0f1e', color: '#fff' }, '&.Mui-disabled': { opacity: 0.4 } }}>
              Add Sort
            </Button>
          </Box>
          {localSorts.length === 0 && (
            <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>No sort applied. Click "Add Sort" to order results.</Typography>
            </Box>
          )}
          <Stack spacing={1.5}>
            {localSorts.map((sort, idx) => (
              <Paper key={sort.id} elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderLeft: '3px solid #C8102E', borderRadius: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort {idx + 1}</Typography>
                  <IconButton size="small" onClick={() => removeSort(sort.id)} sx={{ color: '#ef4444', p: 0.5 }}><X size={14} /></IconButton>
                </Box>
                <Stack spacing={1}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Column</InputLabel>
                    <Select value={sort.field} label="Column"
                      onChange={e => updateSort(sort.id, { field: e.target.value as string })}
                      sx={{ borderRadius: 0, fontSize: '0.85rem' }}>
                      {columns.map(col => (
                        <MenuItem key={col.field} value={col.field}
                          disabled={localSorts.some(s => s.id !== sort.id && s.field === col.field)}
                          sx={{ fontSize: '0.85rem' }}>
                          {col.headerName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <ToggleButtonGroup value={sort.direction} exclusive
                    onChange={(_, val) => val && updateSort(sort.id, { direction: val })}
                    size="small" fullWidth
                    sx={{ '& .MuiToggleButton-root': { borderRadius: 0, fontSize: '0.78rem', fontWeight: 600, flex: 1 } }}>
                    <ToggleButton value="asc" sx={{ gap: 0.5, '&.Mui-selected': { bgcolor: '#0a0f1e', color: '#fff', '&:hover': { bgcolor: '#1a2134ff' } } }}>
                      <ArrowUp size={13} /> Ascending
                    </ToggleButton>
                    <ToggleButton value="desc" sx={{ gap: 0.5, '&.Mui-selected': { bgcolor: '#0a0f1e', color: '#fff', '&:hover': { bgcolor: '#1a2134ff' } } }}>
                      <ArrowDown size={13} /> Descending
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 2, bgcolor: '#f8fafc' }}>
        <Button fullWidth variant="outlined" startIcon={<RotateCcw size={14} />} onClick={handleReset}
          sx={{ borderRadius: 0, fontWeight: 600, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: 'transparent' } }}>
          Reset All
        </Button>
        <Button fullWidth variant="contained" startIcon={<Check size={14} />} onClick={handleApply}
          sx={{ borderRadius: 0, fontWeight: 600, bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' } }}>
          Apply
        </Button>
      </Box>
    </Drawer>
  );
}

// ─── Main Service Component ───────────────────────────────────────────────────
export default function Service() {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'ROLE_MANAGER' || user?.role === 'ROLE_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
  const qc = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Cascading Selection State
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);

  const { control, register, handleSubmit, reset, setValue, formState: { errors } } = useForm<z.infer<typeof sSchema>>({
    resolver: zodResolver(sSchema),
    defaultValues: { vehicleId: 0, description: '' }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['services', keyword, activeFilters, activeSorts, page, pageSize],
    queryFn: async () => {
      const filters = activeFilters.map(f => ({
        field: f.field,
        operator: f.operator === 'contains' ? 'LIKE' : '=',
        value: f.value
      }));

      const sorts = activeSorts.map(s => ({
        field: s.field,
        direction: s.direction.toUpperCase()
      }));

      const { data } = await api.post('/api/v1/service-orders/search', {
        keyword,
        filters,
        sorts,
        page,
        size: pageSize
      });
      return data.data;
    }
  });

  const records = useMemo(() => data?.content || [], [data]);

  // Fetch KIA Cars for cascading dropdown
  const { data: kiaCars = [] } = useQuery<KiaCar[]>({
    queryKey: ['kia-cars'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/kia-cars');
      return data.data;
    },
    staleTime: Infinity,
  });

  // Fetch dealers for admin/manager
  const { data: dealersData } = useQuery({
    queryKey: ['dealers'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/dealers?page=0&size=1000');
      return data.data;
    },
    enabled: isManagerOrAdmin
  });

  const dealers = dealersData?.content || [];

  // Derived options for cascading dropdowns
  const uniqueModels = Array.from(new Set(kiaCars.map(c => c.modelName))).sort();
  const variantsForModel = selectedModel
    ? Array.from(new Set(kiaCars.filter(c => c.modelName === selectedModel).map(c => c.variant))).sort()
    : [];
  const colorsForVariant = (selectedModel && selectedVariant)
    ? kiaCars.filter(c => c.modelName === selectedModel && c.variant === selectedVariant).sort((a, b) => a.color.localeCompare(b.color))
    : [];

  const activeCount = activeFilters.length + activeSorts.length;

  const m = useMutation({
    mutationFn: (d: any) => {
      const payload: any = {
        vehicleId: d.vehicleId,
        description: d.description,
        status: 'PENDING'
      };
      if (isManagerOrAdmin && selectedDealer) {
        payload.dealerId = selectedDealer.id;
      }
      return api.post('/api/v1/service-orders', payload);
    },
    onSuccess: () => {
      toast.success('Order created');
      qc.invalidateQueries({ queryKey: ['services'] });
      setIsOpen(false);
      reset();
      setSelectedModel(null);
      setSelectedVariant(null);
      setSelectedDealer(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error creating order')
  });

  const stM = useMutation({
    mutationFn: ({ id, st, version }: { id: number, st: string, version?: number }) => 
      api.put(`/api/v1/service-orders/${id}/status?status=${st}${version !== undefined ? `&version=${version}` : ''}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] })
  });

  const handleDownloadReport = async (id: number) => {
    try {
      const response = await api.get(`/api/v1/service-orders/${id}/report`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `service_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const toolbarColumns: ColumnDef[] = [
    { field: 'id', headerName: 'Order ID', type: 'number' },
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', type: 'number' as const }] : []),
    ...(isManagerOrAdmin ? [
      { field: 'dealerName', headerName: 'Dealer', type: 'string' as const },
      ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', type: 'number' as const }] : [])
    ] : []),
    { field: 'modelName', headerName: 'Model', type: 'string' },
    { field: 'variant', headerName: 'Variant', type: 'string' },
    { field: 'color', headerName: 'Color', type: 'string' },
    { field: 'description', headerName: 'Issue Description', type: 'string' },
    { field: 'status', headerName: 'Status', type: 'string' },
    { field: 'estimatedWaitTimeMinutes', headerName: 'Wait Time (Min)', type: 'number' },
    { field: 'lastUpdated', headerName: 'Last Updated', type: 'string' },
  ];

  const c: GridColDef[] = [
    { field: 'id', headerName: 'Order ID', width: 90 },
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', width: 100, headerAlign: 'left' as const, align: 'left' as const }] : []),
    ...(isManagerOrAdmin ? [
      { field: 'dealerName', headerName: 'Dealer', width: 180 },
      ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', width: 120, headerAlign: 'left' as const, align: 'left' as const }] : [])
    ] : []),
    { field: 'modelName', headerName: 'Model', width: 120 },
    { field: 'variant', headerName: 'Variant', width: 150 },
    { field: 'color', headerName: 'Color', width: 130 },
    { field: 'description', headerName: 'Issue Description', flex: 2 },
    {
      field: 'status', headerName: 'Status', width: 130,
      renderCell: (p) => {
        let col: "info" | "warning" | "success" = "warning";
        if (p.value === 'COMPLETED') col = 'success';
        if (p.value === 'PENDING') col = 'info';
        return <Chip label={p.value as string} color={col} size="small" variant="outlined" sx={{ borderRadius: 0 }} />;
      }
    },
    {
      field: 'actions', headerName: 'Action', width: 160,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
          <IconButton onClick={() => { setDetailsId(p.row.id); setActiveTab(0); }} size="small" color="primary">
            <Eye size={18} />
          </IconButton>
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && p.row.status === 'PENDING' && (
            <IconButton onClick={() => stM.mutate({ 
              id: p.row.id as number, 
              st: 'IN_PROGRESS',
              version: p.row.version
            })} size="small" color="warning"><Wrench size={18} /></IconButton>
          )}
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && p.row.status === 'IN_PROGRESS' && (
            <IconButton onClick={() => stM.mutate({ 
              id: p.row.id as number, 
              st: 'COMPLETED',
              version: p.row.version
            })} size="small" color="success"><CheckCircle size={18} /></IconButton>
          )}
          <IconButton onClick={() => handleDownloadReport(p.row.id)} size="small" color="secondary">
            <Download size={18} />
          </IconButton>
        </Box>
      )
    }
  ];

  const selectedOrder = records.find(r => r.id === detailsId);

  return (
    <Box className="space-y-8 flex flex-col w-full overflow-x-hidden p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-none shadow-sm border border-slate-100 gap-4 sm:gap-0">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">Workshop & Service</Typography>
          <Typography variant="body2" className="text-slate-500">Manage repair orders locally</Typography>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title={activeCount > 0 ? `${activeFilters.length} filter(s), ${activeSorts.length} sort(s) active` : 'Filter & Sort'} arrow>
            <IconButton
              onClick={() => setToolbarOpen(true)}
              sx={{
                bgcolor: activeCount > 0 ? '#0a0f1e' : 'transparent',
                color: activeCount > 0 ? '#fff' : '#475569',
                border: '1px solid',
                borderColor: activeCount > 0 ? '#0a0f1e' : '#e2e8f0',
                borderRadius: 0,
                width: 40,
                height: 40,
                '&:hover': { bgcolor: activeCount > 0 ? '#1a2134ff' : '#f1f5f9', borderColor: '#0a0f1e', color: activeCount > 0 ? '#fff' : '#0a0f1e' },
                transition: 'all 0.15s ease'
              }}
            >
              <Badge
                badgeContent={activeCount || null}
                sx={{ '& .MuiBadge-badge': { bgcolor: '#C8102E', color: '#fff', fontSize: '0.6rem', minWidth: 16, height: 16, top: -2, right: -2 } }}
              >
                <SlidersHorizontal size={18} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Search Bar */}
          <TextField
            size="small"
            placeholder="Search service orders..."
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(0);
            }}
            sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
            InputProps={{
              startAdornment: <Filter size={14} style={{ marginRight: 8, color: '#94a3b8' }} />
            }}
          />

          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <Button variant="contained" onClick={() => setIsOpen(true)} startIcon={<Plus size={18} />}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: '0px' }}>
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* DataGrid Container */}
      <div className="bg-white rounded-none shadow-sm border border-slate-100 mt-8 w-full">
        <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
          <DataGrid
            rows={records}
            columns={c}
            loading={isLoading}
            paginationMode="server"
            rowCount={data?.totalElements || 0}
            paginationModel={{
              page: page,
              pageSize: pageSize,
            }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              border: 0, borderRadius: 0,
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#334155', borderRadius: 0 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f1f5f9' },
              '& .MuiOutlinedInput-root': { borderRadius: 0 }
            }}
          />
        </Box>
      </div>

      <ToolbarDrawer
        open={toolbarOpen}
        onClose={() => setToolbarOpen(false)}
        columns={toolbarColumns}
        filters={activeFilters}
        sorts={activeSorts}
        onFiltersChange={setActiveFilters}
        onSortsChange={setActiveSorts}
      />

      {/* New Order Dialog */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          Create Repair Order
        </DialogTitle>
        <form onSubmit={handleSubmit((d) => m.mutate(d))}>
          <DialogContent sx={{ px: 3.5, py: 3.5 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {isManagerOrAdmin && (
                <>
                  <Typography variant="subtitle2" color="primary" gutterBottom>Dealer Selection</Typography>
                  <Autocomplete
                    options={dealers || []}
                    value={selectedDealer}
                    getOptionLabel={(o: any) => `${o.name} (ID: ${o.id})`}
                    onChange={(_, val) => setSelectedDealer(val)}
                    renderInput={(params) => <TextField {...params} label="Select Dealer" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
                  />
                </>
              )}
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: isManagerOrAdmin ? 2 : 0 }}>Vehicle Selection</Typography>
              <Autocomplete
                options={uniqueModels}
                value={selectedModel}
                onChange={(_, newVal) => { setSelectedModel(newVal); setSelectedVariant(null); setValue('vehicleId', 0); }}
                renderInput={(params) => <TextField {...params} label="1. Select Model" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
              />
              <Autocomplete
                options={variantsForModel}
                disabled={!selectedModel}
                value={selectedVariant}
                onChange={(_, newVal) => { setSelectedVariant(newVal); setValue('vehicleId', 0); }}
                renderInput={(params) => <TextField {...params} label="2. Select Variant" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
              />
              <Controller
                name="vehicleId"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    options={colorsForVariant}
                    disabled={!selectedVariant}
                    getOptionLabel={(opt: KiaCar) => opt.color}
                    value={colorsForVariant.find(c => c.id === value) || null}
                    onChange={(_, newVal) => onChange(newVal ? newVal.id : 0)}
                    renderInput={(params) => (
                      <TextField {...params} label="3. Select Color"
                        error={!!errors.vehicleId} helperText={errors.vehicleId?.message}
                        fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
                    )}
                  />
                )}
              />
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Issue Details</Typography>
                <TextField {...register('description')} label="Issue Description" fullWidth multiline rows={4}
                  error={!!errors.description} helperText={errors.description?.message}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
              </Box>
            </div>
          </DialogContent>
          <DialogActions className="p-4 border-t border-slate-100 bg-slate-50">
            <Button onClick={() => setIsOpen(false)} color="inherit" sx={{ borderRadius: 0 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={m.isPending}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: 0 }}>
              {m.isPending ? 'Saving...' : 'Save Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Order Details & Documents Dialog */}
      <Dialog open={!!detailsId} onClose={() => setDetailsId(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 0, py: 0, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>Order #{detailsId} Details</Typography>
            <IconButton onClick={() => setDetailsId(null)} size="small"><X size={20} /></IconButton>
          </Box>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 2 }}>
            <Tab label="Information" />
            <Tab label="Documents & Reports" />
          </Tabs>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 400, pt: 3 }}>
          {activeTab === 0 ? (
            <Stack spacing={3}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>Vehicle Info</Typography>
                <Typography variant="h6">{selectedOrder?.vehicleName}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedOrder?.variant} • {selectedOrder?.color}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>Issue Description</Typography>
                <Typography variant="body1" sx={{ mt: 1, p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  {selectedOrder?.description}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>Current Status</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={selectedOrder?.status} color={selectedOrder?.status === 'COMPLETED' ? 'success' : 'info'} sx={{ borderRadius: 0, fontWeight: 700 }} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>Dealer</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedOrder?.dealerName}</Typography>
                </Box>
              </Box>
            </Stack>
          ) : (
            <Box>
              <Box sx={{ mb: 4, p: 2, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FileText size={24} color="#0369a1" />
                  <Box>
                    <Typography variant="subtitle2" color="#0369a1" fontWeight={700}>Service Report PDF</Typography>
                    <Typography variant="caption" color="#0369a1">Generate and download official report</Typography>
                  </Box>
                </Box>
                <Button 
                  variant="contained" 
                  startIcon={<Download size={16} />}
                  onClick={() => detailsId && handleDownloadReport(detailsId)}
                  sx={{ bgcolor: '#0369a1', '&:hover': { bgcolor: '#075985' }, borderRadius: 0 }}
                >
                  Download Report
                </Button>
              </Box>
              
              <DocumentManager 
                module="SERVICE" 
                referenceId={Number(detailsId)} 
                title="Service Documentation (Photos, Invoices)" 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={() => setDetailsId(null)} color="inherit" sx={{ borderRadius: 0 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}