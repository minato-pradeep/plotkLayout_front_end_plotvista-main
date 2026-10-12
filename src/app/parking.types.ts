export interface VehicleType {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type ProjectType = 'residential' | 'commercial' | 'public';

export type SpotType = 'parking' | 'road' | 'road_v' | 'road_h' | 'intersection' | 'tjunction' | 'empty' | 'lift' | 'escalator' | 'hydraulic' | 'stairs';

export interface ParkedVehicle {
  id: string;
  vehicleNumber?: string;
  vehicleTypeId: string;
  categoryId: string;
  entryTime: string;
}

export interface SpotAllocation {
  id?: string;
  floorId?: string;
  row?: number;
  col?: number;
  apartmentNumber?: string;
  houseNumber?: string;
  customerName?: string;
  phoneNumber?: string;
  vehicles: ParkedVehicle[];
}

export interface ParkingSpot {
  id: string;
  type: SpotType;
  categoryId: string;
  occupied: boolean;
  label: string;
  row: number;
  col: number;
  allocation?: SpotAllocation;
}

export interface ParkingFloor {
  id: string;
  name: string;
  rows: number;
  cols: number;
  grid: ParkingSpot[][];
  color: string;
  icon: string;
  isActive?: boolean;
  projectType: ProjectType;
  apartmentId?: string;  // links floor to a layout apartment plot key
}

export interface ParkingState {
  floors: ParkingFloor[];
  activeFloorId: string | null;
  vehicleTypes: VehicleType[];
  categories: Category[];
  buildings: string[];
  houseNumbers: string[];
}
