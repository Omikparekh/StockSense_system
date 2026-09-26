export type UserRole = 'admin' | 'inventory_manager' | 'warehouse_staff';

export type OperationType = 'IN' | 'OUT' | 'INT' | 'ADJ';

export type DocumentStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Cancelled';

export interface UserPayload {
  id: number;
  loginId: string;
  email: string;
  role: UserRole;
}

export interface ApiHealthResponse {
  status: string;
  version: string;
  database: string;
  timestamp: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  uom: string;
  per_unit_weight: number;
  reorder_level: number;
  unit_cost: number;
  image_url?: string | null;
  image_url_2?: string | null;
  created_at?: string;
}

export interface ProductWithStock extends Product {
  on_hand: number;
  reserved: number;
  free_stock: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  total_value: number;
  is_approx_cost?: boolean;
}

export interface LocationStock {
  location_id: number;
  location_name: string;
  location_path: string;
  warehouse_name: string;
  on_hand: number;
  reserved: number;
  free_stock: number;
}

export interface StockMovement {
  id: number;
  reference: string;
  operation_type: OperationType;
  product_id: number;
  from_location: string;
  to_location: string;
  quantity: number;
  status: string;
  user_name?: string;
  notes?: string;
  created_at: string;
}
