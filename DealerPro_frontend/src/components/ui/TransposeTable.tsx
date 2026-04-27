import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography
} from '@mui/material';

interface TransposeTableProps {
  data: {
    metrics: string[];
    [key: string]: any;
  };
  title?: string;
}

export default function TransposeTable({ data, title }: TransposeTableProps) {
  if (!data || !data.metrics) {
    return <Typography color="textSecondary">No data available to transpose.</Typography>;
  }

  const { metrics, ...columns } = data;
  const columnKeys = Object.keys(columns);

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
      {title && (
        <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      <Table size="small">
        <TableHead sx={{ bgcolor: '#f8fafc' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Metric</TableCell>
            {columnKeys.map(key => (
              <TableCell key={key} sx={{ fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>
                {key}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {metrics.map((metric, index) => (
            <TableRow key={metric} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 500, textTransform: 'capitalize' }}>{metric}</TableCell>
              {columnKeys.map(key => (
                <TableCell key={key}>
                  {columns[key][index] !== undefined && columns[key][index] !== null 
                    ? columns[key][index].toLocaleString() 
                    : '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
