import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, TextField, IconButton, Badge, Chip, Drawer, Divider,
  ToggleButton, ToggleButtonGroup, Tooltip, Paper, Stack, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Plus, Edit, Trash2, SlidersHorizontal, X, ArrowUpDown,
  ArrowUp, ArrowDown, Filter, RotateCcw, Check
} from 'lucide-react';

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

// ─── Operator Labels ──────────────────────────────────────────────────────────
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

// ─── Filter Engine ────────────────────────────────────────────────────────────
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

// ─── Toolbar Drawer Component ─────────────────────────────────────────────────
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
        sx: {
          width: { xs: '100vw', sm: 420 },
          borderRadius: 0,
          bgcolor: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)'
        }
      }}
      SlideProps={{ onEnter: handleOpen }}
    >
      {/* Header */}
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

        {/* ── FILTERS SECTION ─────────────────────────── */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Filter size={15} color="#64748b" />
              <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                Filters
              </Typography>
              {localFilters.length > 0 && (
                <Chip label={localFilters.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#0a0f1e', color: '#fff', borderRadius: '4px' }} />
              )}
            </Box>
            <Button
              size="small"
              onClick={addFilter}
              startIcon={<Plus size={13} />}
              sx={{
                fontSize: '0.75rem', fontWeight: 600, color: '#0a0f1e', borderRadius: 0,
                border: '1px solid #0a0f1e', px: 1.5, py: 0.5,
                '&:hover': { bgcolor: '#0a0f1e', color: '#fff' }
              }}
            >
              Add Filter
            </Button>
          </Box>

          {localFilters.length === 0 && (
            <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                No filters applied. Click "Add Filter" to start.
              </Typography>
            </Box>
          )}

          <Stack spacing={1.5}>
            {localFilters.map((filter, idx) => {
              const ops = getOperators(filter.field);
              return (
                <Paper key={filter.id} elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderLeft: '3px solid #0a0f1e', borderRadius: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Rule {idx + 1}
                    </Typography>
                    <IconButton size="small" onClick={() => removeFilter(filter.id)} sx={{ color: '#ef4444', p: 0.5 }}>
                      <X size={14} />
                    </IconButton>
                  </Box>
                  <Stack spacing={1}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.8rem' }}>Column</InputLabel>
                      <Select
                        value={filter.field}
                        label="Column"
                        onChange={e => {
                          const newField = e.target.value as string;
                          const ops2 = getOperators(newField);
                          updateFilter(filter.id, { field: newField, operator: ops2[0].value, value: '' });
                        }}
                        sx={{ borderRadius: 0, fontSize: '0.85rem' }}
                      >
                        {columns.map(col => (
                          <MenuItem key={col.field} value={col.field} sx={{ fontSize: '0.85rem' }}>{col.headerName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.8rem' }}>Condition</InputLabel>
                      <Select
                        value={filter.operator}
                        label="Condition"
                        onChange={e => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                        sx={{ borderRadius: 0, fontSize: '0.85rem' }}
                      >
                        {ops.map(op => (
                          <MenuItem key={op.value} value={op.value} sx={{ fontSize: '0.85rem' }}>{op.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label="Value"
                      value={filter.value}
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

        {/* ── SORTS SECTION ────────────────────────────── */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowUpDown size={15} color="#64748b" />
              <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                Sort Order
              </Typography>
              {localSorts.length > 0 && (
                <Chip label={localSorts.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#0a0f1e', color: '#fff', borderRadius: '4px' }} />
              )}
            </Box>
            <Button
              size="small"
              onClick={addSort}
              startIcon={<Plus size={13} />}
              disabled={localSorts.length >= columns.length}
              sx={{
                fontSize: '0.75rem', fontWeight: 600, color: '#0a0f1e', borderRadius: 0,
                border: '1px solid #0a0f1e', px: 1.5, py: 0.5,
                '&:hover': { bgcolor: '#0a0f1e', color: '#fff' },
                '&.Mui-disabled': { opacity: 0.4 }
              }}
            >
              Add Sort
            </Button>
          </Box>

          {localSorts.length === 0 && (
            <Box sx={{ py: 3, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                No sort applied. Click "Add Sort" to order results.
              </Typography>
            </Box>
          )}

          <Stack spacing={1.5}>
            {localSorts.map((sort, idx) => (
              <Paper key={sort.id} elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderLeft: '3px solid #C8102E', borderRadius: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Sort {idx + 1}
                  </Typography>
                  <IconButton size="small" onClick={() => removeSort(sort.id)} sx={{ color: '#ef4444', p: 0.5 }}>
                    <X size={14} />
                  </IconButton>
                </Box>
                <Stack spacing={1}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Column</InputLabel>
                    <Select
                      value={sort.field}
                      label="Column"
                      onChange={e => updateSort(sort.id, { field: e.target.value as string })}
                      sx={{ borderRadius: 0, fontSize: '0.85rem' }}
                    >
                      {columns.map(col => (
                        <MenuItem
                          key={col.field}
                          value={col.field}
                          disabled={localSorts.some(s => s.id !== sort.id && s.field === col.field)}
                          sx={{ fontSize: '0.85rem' }}
                        >
                          {col.headerName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <ToggleButtonGroup
                    value={sort.direction}
                    exclusive
                    onChange={(_, val) => val && updateSort(sort.id, { direction: val })}
                    size="small"
                    fullWidth
                    sx={{ '& .MuiToggleButton-root': { borderRadius: 0, fontSize: '0.78rem', fontWeight: 600, flex: 1 } }}
                  >
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

      {/* Footer Actions */}
      <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 2, bgcolor: '#f8fafc' }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<RotateCcw size={14} />}
          onClick={handleReset}
          sx={{ borderRadius: 0, fontWeight: 600, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: 'transparent' } }}
        >
          Reset All
        </Button>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Check size={14} />}
          onClick={handleApply}
          sx={{ borderRadius: 0, fontWeight: 600, bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' } }}
        >
          Apply
        </Button>
      </Box>
    </Drawer>
  );
}

// ─── Main TestDrive Component ─────────────────────────────────────────────────
export default function TestDrive() {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'ROLE_MANAGER' || user?.role === 'ROLE_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [scheduledAt, setScheduledAt] = useState<Dayjs | null>(dayjs());
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Cascading Selection State
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // Toolbar state
  const activeCount = activeFilters.length + activeSorts.length;

  const { data, isLoading } = useQuery({
    queryKey: ['testdrives', keyword, activeFilters, activeSorts, page, pageSize],
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

      const { data } = await api.post('/api/test-drives/search', {
        keyword,
        filters,
        sorts,
        page,
        size: pageSize
      });
      return data.data;
    }
  });

  const processedRows = useMemo(() => data?.content || [], [data]);

  const { data: leads } = useQuery({
    queryKey: ['leads_list'],
    queryFn: async () => { const { data } = await api.get('/api/leads?page=0&size=100'); return data.data.content; }
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles_catalog'],
    queryFn: async () => { const { data } = await api.get('/api/vehicles?page=0&size=100'); return data.data.content; }
  });

  const { data: kiaCars = [] } = useQuery<any[]>({
    queryKey: ['kia-cars'],
    queryFn: async () => {
      const { data } = await api.get('/api/kia-cars');
      return data.data;
    },
    staleTime: Infinity,
  });

  // Fetch dealers for admin/manager
  const { data: dealersData } = useQuery({
    queryKey: ['dealers'],
    queryFn: async () => {
      const { data } = await api.get('/api/dealers?page=0&size=1000');
      return data.data;
    },
    enabled: isManagerOrAdmin
  });

  const dealers = dealersData?.content || [];

  // Keyboard shortcut: Ctrl+M to navigate to Test Drives
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        // Already on Test Drives page, so just focus on the page
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derived options for cascading dropdowns
  const uniqueModels = Array.from(new Set(kiaCars.map((c: any) => c.modelName))).sort();
  const variantsForModel = selectedModel
    ? Array.from(new Set(kiaCars.filter((c: any) => c.modelName === selectedModel).map((c: any) => c.variant))).sort()
    : [];
  const colorsForVariant = (selectedModel && selectedVariant)
    ? kiaCars.filter((c: any) => c.modelName === selectedModel && c.variant === selectedVariant).sort((a: any, b: any) => a.color.localeCompare(b.color))
    : [];

  // ─── Apply Filters + Sorts ──────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: () => {
      // Find the vehicle that matches the selected KiaCar
      let vehicleId = null;
      
      if (selectedVehicle?.id) {
        // vehicles from API have kiaCarId, not kiaCar.id
        const vehicle = vehicles?.find((v: any) => v.kiaCarId === selectedVehicle.id);
        vehicleId = vehicle?.id;
      }
      
      // Validation
      if (!selectedLead?.id) {
        throw new Error('Please select a lead');
      }
      if (!vehicleId) {
        throw new Error('Please select a vehicle. If the vehicle is not available, please add it to inventory first.');
      }
      if (!scheduledAt) {
        throw new Error('Please select a date and time');
      }
      
      const payload: any = {
        leadId: selectedLead.id,
        vehicleId: vehicleId,
        scheduledAt: scheduledAt.toISOString()
      };
      
      if (isManagerOrAdmin && selectedDealer) {
        payload.dealerId = selectedDealer.id;
      }
      
      return editId ? api.put(`/api/test-drives/${editId}`, payload) : api.post('/api/test-drives', payload);
    },
    onSuccess: () => {
      toast.success(editId ? 'Test drive updated' : 'Test drive scheduled');
      queryClient.invalidateQueries({ queryKey: ['testdrives'] });
      handleCloseForm();
    },
    onError: (err: any) => {
      const errorMsg = err.message || err.response?.data?.message || (editId ? 'Error updating test drive' : 'Error scheduling test drive');
      toast.error(errorMsg);
    }
  });

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditId(item.id);
      const lead = leads?.find((l: any) => l.id === item.leadId);
      setSelectedLead(lead || null);
      if (isManagerOrAdmin && item.dealerId) {
        const dealer = dealers.find((d: any) => d.id === item.dealerId);
        setSelectedDealer(dealer || null);
      }
      
      // Find the vehicle by vehicleId, then get its KiaCar using kiaCarId
      const vehicle = vehicles?.find((v: any) => v.id === item.vehicleId);
      if (vehicle && vehicle.kiaCarId) {
        const car = kiaCars.find((c: any) => c.id === vehicle.kiaCarId);
        if (car) {
          setSelectedModel(car.modelName);
          setSelectedVariant(car.variant);
          setSelectedVehicle(car);
        }
      }
      
      setScheduledAt(item.scheduledAt ? dayjs(item.scheduledAt) : dayjs());
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditId(null);
    setSelectedLead(null);
    setSelectedDealer(null);
    setSelectedVehicle(null);
    setSelectedModel(null);
    setSelectedVariant(null);
    setScheduledAt(dayjs());
  };

  // ─── Toolbar column definitions ─────────────────────────────────────────────
  const toolbarColumns: ColumnDef[] = [
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', type: 'number' as const }] : []),
    { field: 'customerName', headerName: 'Customer', type: 'string' as const },
    ...(isManagerOrAdmin ? [
      { field: 'dealerName', headerName: 'Dealer', type: 'string' as const },
      ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', type: 'number' as const }] : [])
    ] : []),
    { field: 'modelName', headerName: 'Model', type: 'string' as const },
    { field: 'variant', headerName: 'Variant', type: 'string' as const },
    { field: 'color', headerName: 'Color', type: 'string' as const },
    { field: 'scheduledAt', headerName: 'Scheduled For', type: 'string' as const },
    { field: 'status', headerName: 'Status', type: 'string' as const },
    { field: 'lastUpdated', headerName: 'Last Updated', type: 'string' as const },
  ];

  const cols: GridColDef[] = [
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', width: 100, headerAlign: 'left' as const, align: 'left' as const }] : []),
    { field: 'customerName', headerName: 'Customer', flex: 1.2, minWidth: 150 },
    ...(isManagerOrAdmin ? [
      { field: 'dealerName', headerName: 'Dealer', width: 180 },
      ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', width: 120, headerAlign: 'left' as const, align: 'left' as const }] : [])
    ] : []),
    { field: 'modelName', headerName: 'Model', width: 120 },
    { field: 'variant', headerName: 'Variant', width: 150 },
    { field: 'color', headerName: 'Color', width: 130 },
    {
      field: 'scheduledAt',
      headerName: 'Scheduled For',
      width: 180,
      headerAlign: 'left', align: 'left',
      valueFormatter: (value: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (p) => {
        let col: "info" | "warning" | "success" | "error" = "warning";
        if (p.value === 'COMPLETED') col = 'success';
        if (p.value === 'SCHEDULED') col = 'info';
        if (p.value === 'CANCELLED') col = 'error';
        return <Chip label={p.value as string} color={col} size="small" variant="outlined" sx={{ borderRadius: 0 }} />;
      }
    },
    { field: 'lastUpdated', headerName: 'Last Updated', width: 180 },
    {
      field: 'actions',
      headerName: 'Action',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <IconButton onClick={() => handleOpenForm(params.row)} size="small" color="primary">
              <Edit size={18} />
            </IconButton>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <IconButton onClick={() => console.log('Delete test drive', params.row.id)} size="small" color="error">
              <Trash2 size={18} />
            </IconButton>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-none shadow-sm border border-slate-100 gap-4 sm:gap-0">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">Test Drives</Typography>
          <Typography variant="body2" className="text-slate-500">Manage vehicle demonstrations and customer feedback</Typography>
        </div>
        <div className="flex items-center gap-2">
          {/* Toolbar Button */}
          <Tooltip title={activeCount > 0 ? `${activeFilters.length} filter(s), ${activeSorts.length} sort(s) active` : 'Filter & Sort'} arrow>
            <IconButton
              onClick={() => setToolbarOpen(true)}
              sx={{
                position: 'relative',
                bgcolor: activeCount > 0 ? '#0a0f1e' : 'transparent',
                color: activeCount > 0 ? '#fff' : '#475569',
                border: '1px solid',
                borderColor: activeCount > 0 ? '#0a0f1e' : '#e2e8f0',
                borderRadius: 0,
                width: 40,
                height: 40,
                '&:hover': {
                  bgcolor: activeCount > 0 ? '#1a2134ff' : '#f1f5f9',
                  borderColor: '#0a0f1e',
                  color: activeCount > 0 ? '#fff' : '#0a0f1e',
                },
                transition: 'all 0.15s ease'
              }}
            >
              <Badge
                badgeContent={activeCount || null}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#C8102E',
                    color: '#fff',
                    fontSize: '0.6rem',
                    minWidth: 16,
                    height: 16,
                    top: -2,
                    right: -2
                  }
                }}
              >
                <SlidersHorizontal size={18} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Search Bar */}
          <TextField
            size="small"
            placeholder="Search test drives..."
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

          {/* Active filter/sort summary chips */}
          {activeCount > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {activeFilters.length > 0 && (
                <Chip
                  label={`${activeFilters.length} filter${activeFilters.length > 1 ? 's' : ''}`}
                  size="small"
                  icon={<Filter size={11} />}
                  onDelete={() => setActiveFilters([])}
                  sx={{ borderRadius: '4px', fontWeight: 600, fontSize: '0.72rem', height: 26, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
                />
              )}
              {activeSorts.length > 0 && (
                <Chip
                  label={`${activeSorts.length} sort${activeSorts.length > 1 ? 's' : ''}`}
                  size="small"
                  icon={<ArrowUpDown size={11} />}
                  onDelete={() => setActiveSorts([])}
                  sx={{ borderRadius: '4px', fontWeight: 600, fontSize: '0.72rem', height: 26, bgcolor: '#fdf4ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}
                />
              )}
            </Box>
          )}

          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <Button
              variant="contained"
              onClick={() => handleOpenForm()}
              startIcon={<Plus size={18} />}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: '0px' }}
            >
              Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Active filter summary bar */}
      {activeFilters.length > 0 && (
        <Box sx={{ px: 3, py: 1.5, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderLeft: '3px solid #0ea5e9', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Filter size={14} color="#0369a1" />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', mr: 0.5 }}>Active filters:</Typography>
          {activeFilters.map(f => {
            const col = toolbarColumns.find(c => c.field === f.field);
            return (
              <Chip
                key={f.id}
                label={`${col?.headerName} ${f.operator} "${f.value}"`}
                size="small"
                onDelete={() => setActiveFilters(prev => prev.filter(x => x.id !== f.id))}
                sx={{ borderRadius: '4px', fontSize: '0.72rem', height: 22, bgcolor: '#fff', border: '1px solid #bae6fd', color: '#0369a1' }}
              />
            );
          })}
          <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto' }}>
            Showing {processedRows.length} of {data?.totalElements || 0} records
          </Typography>
        </Box>
      )}

      {/* DataGrid Container */}
      <div className="bg-white rounded-none shadow-sm border border-slate-100 mt-8">
        <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
          <DataGrid
            rows={processedRows}
            columns={cols}
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
              border: 0,
              borderRadius: 0,
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#334155', borderRadius: 0 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f1f5f9' },
              '& .MuiOutlinedInput-root': { borderRadius: 0 },
              '& .MuiDataGrid-panelContent': { color: '#000000' },
              '& .MuiDataGrid-panelContent .MuiFormControlLabel-label': { color: '#000000 !important' },
              '& .MuiDataGrid-panelHeader': { color: '#000000' },
              '& .MuiDataGrid-panelFooter': { color: '#000000' },
              '& .MuiDataGrid-panel .MuiTypography-root': { color: '#000000 !important' },
              '& .MuiDataGrid-panel .MuiFormControlLabel-root': { color: '#000000 !important' }
            }}
          />
        </Box>
      </div>

      {/* ── Toolbar Drawer ────────────────────────────────────────────────────── */}
      <ToolbarDrawer
        open={toolbarOpen}
        onClose={() => setToolbarOpen(false)}
        columns={toolbarColumns}
        filters={activeFilters}
        sorts={activeSorts}
        onFiltersChange={setActiveFilters}
        onSortsChange={setActiveSorts}
      />

      <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          {editId ? 'Edit Test Drive' : 'Schedule Test Drive'}
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 3.5 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Dealer Selection for Manager/Admin */}
            {isManagerOrAdmin && (
              <Autocomplete
                options={dealers || []}
                value={selectedDealer}
                getOptionLabel={(o: any) => `${o.name} (ID: ${o.id})`}
                isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                onChange={(_, val) => setSelectedDealer(val)}
                renderInput={(params) => <TextField {...params} label="Select Dealer" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
              />
            )}

            <Autocomplete
              options={leads || []}
              value={selectedLead}
              getOptionLabel={(o: any) => `${o.firstName} ${o.lastName}`}
              isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
              onChange={(_, val) => setSelectedLead(val)}
              renderOption={(props, option: any) => (
                <li {...props} key={option.id}>
                  {option.firstName} {option.lastName}
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Select Lead" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
            />

            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 1 }}>Vehicle Selection</Typography>

            {/* 1. SELECT MODEL */}
            <Autocomplete
              options={uniqueModels}
              value={selectedModel}
              onChange={(_, newVal) => {
                setSelectedModel(newVal as string | null);
                setSelectedVariant(null);
                setSelectedVehicle(null);
              }}
              renderInput={(params) => <TextField {...params} label="1. Select Model (e.g. Seltos)" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
            />

            {/* 2. SELECT VARIANT */}
            <Autocomplete
              options={variantsForModel}
              disabled={!selectedModel}
              value={selectedVariant}
              onChange={(_, newVal) => {
                setSelectedVariant(newVal as string | null);
                setSelectedVehicle(null);
              }}
              renderInput={(params) => <TextField {...params} label="2. Select Variant (e.g. HTX+)" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
            />

            {/* 3. SELECT COLOR */}
            <Autocomplete
              options={colorsForVariant}
              disabled={!selectedVariant}
              getOptionLabel={(opt: any) => opt.color}
              value={selectedVehicle}
              onChange={(_, newVal) => setSelectedVehicle(newVal)}
              renderInput={(params) => <TextField {...params} label="3. Select Color" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker label="Test Drive Date & Time" value={scheduledAt} onChange={(v: any) => setScheduledAt(v)} sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
            </LocalizationProvider>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={handleCloseForm} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            variant="contained"
            disabled={!selectedLead || !selectedVehicle || !scheduledAt || mutation.isPending}
            sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: 0, px: 3 }}
          >
            {mutation.isPending ? 'Saving...' : (editId ? 'Update' : 'Confirm Schedule')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}