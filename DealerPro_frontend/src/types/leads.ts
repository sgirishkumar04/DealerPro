// Leads domain types

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type TestDriveStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestDrive {
  id: string;
  leadId: string;
  vehicleId: string;
  scheduledDate: string;
  status: TestDriveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  assignedTo: string;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {}

export interface CreateTestDriveDto {
  leadId: string;
  vehicleId: string;
  scheduledDate: string;
}
