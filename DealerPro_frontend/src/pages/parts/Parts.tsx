import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Chip, Badge, Drawer, Divider, ToggleButton,
  ToggleButtonGroup, Tooltip, Paper, Stack, FormControl, InputLabel,
  Select, MenuItem, Autocomplete
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, Trash2, Edit, SlidersHorizontal, X, ArrowUpDown,
  ArrowUp, ArrowDown, Filter, RotateCcw, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { partsService } from '../../services/parts.service';
import { formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const partSchema = z.object({
  name: z.string().min(1, 'Part name is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  supplier: z.string().min(1, 'Supplier is required')
});

type PartFormData = z.infer<typeof partSchema>;

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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>Filter & Sort</Typography>
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
                      placeholder={columns.find(c => c.field === filter.field)?.type === 'number' ? 'e.g. 100' : 'e.g. Bosch'}
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

// ─── Main Parts Component ─────────────────────────────────────────────────────
export default function Parts() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ROLE_MANAGER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';

  const [isOpen, setIsOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Form state
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [stock, setStock] = useState<number>(0);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
    defaultValues: { stock: 0 }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['parts', keyword, activeFilters, activeSorts, page, pageSize],
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

      const { data } = await api.post('/api/parts/search', {
        keyword,
        filters,
        sorts,
        page,
        size: pageSize
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const processedRows = useMemo(() => data?.content || [], [data]);

  // Fetch dealers for admin
  const { data: dealersData } = useQuery({
    queryKey: ['dealers'],
    queryFn: async () => {
      const { data } = await api.get('/api/dealers?page=0&size=1000');
      return data.data;
    },
    enabled: isAdmin
  });

  const dealers = dealersData?.content || [];

  // Get unique part names and suppliers from existing parts
  const uniquePartNames = useMemo(() => {
    const parts = data?.content || [];
    return Array.from(new Set(parts.map((p: any) => ({ id: p.id, name: p.name, price: p.price }))))
      .sort((a: any, b: any) => (a.name as string).localeCompare(b.name as string));
  }, [data]);

  const uniqueSuppliers = useMemo(() => {
    const parts = data?.content || [];
    return Array.from(new Set(parts.map((p: any) => p.supplier).filter(Boolean)))
      .sort((a: any, b: any) => (a as string).localeCompare(b as string));
  }, [data]);

  const activeCount = activeFilters.length + activeSorts.length;

  const mutation = useMutation({
    mutationFn: (newData: any) => {
      const payload: any = {
        name: newData.name,
        price: selectedPart?.price || 0,
        stock: newData.stock,
        supplier: newData.supplier
      };
      if (isAdmin && selectedDealer) {
        payload.dealerId = selectedDealer.id;
      }
      return editId ? partsService.update(String(editId), payload) : partsService.create(payload);
    },
    onSuccess: () => {
      toast.success(editId ? 'Part updated successfully' : 'Part added successfully');
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      handleCloseForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || (editId ? 'Error updating part' : 'Error adding part'))
  });

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditId(item.id);
      setSelectedPart({ id: item.id, name: item.name, price: item.price });
      setSelectedSupplier(item.supplier);
      setStock(item.stock);
      setValue('name', item.name);
      setValue('stock', item.stock);
      setValue('supplier', item.supplier);
      if (isAdmin && item.dealerId) {
        const dealer = dealers.find((d: any) => d.id === item.dealerId);
        setSelectedDealer(dealer || null);
      }
    } else {
      setEditId(null);
      setSelectedPart(null);
      setSelectedSupplier(null);
      setSelectedDealer(null);
      setStock(0);
      reset({ stock: 0 });
    }
    setIsOpen(true);
  };

  const handleCloseForm = () => {
    setIsOpen(false);
    setEditId(null);
    setSelectedPart(null);
    setSelectedSupplier(null);
    setSelectedDealer(null);
    setStock(0);
    reset({ stock: 0 });
  };

  const toolbarColumns: ColumnDef[] = [
    { field: 'name', headerName: 'Name', type: 'string' },
    { field: 'price', headerName: 'Price', type: 'number' },
    { field: 'stock', headerName: 'Stock', type: 'number' },
    { field: 'supplier', headerName: 'Supplier', type: 'string' },
    { field: 'lastUpdated', headerName: 'Last Updated', type: 'string' },
    ...(isManagerOrAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', type: 'number' as const }] : []),
    ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', type: 'number' as const }] : []),
  ];

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1.5 },
    {
      field: 'price', headerName: 'Price', width: 130, headerAlign: 'left', align: 'left',
      valueFormatter: (value: number) => formatCurrency(value)
    },
    {
      field: 'stock', headerName: 'Stock', width: 100, headerAlign: 'left', align: 'left',
      renderCell: (params) => {
        const stock = params.value as number;
        return <Chip label={stock} color={stock < 10 ? 'warning' : 'success'} size="small" variant="outlined" sx={{ borderRadius: 0 }} />;
      }
    },
    { field: 'supplier', headerName: 'Supplier', flex: 1 },
    { field: 'lastUpdated', headerName: 'Last Updated', width: 180 },
    ...(isManagerOrAdmin ? [{ field: 'dealerId', headerName: 'Dealer ID', width: 120 } as GridColDef] : []),
    ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', width: 120 } as GridColDef] : []),
    {
      field: 'actions', headerName: 'Action', width: 100, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          {(user?.role === 'DEALER' || user?.role === 'ROLE_DEALER' || user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') && (
            <IconButton onClick={() => handleOpenForm(params.row)} size="small" color="primary"><Edit size={18} /></IconButton>
          )}
          {isAdmin && (
            <IconButton onClick={() => console.log('Delete', params.row.id)} size="small" color="error"><Trash2 size={18} /></IconButton>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box className="space-y-8 flex flex-col w-full overflow-x-hidden p-2 md:p-0">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-none shadow-sm border border-slate-100">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">Parts Inventory</Typography>
          <Typography variant="body2" className="text-slate-500">Manage vehicle components and spare stock</Typography>
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
            placeholder="Search parts..."
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
            <Button variant="contained" onClick={() => handleOpenForm()} startIcon={<Plus size={18} />}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: '0px' }}>
              Add Part
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
              <Chip key={f.id}
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

      {/* DataGrid Container */}
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
              border: 0, borderRadius: 0,
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

      <ToolbarDrawer
        open={toolbarOpen}
        onClose={() => setToolbarOpen(false)}
        columns={toolbarColumns}
        filters={activeFilters}
        sorts={activeSorts}
        onFiltersChange={setActiveFilters}
        onSortsChange={setActiveSorts}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ px: 3.5, py: 2.5, fontWeight: 700, fontSize: '1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          {editId ? 'Edit Part' : 'Add New Part'}
        </DialogTitle>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <DialogContent sx={{ px: 3.5, py: 3.5 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Dealer Selection for Admin */}
              {isAdmin && (
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

              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: isAdmin ? 2 : 0 }}>Part Details</Typography>
              
              {/* Part Name Dropdown with Search */}
              <Autocomplete
                options={uniquePartNames}
                value={selectedPart}
                getOptionLabel={(option: any) => option.name || ''}
                onChange={(_, newVal) => {
                  setSelectedPart(newVal);
                  if (newVal) {
                    setValue('name', newVal.name);
                  }
                }}
                freeSolo
                onInputChange={(_, newInputValue) => {
                  if (!selectedPart || selectedPart.name !== newInputValue) {
                    setValue('name', newInputValue);
                  }
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Part Name" 
                    fullWidth 
                    error={!!errors.name} 
                    helperText={errors.name?.message || 'Select existing or type new part name'}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} 
                  />
                )}
                renderOption={(props, option: any) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatCurrency(option.price)}</Typography>
                    </Box>
                  </li>
                )}
              />

              {/* Display Price (Read-only) */}
              {selectedPart && (
                <TextField
                  label="Unit Price"
                  value={formatCurrency(selectedPart.price)}
                  fullWidth
                  disabled
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#f8fafc' } }}
                  helperText="Price is auto-filled from selected part"
                />
              )}

              {/* Stock Input */}
              <TextField
                label="Stock Quantity"
                type="number"
                value={stock}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setStock(val);
                  setValue('stock', val);
                }}
                fullWidth
                error={!!errors.stock}
                helperText={errors.stock?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
              />

              {/* Supplier Name Dropdown with Search */}
              <Autocomplete
                options={uniqueSuppliers}
                value={selectedSupplier}
                onChange={(_, newVal: any) => {
                  const val = typeof newVal === 'string' ? newVal : (newVal as any)?.toString();
                  setSelectedSupplier(val || null);
                  if (val) {
                    setValue('supplier', val);
                  }
                }}
                freeSolo
                onInputChange={(_, newInputValue) => {
                  setValue('supplier', newInputValue);
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Supplier Name" 
                    fullWidth 
                    error={!!errors.supplier} 
                    helperText={errors.supplier?.message || 'Select existing or type new supplier name'}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }} 
                  />
                )}
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: '1px solid #f1f5f9', gap: 1 }}>
            <Button onClick={handleCloseForm} sx={{ borderRadius: 0, px: 3 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}
              sx={{ bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134ff' }, borderRadius: 0, px: 3 }}>
              {mutation.isPending ? 'Saving...' : (editId ? 'Update' : 'Save Part')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}