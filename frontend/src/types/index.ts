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

export interface Receipt {
  id: number;
  reference: string;
  operation_type: 'IN';
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  partner_name: string;
  destination_location_id: number | null;
  destination_path: string;
  destination_name: string;
  scheduled_date: string;
  status: DocumentStatus;
  notes: string;
  created_by_user: string;
  created_at: string;
  validated_at?: string;
  total_items: number;
  total_demand: number;
  total_done: number;
}

export interface ReceiptItem {
  id: number;
  operation_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  product_category: string;
  product_uom: string;
  per_unit_weight: number;
  demand_qty: number;
  done_qty: number;
  current_on_hand: number;
}

export interface ReceiptsApiResponse {
  success: boolean;
  data: Receipt[];
}

export interface ReceiptDetailApiResponse {
  success: boolean;
  data: {
    receipt: Receipt;
    items: ReceiptItem[];
  };
}

export interface Delivery {
  id: number;
  reference: string;
  operation_type: 'OUT';
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  partner_name: string;
  source_location_id: number | null;
  source_path: string;
  source_name: string;
  destination_location_id: number | null;
  destination_path: string;
  destination_name: string;
  scheduled_date: string;
  status: DocumentStatus;
  notes: string;
  created_by_user: string;
  created_at: string;
  validated_at?: string;
  total_items: number;
  total_demand: number;
  total_done: number;
}

export interface DeliveryItem {
  id: number;
  operation_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  product_category: string;
  product_uom: string;
  per_unit_weight: number;
  demand_qty: number;
  done_qty: number;
  current_on_hand: number;
  free_stock: number;
  is_available: boolean;
}

export interface DeliveriesApiResponse {
  success: boolean;
  data: Delivery[];
}

export interface DeliveryDetailApiResponse {
  success: boolean;
  data: {
    delivery: Delivery;
    items: DeliveryItem[];
  };
}
