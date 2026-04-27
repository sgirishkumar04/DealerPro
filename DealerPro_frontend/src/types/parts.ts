// Parts domain types

export type PurchaseOrderStatus = 'pending' | 'shipped' | 'received' | 'cancelled';

export interface Part {
  id: string | number;
  name: string;
  price: number;
  stock: number;
  supplier: string;
  dealerId?: number;
  managerId?: number;
  lastUpdated?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface POItem {
  partId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  items: POItem[];
  status: PurchaseOrderStatus;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartDto {
  partNumber: string;
  name: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  unitPrice: number;
  supplierId: string;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  items: POItem[];
}
