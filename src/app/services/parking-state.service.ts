import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ParkingFloor, ParkingSpot, ParkingState, SpotType, Category, VehicleType, SpotAllocation, ProjectType } from '../parking.types';
import { AuthService } from './auth.service';

export const isRoad = (type: SpotType) =>
  ['road', 'road_v', 'road_h', 'intersection', 'tjunction'].includes(type);

const generateGrid = (rows: number, cols: number, layout?: SpotType[][], defaultCategoryId = 'general'): ParkingSpot[][] => {
  const grid: ParkingSpot[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: ParkingSpot[] = [];
    let parkingIndex = 1;
    for (let c = 0; c < cols; c++) {
      const type = (layout && layout[r] && layout[r][c]) || 'parking';
      const label = type === 'parking' ? `${String.fromCharCode(65 + r)}${parkingIndex++}` : '';
      row.push({ id: `${r}-${c}-${Math.random().toString(36).substr(2, 9)}`, type, categoryId: defaultCategoryId, occupied: false, label, row: r, col: c });
    }
    grid.push(row);
  }
  return grid;
};

const DEFAULT_VEHICLE_TYPES: VehicleType[] = [
  { id: 'car', name: 'Car', icon: 'Car', color: '#3b82f6', bgColor: '#dbeafe' },
  { id: 'bike', name: 'Bike', icon: 'Motorbike', color: '#10b981', bgColor: '#d1fae5' },
  { id: 'truck', name: 'Truck', icon: 'Truck', color: '#f59e0b', bgColor: '#fef3c7' },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'general', name: 'General', color: '#64748b' },
  { id: 'reserved', name: 'Reserved', color: '#3b82f6' },
  { id: 'handicap', name: 'Handicap', color: '#10b981' },
];

@Injectable({ providedIn: 'root' })
export class ParkingStateService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = '/api';
    //private base = 'http://103.59.134.16:8082/api';
    //private base = 'http://192.168.150.100:8082/api';
  state = signal<ParkingState>({
    floors: [],
    activeFloorId: null,
    vehicleTypes: DEFAULT_VEHICLE_TYPES,
    categories: DEFAULT_CATEGORIES,
    buildings: [],
    houseNumbers: []
  });

  isEditorOpen = signal(false);
  editingFloorId = signal<string | null>(null);
  isSidebarOpen = signal(true);

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  private get companyId(): string { return this.auth.getCompanyId(); }

  // ── LOAD ─────────────────────────────────────────────────────────────────

  // Step 1: Load floor list only (no grids) + config on page open
  async loadFromBackend() {
    if (!this.companyId) return;
    try {
      const [floorsRes, configRes]: any[] = await Promise.all([
        firstValueFrom(this.http.get(`${this.base}/projects/company/${this.companyId}/parking/floors`, { headers: this.headers() })),
        firstValueFrom(this.http.get(`${this.base}/projects/company/${this.companyId}/parking/config`, { headers: this.headers() }))
      ]);

      const floors: ParkingFloor[] = (floorsRes?.data || []).map((f: any) => ({
        ...f, grid: f.grid || []  // grid is empty until floor is clicked
      }));

      const vehicleTypes = configRes?.data?.vehicleTypes?.length ? configRes.data.vehicleTypes : DEFAULT_VEHICLE_TYPES;
      const categories = configRes?.data?.categories?.length ? configRes.data.categories : DEFAULT_CATEGORIES;

      this.state.set({
        floors,
        activeFloorId: floors.length > 0 ? floors[0].id : null,
        vehicleTypes,
        categories,
        buildings: [],
        houseNumbers: []
      });

      // Load first floor grid if exists
      if (floors.length > 0) await this.loadFloorGrid(floors[0].id);
    } catch (e) {
      console.error('Failed to load parking state', e);
    }
  }

  // Step 2: Load a single floor's full grid when user clicks it
  async loadFloorGrid(floorId: string) {
    if (!this.companyId) return;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${this.base}/projects/company/${this.companyId}/parking/floors/${floorId}`, { headers: this.headers() })
      );
      const floor: ParkingFloor = res?.data;
      if (!floor) return;
      this.state.update(s => ({
        ...s,
        floors: s.floors.map(f => f.id === floorId ? { ...floor } : f),
        activeFloorId: floorId
      }));
    } catch (e) {
      console.error('Failed to load floor grid', e);
    }
  }

  // Step 3: Load apartments only when allocation dropdown opens
  async loadApartments(): Promise<string[]> {
    if (!this.companyId) return [];
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${this.base}/projects/company/${this.companyId}/parking/apartments`, { headers: this.headers() })
      );
      const apartments: string[] = res?.data || [];
      this.state.update(s => ({ ...s, buildings: apartments }));
      return apartments;
    } catch (e) {
      console.error('Failed to load apartments', e);
      return [];
    }
  }

  // ── SAVE ─────────────────────────────────────────────────────────────────

  // Save a single floor (called after add/update/reset)
  private async saveFloor(floor: ParkingFloor) {
    if (!this.companyId) return;
    try {
      await firstValueFrom(
        this.http.put(`${this.base}/projects/company/${this.companyId}/parking/floors/${floor.id}`,
          floor, { headers: this.headers() })
      );
    } catch (e) {
      console.error('Failed to save floor', e);
    }
  }

  // Save only config (vehicleTypes + categories)
  private async saveConfig() {
    if (!this.companyId) return;
    const s = this.state();
    try {
      await firstValueFrom(
        this.http.put(`${this.base}/projects/company/${this.companyId}/parking/config`,
          { vehicleTypes: s.vehicleTypes, categories: s.categories },
          { headers: this.headers() })
      );
    } catch (e) {
      console.error('Failed to save config', e);
    }
  }

  // Save a single spot allocation
  private async saveSpot(floorId: string, row: number, col: number, spot: ParkingSpot) {
    if (!this.companyId) return;
    try {
      await firstValueFrom(
        this.http.put(`${this.base}/projects/company/${this.companyId}/parking/floors/${floorId}/spots/${row}/${col}`,
          spot, { headers: this.headers() })
      );
    } catch (e) {
      console.error('Failed to save spot', e);
    }
  }

  // ── FLOOR OPERATIONS ─────────────────────────────────────────────────────

  openEditor(floorId?: string) {
    this.editingFloorId.set(floorId || null);
    this.isEditorOpen.set(true);
  }

  toggleSidebar() { this.isSidebarOpen.update(v => !v); }

  async setActiveFloor(id: string) {
    this.state.update(s => ({ ...s, activeFloorId: id }));
    // Lazy load grid only if not already loaded
    const floor = this.state().floors.find(f => f.id === id);
    if (!floor?.grid?.length) await this.loadFloorGrid(id);
  }

  addFloor(name: string, rows: number, cols: number, color: string, icon: string, projectType: ProjectType, layout?: SpotType[][]) {
    const newFloor: ParkingFloor = {
      id: `floor-${Date.now()}`,
      name, rows, cols,
      grid: generateGrid(rows, cols, layout, this.state().categories[0]?.id || 'general'),
      color, icon, projectType, isActive: true
    };
    this.state.update(s => ({ ...s, floors: [...s.floors, newFloor], activeFloorId: newFloor.id }));
    this.saveFloor(newFloor);
  }

  addFloorForApartment(aptName: string, aptPlotKey: string): ParkingFloor {
    const newFloor: ParkingFloor = {
      id: `floor-${Date.now()}`,
      name: aptName,
      rows: 4, cols: 6,
      grid: generateGrid(4, 6, undefined, this.state().categories[0]?.id || 'general'),
      color: '#6366f1', icon: 'Layers',
      projectType: 'residential',
      isActive: true,
      apartmentId: aptPlotKey
    };
    this.state.update(s => ({ ...s, floors: [...s.floors, newFloor], activeFloorId: newFloor.id }));
    this.saveFloor(newFloor);
    return newFloor;
  }

  // Auto-create parking floors based on apartment configuration
  async autoCreateParkingFloorsForApartment(aptName: string, aptPlotKey: string, aptConfig: any) {
    const totalFloors = aptConfig.floors || 1; // Floors above ground (1, 2, 3...)
    const unitsPerFloor = aptConfig.unitsPerFloor || 4;
    const floorUnitOverrides = aptConfig.floorUnitOverrides || {};

    // Calculate actual total units accounting for per-floor overrides
    let totalUnits = 0;
    
    // Add ground floor units (key = -1)
    totalUnits += floorUnitOverrides[-1] ?? unitsPerFloor;
    
    // Add floors above ground (1, 2, 3...)
    for (let floor = 1; floor <= totalFloors; floor++) {
      totalUnits += floorUnitOverrides[floor] ?? unitsPerFloor;
    }

    // Total residential floors including ground = totalFloors + 1
    const totalResidentialFloors = totalFloors + 1;
    
    // 1 parking floor per 4 residential floors, minimum 1
    const parkingFloorsCount = Math.max(1, Math.ceil(totalResidentialFloors / 4));

    // Spots per parking floor
    const spotsPerFloor = Math.ceil(totalUnits / parkingFloorsCount);

    // Grid dimensions: use unitsPerFloor as cols (capped at 10),
    // calculate rows to fit all spots
    const cols = Math.min(10, Math.max(unitsPerFloor, 4));
    const rows = Math.min(8, Math.ceil(spotsPerFloor / cols));

    const createdFloors: ParkingFloor[] = [];

    for (let i = 0; i < parkingFloorsCount; i++) {
      const floorName = parkingFloorsCount === 1
        ? `${aptName} - Parking`
        : `${aptName} - P${i + 1}`;

      const newFloor: ParkingFloor = {
        id: `floor-${Date.now()}-${i}`,
        name: floorName,
        rows,
        cols,
        grid: generateGrid(rows, cols, undefined, this.state().categories[0]?.id || 'general'),
        color: '#6366f1',
        icon: 'Layers',
        projectType: 'residential',
        isActive: true,
        apartmentId: aptPlotKey
      };

      createdFloors.push(newFloor);
      await this.saveFloor(newFloor);

      // Small delay to ensure unique IDs
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.state.update(s => ({
      ...s,
      floors: [...s.floors, ...createdFloors],
      activeFloorId: createdFloors[0]?.id || s.activeFloorId
    }));

    return createdFloors;
  }

  getFloorsForApartment(aptPlotKey: string): ParkingFloor[] {
    return this.state().floors.filter(f => f.apartmentId === aptPlotKey);
  }

  updateFloor(id: string, name: string, rows: number, cols: number, color: string, icon: string, projectType: ProjectType, isActive: boolean, layout?: SpotType[][]) {
    this.state.update(s => {
      const idx = s.floors.findIndex(f => f.id === id);
      if (idx === -1) return s;
      const old = s.floors[idx];
      const newGrid = generateGrid(rows, cols, layout, s.categories[0]?.id || 'general');
      for (let r = 0; r < Math.min(rows, old.rows); r++)
        for (let c = 0; c < Math.min(cols, old.cols); c++)
          newGrid[r][c] = { ...old.grid[r][c], type: newGrid[r][c].type, label: newGrid[r][c].label, row: r, col: c };
      const updated = [...s.floors];
      updated[idx] = { ...old, name, rows, cols, color, icon, projectType, isActive, grid: newGrid };
      this.saveFloor(updated[idx]);
      return { ...s, floors: updated };
    });
  }

  async deleteFloor(id: string) {
    if (!this.companyId) return;
    this.state.update(s => {
      const filtered = s.floors.filter(f => f.id !== id);
      return { ...s, floors: filtered, activeFloorId: s.activeFloorId === id ? (filtered[0]?.id || null) : s.activeFloorId };
    });
    try {
      await firstValueFrom(
        this.http.delete(`${this.base}/projects/company/${this.companyId}/parking/floors/${id}`, { headers: this.headers() })
      );
    } catch (e) { console.error('Failed to delete floor', e); }
  }

  resetFloor(id: string) {
    this.state.update(s => {
      const idx = s.floors.findIndex(f => f.id === id);
      if (idx === -1) return s;
      const f = s.floors[idx];
      const freshGrid = generateGrid(f.rows, f.cols, undefined, s.categories[0]?.id || 'general');
      const updated = [...s.floors];
      updated[idx] = { ...f, grid: freshGrid };
      this.saveFloor(updated[idx]);
      return { ...s, floors: updated };
    });
  }

  toggleFloorActive(id: string, isActive: boolean) {
    this.state.update(s => {
      const updated = s.floors.map(f => f.id === id ? { ...f, isActive } : f);
      const floor = updated.find(f => f.id === id);
      if (floor) this.saveFloor(floor);
      return { ...s, floors: updated };
    });
  }

  // ── SPOT OPERATIONS ───────────────────────────────────────────────────────

  setSpotType(floorId: string, row: number, col: number, type: SpotType) {
    this.state.update(s => {
      const idx = s.floors.findIndex(f => f.id === floorId);
      if (idx === -1) return s;
      const floor = { ...s.floors[idx] };
      const grid = floor.grid.map(r => [...r]);
      grid[row][col] = { ...grid[row][col], type, occupied: type !== 'parking' ? false : grid[row][col].occupied, allocation: type !== 'parking' ? undefined : grid[row][col].allocation };
      let pi = 1;
      for (let c = 0; c < floor.cols; c++)
        grid[row][c] = { ...grid[row][c], label: grid[row][c].type === 'parking' ? `${String.fromCharCode(65 + row)}${pi++}` : '' };
      floor.grid = grid;
      const updated = [...s.floors];
      updated[idx] = floor;
      // Save entire floor when layout changes (spot type change affects structure)
      this.saveFloor(floor);
      return { ...s, floors: updated };
    });
  }

  // Public method to force-save a floor's full grid to DB
  saveFloorPublic(floorId: string) {
    const floor = this.state().floors.find(f => f.id === floorId);
    if (floor) this.saveFloor(floor);
  }

  occupySpot(floorId: string, row: number, col: number, allocation: SpotAllocation | null) {
    this.state.update(s => {
      const idx = s.floors.findIndex(f => f.id === floorId);
      if (idx === -1) return s;
      const floor = { ...s.floors[idx] };
      const grid = floor.grid.map(r => [...r]);
      const spot = { ...grid[row][col] };
      if (spot.type !== 'parking') return s;
      if (allocation && allocation.vehicles && allocation.vehicles.length > 0) {
        const allocId = spot.allocation?.id || `alloc-${Date.now()}`;
        spot.occupied = true;
        spot.allocation = { ...allocation, id: allocId, floorId, row, col };
      } else {
        // Clear the spot completely
        spot.occupied = false;
        spot.allocation = undefined;
      }
      grid[row][col] = spot;
      floor.grid = grid;
      const updated = [...s.floors];
      updated[idx] = floor;
      // Save only this spot using explicit row/col params
      this.saveSpot(floorId, row, col, spot);
      return { ...s, floors: updated };
    });
  }

  // ── CONFIG OPERATIONS ─────────────────────────────────────────────────────

  addVehicleType(v: Omit<VehicleType, 'id'>) {
    const newV: VehicleType = { ...v, id: `vtype-${Date.now()}` };
    this.state.update(s => ({ ...s, vehicleTypes: [...s.vehicleTypes, newV] }));
    this.saveConfig();
  }

  updateVehicleType(id: string, v: Partial<VehicleType>) {
    this.state.update(s => ({ ...s, vehicleTypes: s.vehicleTypes.map(vt => vt.id === id ? { ...vt, ...v } : vt) }));
    this.saveConfig();
  }

  deleteVehicleType(id: string) {
    this.state.update(s => ({ ...s, vehicleTypes: s.vehicleTypes.filter(vt => vt.id !== id) }));
    this.saveConfig();
  }

  addCategory(c: Omit<Category, 'id'>) {
    const newC: Category = { ...c, id: `cat-${Date.now()}` };
    this.state.update(s => ({ ...s, categories: [...s.categories, newC] }));
    this.saveConfig();
  }

  updateCategory(id: string, c: Partial<Category>) {
    this.state.update(s => ({ ...s, categories: s.categories.map(cat => cat.id === id ? { ...cat, ...c } : cat) }));
    this.saveConfig();
  }

  deleteCategory(id: string) {
    this.state.update(s => ({ ...s, categories: s.categories.filter(cat => cat.id !== id) }));
    this.saveConfig();
  }

  updateBuildings(buildings: string[], houseNumbers: string[]) {
    this.state.update(s => ({ ...s, buildings, houseNumbers }));
  }
}
