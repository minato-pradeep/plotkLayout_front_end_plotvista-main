import { Component, inject, signal, computed, effect, HostListener, untracked, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParkingStateService } from '../../../services/parking-state.service';
import { ICON_MAP, getVehicleEmoji } from '../../../utils/icon-map.util';
import { SpotType, ProjectType } from '../../../parking.types';

@Component({
  selector: 'app-floor-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './floor-editor.component.html',
  changeDetection: ChangeDetectionStrategy.Default
})
export class FloorEditorComponent {
  parking = inject(ParkingStateService);
  private cdr = inject(ChangeDetectorRef);

  activeTab = signal<'layout' | 'vehicles' | 'categories'>('layout');
  floorId = signal<string | null>(null);
  name = '';
  isActive = true;
  rows = 6;
  cols = 8;
  color = '#3b82f6';
  icon = 'Layers';
  selectedSpotType = signal<SpotType>('parking');
  projectType: ProjectType = 'residential';
  tempGrid = signal<SpotType[][]>([]);
  apartmentId: string | null = null;

  showConfirm = signal(false);
  pendingAction = signal<'reset' | 'status' | 'delete' | null>(null);

  newVehicle = signal({ name: '', icon: 'Car', color: '#3b82f6', bgColor: '#dbeafe' });
  newCategory = signal({ name: '', color: '#64748b' });
  editingVehicleId = signal<string | null>(null);
  editingCategoryId = signal<string | null>(null);
  activeMenuId: string | null = null;

  availableIcons = Object.keys(ICON_MAP);

  occupiedGrid = computed(() => {
    const id = this.floorId();
    if (!id) return [] as any[][];
    return this.parking.state().floors.find(f => f.id === id)?.grid ?? [];
  });

  hasOccupiedSpots = computed(() => this.occupiedGrid().some((row: any[]) => row.some((s: any) => s?.occupied)));

  isPainting = signal(false);
  blockedSpot = signal<{ r: number; c: number } | null>(null);
  private _blockTimer: any = null;

  constructor() {
    effect(() => {
      const isOpen = this.parking.isEditorOpen();
      const floorId = this.parking.editingFloorId();
      if (isOpen) untracked(() => this.open(floorId || undefined));
    }, { allowSignalWrites: true });
  }

  // Called from template when rows/cols inputs change
  onGridSizeChange() {
    const r = this.rows;
    const c = this.cols;
    this.tempGrid.update(prev => {
      if (prev.length === r && (prev[0]?.length || 0) === c) return prev;
      return Array(r).fill(0).map((_, ri) => Array(c).fill(0).map((_, ci) => prev[ri]?.[ci] || 'parking'));
    });
  }

  setActiveTab(tab: string) { this.activeTab.set(tab as 'layout' | 'vehicles' | 'categories'); }
  setProjectType(pt: string) { this.projectType = pt as ProjectType; }
  cancelConfirm() { this.showConfirm.set(false); this.pendingAction.set(null); }
  isStatusReset() { return this.pendingAction() === 'reset'; }
  isStatusActive() { return this.pendingAction() === 'status' && this.isActive; }
  isStatusInactive() { return this.pendingAction() === 'status' && !this.isActive; }
  isDeleteAction() { return this.pendingAction() === 'delete'; }

  getIconName(icon: string) { return getVehicleEmoji(icon); }

  open(floorId?: string) {
    this.floorId.set(floorId || null);
    if (floorId) {
      const f = this.parking.state().floors.find(fl => fl.id === floorId);
      if (f) {
        this.name = f.name;
        this.rows = f.rows;
        this.cols = f.cols;
        this.isActive = f.isActive !== false;
        this.color = f.color || '#3b82f6';
        this.icon = f.icon || 'Layers';
        this.projectType = f.projectType || 'residential';
        this.tempGrid.set(f.grid.map(row => row.map(s => s.type)));
        this.apartmentId = f.apartmentId || null;
      }
    } else {
      this.name = '';
      this.rows = 6;
      this.cols = 8;
      this.isActive = true;
      this.color = '#3b82f6';
      this.icon = 'Layers';
      this.projectType = 'residential';
      this.tempGrid.set(Array(6).fill(0).map(() => Array(8).fill('parking')));
      this.apartmentId = null;
    }
    this.parking.isEditorOpen.set(true);
    this.cdr.markForCheck();
  }

  close() { this.parking.isEditorOpen.set(false); }

  applyType(r: number, c: number) {
    const liveSpot = this.occupiedGrid()[r]?.[c];
    if (liveSpot?.occupied) {
      clearTimeout(this._blockTimer);
      this.blockedSpot.set({ r, c });
      this._blockTimer = setTimeout(() => this.blockedSpot.set(null), 600);
      return;
    }
    const grid = [...this.tempGrid()];
    grid[r] = [...grid[r]];
    grid[r][c] = this.selectedSpotType();
    this.tempGrid.set(grid);
  }

  startPainting(r: number, c: number) { this.isPainting.set(true); this.applyType(r, c); }
  paintIfActive(r: number, c: number) { if (this.isPainting()) this.applyType(r, c); }

  @HostListener('document:mouseup')
  stopPainting() { this.isPainting.set(false); }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.activeMenuId = null;
  }

  selectType(type: string) { this.selectedSpotType.set(type as SpotType); }

  handleSave() {
    if (!this.name.trim()) return;
    if (this.floorId()) {
      this.parking.updateFloor(this.floorId()!, this.name, this.rows, this.cols, this.color, this.icon, this.projectType, this.isActive, this.tempGrid());
    } else {
      this.parking.addFloor(this.name, this.rows, this.cols, this.color, this.icon, this.projectType, this.tempGrid());
    }
    this.close();
  }

  toggleStatus() { this.pendingAction.set('status'); this.showConfirm.set(true); }
  handleReset() { this.pendingAction.set('reset'); this.showConfirm.set(true); }
  handleDelete() { this.pendingAction.set('delete'); this.showConfirm.set(true); }

  confirmPending() {
    const action = this.pendingAction(); const id = this.floorId();
    if (!id || !action) return;
    this.pendingAction.set(null); this.showConfirm.set(false);
    if (action === 'reset') {
      this.parking.resetFloor(id);
      const f = this.parking.state().floors.find(fl => fl.id === id);
      if (f) { this.tempGrid.set(f.grid.map(row => row.map((s: any) => s.type))); this.rows = f.rows; this.cols = f.cols; }
    } else if (action === 'status') {
      this.parking.toggleFloorActive(id, !this.isActive);
      this.close();
    } else if (action === 'delete') {
      this.parking.deleteFloor(id);
      this.close();
    }
  }

  addVehicle() {
    if (!this.newVehicle().name) return;
    if (this.editingVehicleId()) { this.parking.updateVehicleType(this.editingVehicleId()!, this.newVehicle()); this.editingVehicleId.set(null); }
    else this.parking.addVehicleType(this.newVehicle());
    this.newVehicle.set({ name: '', icon: 'Car', color: '#3b82f6', bgColor: '#dbeafe' });
  }

  editVehicle(vt: any) { this.editingVehicleId.set(vt.id); this.newVehicle.set({ name: vt.name, icon: vt.icon, color: vt.color, bgColor: vt.bgColor }); }
  deleteVehicle(id: string) { this.parking.deleteVehicleType(id); }
  updateVehicleIcon(icon: string) { this.newVehicle.update(v => ({ ...v, icon })); }
  updateVehicleName(name: string) { this.newVehicle.update(v => ({ ...v, name })); }
  updateVehicleColor(color: string) { this.newVehicle.update(v => ({ ...v, color })); }

  addCategory() {
    if (!this.newCategory().name) return;
    if (this.editingCategoryId()) { this.parking.updateCategory(this.editingCategoryId()!, this.newCategory()); this.editingCategoryId.set(null); }
    else this.parking.addCategory(this.newCategory());
    this.newCategory.set({ name: '', color: '#64748b' });
  }

  editCategory(cat: any) { this.editingCategoryId.set(cat.id); this.newCategory.set({ name: cat.name, color: cat.color }); }
  deleteCategory(id: string) { this.parking.deleteCategory(id); }
  updateCategoryName(name: string) { this.newCategory.update(c => ({ ...c, name })); }
  updateCategoryColor(color: string) { this.newCategory.update(c => ({ ...c, color })); }
}
