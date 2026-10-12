import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ParkingStateService } from '../../services/parking-state.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ParkingGridComponent } from './parking-grid/parking-grid.component';
import { FloorEditorComponent } from './floor-editor/floor-editor.component';

declare const Swal: any;

@Component({
  selector: 'app-parking',
  standalone: true,
  imports: [CommonModule, FormsModule, ParkingGridComponent, FloorEditorComponent],
  template: `
    <div class="h-screen w-full flex flex-col bg-white overflow-hidden font-sans">

      <!-- Header -->
      <header class="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-[100] shadow-sm relative">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
               style="background: linear-gradient(135deg, #92400e, #f59e0b);">
            <span class="text-xl">🅿️</span>
          </div>
          <div>
            <h1 class="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1">
              MACS <span class="text-amber-500">PARKING</span>
            </h1>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{{ companyName() }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <div class="flex flex-col items-end">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Floors</span>
              <span class="text-sm font-bold text-slate-900">{{ parking.state().floors.length }}</span>
            </div>
          </div>
          <button (click)="back()"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:-translate-y-0.5"
            style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.2); color: #38bdf8;">
            ← Dashboard
          </button>
        </div>
      </header>

      <!-- Main -->
      <main class="flex-1 flex overflow-hidden relative">

        <!-- Sidebar -->
        <div class="relative transition-all duration-300 ease-in-out border-r border-slate-100 bg-white z-[90]"
          [style.width]="parking.isSidebarOpen() ? '288px' : '0px'">
          <div class="w-72 h-full overflow-hidden" [class.opacity-0]="!parking.isSidebarOpen()">
            <div class="w-72 bg-white flex flex-col h-full shrink-0">

              <!-- Floors header -->
              <div class="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 class="text-lg font-bold text-slate-900">Floors</h2>
                <button (click)="parking.openEditor()"
                  class="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-bold">
                  + Add
                </button>
              </div>

              <!-- Floors list -->
              <div class="flex-1 overflow-y-auto p-4 space-y-2">
                @for (floor of generalParkingFloors(); track floor.id) {
                  <div class="p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group"
                    [class.bg-amber-50]="parking.state().activeFloorId === floor.id"
                    [class.border-amber-200]="parking.state().activeFloorId === floor.id"
                    [class.bg-white]="parking.state().activeFloorId !== floor.id"
                    [class.border-slate-100]="parking.state().activeFloorId !== floor.id"
                    [class.opacity-60]="floor.isActive === false"
                    (click)="parking.setActiveFloor(floor.id); clearApt()">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center relative" [style.backgroundColor]="floor.color + '20'">
                        <span class="text-lg">🅿️</span>
                        @if (floor.isActive === false) {
                          <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>
                        }
                      </div>
                      <div>
                        <p class="text-sm font-bold text-slate-900">{{ floor.name }}</p>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {{ floor.rows }}×{{ floor.cols }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button (click)="parking.openEditor(floor.id); $event.stopPropagation()"
                        class="p-2 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100">
                        ✏️
                      </button>
                      <button (click)="confirmDeleteFloor(floor); $event.stopPropagation()"
                        class="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                        🗑️
                      </button>
                    </div>
                  </div>
                }
                @if (parking.state().floors.length === 0) {
                  <div class="text-center py-8 text-slate-400">
                    <p class="text-3xl mb-2">🅿️</p>
                    <p class="text-sm font-bold">No floors yet</p>
                  </div>
                }
              </div>

              <!-- ── APARTMENTS SECTION ── -->
              <div class="border-t border-slate-100">
                <button (click)="toggleAptSection()"
                  class="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div class="flex items-center gap-2">
                    <span class="text-base">🏢</span>
                    <span class="text-[11px] font-black text-slate-700 uppercase tracking-widest">Apartments</span>
                    @if (aptPlots().length > 0) {
                      <span class="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">{{ aptPlots().length }}</span>
                    }
                  </div>
                  <span class="text-slate-400 text-xs">{{ showAptSection() ? '▲' : '▼' }}</span>
                </button>

                @if (showAptSection()) {
                  <div class="px-3 pb-3 space-y-1.5">
                    @if (aptLoading()) {
                      <div class="flex items-center justify-center py-4">
                        <div class="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    } @else if (aptPlots().length === 0) {
                      <p class="text-[10px] text-slate-400 text-center py-3">No apartments in layout</p>
                    } @else {
                      @for (apt of aptPlots(); track apt.plotKey) {
                        <div class="rounded-xl border transition-all overflow-hidden"
                          [class.border-indigo-400]="selectedApt()?.plotKey === apt.plotKey"
                          [class.border-slate-100]="selectedApt()?.plotKey !== apt.plotKey">

                          <!-- Apt row -->
                          <button (click)="selectApt(apt)"
                            class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-indigo-50 group"
                            [class.bg-indigo-50]="selectedApt()?.plotKey === apt.plotKey"
                            [class.bg-white]="selectedApt()?.plotKey !== apt.plotKey">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              [class.bg-indigo-500]="getAptFloors(apt.plotKey).length > 0"
                              [class.bg-indigo-100]="getAptFloors(apt.plotKey).length === 0">
                              <span class="text-sm">{{ getAptFloors(apt.plotKey).length > 0 ? '✓' : '🏢' }}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-[11px] font-black text-slate-900 truncate">{{ apt.name }}</p>
                              <p class="text-[9px] text-slate-400">
                                {{ apt.aptConfig?.floors || 0 }}F · {{ apt.aptConfig?.unitsPerFloor || 0 }} units/F
                              </p>
                            </div>
                          </button>

                          <!-- Nested Floor List -->
                          <div class="bg-slate-50/50 border-t border-slate-100 divide-y divide-slate-100/50">
                            @for (floor of getAptFloors(apt.plotKey); track floor.id) {
                              <div class="group flex items-center justify-between pl-11 pr-3 py-2.5 transition-all hover:bg-white cursor-pointer"
                                (click)="selectApt(apt, floor.id)"
                                [class.bg-white]="parking.state().activeFloorId === floor.id"
                                [class.ring-1]="parking.state().activeFloorId === floor.id"
                                [class.ring-indigo-200]="parking.state().activeFloorId === floor.id">
                                <div>
                                  <p class="text-[11px] font-bold text-slate-700">{{ floor.name }}</p>
                                  <p class="text-[8px] font-medium text-slate-400 uppercase tracking-widest">{{ floor.rows }}×{{ floor.cols }}</p>
                                </div>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button (click)="parking.openEditor(floor.id); $event.stopPropagation()" class="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded">✏️</button>
                                  <button (click)="confirmDeleteFloor(floor); $event.stopPropagation()" class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">🗑️</button>
                                </div>
                              </div>
                            }
                            
                            <!-- Add floor provision -->
                            <div class="px-3 py-2 flex flex-col gap-2 bg-indigo-50/30">
                              <button (click)="addManualAptFloor(apt); $event.stopPropagation()"
                                class="w-full py-1.5 rounded-lg border-2 border-dashed border-indigo-200 text-indigo-500 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">
                                + Add another Floor
                              </button>

                              @if (apt.aptConfig?.floors && apt.aptConfig?.unitsPerFloor) {
                                <div class="p-2 bg-white/60 rounded-xl border border-indigo-100/50">
                                  <div class="flex items-center justify-between mb-1">
                                    <span class="text-[8px] text-indigo-600 font-black uppercase tracking-tighter">Auto Generator</span>
                                    <span class="text-[8px] text-indigo-300">
                                      {{ calcParkingFloors(apt.aptConfig) }} Flooors
                                    </span>
                                  </div>
                                  <button (click)="openCreateFloorsModal(apt); $event.stopPropagation()"
                                    class="w-full py-1 rounded-lg bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest transition-all shadow-sm shadow-indigo-200">
                                    {{ getAptFloors(apt.plotKey).length > 0 ? '🔄 Recreate All' : '✨ Auto Create' }}
                                  </button>
                                </div>
                              }
                            </div>
                          </div>
                        </div>
                      }
                    }
                  </div>
                }
              </div>

            </div>
          </div>

          <!-- Sidebar toggle -->
          <button (click)="parking.toggleSidebar()"
            class="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-amber-50 transition-all z-50 shadow-sm text-slate-400 hover:text-amber-600">
            {{ parking.isSidebarOpen() ? '‹' : '›' }}
          </button>
        </div>

        <!-- Grid area -->
        <div class="flex-1 relative overflow-hidden bg-slate-50 flex flex-col">

          <!-- Active apartment banner -->
          @if (selectedApt()) {
            <div class="bg-indigo-600 text-white px-5 py-2.5 flex items-center justify-between shadow-md shrink-0 z-[85]">
              <div class="flex items-center gap-3">
                <span class="text-base">🏢</span>
                <div>
                  <p class="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Apartment Parking</p>
                  <p class="text-sm font-black">{{ selectedApt()!.name }}</p>
                </div>
                @if (aptCustomersLoading()) {
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                } @else {
                  <span class="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                    {{ aptCustomers().length }} customer{{ aptCustomers().length !== 1 ? 's' : '' }}
                  </span>
                }
              </div>
              <button (click)="clearApt()" class="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white text-sm font-bold">
                ✕ Clear
              </button>
            </div>
          }

          <div class="flex-1 relative overflow-hidden">
            @if (parking.state().floors.length === 0) {
              <div class="flex flex-col items-center justify-center h-full text-center px-6">
                <div class="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-2xl"
                     style="background: linear-gradient(135deg, #92400e, #f59e0b);">
                  <span class="text-5xl">🅿️</span>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">No Parking Floors</h2>
                <p class="text-sm text-slate-500 mb-6">Create your first floor or select an apartment below to auto-generate parking floors</p>
                <button (click)="parking.openEditor()"
                  class="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:-translate-y-1"
                  style="background: linear-gradient(135deg, #92400e, #f59e0b);">
                  + Create First Floor
                </button>
              </div>
            } @else {
              <app-parking-grid></app-parking-grid>
            }
          </div>
        </div>
      </main>

      <app-floor-editor></app-floor-editor>

      <!-- Create Parking Floors Modal -->
      @if (showCreateFloorsModal()) {
        <div class="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">

            <!-- Modal Header -->
            <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between" style="background: linear-gradient(135deg, #4f46e5, #6366f1);">
              <div class="flex items-center gap-3">
                <span class="text-3xl">🏢</span>
                <div>
                  <h3 class="text-base font-black text-white">Create Parking Floors</h3>
                  <p class="text-[10px] text-indigo-200 font-bold mt-0.5">{{ createFloorsTarget()?.name }}</p>
                </div>
              </div>
              <button (click)="showCreateFloorsModal.set(false)" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all">✕</button>
            </div>

            <!-- Calculation Details -->
            <div class="p-6 space-y-4">

              <!-- Input Summary -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Residential Floors</p>
                  <p class="text-2xl font-black text-slate-900">{{ createFloorsTarget()?.aptConfig?.floors || 0 }}</p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Units per Floor</p>
                  <p class="text-2xl font-black text-slate-900">{{ createFloorsTarget()?.aptConfig?.unitsPerFloor || 0 }}</p>
                </div>
              </div>

              <!-- Arrow / Calculation -->
              <div class="flex items-center justify-center gap-2 py-1">
                <div class="h-px flex-1 bg-slate-200"></div>
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Auto Calculation</span>
                <div class="h-px flex-1 bg-slate-200"></div>
              </div>

              <!-- Output Summary -->
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-indigo-50 rounded-2xl p-4 border border-indigo-200 text-center">
                  <p class="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Total Units</p>
                  <p class="text-xl font-black text-indigo-700">
                    {{ (createFloorsTarget()?.aptConfig?.floors || 0) * (createFloorsTarget()?.aptConfig?.unitsPerFloor || 0) }}
                  </p>
                </div>
                <div class="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center">
                  <p class="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Parking Floors</p>
                  <p class="text-xl font-black text-emerald-700">
                    {{ calcParkingFloors(createFloorsTarget()?.aptConfig) }}
                  </p>
                </div>
                <div class="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-center">
                  <p class="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Spots/Floor</p>
                  <p class="text-xl font-black text-amber-700">
                    {{ calcSpotsPerFloor(createFloorsTarget()?.aptConfig) }}
                  </p>
                </div>
              </div>

              <!-- Formula explanation -->
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">📐 Formula</p>
                <div class="space-y-1 text-[10px] text-slate-600">
                  <p>Total Units = {{ createFloorsTarget()?.aptConfig?.floors || 0 }} floors × {{ createFloorsTarget()?.aptConfig?.unitsPerFloor || 0 }} units = <strong>{{ (createFloorsTarget()?.aptConfig?.floors || 0) * (createFloorsTarget()?.aptConfig?.unitsPerFloor || 0) }}</strong></p>
                  <p>Parking Floors = ⌈Res. Floors ÷ 4⌉ = <strong>{{ calcParkingFloors(createFloorsTarget()?.aptConfig) }}</strong></p>
                  <p>Spots per Floor = ⌈Total Units ÷ Parking Floors⌉ = <strong>{{ calcSpotsPerFloor(createFloorsTarget()?.aptConfig) }}</strong></p>
                </div>
              </div>

              @if (getAptFloor(createFloorsTarget()?.plotKey || '')) {
                <div class="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p class="text-[10px] font-black text-amber-700">⚠️ Existing floors for this apartment will be deleted and recreated.</p>
                </div>
              }
            </div>

            <!-- Footer Actions -->
            <div class="px-6 py-4 flex gap-3 border-t border-slate-100 bg-slate-50">
              <button (click)="showCreateFloorsModal.set(false)"
                class="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button (click)="confirmCreateParkingFloors()" [disabled]="creatingFloors()"
                class="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all"
                style="background: linear-gradient(135deg, #4f46e5, #6366f1);"
                [class.opacity-60]="creatingFloors()">
                {{ creatingFloors() ? '⏳ Creating...' : '✨ Create ' + calcParkingFloors(createFloorsTarget()?.aptConfig) + ' Floor(s)' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class ParkingComponent implements OnInit {
  parking = inject(ParkingStateService);
  auth = inject(AuthService);
  api = inject(ApiService);
  router = inject(Router);

  companyName = computed(() => this.auth.getCompanyName() || 'Company');

  showAptSection = signal(false);
  aptLoading = signal(false);
  aptPlots = signal<{ plotKey: string; name: string; aptConfig?: any }[]>([]);

  selectedApt = signal<{ plotKey: string; name: string; aptConfig?: any } | null>(null);
  aptCustomers = signal<any[]>([]);
  aptCustomersLoading = signal(false);

  // Create floors modal
  showCreateFloorsModal = signal(false);
  createFloorsTarget = signal<{ plotKey: string; name: string; aptConfig?: any } | null>(null);
  creatingFloors = signal(false);

  // All project residents for sidebar badges
  allProjectResidents = signal<any[]>([]);
  aptCustomerCounts = computed(() => {
    const counts: Record<string, number> = {};
    this.allProjectResidents().forEach(r => {
      const key = r.plotId || r.plotKey;
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
        if (key.includes('_')) {
          const buildingKey = key.split('_')[0];
          counts[buildingKey] = (counts[buildingKey] || 0) + 1;
        }
      }
    });
    return counts;
  });

  generalParkingFloors = computed(() => 
    this.parking.state().floors.filter(f => !f.apartmentId)
  );

  private projectId = '';

  async ngOnInit() {
    this.resolveProjectId();
    await this.parking.loadFromBackend();
    await this.parking.loadApartments();
    this.loadAllProjectResidents();
    this.preloadApartmentCustomers();
  }

  private preloadApartmentCustomers() {
    if (!this.projectId) return;
    this.api.getLayoutCustomersAll(this.projectId).subscribe({
      next: (res: any) => {
        const allBookings = res?.data || [];
        const aptCache: Record<string, any[]> = {};
        allBookings.forEach((b: any) => {
          const plotKey = b.plotId?.split('_')[0];
          if (plotKey) {
            if (!aptCache[plotKey]) aptCache[plotKey] = [];
            aptCache[plotKey].push(b);
          }
        });
        (this as any)._aptCustomersCache = aptCache;
        console.log('✅ Apartment customers pre-loaded and cached');
      },
      error: () => console.log('⚠️ Failed to pre-load apartment customers')
    });
  }

  back() { this.router.navigate(['/dashboard']); }

  private resolveProjectId() {
    const adminProjectId = this.auth.getCompanyId();
    if (!adminProjectId) return;
    this.projectId = adminProjectId;
  }

  // ── Parking floor calculation helpers ────────────────────────────────────
  /** Calculate parking floors based on total units (1.5 spots per unit, max 30 spots per floor) */
  calcParkingFloors(aptConfig: any): number {
    if (!aptConfig?.floors || !aptConfig?.unitsPerFloor) return 1;
    const totalUnits = aptConfig.floors * aptConfig.unitsPerFloor;
    const totalParkingSpots = Math.ceil(totalUnits * 1.5); // 1.5 parking spots per unit
    const maxSpotsPerFloor = 30; // Maximum 30 spots per parking floor
    return Math.max(1, Math.ceil(totalParkingSpots / maxSpotsPerFloor));
  }

  /** Calculate spots per parking floor based on total parking requirement */
  calcSpotsPerFloor(aptConfig: any): number {
    if (!aptConfig?.floors || !aptConfig?.unitsPerFloor) return 0;
    const totalUnits = aptConfig.floors * aptConfig.unitsPerFloor;
    const totalParkingSpots = Math.ceil(totalUnits * 1.5); // 1.5 parking spots per unit
    const parkingFloors = this.calcParkingFloors(aptConfig);
    return Math.ceil(totalParkingSpots / parkingFloors);
  }

  // ── Create Floors Modal ────────────────────────────────────────────────────
  openCreateFloorsModal(apt: { plotKey: string; name: string; aptConfig?: any }) {
    this.createFloorsTarget.set(apt);
    this.showCreateFloorsModal.set(true);
  }

  async confirmCreateParkingFloors() {
    const apt = this.createFloorsTarget();
    if (!apt?.aptConfig) return;
    this.creatingFloors.set(true);
    try {
      // Delete existing floors for this apartment
      const existingFloors = this.parking.state().floors.filter(f => (f as any).apartmentId === apt.plotKey);
      for (const f of existingFloors) await this.parking.deleteFloor(f.id);

      // Create new floors based on calculation
      await this.parking.autoCreateParkingFloorsForApartment(apt.name, apt.plotKey, apt.aptConfig);

      this.showCreateFloorsModal.set(false);
      this.creatingFloors.set(false);

      // Auto-select the apartment to show its floors
      await this.selectApt(apt);

      Swal.fire({
        icon: 'success',
        title: 'Parking Floors Created!',
        html: `<b>${this.calcParkingFloors(apt.aptConfig)}</b> parking floor(s) created for <b>${apt.name}</b><br>Each floor has <b>${this.calcSpotsPerFloor(apt.aptConfig)}</b> parking spots`,
        timer: 3000,
        showConfirmButton: false
      });
    } catch (e: any) {
      this.creatingFloors.set(false);
      Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'Failed to create parking floors' });
    }
  }

  // ── Apartments section ──────────────────────────────────────────────────

  toggleAptSection() {
    this.showAptSection.update(v => !v);
    if (this.showAptSection() && this.aptPlots().length === 0) this.loadAptPlots();
  }

  private loadAptPlots() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    this.aptLoading.set(true);
    this.api.getProject(companyId).subscribe({
      next: (res: any) => {
        const layoutJson = res?.data?.layoutJson;
        const layout = typeof layoutJson === 'string' ? JSON.parse(layoutJson) : (layoutJson || {});
        const plots: Record<string, any> = layout.plots || {};
        const result: { plotKey: string; name: string; aptConfig?: any }[] = [];
        Object.entries(plots).forEach(([key, plot]: [string, any]) => {
          if (plot?.type === 'apartment' || plot?.type === 'pg') {
            result.push({
              plotKey: key,
              name: plot.name || plot.aptConfig?.blockName || key,
              aptConfig: plot.aptConfig
            });
          }
          if (plot?.splitData) {
            ['a', 'b'].forEach(half => {
              const h = plot.splitData[half];
              if (h?.type === 'apartment' || h?.type === 'pg') {
                result.push({
                  plotKey: `${key}-${half}`,
                  name: h.name || h.aptConfig?.blockName || `${key}-${half}`,
                  aptConfig: h.aptConfig
                });
              }
            });
          }
        });
        this.aptPlots.set(result);
        this.aptLoading.set(false);
      },
      error: () => this.aptLoading.set(false)
    });
  }

  private loadAllProjectResidents() {
    if (!this.projectId) return;
    this.api.getLayoutCustomersAll(this.projectId).subscribe({
      next: (res: any) => this.allProjectResidents.set(res?.data || []),
      error: () => this.allProjectResidents.set([])
    });
  }

  getAptFloors(plotKey: string) {
    return this.parking.getFloorsForApartment(plotKey);
  }

  addManualAptFloor(apt: { name: string; plotKey: string }) {
    const floors = this.getAptFloors(apt.plotKey);
    const floorIndex = floors.length + 1;
    const floorName = `${apt.name} - P${floorIndex}`;
    this.parking.addFloorForApartment(floorName, apt.plotKey);
  }

  // ── Main: select apartment ──────────────────────────────────────────────

  async selectApt(apt: { plotKey: string; name: string; aptConfig?: any }, floorId?: string) {
    this.selectedApt.set(apt);
    (this.parking as any)._preSelectedApt = apt;
    (this.parking as any)._preSelectedAptCustomers = [];

    // Find existing floor(s) for this apartment
    const floors = this.parking.getFloorsForApartment(apt.plotKey);
    const targetFloorId = floorId || (floors.length > 0 ? floors[0].id : null);

    if (targetFloorId) {
      // Floor already exists — activate the target one
      await this.parking.setActiveFloor(targetFloorId);
      this.loadAptCustomersAndAllocations(apt, targetFloorId);
    } else if (apt.aptConfig?.floors && apt.aptConfig?.unitsPerFloor) {
      // No floor yet but we have config — auto-create calculated floors
      await this.parking.autoCreateParkingFloorsForApartment(apt.name, apt.plotKey, apt.aptConfig);
      const createdFloors = this.parking.getFloorsForApartment(apt.plotKey);
      if (createdFloors.length > 0) this.loadAptCustomersAndAllocations(apt, createdFloors[0].id);
    } else {
      // No config available — create a basic single floor
      const floor = this.parking.addFloorForApartment(apt.name, apt.plotKey);
      this.loadAptCustomersAndAllocations(apt, floor.id);
    }
  }

  private loadAptCustomersAndAllocations(apt: { plotKey: string; name: string }, floorId: string) {
    if (!this.projectId) return;
    this.aptCustomersLoading.set(true);
    console.log('[DEBUG] Loading customers for apt:', apt.plotKey, 'projectId:', this.projectId);

    // Load customers for this apartment
    this.api.getApartmentCustomers(this.projectId, apt.plotKey).subscribe({
      next: (res: any) => {
        const customers = res?.data || [];
        this.aptCustomers.set(customers);
        (this.parking as any)._preSelectedAptCustomers = customers;
        this.aptCustomersLoading.set(false);
      },
      error: () => this.aptCustomersLoading.set(false)
    });

    // Load existing allocations and mark spots occupied
    this.api.getApartmentParkingList(this.projectId).subscribe({
      next: (res: any) => {
        const allocs: any[] = res?.data || [];
        const aptAllocs = allocs.filter(a => a.apartmentId === apt.plotKey);
        (this.parking as any)._aptAllocations = aptAllocs;

        aptAllocs.forEach(alloc => {
          const [allocFloorId, spotLabel] = (alloc.parkingId || '').split(':');
          if (allocFloorId !== floorId) return;
          const floor = this.parking.state().floors.find(f => f.id === floorId);
          if (!floor) return;
          for (let r = 0; r < floor.grid.length; r++) {
            for (let c = 0; c < floor.grid[r].length; c++) {
              if (floor.grid[r][c].label === spotLabel && floor.grid[r][c].type === 'parking') {
                this.parking.occupySpot(floorId, r, c, {
                  customerName: alloc.customerName,
                  apartmentNumber: alloc.apartmentName,
                  houseNumber: alloc.doorNo || '',
                  phoneNumber: alloc.customerMobile || '',
                  vehicles: [{ id: alloc.id, vehicleNumber: 'allocated', vehicleTypeId: 'car', categoryId: 'general', entryTime: '' }]
                });
              }
            }
          }
        });
      }
    });
  }

  clearApt() {
    this.selectedApt.set(null);
    this.aptCustomers.set([]);
    (this.parking as any)._preSelectedApt = null;
    (this.parking as any)._preSelectedAptCustomers = [];
    (this.parking as any)._aptAllocations = [];
  }

  confirmDeleteFloor(floor: any) {
    Swal.fire({
      title: 'Delete Floor?',
      html: `Permanently delete <b>${floor.name}</b> and all its parking data?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      background: '#ffffff',
      color: '#0f172a'
    }).then(r => { if (r.isConfirmed) this.parking.deleteFloor(floor.id); });
  }
}
