export type PlotType = 'vacant' | 'house' | 'apartment' | 'watertank' | 'hospital' | 'park' | 'road' | 'shop' | 'security' | 'guesthouse' | 'pg' | 'communityHall' | 'swimmingPool';

export interface Resident {
  name: string;
  phone: string;
  role: 'owner' | 'tenant';
  unit?: string;
  note?: string;
  foodNeeded?: boolean;
  paymentType?: 'MONTHLY' | 'HALFYEARLY' | 'YEARLY';
}

export interface UnitDetail {
  rent?: number;
  sqft?: number;
}

export interface Facilities {
  cctv?: boolean;
  waterNum?: string;
  ebNum?: string;
  gasNum?: string;
}

export interface AptConfig {
  floors: number;
  unitsPerFloor: number;
  parkingFloors?: number;
  blockName: string;
  defaultBhk?: string;
  facilities?: string[];
  unitDetails?: Record<string, UnitDetail>;
  skippedUnits?: string[];
  unitShops?: Record<string, string>;
  mergeGroups?: string[][];
  unitBhk?: Record<string, string>;
  unitNames?: Record<string, string>;
  floorUnitOverrides?: Record<number, number>;
}

export interface SplitHalf {
  type: PlotType;
  name?: string;
  residents: Resident[];
  price?: number;
  sqft?: number;
  shopType?: string;
}

export interface PlotData {
  type: PlotType;
  aptConfig?: AptConfig;
  residents: Resident[];
  price?: number;
  sqft?: number;
  name?: string;
  roadDirection?: 'h' | 'v';
  facilitiesDetails?: Facilities;
  shopType?: string;
  parking?: boolean;
  splitDirection?: 'h' | 'v';
  splitData?: { a: SplitHalf; b: SplitHalf };
  gate?: { position: 'top' | 'bottom' | 'left' | 'right'; type: 'cyber' | 'side'; label?: string };
}

export interface LayoutSection {
  id: string;
  name?: string;
  hStreets: number;
  vStreets: number;
  plotsPerBlock: number;
  hStreetNames: string[];
  vStreetNames: string[];
  plots: Record<string, PlotData>;
  mergeGroups: string[][];
  blockOverrides?: Record<string, { rows: number; cols: number }>;
}

export interface ProjectMeta {
  totalLandArea: string;
  netPlotArea: string;
  plottedArea: string;
  roadArea: string;
  openArea: string;
  utilityArea: string;
  civicAmenities: string;
  totalPlots: number;
  layoutType?: string;
  compassDirection?: 'N' | 'E' | 'S' | 'W';
}

export interface GlobalState {
  hStreets: number;
  vStreets: number;
  hStreetNames?: string[];
  vStreetNames?: string[];
  plotsPerBlock: number;
  plots: Record<string, PlotData>;
  selectedKey: string | null;
  selectedHalf: 'a' | 'b' | null;
  mergeGroups: string[][];
  projectMeta?: ProjectMeta;
  blockOverrides?: Record<string, { rows: number; cols: number }>;
  sections: LayoutSection[];
  activeSectionId: string;
  compassDirection?: 'N' | 'E' | 'S' | 'W';
}
