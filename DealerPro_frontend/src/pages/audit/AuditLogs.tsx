import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box, Typography, Chip, IconButton, Badge, Drawer, Divider, ToggleButton, ToggleButtonGroup,
  Tooltip, Paper, Stack, FormControl, InputLabel, Select, MenuItem, TextField, Button
} from '@mui/material';
import {
  SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, RotateCcw, Check, Plus,
  FileText, Users, Car, Wrench, Package, ShoppingCart, UserCog, Building2, 
  ClipboardList, Calendar, DollarSign, Settings, Database
} from 'lucide-react';
import api from '../../services/api';

// ─── Helper Functions ─────────────────────────────────────────────────────────

// Parse description into structured format
function parseDescription(description: string): { 
  action: string; 
  entity: string; 
  entityId: string;
  headerInfo: string;
  details: Array<{ field: string; value: string }> 
} {
  // Example: "Updated Dealer ID: 5 with Manager ID: 3 → Changes: Dealer Name changed to 'ABC Motors'"
  const result = { 
    action: '', 
    entity: '', 
    entityId: '',
    headerInfo: '',
    details: [] as Array<{ field: string; value: string }> 
  };
  
  try {
    // Extract action and full header info
    const mainMatch = description.match(/^(Created|Updated|Deleted)\s+(.+?)(?:\s*→\s*Changes:\s*(.+))?$/);
    
    if (mainMatch) {
      result.action = mainMatch[1];
      result.headerInfo = mainMatch[2].trim(); // Full header like "Dealer ID: 5 with Manager ID: 3"
      
      // Try to extract just the entity name and ID from header
      const headerParts = result.headerInfo.match(/^(.+?)\s+ID:\s*(\d+)/);
      if (headerParts) {
        result.entity = headerParts[1].trim();
        result.entityId = headerParts[2];
      } else {
        result.entity = result.headerInfo;
      }
      
      // Extract changes if present
      if (mainMatch[3]) {
        const changesStr = mainMatch[3];
        
        // Split by comma, but be careful with commas inside quotes
        const changes: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < changesStr.length; i++) {
          const char = changesStr[i];
          
          if (char === "'" || char === '"') {
            inQuotes = !inQuotes;
            current += char;
          } else if (char === ',' && !inQuotes) {
            if (current.trim()) {
              changes.push(current.trim());
            }
            current = '';
          } else {
            current += char;
          }
        }
        
        if (current.trim()) {
          changes.push(current.trim());
        }
        
        // Parse each change
        changes.forEach(change => {
          // Try to extract field and value
          const colonIndex = change.indexOf(':');
          if (colonIndex > 0) {
            const field = change.substring(0, colonIndex).trim();
            const value = change.substring(colonIndex + 1).trim();
            result.details.push({ field, value });
          } else {
            // If no colon, treat the whole thing as a change description
            result.details.push({ field: change, value: '' });
          }
        });
      }
    } else {
      // Fallback: just show the whole description
      result.action = '';
      result.entity = description;
      result.entityId = '';
      result.headerInfo = description;
    }
  } catch (e) {
    result.action = '';
    result.entity = description;
    result.entityId = '';
    result.headerInfo = description;
  }
  
  return result;
}

// Get icon based on entity name
function getEntityIcon(entityName: string, size: number = 16) {
  const name = entityName.toLowerCase();
  
  if (name.includes('user') || name.includes('admin')) return <Users size={size} />;
  if (name.includes('dealer')) return <Building2 size={size} />;
  if (name.includes('vehicle') || name.includes('car') || name.includes('kia')) return <Car size={size} />;
  if (name.includes('service')) return <Wrench size={size} />;
  if (name.includes('part') || name.includes('inventory')) return <Package size={size} />;
  if (name.includes('order') || name.includes('sale')) return <ShoppingCart size={size} />;
  if (name.includes('lead')) return <UserCog size={size} />;
  if (name.includes('test drive')) return <Calendar size={size} />;
  if (name.includes('payment') || name.includes('transaction')) return <DollarSign size={size} />;
  if (name.includes('log') || name.includes('audit')) return <ClipboardList size={size} />;
  if (name.includes('setting') || name.includes('config')) return <Settings size={size} />;
  
  return <Database size={size} />;
}

// Get color based on entity name
function getEntityColor(entityName: string): string {
  const name = entityName.toLowerCase();
  
  if (name.includes('user') || name.includes('admin')) return '#8b5cf6';
  if (name.includes('dealer')) return '#0ea5e9';
  if (name.includes('vehicle') || name.includes('car')) return '#10b981';
  if (name.includes('service')) return '#f59e0b';
  if (name.includes('part') || name.includes('inventory')) return '#ec4899';
  if (name.includes('order') || name.includes('sale')) return '#ef4444';
  if (name.includes('lead')) return '#06b6d4';
  if (name.includes('test drive')) return '#84cc16';
  
  return '#64748b';
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
                      placeholder={columns.find(c => c.field === filter.field)?.type === 'number' ? 'e.g. 5' : 'e.g. admin'}
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

export default function AuditLogs() {
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeSorts, setActiveSorts] = useState<ActiveSort[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Keyboard shortcuts: Ctrl+U to open filter/sort drawer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        setToolbarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', keyword, activeFilters, activeSorts, page, pageSize],
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

      const { data } = await api.post('/api/v1/audit-logs/search', {
        keyword,
        filters,
        sorts,
        page,
        size: pageSize
      });
      return data.data;
    },
  });

  const processedRows = useMemo(() => data?.content || [], [data]);

  const activeCount = activeFilters.length + activeSorts.length;

  const toolbarColumns: ColumnDef[] = [
    { field: 'id', headerName: 'ID', type: 'number' },
    { field: 'entityName', headerName: 'Entity', type: 'string' },
    { field: 'entityId', headerName: 'Entity ID', type: 'number' },
    { field: 'action', headerName: 'Action', type: 'string' },
    { field: 'performedBy', headerName: 'Performed By', type: 'string' },
    { field: 'performedByRole', headerName: 'Role', type: 'string' },
    { field: 'performedAt', headerName: 'Timestamp', type: 'string' },
    { field: 'description', headerName: 'Description', type: 'string' },
  ];

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 80,
      align: 'center',
      headerAlign: 'center'
    },
    { 
      field: 'performedAt', 
      headerName: 'Timestamp', 
      width: 180,
      align: 'center',
      headerAlign: 'center'
    },
    { 
      field: 'action', 
      headerName: 'Action', 
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        let color: "success" | "info" | "error" = "info";
        if (params.value === 'CREATE') color = 'success';
        if (params.value === 'DELETE') color = 'error';
        return <Chip label={params.value as string} color={color} size="small" variant="outlined" sx={{ borderRadius: 0, fontWeight: 600 }} />;
      }
    },
    { 
      field: 'entityName', 
      headerName: 'Entity', 
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const entityColor = getEntityColor(params.value as string);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%' }}>
            <Box sx={{ color: entityColor, display: 'flex', alignItems: 'center' }}>
              {getEntityIcon(params.value as string, 16)}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {params.value as string}
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'entityId', 
      headerName: 'Entity ID', 
      width: 100, 
      type: 'number',
      align: 'center',
      headerAlign: 'center'
    },
    { 
      field: 'performedBy', 
      headerName: 'Performed By', 
      width: 150,
      align: 'center',
      headerAlign: 'center'
    },
    { 
      field: 'performedByRole', 
      headerName: 'Role', 
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        let color: "error" | "warning" | "info" = "info";
        if (params.value === 'ADMIN') color = 'error';
        if (params.value === 'MANAGER') color = 'warning';
        return <Chip label={params.value as string} color={color} size="small" variant="outlined" sx={{ borderRadius: 0 }} />;
      }
    },
    { 
      field: 'description', 
      headerName: 'Description', 
      flex: 1, 
      minWidth: 400,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params) => {
        const description = params.value as string;
        const parts = parseDescription(description);
        
        return (
          <Tooltip 
            title={
              <Box sx={{ p: 1, maxWidth: 400 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, fontSize: '0.9rem' }}>
                  {parts.action} {parts.headerInfo}
                </Typography>
                {parts.details.length > 0 && (
                  <Box sx={{ pl: 1 }}>
                    {parts.details.map((detail, idx) => (
                      <Typography key={idx} variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.8rem', lineHeight: 1.5 }}>
                        • {detail.field}{detail.value && `: ${detail.value}`}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            }
            arrow 
            placement="top"
          >
            <Box sx={{ py: 1.5, width: '100%' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0a0f1e', mb: 0.8, fontSize: '0.875rem' }}>
                {parts.action} {parts.headerInfo}
              </Typography>
              {parts.details.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {parts.details.map((detail, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.8rem',
                        color: '#334155',
                        maxWidth: 'fit-content'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {detail.field}{detail.value && `: ${detail.value}`}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Tooltip>
        );
      }
    },
  ];

  return (
    <Box className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-none shadow-sm border border-slate-100 gap-4 sm:gap-0">
        <div>
          <Typography variant="h5" className="font-bold text-slate-800">Audit Logs</Typography>
          <Typography variant="body2" className="text-slate-500">Track all system changes and user activities</Typography>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title={activeCount > 0 ? `${activeFilters.length} filter(s), ${activeSorts.length} sort(s) active` : 'Filter & Sort (Ctrl+U)'} arrow>
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
            placeholder="Search logs..."
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
        </div>
      </div>

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
      
      {/* DataGrid Container */}
      <div className="bg-white rounded-none shadow-sm border border-slate-100 mt-8">
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
            getRowHeight={() => 'auto'}
            sx={{
              border: 0,
              borderRadius: 0,
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#334155', borderRadius: 0 },
              '& .MuiDataGrid-row': { 
                '&:hover': { bgcolor: '#f1f5f9' },
                minHeight: '60px !important'
              },
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
                py: 1
              },
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
    </Box>
  );
}
