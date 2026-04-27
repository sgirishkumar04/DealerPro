// Analytics domain types

export interface DealerPerformance {
  id: number;
  dealerId: number;
  dealerName: string;
  salesCount: number;
  revenue: number;
  conversionRate: number;
  score: number;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalSales: number;
  totalRevenue: number;
  activeLeads: number;
  serviceJobs: number;
  monthlySales?: { name: string; sales: number }[];
  revenueTrend?: { name: string; revenue: number }[];
  salesTrend?: number | null;
  revenueTrendPct?: number | null;
  leadsTrend?: number | null;
  servicesTrend?: number | null;
  totalDealers?: number;
  avgSalesPerDealer?: number;
  topMonth?: string;
}
