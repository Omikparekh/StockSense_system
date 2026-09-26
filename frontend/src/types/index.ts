export type OperationType = 'IN' | 'OUT' | 'INT' | 'ADJ';

export type DocumentStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Cancelled';

export interface User {
  id: number;
  loginId: string;
  email: string;
  name: string;
  role: 'admin' | 'inventory_manager' | 'warehouse_staff';
  createdAt: string;
}

export interface ApiHealthResponse {
  status: string;
  version: string;
  database: string;
  timestamp: string;
}

export type StockHealthStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  uom: string;
  per_unit_weight: number;
  reorder_level: number;
  created_at?: string;
}

export interface ProductWithStock extends Product {
  on_hand: number;
  reserved: number;
  free_stock: number;
  stock_status: StockHealthStatus;
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

export interface ProductsApiResponse {
  success: boolean;
  data: {
    products: ProductWithStock[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    categories: string[];
  };
}

export interface ProductDetailApiResponse {
  success: boolean;
  data: {
    product: ProductWithStock;
    locations: LocationStock[];
    recentMovements: StockMovement[];
  };
}

export interface LocationItem {
  id: number;
  warehouse_id: number;
  warehouse_name?: string;
  warehouse_code?: string;
  name: string;
  short_code: string;
  path: string;
  total_on_hand: number;
  distinct_products: number;
  created_at?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  short_code: string;
  address: string;
  total_on_hand: number;
  locations: LocationItem[];
  created_at?: string;
}

export interface WarehousesApiResponse {
  success: boolean;
  data: Warehouse[];
}

export interface LocationsApiResponse {
  success: boolean;
  data: LocationItem[];
}
