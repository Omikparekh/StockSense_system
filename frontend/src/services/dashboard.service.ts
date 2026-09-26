import { api } from './api';

export interface DashboardKPIs {
  receipts: {
    to_receive: number;
    late: number;
    today: number;
    done: number;
  };
  deliveries: {
    to_deliver: number;
    late: number;
    waiting: number;
    ready: number;
    done: number;
  };
  transfers: {
    in_progress: number;
    done: number;
  };
  inventory: {
    total_products: number;
    total_units: number;
    total_valuation?: number;
    in_stock_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
  };
  recent_operations: Array<{
    id: number;
    reference: string;
    operation_type: 'IN' | 'OUT' | 'INT' | 'ADJ';
    partner_name: string | null;
    scheduled_date: string;
    status: string;
    warehouse_name: string;
  }>;
  recent_stock_moves: Array<{
    id: number;
    reference: string;
    operation_type: 'IN' | 'OUT' | 'INT' | 'ADJ';
    quantity: number;
    from_location: string;
    to_location: string;
    created_at: string;
    product_name: string;
    sku: string;
    uom: string;
  }>;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardKPIs;
}

export const dashboardService = {
  fetchDashboardKPIs: async (warehouseId?: number | null): Promise<DashboardResponse> => {
    const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
    return api.get<DashboardResponse>(`/dashboard/kpis${query}`);
  }
};
