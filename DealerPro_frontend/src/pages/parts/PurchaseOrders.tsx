import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partsService } from '../../services/parts.service';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Fab, Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, useTheme, useMediaQuery, Snackbar, Alert, Box 
} from '@mui/material';
import { formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';

const purchaseOrderSchema = z.object({
  partId: z.coerce.number().min(1, "Part ID is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  justification: z.string().min(5, "Justification must be at least 5 characters"),
});

type PurchaseOrderForm = z.infer<typeof purchaseOrderSchema>;

export default function PurchaseOrders() {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'ROLE_MANAGER' || user?.role === 'ROLE_ADMIN';
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('xs'));
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchaseOrders', page, pageSize],
    queryFn: () => partsService.getPurchaseOrders({ page: page + 1, limit: pageSize }),
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { partId: '' as any, quantity: 1, justification: '' }
  });

  const mutation = useMutation({
    mutationFn: partsService.createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setToast({ open: true, message: 'Purchase order raised successfully', severity: 'success' });
      setOpenDialog(false);
      reset();
    },
    onError: (error: any) => {
      setToast({ open: true, message: error.response?.data?.message || 'Failed to raise order', severity: 'error' });
    }
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'PO ID', width: 90 },
    ...(isManagerOrAdmin ? [{ field: 'dealerName', headerName: 'Dealer', width: 180 }] : []),
    { field: 'partId', headerName: 'Part ID', width: 120 },
    { field: 'quantity', headerName: 'Qty', type: 'number', width: 100 },
    { 
      field: 'totalCost', 
      headerName: 'Total. Cost', 
      type: 'number', 
      flex: 1,
      valueFormatter: (params: any) => formatCurrency(params.value)
    },
    { field: 'justification', headerName: 'Justification', flex: 1 },
    { 
      field: 'createdAt', 
      headerName: 'Date', 
      flex: 1,
      valueFormatter: (value: any) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : ''
    },
  ];

  return (
    <div className="p-6 relative min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Purchase Orders</h1>
      <div className="bg-white rounded-none shadow-sm border border-slate-100 mt-8 w-full">
        <Box sx={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}>
          <DataGrid
            rows={data?.data || []}
            columns={columns}
            loading={isLoading}
            paginationMode="server"
            rowCount={data?.total || 0}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              borderRadius: 0,
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#334155', borderRadius: 0 },
            }}
          />
        </Box>
      </div>

      <Fab 
        color="primary" 
        aria-label="raise order" 
        className="!fixed !bottom-8 !right-8" 
        onClick={() => setOpenDialog(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Raise Purchase Order</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent className="space-y-4 pt-4">
            <Controller
              name="partId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Part ID"
                  variant="outlined"
                  fullWidth
                  error={!!errors.partId}
                  helperText={errors.partId?.message}
                />
              )}
            />
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Quantity"
                  variant="outlined"
                  onChange={e => field.onChange(parseInt(e.target.value, 10))}
                  fullWidth
                  error={!!errors.quantity}
                  helperText={errors.quantity?.message}
                />
              )}
            />
            <Controller
              name="justification"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Justification"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.justification}
                  helperText={errors.justification?.message}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar 
        open={toast.open} 
        autoHideDuration={6000} 
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
