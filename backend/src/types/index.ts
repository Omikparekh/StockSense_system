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
