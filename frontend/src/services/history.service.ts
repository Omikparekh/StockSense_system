import { api, ApiError } from './api';

export interface StockHistoryItem {
  id: number;
  reference: string;
  operation_type: 'IN' | 'OUT' | 'INT' | 'ADJ';
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  uom: string;
  from_location: string;
  to_location: string;
  quantity: number;
  status: string;
  user_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface HistoryListResponse {
  success: boolean;
  data: StockHistoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdjustmentPayload {
  product_id: number;
  location_id?: number;
  counted_quantity: number;
  reason: string;
}

export interface AdjustmentResponse {
  success: boolean;
  message: string;
  data: {
    reference: string;
    productId: number;
    productName: string;
    locationId: number;
    locationPath: string;
    previousQuantity: number;
    countedQuantity: number;
    delta: number;
    uom: string;
    reason: string;
  };
}

export const historyService = {
  fetchStockHistory: async (params?: {
    page?: number;
    limit?: number;
    operation_type?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    product_id?: number;
  }): Promise<HistoryListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.operation_type && params.operation_type !== 'ALL') {
      query.set('operation_type', params.operation_type);
    }
    if (params?.search) query.set('search', params.search);
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);
    if (params?.product_id) query.set('product_id', String(params.product_id));

    const qs = query.toString();
    return api.get<HistoryListResponse>(`/stock-history${qs ? `?${qs}` : ''}`);
  },

  fetchAdjustments: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<HistoryListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.from_date) query.set('from_date', params.from_date);
    if (params?.to_date) query.set('to_date', params.to_date);

    const qs = query.toString();
    return api.get<HistoryListResponse>(`/stock-history/adjustments${qs ? `?${qs}` : ''}`);
  },

  createAdjustment: async (payload: AdjustmentPayload): Promise<AdjustmentResponse> => {
    return api.post<AdjustmentResponse>('/stock-history/adjustments', payload);
  },

  downloadCsv: async (): Promise<void> => {
    const token = localStorage.getItem('stocksense_token');
    const response = await fetch('/api/v1/stock-history/export/csv', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to download CSV export');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stocksense-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
