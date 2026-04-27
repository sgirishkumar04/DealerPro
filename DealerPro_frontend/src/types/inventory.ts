export interface InventoryItem {
  id: number;
  vehicleId: number;
  vehicleName: string;
  vehicleModel: string;
  dealerId: number;
  dealerName: string;
  quantity: number;
  status: string;
  lastUpdated: string;
}

export interface InventoryFilters {
  vehicleId?: number;
  status?: string;
}

export interface Vehicle {
  id: number;
  name: string;
  model: string;
  variant: string;
  color: string;
  price: number;
  type?: string;
  fuelType?: string;
}

export interface CreateVehicleDto {
  name: string;
  model: string;
  variant: string;
  color: string;
  price: number;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}
