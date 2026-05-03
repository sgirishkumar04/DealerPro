import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Chip, Tabs, Tab, FormControl, InputLabel, Select,
  MenuItem, Alert, Badge, Drawer, Divider, ToggleButton, ToggleButtonGroup,
  Paper, Stack, Tooltip, Autocomplete
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, Edit, Trash2, SlidersHorizontal, X, Filter, ArrowUpDown,
  ArrowUp, ArrowDown, RotateCcw, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const dealerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  location: z.string().min(2, 'Location is required'),
  contactNumber: z.string().min(10, 'Contact must be at least 10 digits'),
  email: z.string().email('Invalid email format'),
});

const managerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
});

type DealerFormData = z.infer<typeof dealerSchema>;
type ManagerFormData = z.infer<typeof managerSchema>;

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
                      placeholder={columns.find(c => c.field === filter.field)?.type === 'number' ? 'e.g. 5' : 'e.g. Chennai'}
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

// ─── DealersManagedCell ───────────────────────────────────────────────────────
function DealersManagedCell({ managerId }: { managerId: number }) {
  const [dealers, setDealers] = useState<string>('Loading...');

  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const { data } = await api.get(`/api/v1/managers/${managerId}/dealers`);
        const dealerList = data.data || [];
        if (dealerList.length === 0) {
          setDealers('No dealers');
        } else {
          setDealers(dealerList.map((d: any) => d.name).join(', '));
        }
      } catch {
        setDealers('Error loading');
      }
    };
    fetchDealers();
  }, [managerId]);

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      height: '100%',
      width: '100%'
    }}>
      <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#64748b' }}>
        {dealers}
      </Typography>
    </Box>
  );
}

// ─── Main AdminPanel Component ────────────────────────────────────────────────
export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [isDealerFormOpen, setIsDealerFormOpen] = useState(false);
  const [isManagerFormOpen, setIsManagerFormOpen] = useState(false);
  const [editDealerId, setEditDealerId] = useState<number | null>(null);
  const [editManagerId, setEditManagerId] = useState<number | null>(null);
  const [deleteDealerId, setDeleteDealerId] = useState<number | null>(null);
  const [deleteManagerId, setDeleteManagerId] = useState<number | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState<any>(null);
  const [managedDealers, setManagedDealers] = useState<any[]>([]);
  const [selectedReassignManager, setSelectedReassignManager] = useState<number | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [selectedDealerIds, setSelectedDealerIds] = useState<number[]>([]);
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [managerPage, setManagerPage] = useState(0);
  const [managerSize, setManagerSize] = useState(10);
  const [dealerSearchTerm, setDealerSearchTerm] = useState('');
  const [dealerPage, setDealerPage] = useState(0);
  const [dealerSize, setDealerSize] = useState(10);

  // ─── Independent filter/sort state per tab ──────────────────────────────────
  const [dealerFilters, setDealerFilters] = useState<ActiveFilter[]>([]);
  const [dealerSorts, setDealerSorts] = useState<ActiveSort[]>([]);
  const [managerFilters, setManagerFilters] = useState<ActiveFilter[]>([]);
  const [managerSorts, setManagerSorts] = useState<ActiveSort[]>([]);

  const dealerForm = useForm<DealerFormData>({ resolver: zodResolver(dealerSchema) });
  const managerForm = useForm<ManagerFormData>({ resolver: zodResolver(managerSchema) });

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: dealersData, isLoading: dealersLoading } = useQuery({
    queryKey: ['dealers', dealerSearchTerm, dealerFilters, dealerSorts, dealerPage, dealerSize],
    queryFn: async () => {
      const filters = dealerFilters.map(f => ({
        field: f.field,
        operator: f.operator === 'contains' ? 'LIKE' : '=',
        value: f.value
      }));

      const sorts = dealerSorts.map(s => ({
        field: s.field,
        direction: s.direction.toUpperCase()
      }));

      const { data } = await api.post('/api/v1/dealers/search', {
        keyword: dealerSearchTerm,
        filters,
        sorts,
        page: dealerPage,
        size: dealerSize
      });
      return data.data;
    }
  });

  const { data: managersData, isLoading: managersLoading } = useQuery({
    queryKey: ['managers', managerSearchTerm, managerFilters, managerSorts, managerPage, managerSize],
    queryFn: async () => {
      const filters = managerFilters.map(f => ({
        field: f.field,
        operator: f.operator === 'contains' ? 'LIKE' : '=',
        value: f.value
      }));

      const sorts = managerSorts.map(s => ({
        field: s.field,
        direction: s.direction.toUpperCase()
      }));

      const { data } = await api.post('/api/v1/managers/search', {
        keyword: managerSearchTerm,
        filters,
        sorts,
        page: managerPage,
        size: managerSize
      });
      return data.data;
    }
  });

  const { data: unassignedDealersData } = useQuery({
    queryKey: ['unassigned-dealers'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/managers/unassigned-dealers');
      return data.data;
    }
  });

  // ─── Processed rows ─────────────────────────────────────────────────────────
  const processedDealers = useMemo(() => {
    return dealersData?.content || [];
  }, [dealersData]);

  const processedManagers = useMemo(() => {
    return managersData?.content || [];
  }, [managersData]);

  // Active counts per tab
  const dealerActiveCount = dealerFilters.length + dealerSorts.length;
  const managerActiveCount = managerFilters.length + managerSorts.length;
  const activeCount = activeTab === 0 ? dealerActiveCount : managerActiveCount;
  const activeFilters = activeTab === 0 ? dealerFilters : managerFilters;
  const activeSorts = activeTab === 0 ? dealerSorts : managerSorts;

  // ─── Toolbar column definitions ─────────────────────────────────────────────
  const dealerToolbarColumns: ColumnDef[] = [
    { field: 'id', headerName: 'ID', type: 'number' },
    { field: 'name', headerName: 'Dealer Name', type: 'string' },
    { field: 'managerId', headerName: 'Manager ID', type: 'number' },
    { field: 'location', headerName: 'Location', type: 'string' },
    { field: 'email', headerName: 'Email', type: 'string' },
    { field: 'contactNumber', headerName: 'Phone', type: 'string' },
    { field: 'status', headerName: 'Status', type: 'string' },
  ];

  const managerToolbarColumns: ColumnDef[] = [
    { field: 'id', headerName: 'ID', type: 'number' },
    { field: 'name', headerName: 'Manager Name', type: 'string' },
    { field: 'email', headerName: 'Email', type: 'string' },
    { field: 'phone', headerName: 'Phone', type: 'string' },
  ];

  const currentToolbarColumns = activeTab === 0 ? dealerToolbarColumns : managerToolbarColumns;

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const dealerMutation = useMutation({
    mutationFn: (newData: any) => {
      const payload = { ...newData, managerId: selectedManagerId };
      return editDealerId ? api.put(`/api/v1/dealers/${editDealerId}`, payload) : api.post('/api/v1/dealers', payload);
    },
    onSuccess: () => {
      toast.success(editDealerId ? 'Dealer updated successfully' : 'Dealer added successfully');
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-dealers'] });
      handleCloseDealerForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || (editDealerId ? 'Error updating dealer' : 'Error adding dealer'))
  });

  const deleteDealerMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/dealers/${id}`),
    onSuccess: () => {
      toast.success('Dealer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      setDeleteDealerId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error deleting dealer')
  });

  const managerMutation = useMutation({
    mutationFn: (newData: any) => {
      const payload = { ...newData, dealerIds: selectedDealerIds };
      return editManagerId ? api.put(`/api/v1/managers/${editManagerId}`, payload) : api.post('/api/v1/managers', payload);
    },
    onSuccess: () => {
      toast.success(editManagerId ? 'Manager updated successfully' : 'Manager added successfully');
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-dealers'] });
      handleCloseManagerForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || (editManagerId ? 'Error updating manager' : 'Error adding manager'))
  });

  const deleteManagerMutation = useMutation({
    mutationFn: ({ id, reassignToManagerId }: { id: number; reassignToManagerId?: number }) => {
      const params = reassignToManagerId ? `?reassignToManagerId=${reassignToManagerId}` : '';
      return api.delete(`/api/v1/managers/${id}${params}`);
    },
    onSuccess: () => {
      toast.success('Manager deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      setDeleteManagerId(null);
      setReassignDialogOpen(false);
      setManagerToDelete(null);
      setManagedDealers([]);
      setSelectedReassignManager(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error deleting manager')
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleDeleteManager = async (manager: any) => {
    try {
      const { data } = await api.get(`/api/v1/managers/${manager.id}/dealers`);
      const dealers = data.data || [];
      if (dealers.length > 0) {
        setManagerToDelete(manager);
        setManagedDealers(dealers);
        setReassignDialogOpen(true);
      } else {
        setDeleteManagerId(manager.id);
      }
    } catch {
      toast.error('Error checking manager dealers');
    }
  };

  const handleConfirmReassignment = () => {
    if (!selectedReassignManager) {
      toast.error('Please select a manager to reassign dealers');
      return;
    }
    if (managerToDelete) {
      deleteManagerMutation.mutate({ id: managerToDelete.id, reassignToManagerId: selectedReassignManager });
    }
  };

  const handleOpenDealerForm = (item?: any) => {
    if (item) {
      setEditDealerId(item.id);
      dealerForm.setValue('name', item.name);
      dealerForm.setValue('location', item.location);
      dealerForm.setValue('contactNumber', item.contactNumber);
      dealerForm.setValue('email', item.email);
      setSelectedManagerId(item.managerId || null);
    } else {
      setEditDealerId(null);
      dealerForm.reset();
      setSelectedManagerId(null);
    }
    setIsDealerFormOpen(true);
  };

  const handleCloseDealerForm = () => {
    setIsDealerFormOpen(false);
    setEditDealerId(null);
    dealerForm.reset();
    setSelectedManagerId(null);
  };

  const handleOpenManagerForm = (item?: any) => {
    if (item) {
      setEditManagerId(item.id);
      managerForm.setValue('name', item.name);
      managerForm.setValue('email', item.email);
      managerForm.setValue('phone', item.phone || '');
      
      // Fetch dealers managed by this manager
      api.get(`/api/v1/managers/${item.id}/dealers`).then(({ data }) => {
        const dealerIds = data.data.map((d: any) => d.id);
        setSelectedDealerIds(dealerIds);
      });
    } else {
      setEditManagerId(null);
      managerForm.reset();
      setSelectedDealerIds([]);
    }
    setIsManagerFormOpen(true);
  };

  const handleCloseManagerForm = () => {
    setIsManagerFormOpen(false);
    setEditManagerId(null);
    managerForm.reset();
    setSelectedDealerIds([]);
  };

  // ─── DataGrid columns ────────────────────────────────────────────────────────
  const dealerColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70, headerAlign: 'left', align: 'left' },
    { field: 'name', headerName: 'Dealer Name', flex: 1.5, headerAlign: 'left', align: 'left' },
    { field: 'managerId', headerName: 'Manager ID', width: 120, headerAlign: 'left', align: 'left' },
    { field: 'location', headerName: 'Location', flex: 1, headerAlign: 'left', align: 'left' },
    { field: 'email', headerName: 'Email', flex: 1.2, headerAlign: 'left', align: 'left' },
    { field: 'contactNumber', headerName: 'Phone', width: 150, headerAlign: 'left', align: 'left' },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => (
        <Chip
          label={params.value || 'ACTIVE'}
          color={params.value === 'ACTIVE' ? 'success' : 'default'}
          size="small"
          variant="outlined"
          sx={{ borderRadius: 0 }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          <IconButton size="small" color="primary" onClick={() => handleOpenDealerForm(params.row)}>
            <Edit size={18} />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteDealerId(params.row.id)}>
            <Trash2 size={18} />
          </IconButton>
        </Box>
      )
    }
  ];

  const managerColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70, headerAlign: 'left', align: 'left' },
    { field: 'name', headerName: 'Manager Name', flex: 1.5, headerAlign: 'left', align: 'left' },
    { field: 'email', headerName: 'Email', flex: 1.2, headerAlign: 'left', align: 'left' },
    { field: 'phone', headerName: 'Phone', width: 150, headerAlign: 'left', align: 'left' },
    {
      field: 'dealersManaged',
      headerName: 'Dealers Managed',
      flex: 1.5,
      headerAlign: 'left',
      align: 'left',
      sortable: false,
      renderCell: (params) => <DealersManagedCell managerId={params.row.id} />
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          <IconButton size="small" color="primary" onClick={() => handleOpenManagerForm(params.row)}>
            <Edit size={18} />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDeleteManager(params.row)}>
            <Trash2 size={18} />
          </IconButton>
        </Box>
      )
    }
  ];

  const datagridSx = {
    border: 0,
    borderRadius: 0,
    '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#334155', borderRadius: 0 },
    '& .MuiDataGrid-row:hover': { bgcolor: '#f1f5f9' },
    '& .MuiOutlinedInput-root': { borderRadius: 0 }
  };

  return (
    <Box className="space-y-8 flex flex-col w-full overflow-x-hidden p-2 md:p-0">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white p-6 rounded-none shadow-sm border border-slate-100">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">Admin Panel</Typography>
          <Typography variant="body2" className="text-slate-500">Manage dealers and managers</Typography>
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

          {/* Active filter/sort summary chips */}
          {activeCount > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {activeFilters.length > 0 && (
                <Chip
                  label={`${activeFilters.length} filter${activeFilters.length > 1 ? 's' : ''}`}
                  size="small"
                  icon={<Filter size={11} />}
                  onDelete={() => activeTab === 0 ? setDealerFilters([]) : setManagerFilters([])}
                  sx={{ borderRadius: '4px', fontWeight: 600, fontSize: '0.72rem', height: 26, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
                />
              )}
              {activeSorts.length > 0 && (
                <Chip
                  label={`${activeSorts.length} sort${activeSorts.length > 1 ? 's' : ''}`}
                  size="small"
                  icon={<ArrowUpDown size={11} />}
                  onDelete={() => activeTab === 0 ? setDealerSorts([]) : setManagerSorts([])}
                  sx={{ borderRadius: '4px', fontWeight: 600, fontSize: '0.72rem', height: 26, bgcolor: '#fdf4ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}
                />
              )}
            </Box>
          )}

          <TextField
            size="small"
            placeholder={activeTab === 0 ? "Search dealers..." : "Search managers..."}
            value={activeTab === 0 ? dealerSearchTerm : managerSearchTerm}
            onChange={(e) => {
              if (activeTab === 0) {
                setDealerSearchTerm(e.target.value);
                setDealerPage(0);
              } else {
                setManagerSearchTerm(e.target.value);
                setManagerPage(0);
              }
            }}
            sx={{ 
              width: 250,
              '& .MuiOutlinedInput-root': { borderRadius: 0 }
            }}
          />

          <Button
            variant="contained"
            onClick={() => activeTab === 0 ? handleOpenDealerForm() : handleOpenManagerForm()}
            startIcon={<Plus size={18} />}
            sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: '0px' }}
          >
            {activeTab === 0 ? 'Add Dealer' : 'Add Manager'}
          </Button>
        </div>
      </div>

      {/* ── Tabs + DataGrids ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-none shadow-sm border border-slate-100">
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' },
            '& .Mui-selected': { color: '#0a0f1e' },
            '& .MuiTabs-indicator': { backgroundColor: '#0a0f1e' }
          }}
        >
          <Tab label="Dealers" />
          <Tab label="Managers" />
        </Tabs>

        {/* Active filter summary bar — Dealers */}
        {activeTab === 0 && dealerFilters.length > 0 && (
          <Box sx={{ px: 3, py: 1.5, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderLeft: '3px solid #0ea5e9', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Filter size={14} color="#0369a1" />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', mr: 0.5 }}>Active filters:</Typography>
            {dealerFilters.map(f => {
              const col = dealerToolbarColumns.find(c => c.field === f.field);
              return (
                <Chip
                  key={f.id}
                  label={`${col?.headerName} ${f.operator} "${f.value}"`}
                  size="small"
                  onDelete={() => setDealerFilters(prev => prev.filter(x => x.id !== f.id))}
                  sx={{ borderRadius: '4px', fontSize: '0.72rem', height: 22, bgcolor: '#fff', border: '1px solid #bae6fd', color: '#0369a1' }}
                />
              );
            })}
            <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto' }}>
              Showing {processedDealers.length} of {dealersData?.content?.length || 0} records
            </Typography>
          </Box>
        )}

        {/* Active filter summary bar — Managers */}
        {activeTab === 1 && managerFilters.length > 0 && (
          <Box sx={{ px: 3, py: 1.5, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderLeft: '3px solid #0ea5e9', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Filter size={14} color="#0369a1" />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', mr: 0.5 }}>Active filters:</Typography>
            {managerFilters.map(f => {
              const col = managerToolbarColumns.find(c => c.field === f.field);
              return (
                <Chip
                  key={f.id}
                  label={`${col?.headerName} ${f.operator} "${f.value}"`}
                  size="small"
                  onDelete={() => setManagerFilters(prev => prev.filter(x => x.id !== f.id))}
                  sx={{ borderRadius: '4px', fontSize: '0.72rem', height: 22, bgcolor: '#fff', border: '1px solid #bae6fd', color: '#0369a1' }}
                />
              );
            })}
            <Typography variant="caption" sx={{ color: '#64748b', ml: 'auto' }}>
              Showing {processedManagers.length} of {managersData?.content?.length || 0} records
            </Typography>
          </Box>
        )}

        {/* Dealers Tab */}
        {activeTab === 0 && (
          <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
            <DataGrid
              rows={processedDealers}
              columns={dealerColumns}
              loading={dealersLoading}
              paginationMode="server"
              rowCount={dealersData?.totalElements || 0}
              paginationModel={{
                page: dealerPage,
                pageSize: dealerSize,
              }}
              onPaginationModelChange={(model) => {
                setDealerPage(model.page);
                setDealerSize(model.pageSize);
              }}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              disableRowSelectionOnClick
              sx={datagridSx}
            />
          </Box>
        )}

        {/* Managers Tab */}
        {activeTab === 1 && (
          <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
            <DataGrid
              rows={processedManagers}
              columns={managerColumns}
              loading={managersLoading}
              paginationMode="server"
              rowCount={managersData?.totalElements || 0}
              paginationModel={{
                page: managerPage,
                pageSize: managerSize,
              }}
              onPaginationModelChange={(model) => {
                setManagerPage(model.page);
                setManagerSize(model.pageSize);
              }}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              disableRowSelectionOnClick
              sx={datagridSx}
            />
          </Box>
        )}
      </div>

      {/* ── Toolbar Drawer ────────────────────────────────────────────────────── */}
      <ToolbarDrawer
        open={toolbarOpen}
        onClose={() => setToolbarOpen(false)}
        columns={currentToolbarColumns}
        filters={activeTab === 0 ? dealerFilters : managerFilters}
        sorts={activeTab === 0 ? dealerSorts : managerSorts}
        onFiltersChange={activeTab === 0 ? setDealerFilters : setManagerFilters}
        onSortsChange={activeTab === 0 ? setDealerSorts : setManagerSorts}
      />

      {/* ── Dealer Add/Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={isDealerFormOpen} onClose={handleCloseDealerForm} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          {editDealerId ? 'Edit Dealer' : 'Add New Dealer'}
        </DialogTitle>
        <form onSubmit={dealerForm.handleSubmit((d) => dealerMutation.mutate(d))}>
          <DialogContent sx={{ px: 3.5, py: 3.5 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <TextField
                {...dealerForm.register('name')}
                label="Dealer Name" fullWidth
                error={!!dealerForm.formState.errors.name}
                helperText={dealerForm.formState.errors.name?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
              <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}>
                <InputLabel>Manager ID</InputLabel>
                <Select
                  value={selectedManagerId || ''}
                  onChange={(e) => setSelectedManagerId(e.target.value ? Number(e.target.value) : null)}
                  label="Manager ID"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {managersData?.content?.map((manager: any) => (
                    <MenuItem key={manager.id} value={manager.id}>
                      {manager.name} (ID: {manager.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                {...dealerForm.register('location')}
                label="Location" fullWidth
                error={!!dealerForm.formState.errors.location}
                helperText={dealerForm.formState.errors.location?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
              <TextField
                {...dealerForm.register('email')}
                label="Email" type="email" fullWidth
                error={!!dealerForm.formState.errors.email}
                helperText={dealerForm.formState.errors.email?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
              <TextField
                {...dealerForm.register('contactNumber')}
                label="Contact Number" fullWidth
                error={!!dealerForm.formState.errors.contactNumber}
                helperText={dealerForm.formState.errors.contactNumber?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
            <Button onClick={handleCloseDealerForm} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={dealerMutation.isPending}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: 0, px: 3 }}>
              {dealerMutation.isPending ? 'Saving...' : (editDealerId ? 'Update' : 'Add Dealer')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Manager Add/Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={isManagerFormOpen} onClose={handleCloseManagerForm} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          {editManagerId ? 'Edit Manager' : 'Add New Manager'}
        </DialogTitle>
        <form onSubmit={managerForm.handleSubmit((d) => managerMutation.mutate(d))}>
          <DialogContent sx={{ px: 3.5, py: 3.5 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <TextField
                {...managerForm.register('name')}
                label="Manager Name" fullWidth
                error={!!managerForm.formState.errors.name}
                helperText={managerForm.formState.errors.name?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
              <TextField
                {...managerForm.register('email')}
                label="Email" type="email" fullWidth
                error={!!managerForm.formState.errors.email}
                helperText={managerForm.formState.errors.email?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
              <TextField
                {...managerForm.register('phone')}
                label="Phone" fullWidth
                error={!!managerForm.formState.errors.phone}
                helperText={managerForm.formState.errors.phone?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
              <Autocomplete
                multiple
                options={editManagerId 
                  ? [...(unassignedDealersData || []), ...(dealersData?.content || []).filter((d: any) => selectedDealerIds.includes(d.id))]
                  : (unassignedDealersData || [])}
                getOptionLabel={(option: any) => `${option.name} (ID: ${option.id})`}
                value={(editManagerId 
                  ? [...(unassignedDealersData || []), ...(dealersData?.content || []).filter((d: any) => selectedDealerIds.includes(d.id))]
                  : (unassignedDealersData || [])).filter((d: any) => selectedDealerIds.includes(d.id))}
                onChange={(_, newValue) => {
                  setSelectedDealerIds(newValue.map((d: any) => d.id));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Dealers to Manage"
                    placeholder="Select dealers"
                    helperText={editManagerId ? "Unassigned dealers + currently managed dealers" : "Only dealers without managers"}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
                  />
                )}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
            <Button onClick={handleCloseManagerForm} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={managerMutation.isPending}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: 0, px: 3 }}>
              {managerMutation.isPending ? 'Saving...' : (editManagerId ? 'Update' : 'Add Manager')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Dealer Delete Confirmation ────────────────────────────────────────── */}
      <Dialog open={!!deleteDealerId} onClose={() => setDeleteDealerId(null)} PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 3 }}>
          <Typography>Are you sure you want to permanently delete this dealer? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setDeleteDealerId(null)} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
          <Button
            onClick={() => deleteDealerId && deleteDealerMutation.mutate(deleteDealerId)}
            color="error" variant="contained" disabled={deleteDealerMutation.isPending}
            sx={{ borderRadius: 0, px: 3 }}
          >
            {deleteDealerMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Manager Delete Confirmation ───────────────────────────────────────── */}
      <Dialog open={!!deleteManagerId} onClose={() => setDeleteManagerId(null)} PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 3 }}>
          <Typography>Are you sure you want to permanently delete this manager? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button onClick={() => setDeleteManagerId(null)} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
          <Button
            onClick={() => deleteManagerId && deleteManagerMutation.mutate({ id: deleteManagerId })}
            color="error" variant="contained" disabled={deleteManagerMutation.isPending}
            sx={{ borderRadius: 0, px: 3 }}
          >
            {deleteManagerMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Manager Reassignment Dialog ───────────────────────────────────────── */}
      <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          Reassign Dealers
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 3.5 }}>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 0 }}>
            This manager currently manages {managedDealers.length} dealer(s). Please select another manager to reassign these dealers before deletion.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: '#334155' }}>
            Dealers to be reassigned:
          </Typography>
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
            {managedDealers.map((dealer, idx) => (
              <Typography key={dealer.id} variant="body2" sx={{ color: '#64748b', py: 0.5 }}>
                {idx + 1}. {dealer.name}
              </Typography>
            ))}
          </Box>
          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}>
            <InputLabel>Select New Manager</InputLabel>
            <Select
              value={selectedReassignManager || ''}
              onChange={(e) => setSelectedReassignManager(e.target.value as number)}
              label="Select New Manager"
            >
              {managersData?.content
                ?.filter((m: any) => m.id !== managerToDelete?.id)
                .map((manager: any) => (
                  <MenuItem key={manager.id} value={manager.id}>
                    {manager.name} (ID: {manager.id})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button
            onClick={() => {
              setReassignDialogOpen(false);
              setManagerToDelete(null);
              setManagedDealers([]);
              setSelectedReassignManager(null);
            }}
            sx={{ borderRadius: 0, px: 3 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReassignment}
            color="error" variant="contained"
            disabled={deleteManagerMutation.isPending || !selectedReassignManager}
            sx={{ borderRadius: 0, px: 3 }}
          >
            {deleteManagerMutation.isPending ? 'Processing...' : 'Reassign & Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}