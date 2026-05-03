import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box, Select, MenuItem, Button, Typography, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, TextField, FormControl,
  InputLabel, Autocomplete, Badge, Drawer, Divider,
  ToggleButton, ToggleButtonGroup, Tooltip, Paper, Stack, Tabs, Tab
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Trash2, Edit, Plus, SlidersHorizontal, X, ArrowUpDown,
  ArrowUp, ArrowDown, Filter, RotateCcw, Check, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import DocumentManager from '../../components/DocumentManager';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// ─── Status auto-compute helper ──────────────────────────────────────────────
function computeStatus(quantity: number): string {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity < 10) return 'LOW_STOCK';
  return 'IN_STOCK';
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const formSchema = z.object({
  vehicleId: z.number({ error: 'Please select a vehicle' }).min(1, 'Vehicle is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  status: z.string().min(1, 'Status is required'),
  dealerId: z.number().optional(),
});
type FormData = z.infer<typeof formSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface KiaCar {
  id: number;
  displayName: string;
  modelName: string;
  variant: string;
  color: string;
  price: number;
}

interface InventoryRow {
  id: number;
  vehicleId: number;
  kiaCarId?: number;
  vehicleName: string;
  vehicleVariant: string;
  vehicleColor: string;
  vehicleModel: string;
  quantity: number;
  status: string;
  dealerName: string;
  dealerId?: number;
  managerId?: number;
  lastUpdated: string;
  stockStatus?: string;
  version?: number | null;
}

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

  const resetLocal = () => {
    setLocalFilters(filters);
    setLocalSorts(sorts);
  };

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

// ─── Main Inventory Component ─────────────────────────────────────────────────
export default function Inventory() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
  const isManager = user?.role === 'MANAGER' || user?.role === 'ROLE_MANAGER';
  const isManagerOrAdmin = isAdmin || isManager;
  const needsDealerSelect = isAdmin || isManager;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<number | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [docDialogId, setDocDialogId] = useState<number | null>(null); // For standalone docs dialog
  const [keyword, setKeyword] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Cascading Selection
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantity: 0, status: 'IN_STOCK' }
  });

  const watchedQty = watch('quantity', 0);

  // ─── Fetch KIA Cars ─────────────────────────────────────────────────────────
  const { data: kiaCars = [] } = useQuery<KiaCar[]>({
    queryKey: ['kia-cars'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/kia-cars');
      return data.data;
    },
    staleTime: Infinity,
  });

  // ─── Fetch Dealers (for manager / admin only) ────────────────────────────────
  const { data: dealersData } = useQuery({
    queryKey: ['dealers-list'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/dealers?page=0&size=10000');
      return data.data?.content || [];
    },
    enabled: needsDealerSelect,
    staleTime: 300000,
  });
  const dealers: { id: number; name: string }[] = dealersData || [];

  const uniqueModels = Array.from(new Set(kiaCars.map(c => c.modelName))).sort();
  const variantsForModel = selectedModel
    ? Array.from(new Set(kiaCars.filter(c => c.modelName === selectedModel).map(c => c.variant))).sort()
    : [];
  const colorsForVariant = (selectedModel && selectedVariant)
    ? kiaCars.filter(c => c.modelName === selectedModel && c.variant === selectedVariant).sort((a, b) => a.color.localeCompare(b.color))
    : [];

  // ─── Fetch Inventory (Search) ──────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', keyword, activeFilters, activeSorts, page, pageSize],
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

      const { data } = await api.post('/api/v1/inventory/search', {
        keyword,
        filters,
        sorts,
        page,
        size: pageSize
      });
      return data.data;
    },
    staleTime: 60000,
  });

  const processedRows = useMemo(() => data?.content || [], [data]);

  const activeCount = activeFilters.length + activeSorts.length;

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (newData: any) => {
      const autoStatus = computeStatus(Number(newData.quantity));
      const payload = {
        ...newData,
        kiaCarId: newData.vehicleId,
        status: autoStatus,
        version: currentVersion,
        ...(needsDealerSelect && selectedDealerId ? { dealerId: selectedDealerId } : {}),
      };
      return editId ? api.put(`/api/v1/inventory/${editId}`, payload) : api.post('/api/v1/inventory', payload);
    },
    onSuccess: () => {
      toast.success(editId ? 'Inventory updated' : 'Stock added');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      handleCloseForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error saving data'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/inventory/${id}`),
    onSuccess: () => {
      toast.success('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsDeleteOpen(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error deleting'),
  });

  const handleOpenForm = (item?: InventoryRow) => {
    if (item) {
      setEditId(item.id);
      setCurrentVersion(item.version || null);
      setValue('vehicleId', item.kiaCarId || item.vehicleId);
      setValue('quantity', item.quantity);
      setValue('status', item.status);
      const car = kiaCars.find(c => c.id === item.kiaCarId);
      if (car) { setSelectedModel(car.modelName); setSelectedVariant(car.variant); }
      if (item.dealerId) setSelectedDealerId(item.dealerId);
    } else {
      setEditId(null);
      setCurrentVersion(null);
      reset({ quantity: 0, status: 'IN_STOCK' });
      setSelectedModel(null);
      setSelectedVariant(null);
      setSelectedDealerId(null);
    }
    setActiveTab(0);
    setIsFormOpen(true);
  };

  // Open standalone documents dialog (does NOT open the edit form)
  const handleOpenDocuments = (item: InventoryRow) => {
    if (!item || !item.id) return;
    setDocDialogId(item.id);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setActiveTab(0);
    reset();
    setEditId(null);
    setCurrentVersion(null);
    setSelectedModel(null);
    setSelectedVariant(null);
    setSelectedDealerId(null);
  };

  // ─── Toolbar column definitions ─────────────────────────────────────────────
  const toolbarColumns: ColumnDef[] = [
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', type: 'number' as const }] : []),
    ...(isManagerOrAdmin ? [{ field: 'dealerName', headerName: 'Dealer', type: 'string' as const }] : []),
    ...(isManagerOrAdmin ? [{ field: 'managerId', headerName: 'Manager ID', type: 'number' as const }] : []),
    { field: 'vehicleName', headerName: 'Model', type: 'string' },
    { field: 'vehicleVariant', headerName: 'Variant', type: 'string' },
    { field: 'vehicleColor', headerName: 'Color', type: 'string' },
    { field: 'quantity', headerName: 'Qty', type: 'number' },
    { field: 'status', headerName: 'Status', type: 'string' },
    { field: 'lastUpdated', headerName: 'Last Updated', type: 'string' },
  ];

  // ─── DataGrid columns ────────────────────────────────────────────────────────
  const columns: GridColDef[] = [
    ...(isAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', width: 100, headerAlign: 'left' as const, align: 'left' as const }] : []),
    ...(isManagerOrAdmin ? [{ field: 'dealerName', headerName: 'Dealer', flex: 1, minWidth: 150, headerAlign: 'left' as const, align: 'left' as const }] : []),
    ...(isManagerOrAdmin ? [{ field: 'managerId', headerName: 'Manager ID', width: 120, headerAlign: 'left' as const, align: 'left' as const }] : []),
    { field: 'vehicleName', headerName: 'Model', flex: 1.5, minWidth: 130, headerAlign: 'left' as const, align: 'left' as const },
    { field: 'vehicleVariant', headerName: 'Variant', flex: 1.5, minWidth: 150, headerAlign: 'left' as const, align: 'left' as const },
    { field: 'vehicleColor', headerName: 'Color', flex: 1.2, minWidth: 120, headerAlign: 'left' as const, align: 'left' as const },
    { field: 'quantity', headerName: 'Qty', type: 'number', width: 80, headerAlign: 'left' as const, align: 'left' as const },
    {
      field: 'status', headerName: 'Status', width: 130, headerAlign: 'left' as const, align: 'left' as const,
      renderCell: (params) => {
        const val = params.value as string;
        const color = val === 'IN_STOCK' ? 'success' : val === 'LOW_STOCK' ? 'warning' : 'error';
        const label = val === 'IN_STOCK' ? 'In Stock' : val === 'LOW_STOCK' ? 'Low Stock' : val === 'OUT_OF_STOCK' ? 'Out of Stock' : val?.replace(/_/g, ' ');
        return <Chip label={label} color={color} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 0 }} />;
      }
    },
    {
      field: 'stockStatus', headerName: 'System Health', width: 140, headerAlign: 'left' as const, align: 'left' as const,
      renderCell: (params) => {
        const val = params.row.stockStatus as string;
        if (!val) return null;
        const color = val === 'IN_STOCK' ? 'success' : val === 'LOW_STOCK' ? 'warning' : 'error';
        const label = val === 'IN_STOCK' ? 'Healthy' : val === 'LOW_STOCK' ? 'Attention' : 'Critical';
        return (
          <Tooltip title={`Backend computed: ${val}`}>
            <Chip 
              label={label} 
              color={color} 
              size="small" 
              sx={{ fontWeight: 700, borderRadius: 0, fontSize: '0.65rem' }} 
            />
          </Tooltip>
        );
      }
    },
    { field: 'lastUpdated', headerName: 'Last Updated', flex: 1.5, minWidth: 150, headerAlign: 'left' as const, align: 'left' as const },
    {
      field: 'actions', headerName: 'Actions', width: 130, sortable: false, headerAlign: 'left' as const, align: 'left' as const,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          <Tooltip title="View Documents">
            <IconButton onClick={() => handleOpenDocuments(params.row as InventoryRow)} size="small" color="info">
              <FileText size={18} />
            </IconButton>
          </Tooltip>
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <IconButton onClick={() => handleOpenForm(params.row as InventoryRow)} size="small" color="primary">
              <Edit size={18} />
            </IconButton>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <IconButton onClick={() => setIsDeleteOpen(params.row.id as number)} size="small" color="error">
              <Trash2 size={18} />
            </IconButton>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-none shadow-sm border border-slate-100 gap-4 sm:gap-0">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">Inventory Management</Typography>
          <Typography variant="body2" className="text-slate-500">Track KIA vehicle stock across dealer</Typography>
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
            placeholder="Search inventory..."
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

          {/* Add Stock */}
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => handleOpenForm()}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: '0px' }}
            >
              Add Stock
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

      {/* ── DataGrid ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-none shadow-sm border border-slate-100 mt-8">
        <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
          <DataGrid
            rows={processedRows}
            columns={columns}
            loading={isLoading}
            paginationMode="server"
            rowCount={data?.totalElements || 0}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              border: 0, borderRadius: 0,
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#334155', borderRadius: 0 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f1f5f9' },
              '& .MuiOutlinedInput-root': { borderRadius: 0 },
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
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #f1f5f9', px: 3, py: 2 }}>
          {editId ? 'Edit Stock Entry' : 'Add Stock Entry'}
        </DialogTitle>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {needsDealerSelect && (
                <Autocomplete
                  options={dealers}
                  getOptionLabel={(d) => `${d.name} (ID: ${d.id})`}
                  value={dealers.find(d => d.id === selectedDealerId) || null}
                  onChange={(_, newVal) => setSelectedDealerId(newVal ? newVal.id : null)}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Dealer *" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />
                  )}
                />
              )}
              <Typography variant="subtitle2" color="primary">Vehicle Selection</Typography>
              <Autocomplete
                options={uniqueModels}
                value={selectedModel}
                onChange={(_, newVal) => { setSelectedModel(newVal); setSelectedVariant(null); setValue('vehicleId', 0); }}
                renderInput={(params) => <TextField {...params} label="1. Model" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
              />
              <Autocomplete
                options={variantsForModel}
                disabled={!selectedModel}
                value={selectedVariant}
                onChange={(_, newVal) => { setSelectedVariant(newVal); setValue('vehicleId', 0); }}
                renderInput={(params) => <TextField {...params} label="2. Variant" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
              />
              <Controller
                name="vehicleId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={colorsForVariant}
                    disabled={!selectedVariant}
                    getOptionLabel={(opt) => opt.color}
                    value={colorsForVariant.find(c => c.id === field.value) || null}
                    onChange={(_, newVal) => field.onChange(newVal ? newVal.id : 0)}
                    renderInput={(params) => <TextField {...params} label="3. Color" error={!!errors.vehicleId} helperText={errors.vehicleId?.message} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} />}
                  />
                )}
              />
              <TextField
                {...register('quantity', { valueAsNumber: true })}
                label="Quantity" fullWidth type="number"
                error={!!errors.quantity} helperText={errors.quantity?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Auto Status:</Typography>
                <Chip label={watchedQty <= 0 ? 'Out of Stock' : watchedQty < 10 ? 'Low Stock' : 'In Stock'} color={watchedQty <= 0 ? 'error' : watchedQty < 10 ? 'warning' : 'success'} size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: 0 }} />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
            <Button onClick={handleCloseForm} color="inherit" sx={{ borderRadius: 0 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending} sx={{ bgcolor: '#0a0f1e', borderRadius: 0, px: 4 }}>
              {mutation.isPending ? 'Saving...' : (editId ? 'Update' : 'Add Stock')}
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
            Car Documents & Images
          </Box>
          <IconButton onClick={() => setDocDialogId(null)} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {docDialogId !== null && (
            <DocumentManager 
              module="INVENTORY" 
              referenceId={docDialogId} 
              title="Car Images & Brochures" 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      <Dialog open={!!isDeleteOpen} onClose={() => setIsDeleteOpen(null)} PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to permanently delete this inventory record?</DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteOpen(null)} color="inherit" sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button
            onClick={() => isDeleteOpen && deleteMutation.mutate(isDeleteOpen)}
            color="error" variant="contained" disabled={deleteMutation.isPending} sx={{ borderRadius: 0 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
