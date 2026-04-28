import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, IconButton, Badge, Drawer, Divider, ToggleButton,
  ToggleButtonGroup, Tooltip, Paper, Stack, FormControl, InputLabel, Select, MenuItem, Autocomplete,
  Tabs, Tab
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, Edit, Trash2, SlidersHorizontal, X, ArrowUpDown,
  ArrowUp, ArrowDown, Filter, RotateCcw, Check, FileText
} from 'lucide-react';
import DocumentManager from '../../components/DocumentManager';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const formSchema = z.object({
  dealerId: z.number().optional(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.email('Invalid email'),
  phone: z.string().min(8, 'Phone is required'),
  modelName: z.string().min(1, 'Model is required'),
  variant: z.string().min(1, 'Variant is required'),
  color: z.string().min(1, 'Color is required'),
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional()
});

// ─── Toolbar Filter/Sort Types ────────────────────────────────────────────────
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

// ─── Main Leads Component ─────────────────────────────────────────────────────
export default function Leads() {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'ROLE_MANAGER' || user?.role === 'ROLE_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [openConflictDialog, setOpenConflictDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Toolbar state
  const [docDialogId, setDocDialogId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Cascading vehicle selection state
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema)
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

  // Fetch KIA models
  const { data: modelsData = [] } = useQuery({
    queryKey: ['kia-cars'],
    queryFn: async () => {
      const { data } = await api.get('/api/kia-cars');
      return data.data;
    }
  });

  const models = modelsData || [];
  const dealers = dealersData?.content || [];

  // Cascading dropdowns data
  const uniqueModels = Array.from(new Set(models.map((m: any) => m.modelName))).sort();
  const variantsForModel = selectedModel
    ? Array.from(new Set(models.filter((m: any) => m.modelName === selectedModel).map((m: any) => m.variant))).sort()
    : [];
  const colorsForVariant = (selectedModel && selectedVariant)
    ? Array.from(new Set(models.filter((m: any) => m.modelName === selectedModel && m.variant === selectedVariant).map((m: any) => m.color))).sort()
    : [];

  // Lead status options
  const statusOptions = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];

  const { data, isLoading } = useQuery({
    queryKey: ['leads', keyword, activeFilters, activeSorts, page, pageSize],
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

      const { data } = await api.post('/api/leads/search', {
        keyword,
        filters,
        sorts,
        page,
        size: pageSize
      });
      return data.data;
    }
  });

  // ─── Apply Filters + Sorts ─────────────────────────────────────────────────
  const processedRows = useMemo(() => {
    return data?.content || [];
  }, [data]);

  const activeCount = activeFilters.length + activeSorts.length;

  const mutation = useMutation({
    mutationFn: (newData: any) => {
      // Map frontend fields to LeadEntity fields
      const { modelName, variant, color, dealerId, ...rest } = newData;
      const vehicleInterest = [modelName, variant, color].filter(Boolean).join(' - ');
      const payload: any = {
        ...rest,
        vehicleInterest: vehicleInterest || undefined,
        version: currentVersion
      };
      
      if (dealerId) {
        payload.dealer = { id: dealerId };
      }
      
      const formData = new FormData();
      formData.append('lead', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
      }
      
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      return editId ? api.put(`/api/leads/${editId}`, formData, config) : api.post('/api/leads', formData, config);
    },
    onSuccess: () => {
      toast.success(editId ? 'Lead updated successfully' : 'Lead added successfully');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      handleCloseForm();
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setOpenConflictDialog(true);
      } else {
        toast.error(err.response?.data?.message || (editId ? 'Error updating lead' : 'Error adding lead'));
      }
    }
  });

  const handleOpenForm = (item?: any, tab: number = 0) => {
    if (item) {
      setEditId(item.id);
      setCurrentVersion(item.version);
      if (isManagerOrAdmin && item.dealerId) {
        // Ensure dealerId is set as a number for the Select component
        setValue('dealerId', Number(item.dealerId));
      }
      setValue('firstName', item.firstName);
      setValue('lastName', item.lastName);
      setValue('email', item.email);
      setValue('phone', item.phone);
      let parsedModel = item.modelName;
      let parsedVariant = item.variant;
      let parsedColor = item.color;
      
      if (!parsedModel && item.vehicleInterest) {
        const parts = item.vehicleInterest.split(' - ');
        parsedModel = parts[0] || '';
        parsedVariant = parts[1] || '';
        parsedColor = parts[2] || '';
      }

      setValue('modelName', parsedModel || '');
      setValue('variant', parsedVariant || '');
      setValue('color', parsedColor || '');
      setValue('status', item.status || 'NEW');
      setValue('notes', item.notes || '');
      
      // Update states for cascading dropdowns to pre-populate Autocomplete components
      setSelectedModel(parsedModel || null);
      setSelectedVariant(parsedVariant || null);
      setSelectedColor(parsedColor || null);
    } else {
      setEditId(null);
      setCurrentVersion(null);
      setSelectedFiles([]);
      reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        modelName: '',
        variant: '',
        color: '',
        status: 'NEW',
        notes: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleOpenDocuments = (item: any) => {
    if (!item || !item.id) return;
    setDocDialogId(item.id);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditId(null);
    setCurrentVersion(null);
    setSelectedModel(null);
    setSelectedVariant(null);
    setSelectedColor(null);
    setSelectedFiles([]);
    reset();
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status, version }: { id: number, status: string, version?: number }) => 
      api.put(`/api/leads/${id}/status?status=${status}${version !== undefined ? `&version=${version}` : ''}`),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setOpenConflictDialog(true);
      } else {
        toast.error('Error updating status');
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/leads/${id}`),
    onSuccess: () => {
      toast.success('Lead deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error deleting lead')
  });

  // ─── Toolbar column definitions ────────────────────────────────────────────
  const toolbarColumns: ColumnDef[] = [
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', type: 'number' as const }] : []),
    { field: 'firstName', headerName: 'First Name', type: 'string' },
    { field: 'lastName', headerName: 'Last Name', type: 'string' },
    ...(isManagerOrAdmin ? [
      { field: 'dealerName', headerName: 'Dealer', type: 'string' as const },
      { field: 'managerId', headerName: 'Manager ID', type: 'number' as const }
    ] : []),
    { field: 'email', headerName: 'Email', type: 'string' },
    { field: 'phone', headerName: 'Phone', type: 'string' },
    { field: 'modelName', headerName: 'Model', type: 'string' },
    { field: 'variant', headerName: 'Variant', type: 'string' },
    { field: 'color', headerName: 'Color', type: 'string' },
    { field: 'status', headerName: 'Status', type: 'string' },
    { field: 'leadScore', headerName: 'Lead Score', type: 'number' },
    { field: 'lastUpdated', headerName: 'Last Updated', type: 'string' },
  ];

  const columns: GridColDef[] = [
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', width: 100, headerAlign: 'left' as const, align: 'left' as const }] : []),
    { field: 'firstName', headerName: 'First Name', flex: 1 },
    { field: 'lastName', headerName: 'Last Name', flex: 1 },
    ...(isManagerOrAdmin ? [
      { field: 'dealerName', headerName: 'Dealer', flex: 1 },
      { field: 'managerId', headerName: 'Manager ID', width: 120, headerAlign: 'left' as const, align: 'left' as const }
    ] : []),
    { field: 'email', headerName: 'Email', flex: 1.2 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    {
      field: 'modelName',
      headerName: 'Model',
      width: 120,
      valueGetter: (value: any, row: any) => row.modelName || row.vehicleInterest || '—'
    },
    {
      field: 'variant',
      headerName: 'Variant',
      width: 150,
      valueGetter: (value: any, row: any) => row.variant || '—'
    },
    {
      field: 'color',
      headerName: 'Color',
      width: 130,
      valueGetter: (value: any, row: any) => row.color || '—'
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => {
        let color: 'info' | 'success' | 'warning' = 'info';
        if (params.value === 'CONVERTED') color = 'success';
        if (params.value === 'CONTACTED') color = 'warning';
        return <Chip label={params.value as string} color={color} size="small" variant="outlined" sx={{ borderRadius: 0 }} />;
      }
    },
    {
      field: 'leadScore',
      headerName: 'Lead Score',
      width: 130,
      renderCell: (params) => {
        const score = params.value as number || 0;
        let color = '#ef4444'; // Red
        if (score >= 75) color = '#22c55e'; // Green
        else if (score >= 50) color = '#eab308'; // Yellow
        else if (score >= 25) color = '#f97316'; // Orange

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color, minWidth: 35 }}>{score}%</Typography>
            <Box sx={{ flexGrow: 1, height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ width: `${score}%`, height: '100%', bgcolor: color, borderRadius: 3 }} />
            </Box>
          </Box>
        );
      }
    },
    { field: 'lastUpdated', headerName: 'Last Updated', width: 180 },
    {
      field: 'actions',
      headerName: 'Action',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          <Tooltip title="View Documents">
            <IconButton onClick={() => handleOpenDocuments(params.row)} size="small" color="info">
              <FileText size={18} />
            </IconButton>
          </Tooltip>
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <IconButton size="small" color="primary" onClick={() => handleOpenForm(params.row)}>
              <Edit size={18} />
            </IconButton>
          )}
          {isAdmin && (
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              <Trash2 size={18} />
            </IconButton>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box className="space-y-8 flex flex-col w-full overflow-x-hidden p-2 md:p-0">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-6 rounded-none shadow-sm border border-slate-100">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">Leads Management</Typography>
          <Typography variant="body2" className="text-slate-500">Track and convert incoming leads</Typography>
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
            placeholder="Search leads..."
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

          {/* New Lead Button */}
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <Button
              variant="contained"
              onClick={() => handleOpenForm()}
              startIcon={<Plus size={18} />}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: '0px' }}
            >
              New Lead
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
            Showing {processedRows.length} of {data?.content?.length || 0} records
          </Typography>
        </Box>
      )}

      {/* ── DataGrid ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-none shadow-sm border border-slate-100 w-full mt-8">
        <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
            <DataGrid
              rows={processedRows}
              columns={columns}
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

      {/* ── Add/Edit Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 0, py: 0, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ px: 3.5, py: 2 }}>
            {editId ? 'Edit Lead' : 'Add New Lead'}
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <DialogContent sx={{ px: 3.5, py: 3.5, minHeight: 400 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Dealer ID field for Admin/Manager */}
              {isManagerOrAdmin && (
                <FormControl fullWidth error={!!errors.dealerId}>
                  <InputLabel>Dealer</InputLabel>
                  <Select
                    {...register('dealerId', { valueAsNumber: true })}
                    label="Dealer"
                    value={watch('dealerId') || ''}
                    sx={{ borderRadius: 0 }}
                  >
                    {dealers.map((dealer: any) => (
                      <MenuItem key={dealer.id} value={dealer.id}>
                        {dealer.name} (ID: {dealer.id})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.dealerId && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.dealerId.message}
                    </Typography>
                  )}
                </FormControl>
              )}

              <div className="grid grid-cols-2 gap-4">
                <TextField {...register('firstName')} label="First Name" error={!!errors.firstName} helperText={errors.firstName?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
                <TextField {...register('lastName')} label="Last Name" error={!!errors.lastName} helperText={errors.lastName?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
              </div>
              <TextField {...register('email')} label="Email" fullWidth error={!!errors.email} helperText={errors.email?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
              <TextField {...register('phone')} label="Phone" fullWidth error={!!errors.phone} helperText={errors.phone?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
              
              {/* Model dropdown */}
              <Autocomplete
                options={uniqueModels}
                value={selectedModel}
                onChange={(_, newVal) => {
                  const value = newVal as string | null;
                  setSelectedModel(value);
                  setSelectedVariant(null);
                  setSelectedColor(null);
                  setValue('modelName', value || '');
                  setValue('variant', '');
                  setValue('color', '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Model"
                    fullWidth
                    error={!!errors.modelName}
                    helperText={errors.modelName?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                  />
                )}
              />

              {/* Variant dropdown */}
              <Autocomplete
                options={variantsForModel}
                disabled={!selectedModel}
                value={selectedVariant}
                onChange={(_, newVal) => {
                  const value = newVal as string | null;
                  setSelectedVariant(value);
                  setSelectedColor(null);
                  setValue('variant', value || '');
                  setValue('color', '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Variant"
                    fullWidth
                    error={!!errors.variant}
                    helperText={errors.variant?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                  />
                )}
              />

              {/* Color dropdown */}
              <Autocomplete
                options={colorsForVariant}
                disabled={!selectedVariant}
                value={selectedColor}
                onChange={(_, newVal) => {
                  const value = newVal as string | null;
                  setSelectedColor(value);
                  setValue('color', value || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Color"
                    fullWidth
                    error={!!errors.color}
                    helperText={errors.color?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                  />
                )}
              />

              {/* Status dropdown */}
              <FormControl fullWidth error={!!errors.status}>
                <InputLabel>Status</InputLabel>
                <Select
                  {...register('status')}
                  label="Status"
                  defaultValue="NEW"
                  sx={{ borderRadius: 0 }}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
                {errors.status && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.status.message}
                  </Typography>
                )}
              </FormControl>

              <TextField 
                {...register('notes')} 
                label="Lead Notes (Encrypted PII)" 
                multiline 
                rows={3} 
                fullWidth 
                placeholder="Enter sensitive customer information here..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} 
              />

              {/* File Upload Field */}
              <Box sx={{ mt: 1, p: 2, border: '1px dashed #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#475569' }}>
                  Attachments (Optional)
                </Typography>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                {selectedFiles.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {selectedFiles.map((f, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', color: '#10b981', fontWeight: 500 }}>
                        Selected: {f.name} ({(f.size / 1024).toFixed(1)} KB)
                      </Typography>
                    ))}
                  </Box>
                )}
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#94a3b8' }}>
                  Max 5MB per file. PDF, JPG, PNG only.
                </Typography>
              </Box>
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
            <Button onClick={handleCloseForm} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending} sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: 0, px: 3 }}>
              {mutation.isPending ? 'Saving...' : (editId ? 'Update' : 'Add Lead')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Standalone Documents Dialog ─────────────────────────────────────────── */}
      <Dialog 
        open={docDialogId !== null} 
        onClose={() => setDocDialogId(null)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 0, minHeight: 500 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #f1f5f9', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={20} />
            Customer Documents (KYC)
          </Box>
          <IconButton onClick={() => setDocDialogId(null)} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {docDialogId !== null && (
            <DocumentManager 
              module="LEADS" 
              referenceId={docDialogId} 
              title="Customer Documents (KYC)" 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────────────────── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 3 }}>
          <Typography>Are you sure you want to permanently delete this lead? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
          <Button
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            sx={{ borderRadius: 0, px: 3 }}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Update Conflict Dialog ────────────────────────────────────────────── */}
      <Dialog open={openConflictDialog} onClose={() => setOpenConflictDialog(false)} PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          Update Conflict
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 3 }}>
          <Typography>This record was updated by another user. Please refresh and try again.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setOpenConflictDialog(false)} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
          <Button
            onClick={() => {
              setOpenConflictDialog(false);
              handleCloseForm();
              queryClient.invalidateQueries({ queryKey: ['leads'] });
            }}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 0, px: 3 }}
          >
            Refresh
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}