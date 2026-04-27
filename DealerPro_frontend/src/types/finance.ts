// Finance domain types

export type TransactionCategory = 'sales' | 'expenses' | 'payroll' | 'inventory';
export type ReportType = 'profit-loss' | 'balance-sheet';

export interface Transaction {
  id: string;
  date: string;
  category: TransactionCategory;
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportData {
  [key: string]: any;
}

export interface FinancialReport {
  type: ReportType;
  startDate: string;
  endDate: string;
  data: ReportData;
  generatedAt: string;
}

export interface CreateTransactionDto {
  date: string;
  category: TransactionCategory;
  amount: number;
  description: string;
  referenceId?: string;
}
