// Sales domain types

export type PaymentStatus = 'pending' | 'partial' | 'completed';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  vehicleId: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  orderDate: string;
  dealerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  generatedAt: string;
}

export interface CreateOrderDto {
  customerId: string;
  vehicleId: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  dealerId: string;
}

export interface UpdateOrderDto extends Partial<CreateOrderDto> {}
