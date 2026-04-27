import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box, Typography, Chip, IconButton, Badge, Button,
  Drawer, Divider, FormControl, InputLabel, Select, MenuItem,
  TextField, ToggleButton, ToggleButtonGroup, Paper, Stack,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab
} from '@mui/material';
import {
  SlidersHorizontal, X, Plus, Filter, ArrowUpDown,
  ArrowUp, ArrowDown, RotateCcw, Check, Download, FileText, Eye
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import DocumentManager from '../../components/DocumentManager';

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
                      placeholder={columns.find(c => c.field === filter.field)?.type === 'number' ? 'e.g. 100' : 'e.g. CREDIT'}
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

// ─── Main Finance Component ───────────────────────────────────────────────────
export default function Finance() {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'ROLE_MANAGER' || user?.role === 'ROLE_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [transpose, setTranspose] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', keyword, activeFilters, activeSorts, page, pageSize],
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

      const { data } = await api.post('/api/transactions/search', {
        keyword,
        filters,
        sorts,
        page,
        size: pageSize
      });
      return data.data;
    }
  });

  // Transposed P&L Data
  const { data: transposedData, isLoading: isTransposedLoading } = useQuery({
    queryKey: ['transposedFinance'],
    queryFn: async () => {
      const { data } = await api.get('/api/transactions/transposed');
      return data.data as { quarters: string[]; data: Record<string, number[]> };
    },
    enabled: transpose,
    staleTime: 60000,
  });

  const records = useMemo(() => data?.content || [], [data]);

  // ─── Toolbar column definitions ──────────────────────────────────────────────
  const toolbarColumns: ColumnDef[] = [
    { field: 'id', headerName: 'Tx ID', type: 'number' },
    ...(isManagerOrAdmin ? [
      { field: 'dealerId', headerName: 'Dealer ID', type: 'number' as const },
      { field: 'dealerName', headerName: 'Dealer', type: 'string' as const },
    ] : []),
    { field: 'type', headerName: 'Type', type: 'string' },
    { field: 'amount', headerName: 'Amount', type: 'number' },
    { field: 'description', headerName: 'Description', type: 'string' },
    { field: 'createdAt', headerName: 'Timestamp', type: 'string' },
  ];

  const activeCount = activeFilters.length + activeSorts.length;

  const handleDownloadInvoice = async (id: number) => {
    try {
      const response = await api.get(`/api/transactions/invoice/${id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download invoice", err);
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'Tx ID', width: 90 },
    ...(isManagerOrAdmin ? [
      { field: 'dealerId', headerName: 'Dealer ID', width: 100 },
      { field: 'dealerName', headerName: 'Dealer', width: 180 }
    ] : []),
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params: any) => (
        <Chip
          label={params.value as string}
          color={params.value === 'CREDIT' ? 'success' : 'error'}
          size="small"
          variant="outlined"
          sx={{ borderRadius: 0 }}
        />
      )
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 150,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (value: number) => formatCurrency(value)
    },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 200 },
    {
      field: 'createdAt',
      headerName: 'Timestamp',
      width: 180,
      valueFormatter: (value: string) => value ? new Date(value).toLocaleString() : ''
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
          <Tooltip title="View Details">
            <IconButton size="small" color="primary" onClick={() => { setDetailsId(params.row.id); setActiveTab(0); }}>
              <Eye size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download Invoice">
            <IconButton size="small" onClick={() => handleDownloadInvoice(params.row.id)}>
              <Download size={18} className="text-blue-600" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const selectedTx = records.find(r => r.id === detailsId);

  return (
    <Box className="space-y-8 flex flex-col w-full overflow-x-hidden p-2 md:p-0">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-none shadow-sm border border-slate-100 gap-4 sm:gap-0">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">
            {transpose ? 'Profit & Loss (Quarterly)' : 'Transaction History'}
          </Typography>
          <Typography variant="body2" className="text-slate-500">
            {transpose ? 'Transposed quarterly income, expenses, and profit report' : 'View all financial transactions and ledger entries'}
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={transpose ? 'contained' : 'outlined'}
            onClick={() => setTranspose(t => !t)}
            sx={{
              height: 40, borderRadius: 0, fontWeight: 700, fontSize: '0.78rem', px: 2.5,
              bgcolor: transpose ? '#0a0f1e' : 'transparent', color: transpose ? '#fff' : '#0a0f1e',
              borderColor: '#0a0f1e', '&:hover': { bgcolor: transpose ? '#1a2134' : '#0a0f1e', color: '#fff' }
            }}
          >
            {transpose ? '← Normal View' : '⇌ P&L View'}
          </Button>
          <Tooltip title={activeCount > 0 ? `${activeFilters.length} filter(s), ${activeSorts.length} sort(s) active` : 'Filter & Sort'} arrow>
            <IconButton onClick={() => setToolbarOpen(true)} sx={{ borderRadius: 0, border: '1px solid #e2e8f0', width: 40, height: 40 }}>
              <Badge badgeContent={activeCount || null} color="error"><SlidersHorizontal size={18} /></Badge>
            </IconButton>
          </Tooltip>
          <TextField
            size="small" placeholder="Search transactions..." value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
            sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
            InputProps={{ startAdornment: <Filter size={14} style={{ marginRight: 8, color: '#94a3b8' }} /> }}
          />
        </div>
      </div>

      {/* ── DataGrid OR P&L Table ── */}
      {transpose ? (
        <div className="bg-white rounded-none shadow-sm border border-slate-100 mt-8 w-full overflow-x-auto">
          {isTransposedLoading ? (
            <Box sx={{ py: 10, textAlign: 'center' }}><Typography>Loading P&L data...</Typography></Box>
          ) : !transposedData || transposedData.quarters?.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center' }}><Typography>No transaction data found</Typography></Box>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 700, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e8eef8' }}>Metric</th>
                  {transposedData.quarters.map(q => <th key={q} style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 700, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e8eef8' }}>{q}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(transposedData.data).map(([metric, values], rowIdx) => (
                  <tr key={metric} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: '13px', color: '#0a0f1e', bgcolor: '#f8fafc' }}>{metric}</td>
                    {(values as number[]).map((val, i) => (
                      <td key={i} style={{ padding: '14px 20px', fontSize: '14px', fontWeight: metric === 'Profit' ? 700 : 500, color: (metric === 'Profit' && val < 0) ? '#dc2626' : '#334155' }}>
                        ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-none shadow-sm border border-slate-100 mt-8 w-full">
          <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
            <DataGrid
              rows={records}
              columns={columns}
              loading={isLoading}
              paginationMode="server"
              rowCount={data?.totalElements || 0}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
              sx={{ border: 0, borderRadius: 0, '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc' } }}
            />
          </Box>
        </div>
      )}

      {/* ── Details Dialog ── */}
      <Dialog open={!!detailsId} onClose={() => setDetailsId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9' }}>
          <Typography variant="h6" fontWeight={700}>Transaction Details</Typography>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mt: 1 }}>
            <Tab label="Info" />
            <Tab label="Documents" />
          </Tabs>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 300, pt: 3 }}>
          {activeTab === 0 ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>DESCRIPTION</Typography>
                <Typography variant="body1">{selectedTx?.description}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>TYPE</Typography>
                  <Box><Chip label={selectedTx?.type} color={selectedTx?.type === 'CREDIT' ? 'success' : 'error'} size="small" sx={{ borderRadius: 0 }} /></Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>AMOUNT</Typography>
                  <Typography variant="h6" color={selectedTx?.type === 'CREDIT' ? 'success.main' : 'error.main'}>
                    {formatCurrency(selectedTx?.amount)}
                  </Typography>
                </Box>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>TIMESTAMP</Typography>
                <Typography variant="body2">{selectedTx?.createdAt ? new Date(selectedTx.createdAt).toLocaleString() : '-'}</Typography>
              </Box>
            </Stack>
          ) : (
            <Box>
              <DocumentManager 
                module="FINANCE" 
                referenceId={Number(detailsId)} 
                title="Invoices & Receipts" 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={() => setDetailsId(null)} color="inherit" sx={{ borderRadius: 0 }}>Close</Button>
          {activeTab === 0 && (
            <Button 
              variant="contained" 
              startIcon={<Download size={16} />}
              onClick={() => detailsId && handleDownloadInvoice(detailsId)}
              sx={{ bgcolor: '#0a0f1e', borderRadius: 0 }}
            >
              Invoice
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ToolbarDrawer
        open={toolbarOpen} onClose={() => setToolbarOpen(false)} columns={toolbarColumns}
        filters={activeFilters} sorts={activeSorts} onFiltersChange={setActiveFilters} onSortsChange={setActiveSorts}
      />
    </Box>
  );
}