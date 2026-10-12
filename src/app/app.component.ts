import { Component, computed, signal, ChangeDetectionStrategy, OnInit, HostListener, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from './state.service';
import { PlotCellComponent } from './components/plot-cell/plot-cell.component';
import { AptModalComponent } from './components/apt-modal/apt-modal.component';
import { ResModalComponent } from './components/res-modal/res-modal.component';
import { AptDetailModalComponent } from './components/apt-detail-modal/apt-detail-modal.component';
import { CustomerModalComponent, CustomerModalData } from './components/customer-modal/customer-modal.component';
import { PlotType, AptConfig, Resident, PlotData, ProjectMeta } from '../types';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, PlotCellComponent, AptModalComponent, ResModalComponent, AptDetailModalComponent, CustomerModalComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  hStreets = signal(3);
  vStreets = signal(3);
  plotsPerBlock = signal(3);
  searchTerm = '';
  activeMenuId: string | null = null;

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.activeMenuId = null;
  }

  hStreetNames = computed(() => this.stateService.state().hStreetNames || ['Maple Avenue', 'Birch Lane', 'Cedar Boulevard', 'Oakwood Drive', 'Elm Street', 'Rosewood Path']);
  vStreetNames = computed(() => this.stateService.state().vStreetNames || ['Gold Crescent', 'Silver Close', 'Diamond Road', 'Pearl Way', 'Emerald Row', 'Sapphire Drive']);

  updateStreetName(type: 'h' | 'v', index: number, name: string) {
    this.stateService.saveState();
    this.stateService.updateStreetName(type, index, name);
  }

  layoutType = signal<string>('');
  isPgOnly = computed(() => this.layoutType().toUpperCase() === 'PG_ONLY');
  isPgAll = computed(() => this.layoutType().toUpperCase() === 'PG_ALL');
  isPg = computed(() => this.isPgOnly() || this.isPgAll() || this.layoutType().toUpperCase() === 'PG');

  isProjectInfoOpen = false;
  isAptModalOpen = false;
  isAptDetailOpen = signal(false);
  isResModalOpen = false;
  isDetailModalOpen = false;
  isShopPickerOpen = false;
  isSidebarOpen = signal(true);
  isSidebarExtended = signal(false);
  sidebarStage = signal<0 | 1 | 2>(0); // 0=narrow, 1=wide, 2=full
  classificationOpen = signal(true);
  othersOpen = signal(true);
  shopPickerKey = '';
  resModalRole: 'owner' | 'tenant' = 'owner';
  layoutRotation = signal(0);
  compassDirection = signal<'N' | 'E' | 'S' | 'W'>('N');

  // Direction labels shown on the 4 sides of the layout based on compass orientation
  directionLabels = computed(() => {
    const dir = this.compassDirection();
    // Order: top, right, bottom, left
    const map: Record<string, [string, string, string, string]> = {
      'N': ['NORTH', 'EAST', 'SOUTH', 'WEST'],
      'E': ['EAST', 'SOUTH', 'WEST', 'NORTH'],
      'S': ['SOUTH', 'WEST', 'NORTH', 'EAST'],
      'W': ['WEST', 'NORTH', 'EAST', 'SOUTH'],
    };
    const [top, right, bottom, left] = map[dir];
    return { top, right, bottom, left };
  });

  showDirectionOverlay = signal(false);

  compassRightPos = computed(() => {
    if (!this.isSidebarOpen()) return 32; // Standard margin when closed
    const stage = this.sidebarStage();
    const widths = [288, 480, 700];
    return widths[stage] + 32; // Offset by sidebar width plus margin
  });

  isContextMenuOpen = signal(false);
  contextMenuPos = { x: 0, y: 0 };
  contextMenuKey = '';
  isRenameModalOpen = signal(false);
  renameValue = '';

  rotateLayout() {
    this.layoutRotation.update(r => r + 90);
    // Cycle compass direction: N → E → S → W → N
    const cycle: Record<string, 'N' | 'E' | 'S' | 'W'> = { N: 'E', E: 'S', S: 'W', W: 'N' };
    this.compassDirection.update(d => cycle[d]);
    // Show direction overlay briefly
    this.showDirectionOverlay.set(true);
    setTimeout(() => this.showDirectionOverlay.set(false), 2000);
    // Save compass direction to backend immediately
    this.saveCompassDirectionToBackend();
    // Also update state immediately
    const s = this.stateService.state();
    const projectMeta = { ...s.projectMeta, compassDirection: this.compassDirection() };
    this.stateService.state.update(st => ({ ...st, projectMeta }));
  }

  private saveCompassDirectionToBackend() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    const s = this.stateService.state();
    const projectMeta = { ...s.projectMeta, compassDirection: this.compassDirection() };
    const meta = {
      global: { H: this.hStreets(), V: this.vStreets(), PSB: this.plotsPerBlock() },
      hStreetNames: s.hStreetNames,
      vStreetNames: s.vStreetNames,
      projectMeta,
      mergeGroups: s.mergeGroups,
      blockOverrides: s.blockOverrides
    };
    // Save metadata directly to backend
    this.api.saveLayoutMeta(companyId, meta).subscribe({
      next: () => console.log('Compass direction saved:', this.compassDirection()),
      error: (err) => console.error('Failed to save compass direction:', err)
    });
  }

  // Drag and Drop State
  draggedType: PlotType | null = null;
  draggedRoadDirection: 'h' | 'v' | undefined = undefined;

  onDragStart(event: DragEvent, type: PlotType, direction?: 'h' | 'v', shopType?: string, itemName?: string) {
    this.draggedType = type;
    this.draggedRoadDirection = direction;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', type);
      if (direction) event.dataTransfer.setData('road-direction', direction);
      if (shopType) event.dataTransfer.setData('shop-type', shopType);
      if (itemName) event.dataTransfer.setData('item-name', itemName);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Required to allow drop
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent, key: string, half: 'a' | 'b' | null = null) {
    event.preventDefault();
    const type = (event.dataTransfer?.getData('text/plain') || this.draggedType) as PlotType;
    const direction = (event.dataTransfer?.getData('road-direction') || this.draggedRoadDirection) as 'h' | 'v' | undefined;
    const shopType = event.dataTransfer?.getData('shop-type') || undefined;
    const itemName = event.dataTransfer?.getData('item-name') || undefined;
    if (!type) return;

    this.stateService.selectPlot(key, half);
    const plot = this.plots()[key];
    const targetData = (plot?.splitDirection && half) ? plot.splitData?.[half] : plot;

    if (type === 'vacant' && !this.isOccupied(targetData)) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'This plot is already vacant', showConfirmButton: false, timer: 3000, timerProgressBar: true });
      this.draggedType = null;
      this.draggedRoadDirection = undefined;
      return;
    }

    if (type === 'shop') {
      const doShopDrop = () => {
        this.stateService.saveState();
        this.stateService.updatePlot(key, {
          type: 'shop', shopType,
          name: this.shopOptions.find(o => o.value === shopType)?.label || shopType,
          residents: targetData?.residents || []
        });
        this.saveLayoutToBackend(key);
        this.replaceConfirm.set(null);
      };
      if (this.isOccupied(targetData)) {
        if (targetData?.type === 'shop' && (targetData?.shopType ?? '') === (shopType ?? '')) {
          Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `"${this.getDisplayName(targetData)}" is already assigned to this plot`, showConfirmButton: false, timer: 3000, timerProgressBar: true });
        } else {
          this.replaceConfirm.set({
            existingName: this.getDisplayName(targetData),
            newName: itemName || this.shopOptions.find(o => o.value === shopType)?.label || shopType,
            onYes: doShopDrop
          });
        }
      } else { doShopDrop(); }
    } else {
      this.setPlotType(key, type, direction);
    }

    this.draggedType = null;
    this.draggedRoadDirection = undefined;
  }

  drillDownToCustomer(res: any) {
    if (!this.selectedKey()) return;
    this.isCustomerModalOpen.set(true);
    // Modal will sync with selectedKey
  }

  readonly shopOptions = [
    { value: 'grocery', label: 'Grocery Store', emoji: '🛒', category: 'Food & Daily' },
    { value: 'gym', label: 'Gym', emoji: '🏋️', category: 'Fitness' },
    { value: 'playstation', label: 'PlayStation', emoji: '🎮', category: 'Gaming' },
    { value: 'pharmacy', label: 'Pharmacy', emoji: '💊', category: 'Health' },
    { value: 'restaurant', label: 'Restaurant', emoji: '🍽️', category: 'Food' },
    { value: 'bakery', label: 'Bakery', emoji: '🥐', category: 'Food' },
    { value: 'salon', label: 'Salon / Spa', emoji: '💈', category: 'Beauty' },
    { value: 'laundry', label: 'Laundry', emoji: '🧺', category: 'Services' },
    { value: 'stationery', label: 'Stationery', emoji: '📚', category: 'Education' },
    { value: 'tailoring', label: 'Tailoring', emoji: '🧵', category: 'Services' },
    { value: 'clinic', label: 'Mini Clinic', emoji: '🩺', category: 'Health' },
    { value: 'atm', label: 'ATM / Bank', emoji: '🏧', category: 'Finance' },
  ];

  openShopPicker(key: string) {
    this.shopPickerKey = key;
    // preserve selectedHalf when opening shop picker for a split cell
    const currentHalf = this.selectedHalf();
    this.stateService.selectPlot(key, currentHalf);
    this.isShopPickerOpen = true;
  }

  confirmShopType(shopType: string) {
    const key = this.shopPickerKey;
    if (!key) return;
    this.stateService.saveState();
    const half = this.selectedHalf();
    const currentData = half
      ? this.plots()[key]?.splitData?.[half]
      : this.plots()[key];
    this.stateService.updatePlot(key, {
      type: 'shop',
      shopType,
      name: this.shopOptions.find(o => o.value === shopType)?.label || shopType,
      residents: currentData?.residents || []
    });
    this.isShopPickerOpen = false;
    this.saveLayoutToBackend(key);
  }

  getShopOption(value: string) {
    return this.shopOptions.find(o => o.value === value);
  }

  getShopColorClass(category: string): string {
    switch (category) {
      case 'Health': return 'bg-sky-50 border-sky-100 text-sky-700 hover:border-sky-400';
      case 'Food': return 'bg-sky-50 border-sky-100 text-sky-700 hover:border-sky-400';
      case 'Beauty':
      case 'Services': return 'bg-sky-50 border-sky-100 text-sky-700 hover:border-sky-400';
      case 'Finance':
      case 'Tech': return 'bg-sky-50 border-sky-100 text-sky-700 hover:border-sky-400';
      case 'Entertainment': return 'bg-sky-50 border-sky-100 text-sky-700 hover:border-sky-400';
      case 'Education': return 'bg-sky-50 border-sky-100 text-sky-700 hover:border-sky-400';
      default: return 'bg-sky-50 border-sky-100 text-sky-700 hover:border-sky-400';
    }
  }

  // ── MERGE ──────────────────────────────────────────────
  pendingMerge: string[] = [];
  isCtrlHeld = false;
  mergeGroups = computed(() => this.state().mergeGroups || []);

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Control') this.isCtrlHeld = true;
    if (e.key === 'Escape') { this.pendingMerge = []; this.isCtrlHeld = false; }
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    if (e.key !== 'Control') return;
    this.isCtrlHeld = false;
    if (this.pendingMerge.length >= 2) this.executeMerge();
    else this.pendingMerge = [];
  }

  executeMerge() {
    if (this.pendingMerge.length < 2) return;
    this.stateService.saveState();
    this.stateService.mergePlots([...this.pendingMerge]);
    this.pendingMerge = [];
    this.saveLayoutToBackend();
  }

  unmerge(key: string) { this.stateService.saveState(); this.stateService.unmerge(key); this.saveLayoutToBackend(); }

  // Cell size signals
  zoom = signal(1.0);
  CELL = computed(() => 96 * this.zoom());
  ROAD = computed(() => 64 * this.zoom());

  getBlockX(c: number): number {
    let x = 0;
    const road = this.ROAD();
    for (let i = 0; i < c; i++) {
      x += this.getMaxBlockCols(i) * this.CELL() + road;
    }
    return x;
  }

  getBlockY(r: number): number {
    let y = 0;
    const road = this.ROAD();
    for (let i = 0; i < r; i++) {
      y += this.getMaxBlockRows(i) * this.CELL() + road;
    }
    return y;
  }

  zoomIn() { if (this.zoom() < 2.0) this.zoom.update(z => +(z + 0.1).toFixed(1)); }
  zoomOut() { if (this.zoom() > 0.4) this.zoom.update(z => +(z - 0.1).toFixed(1)); }
  resetZoom() { this.zoom.set(1.0); }

  // Convert a plot key to its pixel top-left position on the canvas
  getCellPixelPos(key: string): { x: number; y: number; w: number; h: number } | null {
    const fullKey = key.split('-')[0];
    const halfSuffix = key.includes('-') ? key.split('-')[1] : null;

    const m = fullKey.match(/r(\d+)c(\d+)pr(\d+)pc(\d+)/);
    if (!m) return null;
    const r = +m[1], c = +m[2], pr = +m[3], pc = +m[4];
    const C = this.CELL();

    const baseX = this.getBlockX(c);
    const baseY = this.getBlockY(r);

    let x = baseX + pc * C;
    let y = baseY + pr * C;
    let w = C;
    let h = C;

    if (halfSuffix) {
      const plot = this.plots()[fullKey];
      if (plot?.splitDirection === 'v') {
        w = C / 2;
        if (halfSuffix === 'b') x += w;
      } else if (plot?.splitDirection === 'h') {
        h = C / 2;
        if (halfSuffix === 'b') y += h;
      }
    }

    return { x, y, w, h };
  }

  // Compute the bounding rectangle for a merge group
  getMergeRect(group: string[]): { x: number; y: number; w: number; h: number } | null {
    const positions = group.map(k => this.getCellPixelPos(k)).filter(Boolean) as { x: number; y: number; w: number; h: number }[];
    if (!positions.length) return null;
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxX = Math.max(...positions.map(p => p.x + p.w));
    const maxY = Math.max(...positions.map(p => p.y + p.h));
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  getMergeGroupOf(key: string): string[] | null {
    return this.mergeGroups().find(g =>
      g.includes(key) || g.includes(key + '-a') || g.includes(key + '-b')
    ) || null;
  }

  isMergePrimary(key: string): boolean {
    const g = this.getMergeGroupOf(key);
    // It's a primary only if the FULL key itself is the primary (at index 0)
    return !!g && g[0] === key;
  }

  isMergeSecondary(key: string): boolean {
    const g = this.getMergeGroupOf(key);
    if (!g) return false;
    // It's a full secondary only if the FULL key itself is in the group (not as index 0)
    return g.includes(key) && g[0] !== key;
  }

  getHiddenHalf(key: string): 'a' | 'b' | null {
    const group = this.mergeGroups().find(g => g.includes(key + '-a') || g.includes(key + '-b'));
    if (!group) return null;
    if (group.includes(key + '-a')) return 'a';
    if (group.includes(key + '-b')) return 'b';
    return null;
  }

  // No longer needed for grid span — kept empty for template compat
  getMergeStyle(_key: string): { [k: string]: string } { return {}; }

  isPendingMerge(key: string) {
    return this.pendingMerge.includes(key) ||
      this.pendingMerge.includes(key + '-a') ||
      this.pendingMerge.includes(key + '-b');
  }

  roadStartKey = signal<string | null>(null);
  roadEndKey = signal<string | null>(null);

  isNightMode = true;

  toggleTheme() {
    if (this.isNightMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }


  state = this.stateService.state;
  selectedKey = computed(() => this.state().selectedKey);
  selectedHalf = computed(() => this.state().selectedHalf);
  plots = computed(() => this.state().plots);
  selectedPlotBookings = signal<any[]>([]);

  // Watch selectedKey to load fresh records from backend
  private isValidPid(pid: string | null | undefined): pid is string {
    return !!pid && pid.length >= 30 && pid !== 'null' && pid !== 'undefined';
  }

  loadBookings(key: string | null, callback?: (bookings: any[]) => void) {
    if (!key) { this.selectedPlotBookings.set([]); callback?.([]); return; }
    const pid = this.projectId();
    if (!this.isValidPid(pid)) { this.selectedPlotBookings.set([]); callback?.([]); return; }
    this.api.getPlotBookings(pid, key).subscribe({
      next: (res: any) => {
        const bookings = res.data || [];
        this.selectedPlotBookings.set(bookings);
        callback?.(bookings);
        this.cdr.markForCheck();
      },
      error: () => { this.selectedPlotBookings.set([]); callback?.([]); this.cdr.markForCheck(); }
    });
  }

  roadConnectivity = computed(() => {
    const p = this.plots();
    const conn: Record<string, { top: boolean, bottom: boolean, left: boolean, right: boolean }> = {};

    Object.keys(p).forEach(key => {
      if (p[key].type !== 'road') return;
      const coords = this.parseKey(key);
      if (!coords) return;
      const { globalR, globalC } = coords;

      conn[key] = {
        top: p[this.createKeyFromGlobal(globalR - 1, globalC)]?.type === 'road',
        bottom: p[this.createKeyFromGlobal(globalR + 1, globalC)]?.type === 'road',
        left: p[this.createKeyFromGlobal(globalR, globalC - 1)]?.type === 'road',
        right: p[this.createKeyFromGlobal(globalR, globalC + 1)]?.type === 'road'
      };
    });
    return conn;
  });

  selectedPlot = computed(() => {
    const key = this.selectedKey();
    const half = this.selectedHalf();
    const plot = key ? this.plots()[key] : null;
    if (plot?.splitDirection && half) {
      return plot.splitData?.[half] || null;
    }
    return plot;
  });

  stats = computed(() => {
    const s = this.state();
    let total = 0;
    for (let r = 0; r <= this.hStreets(); r++)
      for (let c = 0; c <= this.vStreets(); c++)
        total += this.getBlockRows(r, c) * this.getBlockCols(r, c);
    let houses = 0, apts = 0, residents = 0, assigned = 0, resEngaged = 0, comEngaged = 0;
    const residentialTypes = new Set(['house', 'apartment', 'pg', 'guesthouse']);
    const commercialTypes = new Set(['shop', 'hospital', 'watertank', 'security', 'gate']);
    Object.values(s.plots).forEach((p: PlotData) => {
      if (p.type === 'house') houses++;
      if (p.type === 'apartment') apts++;
      residents += p.residents.length;
      if (p.type && p.type !== 'vacant') assigned++;
      if (residentialTypes.has(p.type as string)) resEngaged++;
      if (commercialTypes.has(p.type as string)) comEngaged++;
    });
    const resVacant = Math.max(0, total - resEngaged - comEngaged);
    const comVacant = Math.max(0, total - comEngaged - resEngaged);
    return { total, houses, apts, vacant: Math.max(0, total - assigned), residents, resEngaged, resVacant, comEngaged, comVacant };
  });

  layoutStats = computed(() => {
    const s = this.state();
    // Count total grid cells
    let total = 0;
    for (let r = 0; r <= this.hStreets(); r++)
      for (let c = 0; c <= this.vStreets(); c++)
        total += this.getBlockRows(r, c) * this.getBlockCols(r, c);

    let plotted = 0, roads = 0, open = 0;
    const plotValues = Object.values(s.plots) as PlotData[];

    plotValues.forEach((p: PlotData) => {
      if (!p.type || p.type === 'vacant') return;
      if (p.type === 'road') { roads++; return; }
      if (p.type === 'park') { open++; return; }
      plotted++; // house, apartment, shop, pg, guesthouse, hospital, watertank, security, gate etc.
    });

    const vacant = Math.max(0, total - plotted - roads - open);
    const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%';

    return { total, plotted, roads, open, vacant, pct };
  });

  // Customer modal
  isCustomerModalOpen = signal(false);
  customerModalData = signal<CustomerModalData | null>(null);
  projectId = signal<string>('');
  subClassifications = signal<any[]>([]);
  isCustomizeSubClassOpen = signal(false);
  editingSubClass = signal<any | null>(null);
  editSubClassName = signal('');

  // Action Dashboard (Swal) - Centralized for all plots with bookings
  swalConfig = signal<{ key: string; plot: PlotData; bookings: any[] } | null>(null);

  openActionDashboard(key: string) {
    const plot = this.plots()[key];
    if (!plot || !plot.type || plot.type === 'vacant' || plot.type === 'road') return;

    // Close any existing Swal before opening a new one
    Swal.close();

    this.loadBookings(key, bookings => {
      if (bookings.length > 0) {
        this.swalConfig.set({ key, plot, bookings });
        // Use setTimeout to ensure Swal.close() has fully completed before opening new one
        setTimeout(() => {
          this.showUnifiedPlotSwal(key, plot, bookings);
        }, 100);
      } else {
        // For apartment/pg without config, open config modal first
        if ((plot.type === 'apartment' || plot.type === 'pg') && !plot.aptConfig) {
          this.isAptModalOpen = true;
        } else {
          // For all other types (house, shop, guesthouse, etc.) or apartment/pg with config, open booking form
          this.openNewBookingForm(key);
        }
      }
    });
  }

  // Show a unified premium SweetAlert2 modal matching USER screenshot
  private showUnifiedPlotSwal(key: string, plot: PlotData, bookings: any[]) {
    const filteredBookings = bookings.filter(b => b.plotId === key);
    const residentCount = filteredBookings.length;
    // Use sqft from PlotData; if not set, fall back to sqFeet from the latest booking record
    const sqftVal = plot.sqft || (filteredBookings[0]?.sqFeet ? +filteredBookings[0].sqFeet : undefined);
    const sqftDisplay = sqftVal ? `<div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 8px;">📐 Area: <span style="color: #0f172a;">${sqftVal} ft²</span></div>` : '';

    // Generate resident cards for all residents
    const residentsHtml = filteredBookings.map((customer, idx) => {
      const customerName = customer?.customerName || 'Resident';
      const customerType = customer?.customerType || 'OWNER';
      const customerMobile = customer?.customerMobile || '';
      const initial = customerName.charAt(0).toUpperCase();
      return `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 56px; height: 56px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #0369a1; flex-shrink: 0;">${initial}</div>
        <div style="flex-grow: 1; overflow: hidden;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${customerName}</h3>
          <div style="display: flex; gap: 8px; margin: 4px 0 8px 0;">
            <span style="background: #0ea5e9; color: white; font-size: 8px; font-weight: 900; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">${customerType}</span>
            <span style="background: #f1f5f9; color: #64748b; font-size: 8px; font-weight: 900; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">RESIDENT ${idx + 1}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; font-weight: 700;">Mobile: <span style="color: #0f172a;">${customerMobile || 'N/A'}</span></div>
        </div>
        <div style="position: relative;">
          <button class="swal-res-dots" data-idx="${idx}" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 20px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">⋮</button>
          
          <div class="swal-res-menu" data-idx="${idx}" style="display: none; position: absolute; right: 100%; top: 50%; transform: translateY(-50%); margin-right: 8px; width: 130px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: -8px 0 20px rgba(0,0,0,0.12); z-index: 1000; overflow: hidden; padding: 4px; flex-direction: column;">
            <button class="swal-btn-res-edit" data-idx="${idx}" style="width: 100%; text-align: left; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">✏️</span> Edit Detail
            </button>
            <div style="height: 1px; background: #f1f5f9; margin: 0 8px;"></div>
            <button class="swal-btn-res-delete" data-idx="${idx}" style="width: 100%; text-align: left; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 700; color: #ef4444; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">🗑️</span> Vacate
            </button>
          </div>
        </div>
      </div>
      `;
    }).join('');

    Swal.fire({
      title: '',
      html: `
        <div style="text-align: left; font-family: 'Inter', sans-serif;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div>
              <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; text-transform: lowercase;">${plot.name || key}</h2>
              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 800; color: ${residentCount > 0 ? '#f59e0b' : '#94a3b8'}; text-transform: uppercase; letter-spacing: 0.05em;">${residentCount} ACTIVE RESIDENT(S)</p>
              ${sqftDisplay}
            </div>
            <button id="swal-close-x" style="background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; padding: 0;">&times;</button>
          </div>
          
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;">

          <!-- Residents Cards -->
          ${residentCount > 0 ? `
          <div style="max-height: 300px; overflow-y: auto; margin-bottom: 24px;">
            ${residentsHtml}
          </div>
          ` : `
          <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 20px; padding: 32px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">🏘️</div>
            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Vacant Building</p>
            <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 600; color: #cbd5e1;">Configure or enter plots to add residents</p>
          </div>
          `}

          <!-- Action Buttons Stack -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button id="swal-btn-details" style="width: 100%; padding: 16px; border: none; border-radius: 20px; background: #3b82f6; color: white; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.1s;">
              <span style="font-size: 18px;">👁️</span> VIEW PLOT DETAILS
            </button>
            
            ${(plot.type === 'apartment' || plot.type === 'pg') ? `
            <button id="swal-btn-plots" style="width: 100%; padding: 16px; border: none; border-radius: 20px; background: #a855f7; color: white; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.1s;">
              <span style="font-size: 18px;">🏢</span> OPEN ${plot.type === 'pg' ? 'PG' : 'APARTMENT'} PLOTS
            </button>
            <button id="swal-btn-edit-struct" style="width: 100%; padding: 16px; border: none; border-radius: 20px; background: #f59e0b; color: white; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.1s;">
              <span style="font-size: 18px;">⚙️</span> EDIT STRUCTURE
            </button>
            ` : ''}

            <button id="swal-btn-add" style="width: 100%; padding: 16px; border: none; border-radius: 20px; background: #0f172a; color: white; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.1s;">
              <span style="font-size: 18px;">➕</span> ADD OWNER / TENANT
            </button>
          </div>
        </div>
      `,
      showConfirmButton: false,
      width: '400px',
      padding: '24px',
      background: '#ffffff',
      showCloseButton: false,
      didOpen: () => {
        const popup = Swal.getPopup() as HTMLElement;
        if (popup) popup.style.borderRadius = '32px';

        const closeX = document.getElementById('swal-close-x') as HTMLElement;
        if (closeX) closeX.onclick = () => Swal.close();

        const detailsBtn = document.getElementById('swal-btn-details') as HTMLElement;
        const plotsBtn = document.getElementById('swal-btn-plots') as HTMLElement;
        const editStructBtn = document.getElementById('swal-btn-edit-struct') as HTMLElement;
        const addBtn = document.getElementById('swal-btn-add') as HTMLElement;

        if (detailsBtn) detailsBtn.onclick = () => {
          const cfg = this.swalConfig();
          if (cfg) this.selectedPlotBookings.set(cfg.bookings);
          Swal.close();
          this.swalConfig.set(null);
          this.isDetailModalOpen = true;
          this.cdr.markForCheck();
        };
        if (plotsBtn) plotsBtn.onclick = () => {
          Swal.close();
          this.swalConfig.set(null);
          this.isAptDetailOpen.set(true);
        };
        if (editStructBtn) editStructBtn.onclick = () => {
          Swal.close();
          this.swalConfig.set(null);
          this.isAptModalOpen = true;
        };
        if (addBtn) addBtn.onclick = () => {
          Swal.close();
          this.swalConfig.set(null);
          this.addPersonFromSwal();
        };

        // Resident menu logic (dots) - handle multiple residents
        const dotsBtns = document.querySelectorAll('.swal-res-dots');
        dotsBtns.forEach((dotsBtn) => {
          const idx = dotsBtn.getAttribute('data-idx');
          const resMenu = document.querySelector(`.swal-res-menu[data-idx="${idx}"]`) as HTMLElement;
          if (dotsBtn && resMenu) {
            (dotsBtn as HTMLElement).onclick = (e) => {
              e.stopPropagation();
              const isOpening = resMenu.style.display === 'none';

              // Close others
              document.querySelectorAll('.swal-res-menu').forEach(m => {
                if (m !== resMenu) (m as HTMLElement).style.display = 'none';
              });

              resMenu.style.display = isOpening ? 'block' : 'none';
            };
          }
        });

        // Edit buttons for each resident
        const editBtns = document.querySelectorAll('.swal-btn-res-edit');
        editBtns.forEach((editBtn) => {
          const idx = parseInt(editBtn.getAttribute('data-idx') || '0');
          const htmlEditBtn = editBtn as HTMLElement;
          htmlEditBtn.onmouseover = () => { htmlEditBtn.style.background = '#f8fafc'; };
          htmlEditBtn.onmouseout = () => { htmlEditBtn.style.background = 'none'; };
          htmlEditBtn.onclick = () => {
            Swal.close();
            this.editResidentFromSwal(filteredBookings[idx]);
          };
        });

        // Delete buttons for each resident
        const deleteBtns = document.querySelectorAll('.swal-btn-res-delete');
        deleteBtns.forEach((deleteBtn) => {
          const idx = parseInt(deleteBtn.getAttribute('data-idx') || '0');
          const htmlDeleteBtn = deleteBtn as HTMLElement;
          htmlDeleteBtn.onmouseover = () => { htmlDeleteBtn.style.background = '#fef2f2'; };
          htmlDeleteBtn.onmouseout = () => { htmlDeleteBtn.style.background = 'none'; };
          htmlDeleteBtn.onclick = () => {
            this.deleteResidentFromSwal(filteredBookings[idx]);
          };
        });

        // Close menus when clicking outside
        window.onclick = () => {
          const menus = document.querySelectorAll('.swal-res-menu');
          menus.forEach(menu => { (menu as HTMLElement).style.display = 'none'; });
        };
      }
    });
  }

  // Open full booking form for a new booking
  openNewBookingForm(key: string) {
    const plot = this.plots()[key];
    this.customerModalData.set({
      plotId: key,
      plotName: plot?.name || key,
      projectId: this.projectId() || '',
      plotType: plot?.type || '',
      sqft: plot?.sqft,
      aptConfig: plot?.aptConfig,
      mode: 'new'
    });
    this.isCustomerModalOpen.set(true);
  }

  // Edit a specific resident
  editResidentFromSwal(resident: any) {
    const key = this.swalConfig()?.key || this.selectedKey();
    if (!key) return;
    const plot = this.plots()[key];

    // Clear swalConfig to prevent stale data from interfering
    this.swalConfig.set(null);

    this.customerModalData.set({
      plotId: key,
      plotName: plot?.name || key,
      projectId: this.projectId() || '',
      plotType: plot?.type || '',
      sqft: plot?.sqft,
      aptConfig: plot?.aptConfig,
      mode: 'edit',
      editBooking: resident,
      allBookings: this.swalConfig()?.bookings?.filter(b => b.plotId === key) || []
    });
    this.isCustomerModalOpen.set(true);
  }

  // Add person logic
  private addPersonFromSwal() {
    const config = this.swalConfig();
    const key = config?.key || this.selectedKey();
    if (!key) return;
    const plot = this.plots()[key];
    const ref = config?.bookings?.[0];

    // Clear swalConfig to prevent stale data from interfering
    this.swalConfig.set(null);

    this.customerModalData.set({
      plotId: key,
      plotName: plot?.name || key,
      projectId: this.projectId() || '',
      plotType: plot?.type || '',
      sqft: ref?.sqFeet || plot?.sqft,
      aptConfig: plot?.aptConfig,
      mode: 'add-person',
      refBooking: ref,
      allBookings: config?.bookings?.filter(b => b.plotId === key) || []
    });
    this.isCustomerModalOpen.set(true);
  }

  // Delete a specific resident
  deleteResidentFromSwal(resident: any) {
    const config = this.swalConfig();
    const key = config?.key || this.selectedKey();
    if (!key) return;
    if (!confirm(`Remove booking for ${resident.customerName || 'this resident'}?`)) return;
    const pid = this.projectId();
    const del$ = resident.id ? this.api.vacateBooking(resident.id) : this.api.vacatePlot(pid, key);
    del$.subscribe({
      next: () => {
        this.api.getPlotBookings(pid, key).subscribe({
          next: (res: any) => {
            const updated = res.data || [];
            Swal.close();
            if (updated.length > 0) {
              const plot = this.plots()[key];
              this.swalConfig.set({ key, plot, bookings: updated });
              setTimeout(() => this.showUnifiedPlotSwal(key, plot, updated), 100);
            } else {
              this.swalConfig.set(null);
            }
          },
          error: () => Swal.close()
        });
      },
      error: () => alert('Failed to remove booking.')
    });
  }

  vacateFromSwal() {
    const config = this.swalConfig();
    if (!config) return;
    this.swalConfig.set(null);
    this.openVacateConfirm(config.key);
  }


  private saveTimer: any;

  // ── SIDEBAR ITEMS — hardcoded fallback, overridden by backend sub-classifications ──
  // Each item maps sub-classification name → PlotType + shopType + icon
  readonly hardcodedSidebarItems = [
    // Residential
    { name: 'Individual Villa', classification: 'Residential', type: 'house' as PlotType, shopType: undefined, icon: 'assets/plot-icons/villa.png' },
    { name: 'Apartment', classification: 'Residential', type: 'apartment' as PlotType, shopType: undefined, icon: 'assets/plot-icons/apartment.png' },
    // Commercial
    { name: 'Shop', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'shop', icon: 'assets/plot-icons/shop.png' },
    { name: 'Grocery Store', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'grocery', icon: 'assets/plot-icons/grosary.png' },
    { name: 'Gym', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'gym', icon: 'assets/plot-icons/gym.png' },
    { name: 'Pharmacy', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'pharmacy', icon: 'assets/plot-icons/pharmacy.png' },
    { name: 'Bakery', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'bakery', icon: 'assets/plot-icons/bakery.png' },
    { name: 'Bank', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'atm', icon: 'assets/plot-icons/bank.png' },
    { name: 'Mini Clinic', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'clinic', icon: 'assets/plot-icons/mini clinic.png' },
    { name: 'Laundry', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'laundry', icon: 'assets/plot-icons/laundary (1).png' },
    { name: 'Tailor', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'tailoring', icon: 'assets/plot-icons/tailor (1).png' },
    { name: 'Spa', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'salon', icon: 'assets/plot-icons/spa (1).png' },
    { name: 'PlayStation', classification: 'Commercial', type: 'shop' as PlotType, shopType: 'playstation', icon: 'assets/plot-icons/playstation.png' },
    // Amenities
    { name: 'Park', classification: 'Amenities', type: 'park' as PlotType, shopType: undefined, icon: 'assets/plot-icons/park.png' },
    { name: 'Water Tank', classification: 'Amenities', type: 'watertank' as PlotType, shopType: undefined, icon: 'assets/plot-icons/watertank.png' },
    { name: 'Hospital', classification: 'Amenities', type: 'hospital' as PlotType, shopType: undefined, icon: 'assets/plot-icons/hospital.png' },
    { name: 'Security', classification: 'Amenities', type: 'security' as PlotType, shopType: undefined, icon: 'assets/plot-icons/security.png' },
    { name: 'Community Hall', classification: 'Amenities', type: 'communityHall' as PlotType, shopType: undefined, icon: 'assets/plot-icons/CommunityHall.png' },
    { name: 'Guest House', classification: 'Amenities', type: 'guesthouse' as PlotType, shopType: undefined, icon: 'assets/plot-icons/GuestHouse.png' },
    { name: 'Swimming Pool', classification: 'Amenities', type: 'swimmingPool' as PlotType, shopType: undefined, icon: 'assets/plot-icons/SwimmingPool.png' },
    // Others
    { name: 'Road H', classification: 'Others', type: 'road' as PlotType, shopType: 'h', icon: '' },
    { name: 'Road V', classification: 'Others', type: 'road' as PlotType, shopType: 'v', icon: '' },
    { name: 'Gate', classification: 'Others', type: 'gate' as PlotType, shopType: undefined, icon: '' },
    { name: 'Vacant', classification: 'Others', type: 'vacant' as PlotType, shopType: undefined, icon: 'assets/plot-icons/vacant.png' },
  ];

  // Map sub-classification name from backend → local PlotType + shopType
  private readonly nameToPlotType: Record<string, { type: PlotType; shopType?: string }> = {
    'house': { type: 'house' },
    'villa': { type: 'house' },
    'apartment': { type: 'apartment' },
    'shop': { type: 'shop', shopType: 'shop' },
    'grocery store': { type: 'shop', shopType: 'grocery' },
    'gym': { type: 'shop', shopType: 'gym' },
    'pharmacy': { type: 'shop', shopType: 'pharmacy' },
    'bakery': { type: 'shop', shopType: 'bakery' },
    'bank': { type: 'shop', shopType: 'atm' },
    'mini clinic': { type: 'shop', shopType: 'clinic' },
    'laundry': { type: 'shop', shopType: 'laundry' },
    'tailor': { type: 'shop', shopType: 'tailoring' },
    'spa': { type: 'shop', shopType: 'salon' },
    'playstation': { type: 'shop', shopType: 'playstation' },
    'park': { type: 'park' },
    'water tank': { type: 'watertank' },
    'hospital': { type: 'hospital' },
    'security': { type: 'security' },
    'road h': { type: 'road', shopType: 'h' },
    'road v': { type: 'road', shopType: 'v' },
    'road': { type: 'road', shopType: 'h' },
    'gate': { type: 'gate' as PlotType },
    'vacant': { type: 'vacant' },
    'pg': { type: 'pg' },
    'guesthouse': { type: 'guesthouse' },
    'guest house': { type: 'guesthouse' },
    'guest_house': { type: 'guesthouse' },
  };

  // These items always appear in Residential regardless of backend sub-classifications
  private readonly alwaysResidentialItems = [
    { name: 'Individual Villa', classification: 'Residential', type: 'house' as PlotType, shopType: undefined, icon: 'assets/plot-icons/villa.png' },
    { name: 'Apartment', classification: 'Residential', type: 'apartment' as PlotType, shopType: undefined, icon: 'assets/plot-icons/apartment.png' },
  ];

  // These items always appear in Amenities regardless of backend sub-classifications
  private readonly alwaysAmenitiesItems = [
    { name: 'Park', classification: 'Amenities', type: 'park' as PlotType, shopType: undefined, icon: 'assets/plot-icons/park.png' },
    { name: 'Water Tank', classification: 'Amenities', type: 'watertank' as PlotType, shopType: undefined, icon: 'assets/plot-icons/watertank.png' },
    { name: 'Hospital', classification: 'Amenities', type: 'hospital' as PlotType, shopType: undefined, icon: 'assets/plot-icons/hospital.png' },
    { name: 'Security', classification: 'Amenities', type: 'security' as PlotType, shopType: undefined, icon: 'assets/plot-icons/security.png' },
    { name: 'Community Hall', classification: 'Amenities', type: 'communityHall' as PlotType, shopType: undefined, icon: 'assets/plot-icons/CommunityHall.png' },
    { name: 'Guest House', classification: 'Amenities', type: 'guesthouse' as PlotType, shopType: undefined, icon: 'assets/plot-icons/GuestHouse.png' },
    { name: 'Swimming Pool', classification: 'Amenities', type: 'swimmingPool' as PlotType, shopType: undefined, icon: 'assets/plot-icons/SwimmingPool.png' },
  ];

  // These items always appear in Others regardless of backend sub-classifications
  private readonly alwaysShowItems = [
    { name: 'PG', classification: 'Others', type: 'pg' as PlotType, shopType: undefined, icon: 'assets/plot-icons/apartment.png' },
    { name: 'Road H', classification: 'Others', type: 'road' as PlotType, shopType: 'h', icon: '' },
    { name: 'Road V', classification: 'Others', type: 'road' as PlotType, shopType: 'v', icon: '' },
    { name: 'Gate', classification: 'Others', type: 'gate' as PlotType, shopType: undefined, icon: '' },
    { name: 'Vacant', classification: 'Others', type: 'vacant' as PlotType, shopType: undefined, icon: 'assets/plot-icons/vacant.png' },
  ];

  // Returns sidebar items — from backend if loaded, else hardcoded
  sidebarGroups = computed(() => {
    const subs = this.subClassifications();
    const isPgOnly = this.isPgOnly();
    const isPg = this.isPg();
    let items: { name: string; classification: string; type: PlotType; shopType: string | undefined; icon: string }[];

    if (subs.length > 0) {
      const backendItems = subs.filter((s: any) => s.status === 'ACTIVE').map((s: any) => {
        const key = s.name.toLowerCase().trim();
        const mapped = this.nameToPlotType[key];
        const icon = s.logo ? this.getFullLogoUrl(s.logo) : this.getLocalIcon(s.name);
        const classificationName = s.classificationName || 'Others';

        if (mapped) {
          if (mapped.type === 'road' || (mapped.type as string) === 'gate' || mapped.type === 'vacant') return null;
          return { name: s.name, classification: classificationName, type: mapped.type, shopType: mapped.shopType, icon };
        }

        // Custom (unmapped) sub-classification
        if (classificationName === 'Residential') {
          return { name: s.name, classification: classificationName, type: 'house' as PlotType, shopType: undefined, icon };
        }
        if (classificationName === 'Commercial') {
          return { name: s.name, classification: classificationName, type: 'shop' as PlotType, shopType: key, icon };
        }
        return { name: s.name, classification: classificationName, type: 'park' as PlotType, shopType: undefined, icon };
      }).filter(Boolean) as { name: string; classification: string; type: PlotType; shopType: string | undefined; icon: string }[];

      items = [...backendItems, ...this.alwaysResidentialItems, ...this.alwaysAmenitiesItems, ...this.alwaysShowItems];
    } else {
      // Hardcoded fallback
      items = isPgOnly
        ? this.hardcodedSidebarItems.filter(i => i.classification !== 'Residential' || i.type === 'pg')
        : this.hardcodedSidebarItems;
    }

    // Deduplicate by type+shopType — keep first occurrence (backend items take priority)
    // For house type: always rename to 'Villa' and keep only one entry
    const seen = new Set<string>();
    items = items
      .map(i => i.type === 'house' ? { ...i, name: 'Individual Villa' } : i)
      .filter(i => {
        const key = `${i.type}__${i.shopType ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    // Remove guesthouse entirely from Residential
    items = items.filter(i => i.type !== 'guesthouse');

    // Force amenity types into Amenities classification
    const amenityTypes = new Set(['park', 'watertank', 'hospital', 'security', 'communityHall', 'guesthouse', 'swimmingPool']);
    items = items.map(i => amenityTypes.has(i.type) ? { ...i, classification: 'Amenities' } : i);

    // Force pg into Others
    items = items.map(i => i.type === 'pg' ? { ...i, classification: 'Others' } : i);

    // Ensure all 4 amenity items exist (add missing ones)
    for (const a of this.alwaysAmenitiesItems) {
      if (!items.some(i => i.type === a.type)) items.push(a);
    }

    // For PG_ONLY: only show PG under Residential
    if (isPgOnly) {
      items = items.filter(i => i.classification !== 'Residential' || i.type === 'pg');
    }

    // Group by classification
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const cls = item.classification;
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(item);
    }
    // Return in order: Residential, Commercial, Amenities, Others, then any extras
    const order = ['Residential', 'Commercial', 'Amenities', 'PG', 'Others'];
    const result: { classification: string; items: typeof items }[] = [];
    for (const cls of order) {
      if (groups[cls]?.length) result.push({ classification: cls, items: groups[cls] });
    }
    for (const cls of Object.keys(groups)) {
      if (!order.includes(cls)) result.push({ classification: cls, items: groups[cls] });
    }
    return result;
  });

  classificationOpenMap = signal<Record<string, boolean>>({ Residential: true, Commercial: true, Amenities: true, Others: true });

  toggleClassificationGroup(name: string) {
    this.classificationOpenMap.update(m => ({ ...m, [name]: !m[name] }));
  }

  isClassificationOpen(name: string): boolean {
    const m = this.classificationOpenMap();
    return m[name] !== false; // default open
  }

  getLocalIcon(name: string): string {
    const key = name.toLowerCase().trim();

    // Icon mapping with fallback logic
    const iconMap: Record<string, string> = {
      'house': 'villa.png',
      'villa': 'villa.png',
      'apartment': 'apartment.png',
      'shop': 'shop.png',
      'grocery store': 'grosary.png',
      'gym': 'gym.png',
      'pharmacy': 'pharmacy.png',
      'bakery': 'bakery.png',
      'bank': 'bank.png',
      'mini clinic': 'mini clinic.png',
      'laundry': 'laundary (1).png',
      'tailor': 'tailor (1).png',
      'spa': 'spa (1).png',
      'playstation': 'playstation.png',
      'park': 'park.png',
      'water tank': 'watertank.png',
      'security': 'security.png',
      'vacant': 'vacant.png',
      'hospital': 'hospital.png',
      'pg': 'apartment.png',
      'guesthouse': 'GuestHouse.png',
      'guest house': 'GuestHouse.png',
      'guest_house': 'GuestHouse.png',
      'communityhall': 'CommunityHall.png',
      'community hall': 'CommunityHall.png',
      'swimmingpool': 'SwimmingPool.png',
      'swimming pool': 'SwimmingPool.png',
    };

    // Return mapped icon or default to vacant
    const iconFile = iconMap[key] || 'vacant.png';
    return `assets/plot-icons/${iconFile}`;
  }

  // ── REPLACE CONFIRM DIALOG ──────────────────────────
  replaceConfirm = signal<{ existingName: string; newName: string; onYes: () => void } | null>(null);

  private getDisplayName(plot: PlotData | null | undefined): string {
    if (!plot) return 'building';
    if (plot.name) return plot.name;
    const map: Record<string, string> = {
      house: 'House', apartment: 'Apartment', shop: 'Shop', park: 'Park',
      hospital: 'Hospital', watertank: 'Water Tank', security: 'Security', gym: 'Gym'
    };
    return map[plot.type] || plot.type;
  }

  private isOccupied(plot: PlotData | null | undefined): boolean {
    if (!plot) return false;
    return plot.type !== 'vacant' && plot.type !== 'road' && !!plot.type;
  }

  applySidebarItem(item: { type: PlotType; shopType?: string; name: string }) {
    const key = this.selectedKey();
    if (!key) return;
    if (item.type === 'vacant') {
      const plot = this.plots()[key];
      const half = this.selectedHalf();
      const targetData = (plot?.splitDirection && half) ? plot.splitData?.[half] : plot;
      if (!this.isOccupied(targetData)) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'This plot is already vacant', showConfirmButton: false, timer: 3000, timerProgressBar: true });
        return;
      }
      this.clearPlot(key);
      return;
    }
    if ((item.type as string) === 'gate') { this.openGatePicker(key); return; }
    if (item.type === 'road') { this.setPlotType(key, 'road', item.shopType as 'h' | 'v'); return; }

    const plot = this.plots()[key];
    const half = this.selectedHalf();
    const targetData = (plot?.splitDirection && half) ? plot.splitData?.[half] : plot;

    if (item.type === 'apartment' || item.type === 'pg') {
      if (this.isOccupied(targetData)) {
        this.replaceConfirm.set({
          existingName: this.getDisplayName(targetData),
          newName: item.type === 'apartment' ? 'Apartment' : 'PG Building',
          onYes: () => { this.replaceConfirm.set(null); this.isAptModalOpen = true; }
        });
      } else {
        this.isAptModalOpen = true;
      }
      return;
    }

    const doApply = () => {
      this.stateService.saveState();
      this.stateService.updatePlot(key, {
        type: item.type,
        shopType: item.shopType,
        name: item.name,
        residents: targetData?.residents || [],
        price: item.type === 'house' ? 6000 : undefined,
        sqft: item.type === 'house' ? 1200 : undefined,
      } as any);
      this.saveLayoutToBackend(key);
      this.replaceConfirm.set(null);
    };

    if (this.isOccupied(targetData)) {
      const isSameAssignment =
        targetData?.type === item.type &&
        (targetData?.shopType ?? '') === (item.shopType ?? '');
      if (isSameAssignment) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `"${item.name}" is already assigned to this plot`, showConfirmButton: false, timer: 3000, timerProgressBar: true });
        return;
      }
      this.replaceConfirm.set({
        existingName: this.getDisplayName(targetData),
        newName: item.name,
        onYes: doApply
      });
    } else {
      doApply();
    }
  }

  constructor(private stateService: StateService, public router: Router, private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {
    effect(() => {
      const key = this.selectedKey();
      if (!key) this.selectedPlotBookings.set([]);
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    document.body.classList.add('light-theme');
    this.layoutType.set(this.auth.getLayoutType());
    this.loadFromBackend();
    this.loadSubClassifications();
  }

  loadFromBackend() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) { this.loadEmptyLayout(); return; }

    // Load project id and layout type
    this.api.getProject(companyId).subscribe({
      next: (res: any) => {
        if (res.data?.id) this.projectId.set(String(res.data.id));
        else this.projectId.set('');
        if (res.data?.companyLayoutType) this.layoutType.set((res.data.companyLayoutType as string).toUpperCase());
        this.auth.updateUser({ layoutType: res.data?.companyLayoutType || '' });
      },
      error: () => { }
    });

    // Step 1: Load meta only (fast — no plots)
    this.api.getLayoutMeta(companyId).subscribe({
      next: (res: any) => {
        const meta = res.data || {};
        const H = meta.global?.H ?? meta.hStreets ?? 2;
        const V = meta.global?.V ?? meta.vStreets ?? 2;
        const PSB = meta.global?.PSB ?? meta.plotsPerBlock ?? 2;
        this.hStreets.set(H);
        this.vStreets.set(V);
        this.plotsPerBlock.set(PSB);
        
        // Restore compass direction from metadata
        const projectMeta = meta.projectMeta || {};
        const savedCompassDirection = projectMeta.compassDirection || 'N';
        this.compassDirection.set(savedCompassDirection as 'N' | 'E' | 'S' | 'W');

        // Also restore layout rotation based on compass direction
        const rotationMap: Record<string, number> = { N: 0, E: 90, S: 180, W: 270 };
        this.layoutRotation.set(rotationMap[savedCompassDirection] || 0);
        
        // Update state with restored projectMeta
        this.stateService.state.update(s => ({
          ...s,
          hStreets: H, vStreets: V, plotsPerBlock: PSB,
          mergeGroups: meta.mergeGroups || [],
          hStreetNames: meta.hStreetNames || s.hStreetNames,
          vStreetNames: meta.vStreetNames || s.vStreetNames,
          projectMeta,
          blockOverrides: meta.blockOverrides || {}
        }));

        // Step 2: Load plots separately
        this.api.getLayoutPlots(companyId).subscribe({
          next: (plotsRes: any) => {
            const allPlots: Record<string, any> = plotsRes.data || {};
            // Filter out stale plot keys that don't belong to the current grid
            const validPlots: Record<string, any> = {};
            const staleKeys: string[] = [];
            for (const key of Object.keys(allPlots)) {
              if (this.isValidPlotKey(key, H, V, PSB)) {
                validPlots[key] = allPlots[key];
              } else {
                staleKeys.push(key);
              }
            }
            // Delete stale plots from backend silently
            staleKeys.forEach(k => this.api.deletePlot(companyId, k).subscribe());
            this.stateService.state.update(s => ({ ...s, plots: validPlots }));
            
            // Step 3: Load all bookings for all plots on page load
            const pid = this.projectId();
            if (pid) {
              this.api.getLayoutCustomersAll(pid).subscribe({
                next: (custRes: any) => {
                  const allBookings = custRes.data || [];
                  // Pre-populate bookings for all plots that have them
                  Object.keys(validPlots).forEach(key => {
                    const plotBookings = allBookings.filter((b: any) => b.plotId === key || b.plotId?.startsWith(key + '_'));
                    if (plotBookings.length > 0) {
                      // Store bookings in a cache for quick access
                      (this as any)._plotBookingsCache = (this as any)._plotBookingsCache || {};
                      (this as any)._plotBookingsCache[key] = plotBookings;
                    }
                  });
                  console.log('✅ Layout loaded with all bookings cached');
                },
                error: () => console.log('⚠️ Failed to load bookings on page load')
              });
            }
            
            console.log('✅ Layout loaded successfully with compass direction:', this.compassDirection());
          },
          error: () => { }
        });
      },
      error: () => this.loadEmptyLayout()
    });
  }

  loadEmptyLayout() {
    const H = 2, V = 2, PSB = 2;
    this.hStreets.set(H);
    this.vStreets.set(V);
    this.plotsPerBlock.set(PSB);
    this.stateService.state.update(s => ({
      ...s,
      plots: {},
      hStreets: H,
      vStreets: V,
      plotsPerBlock: PSB,
      mergeGroups: []
    }));
  }

  loadSubClassifications() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    this.api.getSubClassifications(companyId).subscribe({
      next: (res: any) => this.subClassifications.set(res.data || []),
      error: () => { }
    });
  }

  // Add sub-classification
  isAddSubClassOpen = signal(false);
  newSubClassName = signal('');
  newSubClassClassification = signal('Residential');
  newSubClassIconFile = signal<File | null>(null);
  newSubClassIconPreview = signal<string>('');
  readonly classificationOptions = ['Residential', 'Commercial', 'Others'];

  openAddSubClass() {
    this.newSubClassName.set('');
    this.newSubClassClassification.set('Residential');
    this.newSubClassIconFile.set(null);
    this.newSubClassIconPreview.set('');
    this.isAddSubClassOpen.set(true);
  }

  onNewSubClassIcon(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.newSubClassIconFile.set(file);
    const reader = new FileReader();
    reader.onload = (e: any) => this.newSubClassIconPreview.set(e.target.result);
    reader.readAsDataURL(file);
  }

  saveNewSubClass() {
    const name = this.newSubClassName().trim();
    const classification = this.newSubClassClassification();
    const companyId = this.auth.getCompanyId();
    if (!name || !companyId) return;
    this.api.createSubClassification(companyId, name, classification, this.newSubClassIconFile() ?? undefined).subscribe({
      next: () => { this.loadSubClassifications(); this.isAddSubClassOpen.set(false); },
      error: () => { }
    });
  }

  openCustomizeSubClass() {
    this.isCustomizeSubClassOpen.set(true);
    this.editingSubClass.set(null);
    this.editSubClassName.set('');
  }

  startEditSubClass(sc: any) {
    this.editingSubClass.set(sc);
    this.editSubClassName.set(sc.name);
  }

  saveEditSubClass() {
    const sc = this.editingSubClass();
    const companyId = this.auth.getCompanyId();
    if (!sc || !companyId || !this.editSubClassName().trim()) return;
    this.api.updateSubClassification(sc.id, companyId, this.editSubClassName().trim()).subscribe({
      next: () => {
        this.loadSubClassifications();
        this.editingSubClass.set(null);
        this.editSubClassName.set('');
      },
      error: () => { }
    });
  }

  deleteSubClass(sc: any) {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    this.api.deleteSubClassification(sc.id, companyId).subscribe({
      next: () => this.loadSubClassifications(),
      error: () => { }
    });
  }

  toggleSubClassStatus(sc: any) {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    this.api.toggleSubClassificationStatus(sc.id, companyId).subscribe({
      next: () => this.loadSubClassifications(),
      error: () => { }
    });
  }

  saveLayoutToBackend(changedKey?: string, plotDataOverride?: any) {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;

    const s = this.stateService.state();
    const projectMeta = { ...s.projectMeta, compassDirection: this.compassDirection() };
    const meta = {
      global: { H: this.hStreets(), V: this.vStreets(), PSB: this.plotsPerBlock() },
      hStreetNames: s.hStreetNames,
      vStreetNames: s.vStreetNames,
      projectMeta,
      mergeGroups: s.mergeGroups,
      blockOverrides: s.blockOverrides
    };

    if (changedKey) {
      // Use the override if provided (avoids potential stale snapshot), else read from state
      const plot = plotDataOverride !== undefined ? plotDataOverride : s.plots[changedKey];
      if (plot) {
        this.api.savePlot(companyId, changedKey, plot).subscribe();
      } else {
        this.api.deletePlot(companyId, changedKey).subscribe();
      }
      // Debounce meta save separately
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.api.saveLayoutMeta(companyId, meta).subscribe();
      }, 1500);
    } else {
      // Bulk save (reset/generate) — debounced
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.api.saveLayout(companyId, {
          global: { H: this.hStreets(), V: this.vStreets(), PSB: this.plotsPerBlock() },
          hStreetNames: s.hStreetNames,
          vStreetNames: s.vStreetNames,
          projectMeta,
          mergeGroups: s.mergeGroups,
          blockOverrides: s.blockOverrides,
          plots: s.plots
        }).subscribe();
      }, 800);
    }
  }

  async downloadFullPDF() {
    try {
      const jspdfMod: any = await import('jspdf');
      const atMod: any = await import('jspdf-autotable');
      const JsPDF = jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF ?? jspdfMod.default;
      const doc = new JsPDF('l', 'mm', 'a4');
      const atFn = atMod.default ?? atMod.autoTable;
      const autoTable = (opts: any) => typeof atFn === 'function' && atFn.length >= 2 ? atFn(doc, opts) : atFn(opts);
      const docWithTable = (doc as any);
      const companyId = this.auth.getCompanyId();

      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('RESIDENT LEDGER REPORT', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Project ID: ${this.projectId() || 'N/A'}`, 14, 30);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);

      const tableData: any[] = [];
      Object.entries(this.plots()).forEach(([key, plot]) => {
        if (plot.residents && plot.residents.length > 0) {
          plot.residents.forEach(res => {
            tableData.push([
              key,
              plot.name || plot.type,
              res.name,
              res.phone,
              res.role,
              res.unit || '—',
              res.paymentType || '—',
              res.foodNeeded ? 'Yes' : 'No'
            ]);
          });
        }
      });

      if (tableData.length === 0) {
        alert('No active residents found in the layout.');
        return;
      }

      autoTable({
        startY: 45,
        head: [['Plot Key', 'Plot Name', 'Name', 'Phone', 'Role', 'Unit', 'Payment', 'Food']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { top: 45 }
      });

      doc.save(`Layout_Residents_${new Date().getTime()}.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
      alert('PDF generation failed. Check console for details.');
    }
  }

  async downloadPlotPDF(key: string) {
    const plot = this.plots()[key];
    if (!plot || !plot.residents?.length) { alert('This plot has no residents to export.'); return; }
    try {
      const jspdfMod: any = await import('jspdf');
      const atMod: any = await import('jspdf-autotable');
      const JsPDF = jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF ?? jspdfMod.default;
      const doc = new JsPDF();
      const atFn = atMod.default ?? atMod.autoTable;
      const autoTable = (opts: any) => typeof atFn === 'function' && atFn.length >= 2 ? atFn(doc, opts) : atFn(opts);
      const docWithTable = (doc as any);

      doc.setFontSize(16);
      doc.text(`RESIDENT REPORT: ${plot.name || key}`, 14, 20);

      const tableData = plot.residents.map((res: any) => [
        res.name || '',
        res.phone || '',
        res.role || '',
        res.unit || '—',
        res.paymentType || '—'
      ]);

      autoTable({
        startY: 30,
        head: [['Name', 'Phone', 'Role', 'Unit', 'Payment']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233] }
      });

      doc.save(`Plot_${key}_Residents.pdf`);
    } catch (e) {
      console.error('PDF error', e);
      alert('PDF generation failed. Check console for details.');
    }
  }

  onBookingSaved() {
    const key = this.selectedKey();
    if (!key) return;
    
    // Load fresh bookings from backend
    this.loadBookings(key, bookings => {
      // Close modal AFTER bookings are loaded
      this.isCustomerModalOpen.set(false);
      
      if (bookings.length > 0) {
        // Sync sqft from the saved booking back into PlotData so the popup shows the updated value
        const latestBooking = bookings.find(b => b.plotId === key) || bookings[0];
        const newSqft = latestBooking?.sqFeet ? +latestBooking.sqFeet : undefined;
        const currentPlot = this.plots()[key];
        if (newSqft && newSqft !== currentPlot?.sqft) {
          this.updateSqft(key, newSqft);
        }
        // Read plot again after potential sqft update
        const plot = { ...(this.plots()[key] || currentPlot), ...(newSqft ? { sqft: newSqft } : {}) };

        // Update swalConfig with fresh data
        this.swalConfig.set({ key, plot, bookings });
        
        // Reopen Swal with updated data
        setTimeout(() => {
          this.showUnifiedPlotSwal(key, plot, bookings);
        }, 150);
      }
    });
  }

  openCustomerModal(key: string) {
    const plot = this.plots()[key];
    this.customerModalData.set({
      plotId: key,
      plotName: plot?.name || key,
      projectId: this.projectId() || '',
      plotType: plot?.type || '',
      sqft: plot?.sqft,
      aptConfig: plot?.aptConfig,
      mode: 'new'
    });
    this.isCustomerModalOpen.set(true);
  }

  // View detailed resident profile card
  viewResidentProfile(res: any) {
    const name = res.customerName || res.name || 'Resident';
    const initial = name.charAt(0).toUpperCase();
    const role = (res.customerType || res.role || 'TENANT').toUpperCase();

    // Check if we should show food details (always for PG, conditional for Apartment)
    const plot = this.plots()[this.selectedKey() || ''];
    const plotName = (plot?.name || '').toLowerCase();
    const plotType = plot?.type || '';
    const showFood = plotType === 'pg' || (plotType === 'apartment' && plotName.includes('pg'));

    Swal.fire({
      html: `
        <div class="text-left">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-2xl font-black text-white shadow-xl">
              ${initial}
            </div>
            <div>
              <h3 class="text-xl font-black text-slate-900 leading-tight mb-1">${name}</h3>
              <span class="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
                ${role}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">📞 Contact Number</div>
              <div class="text-xs font-bold text-slate-900">${res.customerMobile || res.phone || '—'}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">✉️ Email Address</div>
              <div class="text-xs font-bold text-slate-900 truncate">${res.customerEmail || res.email || '—'}</div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-100/60">
              <div class="flex items-center gap-3">
                <span class="text-lg">💳</span>
                <div>
                  <div class="text-[9px] font-black uppercase tracking-widest text-emerald-700">Payment Status</div>
                  <div class="text-[10px] font-bold text-emerald-900">${res.paymentType || 'Not Selected'}</div>
                </div>
              </div>
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            ${showFood ? `
            <div class="flex items-center justify-between p-3 rounded-2xl ${res.foodNeeded ? 'bg-orange-50 border-orange-100/60' : 'bg-slate-50 border-slate-100'}">
              <div class="flex items-center gap-3">
                <span class="text-lg">${res.foodNeeded ? '🍱' : '🚫'}</span>
                <div>
                  <div class="text-[9px] font-black uppercase tracking-widest ${res.foodNeeded ? 'text-orange-700' : 'text-slate-400'}">Food Preference</div>
                  <div class="text-[10px] font-bold ${res.foodNeeded ? 'text-orange-900' : 'text-slate-500'}">
                    ${res.foodNeeded ? 'Menu Option Opt-in' : 'Direct Dining Only'}
                  </div>
                </div>
              </div>
            </div>
            ` : ''}

            ${res.unit ? `
            <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 text-white border border-slate-800">
              <span class="text-lg">📍</span>
              <div>
                <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">Allocated Unit</div>
                <div class="text-[10px] font-bold">Room/Flat: ${res.unit}</div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'CLOSE PROFILE',
      confirmButtonColor: '#0f172a',
      width: '400px',
      padding: '24px',
      background: '#ffffff',
      customClass: {
        confirmButton: 'rounded-2xl px-8 py-4 text-[11px] font-black uppercase tracking-widest shadow-xl border-none',
        popup: 'rounded-[32px]'
      }
    });
  }

  openVacateConfirm(key: string) {
    const pid = this.projectId();
    const plot = this.plots()[key];
    this.customerModalData.set({
      plotId: key,
      plotName: plot?.name || key,
      projectId: pid || '',
      plotType: plot?.type || '',
      sqft: plot?.sqft,
      vacateMode: true
    });
    this.isCustomerModalOpen.set(true);
  }

  loadHardcodedJson() {
    const H = 2, V = 2, PSB = 2;
    const plots: Record<string, PlotData> = {};
    const k = (r: number, c: number, pr: number, pc: number) => `r${r}c${c}pr${pr}pc${pc}`;
    for (let r = 0; r <= H; r++) {
      for (let c = 0; c <= V; c++) {
        for (let pr = 0; pr < PSB; pr++) {
          for (let pc = 0; pc < PSB; pc++) {
            const key = k(r, c, pr, pc);
            if (r === 0 && c === 0) {
              plots[key] = { type: 'apartment', name: `MACS Tower ${String.fromCharCode(65 + pr * PSB + pc)}`, residents: [], aptConfig: { floors: 12, unitsPerFloor: 6, blockName: `Tower ${String.fromCharCode(65 + pr * PSB + pc)}`, facilities: ['GYM', 'SWIMMING POOL'], defaultBhk: '3 BHK', unitNames: { '1A': 'PENTHOUSE-01' } } };
            } else if (r === 0 && c === 1) {
              plots[key] = { type: 'house', name: `Signature Villa #${(pr * PSB + pc + 1).toString().padStart(3, '0')}`, price: 32000000, sqft: 4200, residents: [] };
            } else if (r === 1 && c === 0) {
              plots[key] = pr === 1 ? { type: 'watertank', name: 'MAIN WATER RESERVOIR', residents: [] } : { type: 'park', name: 'GREEN ZONE ' + (pr * PSB + pc), residents: [] };
            } else if (r === 1 && c === 1) {
              const shop = this.shopOptions[(pr * PSB + pc) % this.shopOptions.length];
              plots[key] = { type: 'shop', shopType: shop.value, name: `MACS ${shop.label}`, residents: [] };
            } else {
              plots[key] = (pr + pc) % 2 === 0 ? { type: 'house', name: `Villa ${r}${c}-${pr}${pc}`, price: 18000000, sqft: 2400, residents: [] } : { type: 'park', name: 'COMMUNITY PARK', residents: [] };
            }
          }
        }
      }
    }
    this.hStreets.set(H);
    this.vStreets.set(V);
    this.plotsPerBlock.set(PSB);
    this.stateService.state.update(s => ({ ...s, plots, hStreets: H, vStreets: V, plotsPerBlock: PSB }));
    this.stateService.saveState();
  }

  @HostListener('document:click')
  closeDetailOnOutside() { }

  onPlotRightClick(event: MouseEvent, key: string, data: PlotData) {
    event.preventDefault();
    event.stopPropagation();

    // Ensure we target the primary cell if it's a merged block
    const group = this.getMergeGroupOf(key);
    const targetKey = group ? group[0] : key;

    this.contextMenuKey = targetKey;
    this.contextMenuPos = { x: event.clientX, y: event.clientY };
    this.isContextMenuOpen.set(true);
  }

  openRenameModal() {
    const plot = this.plots()[this.contextMenuKey];
    this.renameValue = plot?.name || '';
    this.isRenameModalOpen.set(true);
    this.isContextMenuOpen.set(false);
  }

  saveRename() {
    if (this.contextMenuKey) {
      this.stateService.saveState();
      this.stateService.updatePlot(this.contextMenuKey, { name: this.renameValue });
      this.saveLayoutToBackend(this.contextMenuKey);
    }
    this.isRenameModalOpen.set(false);
  }

  openResidentModal() {
    this.stateService.selectPlot(this.contextMenuKey);
    this.resModalRole = 'owner';
    this.isResModalOpen = true;
    this.isContextMenuOpen.set(false);
  }

  getResident(data: PlotData | null | undefined, role: 'owner' | 'tenant'): Resident | undefined {
    return data?.residents?.find(r => r.role === role);
  }

  generateLayout() {
    this.stateService.saveState();
    this.stateService.selectPlot(null);
    this.stateService.state.update(s => ({ ...s, plots: {} }));
  }

  resetLayout() {
    Swal.fire({
      title: '⚠️ Reset Entire Layout?',
      html: `
        <div style="text-align:left; font-family:'Inter',sans-serif; padding: 4px 0;">
          <p style="margin:0 0 12px 0; font-size:14px; color:#334155; line-height:1.6;">
            This will <strong style="color:#ef4444;">permanently delete</strong> all plot data including:
          </p>
          <ul style="margin:0 0 12px 0; padding-left:20px; font-size:13px; color:#64748b; line-height:2;">
            <li>All plot assignments (houses, apartments, shops, etc.)</li>
            <li>All resident &amp; customer records</li>
            <li>All merge groups and split configurations</li>
            <li>All data saved in the database</li>
          </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '🗑️ Yes, Reset Everything',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      width: '480px',
      customClass: { popup: 'rounded-[24px]' }
    }).then(result => {
      if (!result.isConfirmed) return;

      const companyId = this.auth.getCompanyId();

      // Clear local state immediately
      this.stateService.saveState();
      this.stateService.state.update(s => ({ ...s, plots: {}, selectedKey: null, mergeGroups: [] }));
      this.selectedPlotBookings.set([]);

      // Delete all data from the database
      if (companyId) {
        this.api.resetLayout(companyId).subscribe({
          next: () => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: 'Layout reset successfully',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });
          },
          error: () => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'error',
              title: 'DB reset failed — local state cleared only',
              showConfirmButton: false,
              timer: 4000,
              timerProgressBar: true
            });
          }
        });
      }
    });
  }

  undo() { this.stateService.undo(); }
  redo() { this.stateService.redo(); }

  canUndo = computed(() => this.stateService.undoStack().length > 0);
  canRedo = computed(() => this.stateService.redoStack().length > 0);

  setPlotType(key: string, type: PlotType, direction?: 'h' | 'v') {
    if (type === 'apartment') { this.isAptModalOpen = true; return; }
    const plot = this.plots()[key];
    const half = this.selectedHalf();
    const targetData = (plot?.splitDirection && half) ? plot.splitData?.[half] : plot;
    const group = this.getMergeGroupOf(key);
    const isMerged = !!group;
    const displayName = isMerged ? `Merged ${type.charAt(0).toUpperCase() + type.slice(1)}` :
      (type === 'house' ? (half ? `${half.toUpperCase()} House ${key.replace('r', '').replace('c', '-').replace('pr', '-').replace('pc', '-')}` : `House ${key.replace('r', '').replace('c', '-').replace('pr', '-').replace('pc', '-')}`) : undefined);

    const doSet = () => {
      this.stateService.saveState();
      this.stateService.updatePlot(key, {
        type, residents: type === 'road' ? [] : (targetData?.residents || []),
        price: type === 'house' ? 6000 : undefined,
        sqft: type === 'house' ? 1200 : (isMerged ? 2400 : undefined),
        name: displayName, roadDirection: type === 'road' ? direction : undefined
      } as any);
      this.saveLayoutToBackend(key);
      this.replaceConfirm.set(null);
    };

    if (type !== 'road' && type !== 'vacant' && this.isOccupied(targetData)) {
      if (targetData?.type === type) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `"${this.getDisplayName(targetData)}" is already assigned to this plot`, showConfirmButton: false, timer: 3000, timerProgressBar: true });
        return;
      }
      this.replaceConfirm.set({
        existingName: this.getDisplayName(targetData),
        newName: type.charAt(0).toUpperCase() + type.slice(1),
        onYes: doSet
      });
    } else {
      doSet();
    }
  }

  updateCellName(key: string, event: { half: 'a' | 'b' | null, name: string }) {
    this.stateService.saveState();
    if (event.half) {
      const plot = this.plots()[key];
      if (plot?.splitDirection) {
        const splitData = { ...plot.splitData! };
        splitData[event.half] = { ...splitData[event.half], name: event.name };
        this.stateService.state.update(s => ({ ...s, plots: { ...s.plots, [key]: { ...plot, splitData } } }));
      }
    } else {
      this.stateService.updatePlot(key, { name: event.name });
    }
    this.saveLayoutToBackend(key);
  }

  updatePlotDetails(key: string, updates: Partial<PlotData>) {
    const existingPlot = this.plots()[key] || {};
    const mergedPlot = { ...existingPlot, ...updates };
    this.stateService.updatePlot(key, updates);
    // Pass merged plot directly to guarantee fresh data is persisted
    this.saveLayoutToBackend(key, mergedPlot);
  }

  updateSecurityGuard(key: string, field: 'name' | 'phone', value: string) {
    const plot = this.plots()[key];
    if (!plot) return;
    const residents = plot.residents?.length
      ? [...plot.residents]
      : [{ name: '', phone: '', role: 'owner' as const }];
    residents[0] = { ...residents[0], [field]: value };
    const updatedPlot = { ...plot, residents };
    this.stateService.updatePlot(key, { residents });
    this.saveLayoutToBackend(key, updatedPlot);
  }

  updateSqft(key: string, sqft: number) {
    this.stateService.saveState();
    const existingPlot = this.plots()[key] || {};
    const updatedPlot = { ...existingPlot, sqft };
    this.stateService.updatePlot(key, { sqft });
    this.saveLayoutToBackend(key, updatedPlot);
  }

  handleAptConfirm(config: AptConfig) {
    const key = this.selectedKey();
    if (!key) return;
    this.stateService.saveState();

    const existingPlot = this.plots()[key];
    const isMerged = !!this.getMergeGroupOf(key);
    const existingName = existingPlot?.name;
    const isPg = existingPlot?.type === 'pg';
    
    const typeLabel = isPg ? 'PG' : 'Apartment';
    const autoName = config.blockName?.trim() || existingName ||
      (typeLabel + ' ' + key.replace('r', '').replace('c', '-').replace('pr', '-').replace('pc', '-'));
    
    const updatedPlot: any = {
      ...(existingPlot || {}),
      type: isPg ? 'pg' : 'apartment',
      aptConfig: config,
      residents: existingPlot?.residents || [],
      name: isMerged ? `Merged ${typeLabel}` : autoName
    };

    this.stateService.updatePlot(key, updatedPlot);
    this.isAptModalOpen = false;
    // Pass the constructed plot directly to guarantee fresh data is saved (not a stale state snapshot)
    this.saveLayoutToBackend(key, updatedPlot);

    // Auto-create parking floors for this apartment/pg
    this.autoCreateParkingFloors(key, autoName, config);
  }

  private async autoCreateParkingFloors(plotKey: string, aptName: string, config: AptConfig) {
    try {
      const companyId = this.auth.getCompanyId();
      if (!companyId) return;

      // Calculate total floors including ground floor
      const totalFloors = config.floors + 1;

      // Calculate parking floors: 1 floor per 4 residential floors (minimum 1)
      const parkingFloorsCount = Math.max(1, Math.ceil(totalFloors / 4));

      // Calculate parking spots per floor based on units
      const totalUnits = config.floors * config.unitsPerFloor;
      const totalParkingSpots = Math.ceil(totalUnits * 1.5);
      const spotsPerFloor = Math.ceil(totalParkingSpots / parkingFloorsCount);

      // Calculate optimal grid dimensions using square root
      const cols = Math.ceil(Math.sqrt(spotsPerFloor));
      const rows = Math.ceil(spotsPerFloor / cols);

      // Generate grid once (reuse for all floors)
      const gridTemplate = this.generateParkingGrid(rows, cols);

      // Create all floor data objects
      const floorDataArray = Array.from({ length: parkingFloorsCount }, (_, i) => ({
        id: `floor-${Date.now()}-${i}`,
        name: parkingFloorsCount === 1 ? `${aptName} - Parking` : `${aptName} - P${i + 1}`,
        rows,
        cols,
        grid: JSON.parse(JSON.stringify(gridTemplate)),
        color: '#6366f1',
        icon: 'Layers',
        projectType: 'residential' as const,
        isActive: true,
        apartmentId: plotKey
      }));

      // Execute all API calls in parallel
      await Promise.all(floorDataArray.map(floorData =>
        this.api.saveParkingFloor(companyId, floorData).toPromise()
      ));

      console.log(`✅ Auto-created ${parkingFloorsCount} parking floor(s) for ${aptName}`);
    } catch (error) {
      console.error('Failed to auto-create parking floors:', error);
    }
  }

  private generateParkingGrid(rows: number, cols: number): any[][] {
    const grid: any[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: any[] = [];
      for (let c = 0; c < cols; c++) {
        const label = `${String.fromCharCode(65 + r)}${c + 1}`;
        row.push({
          id: `${r}-${c}`,
          type: 'parking',
          categoryId: 'general',
          occupied: false,
          label,
          row: r,
          col: c
        });
      }
      grid.push(row);
    }
    return grid;
  }

  handleResSave(resident: Resident) {
    const key = this.selectedKey();
    if (!key) return;
    this.stateService.saveState();
    this.stateService.addResident(key, resident);
    this.isResModalOpen = false;
    this.saveLayoutToBackend(key);
  }

  deleteResident(key: string, idx: number) {
    const plot = this.plots()[key];
    if (!plot) return;
    this.stateService.saveState();
    const newResidents = [...plot.residents];
    newResidents.splice(idx, 1);
    this.stateService.updatePlot(key, { residents: newResidents });
  }

  fillBlockWithParks() { this.fillBlockWithType('park'); }
  fillBlockWithRoads() { this.fillBlockWithType('road'); }

  private fillBlockWithType(type: PlotType) {
    const key = this.selectedKey();
    if (!key) return;
    const match = key.match(/r(\d+)c(\d+)/);
    if (!match) return;
    this.stateService.saveState();
    const r = match[1], c = match[2];
    for (let pr = 0; pr < this.plotsPerBlock(); pr++)
      for (let pc = 0; pc < this.plotsPerBlock(); pc++)
        this.stateService.updatePlot(`r${r}c${c}pr${pr}pc${pc}`, { type, residents: [] });
    this.saveLayoutToBackend();
  }

  addMiddleRoadsToSelectedBlock() {
    const key = this.selectedKey();
    if (!key) return;
    const match = key.match(/r(\d+)c(\d+)/);
    if (!match) return;
    this.stateService.saveState();
    const r = parseInt(match[1]), c = parseInt(match[2]);
    const mid = Math.floor(this.plotsPerBlock() / 2);
    for (let pr = 0; pr < this.plotsPerBlock(); pr++)
      this.stateService.updatePlot(`r${r}c${c}pr${pr}pc${mid}`, { type: 'road', residents: [], roadDirection: 'v' });
    for (let pc = 0; pc < this.plotsPerBlock(); pc++)
      this.stateService.updatePlot(`r${r}c${c}pr${mid}pc${pc}`, { type: 'road', residents: [], roadDirection: 'h' });
    this.saveLayoutToBackend();
  }

  fillRowWithRoads() {
    const key = this.selectedKey();
    if (!key) return;
    const match = key.match(/r(\d+)c(\d+)pr(\d+)pc(\d+)/);
    if (!match) return;
    this.stateService.saveState();
    const r = match[1], pr = match[3];
    for (let c = 0; c <= this.vStreets(); c++)
      for (let pc = 0; pc < this.plotsPerBlock(); pc++)
        this.stateService.updatePlot(`r${r}c${c}pr${pr}pc${pc}`, { type: 'road', residents: [], roadDirection: 'h' });
    this.saveLayoutToBackend();
  }

  fillColWithRoads() {
    const key = this.selectedKey();
    if (!key) return;
    const match = key.match(/r(\d+)c(\d+)pr(\d+)pc(\d+)/);
    if (!match) return;
    this.stateService.saveState();
    const c = match[2], pc = match[4];
    for (let r = 0; r <= this.hStreets(); r++)
      for (let pr = 0; pr < this.plotsPerBlock(); pr++)
        this.stateService.updatePlot(`r${r}c${c}pr${pr}pc${pc}`, { type: 'road', residents: [], roadDirection: 'v' });
    this.saveLayoutToBackend();
  }

  fillCrossWithRoads() { this.fillRowWithRoads(); this.fillColWithRoads(); }

  fillRowWithHouse() {
    const key = this.selectedKey();
    if (!key) return;
    const match = key.match(/r(\d+)c(\d+)pr(\d+)pc(\d+)/);
    if (!match) return;
    this.stateService.saveState();
    const r = match[1], pr = match[3];
    for (let c = 0; c <= this.vStreets(); c++)
      for (let pc = 0; pc < this.plotsPerBlock(); pc++) {
        const targetKey = `r${r}c${c}pr${pr}pc${pc}`;
        this.stateService.updatePlot(targetKey, { type: 'house', name: `House ${r}${c}-${pr}${pc}`, price: 6000, sqft: 1200, residents: [] });
      }
    this.saveLayoutToBackend();
  }

  fillColWithHouse() {
    const key = this.selectedKey();
    if (!key) return;
    const match = key.match(/r(\d+)c(\d+)pr(\d+)pc(\d+)/);
    if (!match) return;
    this.stateService.saveState();
    const c = match[2], pc = match[4];
    for (let r = 0; r <= this.hStreets(); r++)
      for (let pr = 0; pr < this.plotsPerBlock(); pr++) {
        const targetKey = `r${r}c${c}pr${pr}pc${pc}`;
        this.stateService.updatePlot(targetKey, { type: 'house', name: `House ${r}${c}-${pr}${pc}`, price: 6000, sqft: 1200, residents: [] });
      }
    this.saveLayoutToBackend();
  }

  addMiddleRoadsToAll() {
    this.stateService.saveState();
    const mid = Math.floor(this.plotsPerBlock() / 2);
    for (let r = 0; r <= this.hStreets(); r++)
      for (let c = 0; c <= this.vStreets(); c++) {
        for (let pr = 0; pr < this.plotsPerBlock(); pr++)
          this.stateService.updatePlot(`r${r}c${c}pr${pr}pc${mid}`, { type: 'road', residents: [], roadDirection: 'v' });
        for (let pc = 0; pc < this.plotsPerBlock(); pc++)
          this.stateService.updatePlot(`r${r}c${c}pr${mid}pc${pc}`, { type: 'road', residents: [], roadDirection: 'h' });
      }
    this.saveLayoutToBackend();
  }

  setRoadStart() { this.roadStartKey.set(this.selectedKey()); }
  setRoadEnd() { this.roadEndKey.set(this.selectedKey()); }

  drawPathRoad() {
    const start = this.roadStartKey(), end = this.roadEndKey();
    if (!start || !end) return;
    const s = this.parseKey(start), e = this.parseKey(end);
    if (!s || !e) return;
    this.stateService.saveState();
    for (let gc = Math.min(s.globalC, e.globalC); gc <= Math.max(s.globalC, e.globalC); gc++)
      this.stateService.updatePlot(this.createKeyFromGlobal(s.globalR, gc), { type: 'road', residents: [], roadDirection: 'h' });
    for (let gr = Math.min(s.globalR, e.globalR); gr <= Math.max(s.globalR, e.globalR); gr++)
      this.stateService.updatePlot(this.createKeyFromGlobal(gr, e.globalC), { type: 'road', residents: [], roadDirection: 'v' });
    this.roadStartKey.set(null);
    this.roadEndKey.set(null);
    this.saveLayoutToBackend();
  }

  private isValidPlotKey(key: string, H: number, V: number, PSB: number): boolean {
    const m = key.match(/^r(\d+)c(\d+)pr(\d+)pc(\d+)$/);
    if (!m) return true; // keep non-standard keys (road/street keys etc)
    const r = +m[1], c = +m[2], pr = +m[3], pc = +m[4];
    return r <= H && c <= V && pr < PSB && pc < PSB;
  }

  private parseKey(key: string) {
    const match = key.match(/r(\d+)c(\d+)pr(\d+)pc(\d+)/);
    if (!match) return null;
    const r = parseInt(match[1]), c = parseInt(match[2]), pr = parseInt(match[3]), pc = parseInt(match[4]);
    const psb = this.plotsPerBlock();
    return { r, c, pr, pc, globalR: r * psb + pr, globalC: c * psb + pc };
  }

  private createKeyFromGlobal(gr: number, gc: number) {
    const psb = this.plotsPerBlock();
    return `r${Math.floor(gr / psb)}c${Math.floor(gc / psb)}pr${gr % psb}pc${gc % psb}`;
  }

  clearPlot(key: string) {
    const pid = this.projectId();
    // Vacate all backend bookings for this plot first
    if (pid) {
      this.api.vacatePlot(pid, key).subscribe();
    }
    this.stateService.saveState();
    const half = this.selectedHalf();
    if (half) {
      this.stateService.state.update(s => {
        const plots = { ...s.plots };
        const plot = plots[key];
        if (plot && plot.splitDirection) {
          const splitData = { ...plot.splitData! };
          splitData[half] = { type: 'vacant', name: undefined, residents: [], shopType: undefined, price: undefined, sqft: undefined } as any;
          plots[key] = { ...plot, splitData };
        }
        return { ...s, plots };
      });
    } else {
      this.stateService.state.update(s => {
        const plots = { ...s.plots };
        delete plots[key];
        return { ...s, plots };
      });
    }
    this.selectedPlotBookings.set([]);
    this.saveLayoutToBackend(key);
  }

  selectPlot(key: string, half: 'a' | 'b' | null = null) {
    if (this.isCtrlHeld) {
      const mergeKey = half ? `${key}-${half}` : key;
      if (this.pendingMerge.includes(mergeKey)) {
        this.pendingMerge = this.pendingMerge.filter(k => k !== mergeKey);
      } else {
        this.pendingMerge = [...this.pendingMerge, mergeKey];
      }
      return;
    }
    const group = this.getMergeGroupOf(key);
    const targetKey = group ? group[0] : key;
    this.stateService.selectPlot(targetKey, half);
    const plot = this.plots()[targetKey];
    if (!plot) return;
    if (plot.type && plot.type !== 'vacant' && plot.type !== 'road' && !this.swalConfig()) {
      // Try to use cached bookings first, then load from backend
      const cachedBookings = (this as any)._plotBookingsCache?.[targetKey];
      if (cachedBookings && cachedBookings.length > 0) {
        // Use cached bookings immediately
        this.swalConfig.set({ key: targetKey, plot, bookings: cachedBookings });
        setTimeout(() => {
          this.showUnifiedPlotSwal(targetKey, plot, cachedBookings);
        }, 100);
      } else {
        // Load from backend
        this.loadBookings(targetKey, bookings => {
          if (bookings.length > 0) {
            this.swalConfig.set({ key: targetKey, plot, bookings });
            setTimeout(() => {
              this.showUnifiedPlotSwal(targetKey, plot, bookings);
            }, 100);
          } else {
            // No bookings — open booking form for all building types
            if ((plot.type === 'apartment' || plot.type === 'pg') && !plot.aptConfig) {
              this.isAptModalOpen = true;
            } else {
              this.openNewBookingForm(targetKey);
            }
          }
        });
      }
    }
  }

  getMatchedCoords() {
    return Object.entries(this.plots())
      .filter(([_, data]) => this.searchTerm && data.name?.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .map(([key]) => {
        const m = key.match(/r(\d+)c(\d+)/);
        return m ? { r: parseInt(m[1]), c: parseInt(m[2]) } : null;
      }).filter(Boolean);
  }

  isPlotMatched(key: string) {
    const plot = this.plots()[key];
    return this.searchTerm && plot?.name?.toLowerCase().includes(this.searchTerm.toLowerCase());
  }

  isBlockHighlighted(r: number, c: number) {
    return this.getMatchedCoords().some(coord => coord?.r === r && coord?.c === c);
  }

  isRoadHighlighted(r: number, c: number, type: 'h' | 'v') {
    const coords = this.getMatchedCoords();
    return type === 'v'
      ? coords.some(coord => coord?.c === c || coord?.c === c + 1)
      : coords.some(coord => coord?.r === r || coord?.r === r + 1);
  }

  isIntersectionHighlighted(r: number, c: number) {
    return this.isRoadHighlighted(r, c, 'h') || this.isRoadHighlighted(r, c, 'v');
  }

  getRange(n: number) { return Array(n + 1).fill(0).map((_, i) => i); }
  getSubRange(n: number) { return Array(n).fill(0).map((_, i) => i); }

  getBlockKeys(r: number, c: number) {
    const keys = [];
    for (let pr = 0; pr < this.plotsPerBlock(); pr++)
      for (let pc = 0; pc < this.plotsPerBlock(); pc++)
        keys.push(`r${r}c${c}pr${pr}pc${pc}`);
    return keys;
  }

  isAllParks(r: number, c: number) {
    return this.getBlockKeys(r, c).every(k => this.plots()[k]?.type === 'park');
  }

  splitPlot(key: string, direction: 'h' | 'v' = 'v') {
    this.stateService.saveState();
    this.stateService.splitPlot(key, direction);
    this.saveLayoutToBackend(key);
  }

  unsplitPlot(key: string) {
    this.stateService.saveState();
    this.stateService.unsplitPlot(key);
    this.saveLayoutToBackend(key);
  }

  handleSplitClick(key: string, half: 'a' | 'b') {
    if (this.isCtrlHeld) {
      this.selectPlot(key, half);
      return;
    }
    this.stateService.selectPlot(key, half);
    const plot = this.plots()[key];
    const halfData = plot?.splitData?.[half];
    if (!halfData) return;
    if (halfData.type !== 'vacant' && halfData.type !== 'road') this.openNewBookingForm(key);
  }

  isSplitCell(key: string): boolean {
    return !!this.plots()[key]?.splitDirection;
  }

  // ── BLOCK CUSTOMIZATION ──────────────────────────────
  isBlockCustomizeOpen = false;
  blockCustomizeTarget = { r: 0, c: 0 };
  blockCustomizeRows = 2;
  blockCustomizeCols = 2;

  blockOverrides = computed(() => this.state().blockOverrides || {});

  getBlockRows(r: number, c: number): number {
    return this.blockOverrides()[`${r}_${c}`]?.rows ?? this.plotsPerBlock();
  }

  getBlockCols(r: number, c: number): number {
    return this.blockOverrides()[`${r}_${c}`]?.cols ?? this.plotsPerBlock();
  }

  openBlockCustomize(r: number, c: number, event: MouseEvent) {
    event.stopPropagation();
    this.blockCustomizeTarget = { r, c };
    this.blockCustomizeRows = this.getBlockRows(r, c);
    this.blockCustomizeCols = this.getBlockCols(r, c);
    this.isBlockCustomizeOpen = true;
  }

  applyBlockCustomize() {
    const { r, c } = this.blockCustomizeTarget;
    this.stateService.saveState();
    this.stateService.setBlockOverride(r, c, this.blockCustomizeRows, this.blockCustomizeCols);
    this.isBlockCustomizeOpen = false;
    this.saveLayoutToBackend();
  }

  resetBlockCustomize() {
    const { r, c } = this.blockCustomizeTarget;
    this.stateService.saveState();
    this.stateService.clearBlockOverride(r, c);
    this.isBlockCustomizeOpen = false;
    this.saveLayoutToBackend();
  }

  getBlockKeysCustom(r: number, c: number): string[] {
    const keys = [];
    const rows = this.getBlockRows(r, c);
    const cols = this.getBlockCols(r, c);
    for (let pr = 0; pr < rows; pr++)
      for (let pc = 0; pc < cols; pc++)
        keys.push(`r${r}c${c}pr${pr}pc${pc}`);
    return keys;
  }

  isBlockOverridden(r: number, c: number): boolean {
    return !!this.blockOverrides()[`${r}_${c}`];
  }

  getMaxBlockRows(r: number): number {
    let max = 0;
    for (let c = 0; c <= this.vStreets(); c++)
      max = Math.max(max, this.getBlockRows(r, c));
    return max;
  }

  getMaxBlockCols(c: number): number {
    let max = 0;
    for (let r = 0; r <= this.hStreets(); r++)
      max = Math.max(max, this.getBlockCols(r, c));
    return max;
  }

  addRow() { this.hStreets.update(v => Math.min(v + 1, 8)); }
  addCol() { this.vStreets.update(v => Math.min(v + 1, 8)); }

  // ── GATE ──────────────────────────────────────────────
  isGatePickerOpen = false;
  gatePickerKey = '';
  gateConfig: { position: 'top' | 'bottom' | 'left' | 'right'; type: 'cyber' | 'side'; label: string; isCustom: boolean } = { position: 'top', type: 'cyber', label: 'ENTRANCE', isCustom: false };
  readonly gateNames = ['ENTRANCE', 'EXIT', 'GATE A', 'CUSTOMIZE'];

  readonly gateTypes = [
    { value: 'cyber', label: 'Cyber Gate', emoji: '⚡', desc: 'High-Tech Neon Style' },
    { value: 'side', label: 'Side Gate', emoji: '🏙️', desc: 'Modern Elite Style' },
  ];

  openGatePicker(key: string) {
    if (!key) return;
    this.gatePickerKey = key;
    const existing = this.plots()[key]?.gate;
    const isCustom = existing?.label ? !this.gateNames.slice(0, 3).includes(existing.label) : false;
    this.gateConfig = {
      position: (existing?.position || 'top') as 'top' | 'bottom' | 'left' | 'right',
      type: (existing?.type || 'cyber') as 'cyber' | 'side',
      label: existing?.label || 'ENTRANCE',
      isCustom
    };
    this.isGatePickerOpen = true;
  }

  confirmGate() {
    const key = this.gatePickerKey;
    if (key) {
      this.stateService.saveState();
      this.stateService.updatePlot(key, {
        gate: {
          position: this.gateConfig.position as any,
          type: this.gateConfig.type as any,
          label: this.gateConfig.isCustom ? this.gateConfig.label : (this.gateConfig.label === 'CUSTOMIZE' ? '' : this.gateConfig.label)
        }
      });
      this.saveLayoutToBackend(key);
    }
    this.isGatePickerOpen = false;
  }

  removeGate() {
    const key = this.gatePickerKey;
    if (!key) return;
    this.stateService.saveState();
    this.stateService.updatePlot(key, { gate: undefined });
    this.isGatePickerOpen = false;
    this.saveLayoutToBackend(key);
  }

  // Vacant plot click — select and open sidebar
  onVacantClick(key: string) {
    this.stateService.selectPlot(key);
    if (!this.isSidebarOpen()) this.isSidebarOpen.set(true);
  }

  getMergeTypeColor(type: string | undefined): string {
    const colors: Record<string, string> = {
      house: '#10b981',
      apartment: '#0ea5e9',
      park: '#22c55e',
      shop: '#06b6d4',
      watertank: '#3b82f6',
      hospital: '#ef4444',
    };
    return colors[type || ''] || '#94a3b8';
  }

  getMergeBlockStyle(type: string | undefined, isSelected: boolean): string {
    const selectedBorder = isSelected ? `box-shadow: 0 0 0 2px ${this.getMergeTypeColor(type)};` : '';
    return `background:#ffffff; border:1px solid #e2e8f0; ${selectedBorder}`;
  }

  getMergeGlassLayer(_type: string | undefined): string { return ''; }
  getMergeGlowRing(_type: string | undefined, _units: number): string { return ''; }

  // ── SVG POLYGON MERGE SHAPE ──────────────────────────
  getMergePolygonPath(group: string[]): string | null {
    const positions = group.map(k => this.getCellPixelPos(k)).filter(Boolean) as { x: number; y: number; w: number; h: number }[];
    if (!positions.length) return null;

    const C = this.CELL();
    const step = C / 2;
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));

    const cellSet = new Set<string>();
    positions.forEach(p => {
      const c = Math.round((p.x - minX) / step);
      const r = Math.round((p.y - minY) / step);
      const cols = Math.round(p.w / step);
      const rows = Math.round(p.h / step);
      for (let ir = 0; ir < rows; ir++) {
        for (let ic = 0; ic < cols; ic++) {
          cellSet.add(`${r + ir},${c + ic}`);
        }
      }
    });

    const has = (r: number, c: number) => cellSet.has(`${r},${c}`);

    // Collect all outer edges
    const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
    cellSet.forEach(key => {
      const parts = key.split(',');
      const r = parseInt(parts[0]);
      const c = parseInt(parts[1]);
      const x = minX + c * step;
      const y = minY + r * step;

      if (!has(r - 1, c)) edges.push({ x1: x, y1: y, x2: x + step, y2: y }); // top
      if (!has(r + 1, c)) edges.push({ x1: x + step, y1: y + step, x2: x, y2: y + step }); // bottom
      if (!has(r, c - 1)) edges.push({ x1: x, y1: y + step, x2: x, y2: y }); // left
      if (!has(r, c + 1)) edges.push({ x1: x + step, y1: y, x2: x + step, y2: y + step }); // right
    });

    if (edges.length === 0) return null;

    // Chain edges into a closed polygon path
    const pt = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
    const edgeMap = new Map<string, { x: number; y: number }>();
    edges.forEach(e => edgeMap.set(pt(e.x1, e.y1), { x: e.x2, y: e.y2 }));

    const start = edges[0];
    let cur = { x: start.x1, y: start.y1 };
    const points: string[] = [`M${cur.x.toFixed(2)},${cur.y.toFixed(2)}`];
    const visited = new Set<string>();

    for (let i = 0; i < edges.length; i++) {
      const key = pt(cur.x, cur.y);
      if (visited.has(key)) break;
      visited.add(key);
      const next = edgeMap.get(key);
      if (!next) break;
      points.push(`L${next.x.toFixed(2)},${next.y.toFixed(2)}`);
      cur = next;
    }
    points.push('Z');
    return points.join(' ');
  }

  getMergeCentroid(group: string[]): { x: number; y: number } | null {
    const positions = group.map(k => this.getCellPixelPos(k)).filter(Boolean) as { x: number; y: number; w: number; h: number }[];
    if (!positions.length) return null;
    const avgX = positions.reduce((s, p) => s + p.x + p.w / 2, 0) / positions.length;
    const avgY = positions.reduce((s, p) => s + p.y + p.h / 2, 0) / positions.length;
    return { x: avgX, y: avgY };
  }

  getMergeSvgBounds(group: string[]): { x: number; y: number; w: number; h: number } | null {
    const positions = group.map(k => this.getCellPixelPos(k)).filter(Boolean) as { x: number; y: number; w: number; h: number }[];
    if (!positions.length) return null;
    const pad = 6;
    const minX = Math.min(...positions.map(p => p.x)) - pad;
    const minY = Math.min(...positions.map(p => p.y)) - pad;
    const maxX = Math.max(...positions.map(p => p.x + p.w)) + pad;
    const maxY = Math.max(...positions.map(p => p.y + p.h)) + pad;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  toggleSidebarExtension() {
    this.isSidebarExtended.set(!this.isSidebarExtended());
  }

  cycleSidebarStage() {
    this.sidebarStage.update(s => ((s + 1) % 3) as 0 | 1 | 2);
  }

  sidebarWidthClass = computed(() => {
    if (!this.isSidebarOpen()) return 'w-0 opacity-0 overflow-hidden';
    const stage = this.sidebarStage();
    if (stage === 0) return 'w-72';
    if (stage === 1) return 'w-[480px]';
    return 'w-[700px]';
  });

  private getFullLogoUrl(logoPath: string | undefined): string {
    if (!logoPath) return '';
    // If it's already a full HTTP URL, return as-is
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      return logoPath;
    }
    // If it's a relative path starting with /, prepend origin
    if (logoPath.startsWith('/')) {
      return window.location.origin + logoPath;
    }
    // If it's a relative path like 'plot-vista-main/assets/...', prepend origin
    if (logoPath.startsWith('plot-vista-main/assets/')) {
      return window.location.origin + '/plot-vista-main/' + logoPath.replace('plot-vista-main/', '');
    }
    // Otherwise, treat as relative path and prepend origin
    return window.location.origin + '/' + logoPath;
  }

  getPlotIconPath(type?: PlotType, shopType?: string): string {
    if (!type || type === 'vacant' || type === 'road') return '';

    // Handle shop types with backend sub-classification logo support
    if (type === 'shop') {
      const shopMap: Record<string, string> = {
        'gym': 'gym.png', 'playstation': 'playstation.png', 'bank': 'bank.png',
        'atm': 'bank.png', 'miniclinic': 'mini clinic.png', 'pharmacy': 'pharmacy.png',
        'bakery': 'bakery.png', 'grosary': 'grosary.png', 'grocery': 'grosary.png',
        'laundry': 'laundary (1).png', 'tailoring': 'tailor (1).png',
        'salon': 'spa (1).png', 'spa': 'spa (1).png', 'shop': 'shop.png',
      };
      if (shopType) {
        const key = shopType.toLowerCase().trim();
        // Check backend sub-classifications first for uploaded logos
        const sc = this.subClassifications().find((s: any) => s.name.toLowerCase().trim() === key);
        if (sc?.logo) {
          return this.getFullLogoUrl(sc.logo);
        }
        // Fallback to local icon map
        if (shopMap[key]) return `assets/plot-icons/${shopMap[key]}`;
      }
      return 'assets/plot-icons/shop.png';
    }

    // Check backend sub-classifications for custom types (guesthouse, etc.)
    const typeName = type.toLowerCase().trim();
    const sc = this.subClassifications().find((s: any) => {
      const scName = s.name.toLowerCase().trim();
      return scName === typeName || scName === typeName.replace('_', ' ') || scName === typeName.replace(' ', '_');
    });
    if (sc?.logo) {
      return this.getFullLogoUrl(sc.logo);
    }

    // Fallback to local icon mapping
    const typeIconMap: Record<string, string> = {
      'watertank': 'watertank.png',
      'guesthouse': 'GuestHouse.png',
      'guest_house': 'GuestHouse.png',
      'communityHall': 'CommunityHall.png',
      'swimmingPool': 'SwimmingPool.png',
      'pg': 'apartment.png',
      'house': 'villa.png',
      'villa': 'villa.png',
      'apartment': 'apartment.png',
      'park': 'park.png',
      'hospital': 'hospital.png',
      'security': 'security.png',
    };

    const iconFile = typeIconMap[typeName] || `${type}.png`;
    return `assets/plot-icons/${iconFile}`;
  }

  getPillarStyle(type: string | undefined, label?: string): string {
    if (!type) return 'background: #94a3b8;';
    const isExit = label?.toLowerCase().includes('exit');
    const color = isExit ? '#ef4444' : (type === 'cyber' ? '#1d4ed8' : '#1e293b');
    const accent = isExit ? '#fee2e2' : (type === 'cyber' ? '#38bdf8' : '#475569');

    if (type === 'cyber') {
      return `background: linear-gradient(135deg, ${accent} 0%, ${color} 100%); border: 1px solid ${isExit ? '#991b1b' : '#1e3a8a'}; box-shadow: 0 0 15px ${isExit ? 'rgba(239,68,68,0.4)' : 'rgba(14,165,233,0.4)'};`;
    }
    return `background: linear-gradient(135deg, ${accent} 0%, ${color} 100%); border: 1px solid ${isExit ? '#991b1b' : '#0f172a'};`;
  }

  getBarStyle(type: string | undefined, label?: string): string {
    if (!type) return 'background: #64748b;';
    const isExit = label?.toLowerCase().includes('exit');
    if (isExit) return 'background: linear-gradient(to bottom, #f87171, #ef4444); border: 1px solid #991b1b;';

    switch (type) {
      case 'cyber': return 'background: linear-gradient(to bottom, #0ea5e9, #2563eb); border: 1px solid #1e40af;';
      case 'side': return 'background: linear-gradient(to bottom, #1e293b, #0f172a); border: 1px solid #020617;';
      default: return 'background: #64748b;';
    }
  }
}

