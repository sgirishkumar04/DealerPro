import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analytics.service';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Typography, CircularProgress, IconButton, Badge, Drawer, Box,
  Button, FormControl, InputLabel, Select, MenuItem, TextField,
  ToggleButton, ToggleButtonGroup, Chip, Paper, Stack, Divider, Tooltip
} from '@mui/material';
import {
  SlidersHorizontal, X, Plus, Filter, ArrowUpDown,
  ArrowUp, ArrowDown, RotateCcw, Check
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import api from '../../services/api';
import TransposeTable from '../../components/ui/TransposeTable';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4'];

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
        {/* Filters */}
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
            <Button size="small" onClick={addFilter} startIcon={<Plus size={13} />}
              sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#0a0f1e', borderRadius: 0, border: '1px solid #0a0f1e', px: 1.5, py: 0.5, '&:hover': { bgcolor: '#0a0f1e', color: '#fff' } }}>
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
                      <Select value={filter.field} label="Column"
                        onChange={e => {
                          const newField = e.target.value as string;
                          const ops2 = getOperators(newField);
                          updateFilter(filter.id, { field: newField, operator: ops2[0].value, value: '' });
                        }}
                        sx={{ borderRadius: 0, fontSize: '0.85rem' }}>
                        {columns.map(col => (
                          <MenuItem key={col.field} value={col.field} sx={{ fontSize: '0.85rem' }}>{col.headerName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '0.8rem' }}>Condition</InputLabel>
                      <Select value={filter.operator} label="Condition"
                        onChange={e => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                        sx={{ borderRadius: 0, fontSize: '0.85rem' }}>
                        {ops.map(op => (
                          <MenuItem key={op.value} value={op.value} sx={{ fontSize: '0.85rem' }}>{op.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Value" value={filter.value}
                      onChange={e => updateFilter(filter.id, { value: e.target.value })}
                      fullWidth
                      placeholder={columns.find(c => c.field === filter.field)?.type === 'number' ? 'e.g. 5' : 'e.g. Kia Delhi'}
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
              <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                Sort Order
              </Typography>
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

      {/* Footer */}
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

// ─── Main Analytics Component ─────────────────────────────────────────────────
export default function Analytics() {
  const user = useAuthStore((state) => state.user);
  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'ROLE_ADMIN' ||
    user?.role === 'ROLE_MANAGER';

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  // Toolbar state
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['dealerPerformance', startDate, endDate],
    queryFn: async () => {
      let url = '/api/analytics/dealer-performance?page=0&size=10000';
      if (startDate) url += `&startDate=${startDate.toISOString()}`;
      if (endDate) url += `&endDate=${endDate.toISOString()}`;
      const { data } = await api.get(url);
      return data.data;
    },
  });

  const { data: conversionData, isLoading: isConversionLoading } = useQuery({
    queryKey: ['conversionSplit'],
    queryFn: () => analyticsService.getConversionSplit(),
    staleTime: 60000,
  });

  const { data: transposedSalesData } = useQuery({
    queryKey: ['transposedSales'],
    queryFn: async () => {
      const { data } = await api.get('/api/analytics/monthly-sales-transposed');
      return data.data;
    },
    staleTime: 60000,
  });

  // Apply filters + sorts client-side
  const processedRows = useMemo(() => {
    const raw = data?.content || [];
    const filtered = activeFilters.length > 0
      ? raw.filter((row: any) => activeFilters.every(f => applyFilter(row, f)))
      : raw;
    return applySort(filtered, activeSorts);
  }, [data, activeFilters, activeSorts]);

  const activeCount = activeFilters.length + activeSorts.length;

  const toolbarColumns: ColumnDef[] = [
    { field: 'dealerId', headerName: 'Dealer ID', type: 'number' },
    { field: 'dealerName', headerName: 'Dealer', type: 'string' },
    ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', type: 'number' as const }] : []),
    { field: 'salesCount', headerName: 'Sales Count', type: 'number' },
    { field: 'revenue', headerName: 'Revenue (₹)', type: 'number' },
    { field: 'conversionRate', headerName: 'Conv. Rate', type: 'number' },
    { field: 'score', headerName: 'Score', type: 'number' },
    { field: 'createdAt', headerName: 'Date', type: 'string' },
  ];

  const columns: GridColDef[] = [
    { field: 'dealerId', headerName: 'Dealer ID', width: 100, align: 'left', headerAlign: 'left' },
    { field: 'dealerName', headerName: 'Dealer', flex: 1, minWidth: 150, align: 'left', headerAlign: 'left' },
    ...(isAdmin ? [{ field: 'managerId', headerName: 'Manager ID', width: 110, align: 'left' as const, headerAlign: 'left' as const }] : []),
    { field: 'salesCount', headerName: 'Sales Count', type: 'number', width: 120, align: 'left', headerAlign: 'left' },
    {
      field: 'revenue', headerName: 'Revenue (₹)', type: 'number', width: 140, align: 'left', headerAlign: 'left',
      valueFormatter: (value: any) => formatCurrency(value || 0),
    },
    {
      field: 'conversionRate', headerName: 'Conv. Rate', type: 'number', width: 120, align: 'left', headerAlign: 'left',
      valueFormatter: (value: any) => (value != null ? `${value}%` : '0%'),
    },
    { field: 'score', headerName: 'Score', type: 'number', width: 90, align: 'left', headerAlign: 'left' },
    {
      field: 'createdAt', headerName: 'Date', width: 120, align: 'left', headerAlign: 'left',
      valueFormatter: (value: any) => value ? new Date(value).toLocaleDateString() : '',
    },
  ];

  const pieData = conversionData
    ? conversionData.map((item: any) => ({ name: item.status, value: item.count }))
    : [];

  return (
    <>
      <style>{`
        .an-page {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-sizing: border-box;
          width: 100%;
          font-family: Helvetica, Arial, sans-serif;
        }
        .an-row {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 18px;
          align-items: start;
        }
        .an-perf-card,
        .an-pie-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
          border: 1px solid #eef0f6;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .an-card-header {
          padding: 18px 22px 16px;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }
        .an-card-title {
          font-family: Helvetica, Arial, sans-serif !important;
          font-weight: 600 !important;
          font-size: 15px !important;
          color: #1a1f36 !important;
          letter-spacing: -0.01em;
          margin: 0 !important;
        }
        .an-card-subtitle {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 3px;
          display: block;
        }
        .an-date-row {
          display: flex;
          gap: 12px;
          padding: 14px 22px 0;
          flex-wrap: wrap;
        }
        .an-date-row .MuiFormControl-root {
          flex: 1;
          min-width: 140px;
        }
        .an-date-row .MuiInputBase-root {
          border-radius: 10px !important;
          font-family: Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          background: #f8faff !important;
        }
        .an-date-row .MuiOutlinedInput-notchedOutline {
          border: 1.5px solid #e2e8f5 !important;
        }
        .an-date-row .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline {
          border-color: #a5b4fc !important;
        }
        .an-date-row .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline {
          border-color: #6366f1 !important;
        }
        .an-date-row .MuiInputLabel-root {
          font-family: Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          color: #94a3b8 !important;
        }
        .an-filter-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 10px 22px 0;
        }
        .an-grid-body {
          padding: 14px 20px 20px;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .an-datagrid-wrap {
          height: calc(100vh - 320px);
          max-height: 450px;
          min-height: 300px;
          width: 100%;
          overflow: hidden;
          border-radius: 10px;
        }
        .an-datagrid-wrap .MuiDataGrid-root {
          border: none !important;
          font-family: Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
        }
        .an-datagrid-wrap .MuiDataGrid-virtualScroller { overflow-x: auto !important; overflow-y: auto !important; }
        .an-datagrid-wrap .MuiDataGrid-filler { border: none !important; }
        .an-datagrid-wrap .MuiDataGrid-virtualScrollerContent { border: none !important; }
        .an-datagrid-wrap .MuiDataGrid-columnHeaders { background: #f8faff !important; border-bottom: 2px solid #e8eef8 !important; border-radius: 10px 10px 0 0 !important; }
        .an-datagrid-wrap .MuiDataGrid-columnHeaderTitle { font-family: Helvetica, Arial, sans-serif !important; font-weight: 600 !important; color: #64748b !important; font-size: 11px !important; letter-spacing: 0.06em; text-transform: uppercase; }
        .an-datagrid-wrap .MuiDataGrid-columnHeader,
        .an-datagrid-wrap .MuiDataGrid-columnHeader--alignRight { justify-content: flex-start !important; }
        .an-datagrid-wrap .MuiDataGrid-columnHeaderTitleContainer { justify-content: flex-start !important; }
        .an-datagrid-wrap .MuiDataGrid-cell--alignRight { justify-content: flex-start !important; text-align: left !important; }
        .an-datagrid-wrap .MuiDataGrid-row:hover { background: #f5f7ff !important; }
        .an-datagrid-wrap .MuiDataGrid-cell { border-bottom: 1px solid #f1f5f9 !important; color: #334155 !important; font-family: Helvetica, Arial, sans-serif !important; font-weight: 400 !important; font-size: 13px !important; }
        .an-datagrid-wrap .MuiDataGrid-footerContainer { border-top: 2px solid #e8eef8 !important; background: #f8faff !important; overflow: hidden !important; }
        .an-datagrid-wrap .MuiTablePagination-root { overflow: hidden !important; }
        .an-datagrid-wrap .MuiTablePagination-toolbar { overflow: hidden !important; }
        .an-datagrid-wrap .MuiTablePagination-actions { overflow: hidden !important; }
        .an-datagrid-wrap .MuiTablePagination-root,
        .an-datagrid-wrap .MuiTablePagination-selectLabel,
        .an-datagrid-wrap .MuiTablePagination-displayedRows { font-family: Helvetica, Arial, sans-serif !important; font-size: 12px !important; color: #64748b !important; }
        .an-pie-body { padding: 16px 22px 24px; flex: 1; display: flex; flex-direction: column; }
        .an-pie-chart-wrap { width: 100%; height: 240px; flex-shrink: 0; }
        .an-legend { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
        .an-legend-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #475569; }
        .an-legend-left { display: flex; align-items: center; gap: 10px; }
        .an-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .an-legend-val { font-size: 14px; font-weight: 700; color: #1a1f36; }
        .an-pie-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 12px; min-height: 200px; }
        .an-pie-empty-icon { width: 52px; height: 52px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        @media (min-width: 1400px) { .an-row { grid-template-columns: 1fr 380px; } }
        @media (max-width: 900px) {
          .an-page { padding: 14px; gap: 14px; }
          .an-row { grid-template-columns: 1fr; gap: 14px; }
          .an-datagrid-wrap { height: calc(100vh - 380px); max-height: 400px; min-height: 280px; }
          .an-pie-chart-wrap { max-width: 320px; margin: 0 auto; }
        }
        @media (max-width: 480px) {
          .an-page { padding: 10px; gap: 10px; }
          .an-card-header { padding: 14px 16px 12px; }
          .an-date-row { padding: 12px 16px 0; gap: 8px; }
          .an-date-row .MuiFormControl-root { min-width: 0; }
          .an-grid-body { padding: 10px 12px 14px; }
          .an-datagrid-wrap { height: calc(100vh - 420px); max-height: 350px; min-height: 250px; }
          .an-pie-body { padding: 12px 16px 18px; }
          .an-pie-chart-wrap { height: 200px; }
        }
      `}</style>

      <div className="an-page">
        <div className="an-row">

          {/* ── Performance Index Card ── */}
          <div className="an-perf-card">
            <div className="an-card-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography className="an-card-title">Performance Index</Typography>
                  <span className="an-card-subtitle">
                    Historical performance metrics and scores for dealer
                  </span>
                </div>

                {/* Toolbar Button */}
                <Tooltip title={activeCount > 0 ? `${activeFilters.length} filter(s), ${activeSorts.length} sort(s) active` : 'Filter & Sort'} arrow>
                  <IconButton
                    onClick={() => setToolbarOpen(true)}
                    sx={{
                      bgcolor: activeCount > 0 ? '#0a0f1e' : 'transparent',
                      color: activeCount > 0 ? '#fff' : '#475569',
                      border: '1px solid',
                      borderColor: activeCount > 0 ? '#0a0f1e' : '#e2e8f0',
                      borderRadius: 0,
                      width: 38,
                      height: 38,
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
                      sx={{ '& .MuiBadge-badge': { bgcolor: '#C8102E', color: '#fff', fontSize: '0.6rem', minWidth: 16, height: 16, top: -2, right: -2 } }}
                    >
                      <SlidersHorizontal size={17} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </div>
            </div>

            {/* Active filter summary bar */}
            {activeFilters.length > 0 && (
              <div className="an-filter-bar">
                <Filter size={13} color="#0369a1" />
                <span style={{ fontWeight: 700, color: '#0369a1', fontSize: '12px' }}>Active filters:</span>
                {activeFilters.map(f => {
                  const col = toolbarColumns.find(c => c.field === f.field);
                  return (
                    <Chip
                      key={f.id}
                      label={`${col?.headerName} ${f.operator} "${f.value}"`}
                      size="small"
                      onDelete={() => setActiveFilters(prev => prev.filter(x => x.id !== f.id))}
                      sx={{ borderRadius: '4px', fontSize: '0.7rem', height: 22, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1' }}
                    />
                  );
                })}
                <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>
                  {processedRows.length} of {data?.content?.length || 0} records
                </span>
              </div>
            )}

            {/* DataGrid */}
            <div className="an-grid-body">
              <div className="an-datagrid-wrap">
                <DataGrid
                  rows={processedRows}
                  columns={columns}
                  loading={isLoading}
                  paginationMode="client"
                  pageSizeOptions={[5, 10, 25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{ '& .MuiDataGrid-root': { border: 'none' }, border: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* ── Conversion Split Card ── */}
          <div className="an-pie-card">
            <div className="an-card-header">
              <Typography className="an-card-title">Conversion Split</Typography>
              <span className="an-card-subtitle">
                Lead status distribution across pipeline stages
              </span>
            </div>
            <div className="an-pie-body">
              {pieData.length > 0 ? (
                <>
                  <div className="an-pie-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius="52%" outerRadius="78%" paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {pieData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '13px', padding: '10px 16px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="an-legend">
                    {pieData.map((entry: any, index: number) => (
                      <div key={index} className="an-legend-row">
                        <div className="an-legend-left">
                          <div className="an-legend-dot" style={{ background: COLORS[index % COLORS.length] }} />
                          <span>{entry.name}</span>
                        </div>
                        <span className="an-legend-val">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="an-pie-empty">
                  {isLoading || isConversionLoading ? (
                    <CircularProgress size={34} style={{ color: '#6366f1' }} />
                  ) : (
                    <>
                      <div className="an-pie-empty-icon">📭</div>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>No conversion data yet</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Transposed Data Views ── */}
        <Box sx={{ mt: 3 }}>
          {transposedSalesData && (
            <TransposeTable 
              title="Transposed Monthly Sales Performance" 
              data={transposedSalesData} 
            />
          )}
        </Box>

        {/* Toolbar Drawer */}
        <ToolbarDrawer
          open={toolbarOpen}
          onClose={() => setToolbarOpen(false)}
          columns={toolbarColumns}
          filters={activeFilters}
          sorts={activeSorts}
          onFiltersChange={setActiveFilters}
          onSortsChange={setActiveSorts}
        />
      </div>
    </>
  );
}