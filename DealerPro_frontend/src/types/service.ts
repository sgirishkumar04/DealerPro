// Service domain types

export type ServiceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface ServiceAppointment {
  id: string;
  customerId: string;
  vehicleId: string;
  appointmentDate: string;
  technicianId: string;
  serviceType: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PartUsage {
  partId: string;
  quantity: number;
  unitPrice: number;
}

export interface RepairOrder {
  id: string;
  appointmentId: string;
  laborHours: number;
  partsUsed: PartUsage[];
  totalCost: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceAppointmentDto {
  customerId: string;
  vehicleId: string;
  appointmentDate: string;
  technicianId: string;
  serviceType: string;
}

export interface CreateRepairOrderDto {
  appointmentId: string;
  laborHours: number;
  partsUsed: PartUsage[];
  totalCost: number;
}
