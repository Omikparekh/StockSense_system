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
