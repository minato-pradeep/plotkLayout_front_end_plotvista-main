import { Component, HostListener, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParkingStateService } from '../../../services/parking-state.service';
import { ParkingSpotComponent } from '../spot.component';
import { SpotType, ParkedVehicle } from '../../../parking.types';
import { getVehicleEmoji } from '../../../utils/icon-map.util';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { firstValueFrom } from 'rxjs';

declare const Swal: any;

@Component({
  selector: 'app-parking-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, ParkingSpotComponent],
  templateUrl: './parking-grid.component.html'
})
export class ParkingGridComponent implements OnInit, OnDestroy {
  parking = inject(ParkingStateService);
  private api = inject(ApiService);
  private auth = inject(AuthService);

  floor = computed(() => this.parking.state().floors.find(f => f.id === this.parking.state().activeFloorId));

  selectedSpot = signal<{ r: number; c: number } | null>(null);
  menuPos = signal({ x: 0, y: 0 });

  // Modal states
  isAllocating = signal(false);
  isViewingDetails = signal(false);
  isEditingAllocation = signal(false);
  viewMode = signal<'2D' | '3D'>('3D');

  rotation = signal({ x: 25, y: 0, z: 0 });
  scale = signal(1);
  offset = signal({ x: 0, y: 0 });
  isDragging = signal(false);
  isPanning = signal(false);
  lastMousePos = { x: 0, y: 0 };

  // Apartment allocation state
  apartments = signal<{ name: string; plotKey: string }[]>([]);
  selectedApartment = signal<{ name: string; plotKey: string } | null>(null);
  apartmentCustomers = signal<any[]>([]);
  selectedCustomer = signal<any | null>(null);
  loadingCustomers = signal(false);

  // Vehicle for non-residential floors
  currentVehicle = signal<Partial<ParkedVehicle>>({ vehicleNumber: '', vehicleTypeId: '', categoryId: '' });
  allocationVehicles = signal<ParkedVehicle[]>([]);
  customerName = signal('');
  phoneNumber = signal('');

  // Existing allocation details
  existingAllocation = signal<any | null>(null);

  // Apartment parking table
  apartmentParkingList = signal<any[]>([]);

  spotTypes: { type: SpotType; label: string }[] = [
    { type: 'parking', label: 'PARKING' }, { type: 'hydraulic', label: 'STACKER' },
    { type: 'lift', label: 'LIFT' }, { type: 'escalator', label: 'ESCALATOR' },
    { type: 'stairs', label: 'STAIRS' }, { type: 'road', label: 'ROAD (H)' },
    { type: 'road_v', label: 'ROAD (V)' }, { type: 'intersection', label: 'INTERSECTION' },
    { type: 'tjunction', label: 'T-JUNCTION' }, { type: 'empty', label: 'EMPTY' },
  ];

  isAnyModalOpen = computed(() =>
    this.isAllocating() || this.isEditingAllocation() || this.isViewingDetails() || this.parking.isEditorOpen()
  );

  totalSpots = computed(() => this.floor()?.grid.flat().filter(s => s.type === 'parking').length ?? 0);
  availableSpots = computed(() => this.floor()?.grid.flat().filter(s => s.type === 'parking' && !s.occupied).length ?? 0);

  ngOnInit() {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.loadApartmentParkingList();
    this.loadViewState();
  }

  ngOnDestroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.saveViewState();
  }

  getIconName(icon: string) { return getVehicleEmoji(icon); }
  getCategory(id?: string) { return id ? this.parking.state().categories.find(c => c.id === id) || null : null; }
  getVehicleType(id?: string) { return id ? this.parking.state().vehicleTypes.find(v => v.id === id) || null : null; }

  private get projectId(): string {
    // Get projectId from parking state or auth
    return (this.parking as any)._projectId || '';
  }

  loadApartmentParkingList() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    this.api.getApartmentParkingList(companyId).subscribe({
      next: (r: any) => this.apartmentParkingList.set(r?.data || []),
      error: () => {}
    });
  }

  // ── SPOT CLICK ────────────────────────────────────────────────────────────
  handleSpotClick(r: number, c: number) {
    if (this.floor()?.isActive === false) return;
    const f = this.floor(); if (!f) return;
    const spot = f.grid[r][c];
    if (spot.type !== 'parking') return;

    const spotId = `${f.id}:${spot.label}`;

    if (spot.occupied) {
      // Check apartment parking table first
      const apEntry = this.apartmentParkingList().find(ap => ap.parkingId === spotId);
      if (apEntry) {
        this.selectedSpot.set({ r, c });
        this.existingAllocation.set(apEntry);
        this.isViewingDetails.set(true);
        return;
      }
      // Fallback to old allocation
      this.selectedSpot.set({ r, c });
      this.existingAllocation.set(spot.allocation || null);
      this.isViewingDetails.set(true);
      return;
    }

    // Unoccupied — open allocation modal
    this.selectedSpot.set({ r, c });
    this.openAllocationModal();
  }

  openAllocationModal() {
    const f = this.floor();
    if (!f) return;

    if (f.apartmentId) {
      const companyId = this.auth.getCompanyId();
      const preSelected = (this.parking as any)._preSelectedApt as { name: string; plotKey: string } | undefined;
      const preCustomers = (this.parking as any)._preSelectedAptCustomers as any[] | undefined;

      // If apt pre-selected, use cached data (even if empty — show empty list)
      if (preSelected) {
        this.apartments.set([preSelected]);
        this.selectedApartment.set(preSelected);
        this.apartmentCustomers.set(preCustomers || []);
        this.selectedCustomer.set(null);
        this.currentVehicle.set({
          vehicleNumber: '',
          vehicleTypeId: this.parking.state().vehicleTypes[0]?.id || '',
          categoryId: this.parking.state().categories[0]?.id || ''
        });
        // If customers not yet loaded, fetch them now
        if (!preCustomers || preCustomers.length === 0) {
          this.loadCustomersForApartment(preSelected);
        }
        this.isAllocating.set(true);
        return;
      }

      // No pre-selected apt: fetch layout to list all apartments
      this.api.getProject(companyId).subscribe({
        next: (res: any) => {
          const layout = res?.data?.layoutJson;
          const parsed = typeof layout === 'string' ? JSON.parse(layout) : (layout || {});
          const plots: Record<string, any> = parsed.plots || {};

          const apts: { name: string; plotKey: string }[] = [];
          Object.entries(plots).forEach(([key, plot]: [string, any]) => {
            if (plot?.type === 'apartment')
              apts.push({ plotKey: key, name: plot.name || plot.aptConfig?.blockName || key });
            if (plot?.splitData) {
              ['a', 'b'].forEach(half => {
                const h = plot.splitData[half];
                if (h?.type === 'apartment')
                  apts.push({ plotKey: `${key}-${half}`, name: h.name || h.aptConfig?.blockName || `${key}-${half}` });
              });
            }
          });
          this.apartments.set(apts);
          const aptToUse = apts[0] || null;
          this.selectedApartment.set(aptToUse);
          this.selectedCustomer.set(null);
          this.apartmentCustomers.set([]);
          if (aptToUse) this.loadCustomersForApartment(aptToUse);
          this.isAllocating.set(true);
        }
      });
    } else {
      // Non-apartment floor: vehicle entry only
      this.allocationVehicles.set([]);
      this.customerName.set('');
      this.phoneNumber.set('');
      this.currentVehicle.set({
        vehicleNumber: '',
        vehicleTypeId: this.parking.state().vehicleTypes[0]?.id || '',
        categoryId: this.parking.state().categories[0]?.id || ''
      });
      this.isAllocating.set(true);
    }
  }

  onApartmentChange(apt: { name: string; plotKey: string }) {
    this.selectedApartment.set(apt);
    this.selectedCustomer.set(null);
    this.apartmentCustomers.set([]);
    this.loadCustomersForApartment(apt);
  }

  loadCustomersForApartment(apt: { name: string; plotKey: string }) {
    const companyId = this.auth.getCompanyId();
    if (!companyId || !apt.plotKey) return;
    this.loadingCustomers.set(true);
    this.api.getApartmentCustomers(companyId, apt.plotKey).subscribe({
      next: (r: any) => {
        this.apartmentCustomers.set(r?.data || []);
        this.selectedCustomer.set(null);
        this.loadingCustomers.set(false);
      },
      error: () => this.loadingCustomers.set(false)
    });
  }

  canConfirmAllocation(): boolean {
    const f = this.floor();
    if (!f) return false;
    
    if (f.apartmentId) {
      return !!this.selectedCustomer();
    }
    
    const v = this.currentVehicle();
    if (f.projectType === 'public') {
      return !!v.vehicleTypeId && !!v.categoryId;
    } else {
      return !!v.vehicleNumber?.trim() && !!v.vehicleTypeId && !!v.categoryId;
    }
  }

  // ── ALLOCATE ──────────────────────────────────────────────────────────────
  handleAllocate() {
    const s = this.selectedSpot(); const f = this.floor();
    if (!s || !f) return;
    const spot = f.grid[s.r][s.c];
    const spotId = `${f.id}:${spot.label}`;

    if (f.apartmentId) {
      const customer = this.selectedCustomer();
      const apt = this.selectedApartment();
      if (!customer || !apt) return;

      const companyId = this.auth.getCompanyId();
      this.api.checkParkingSpot(companyId, spotId).subscribe({
        next: (checkRes: any) => {
          if (checkRes?.data?.allocated) {
            Swal.fire({
              icon: 'warning',
              title: 'Spot Already Allocated',
              text: `This spot is already allocated to ${checkRes.data.customerName}. Replace?`,
              showCancelButton: true,
              confirmButtonText: 'Yes, Replace',
              cancelButtonText: 'Cancel'
            }).then(result => {
              if (result.isConfirmed) this.doAllocate(companyId, spotId, spot.label, apt, customer, f.id, s.r, s.c);
            });
          } else {
            this.doAllocate(companyId, spotId, spot.label, apt, customer, f.id, s.r, s.c);
          }
        }
      });
    } else {
      // Non-apartment floor: use vehicle input directly
      const v = this.currentVehicle();
      const isPublic = f.projectType === 'public';
      if (!isPublic && !v.vehicleNumber?.trim()) return;

      const vehiclePayload: ParkedVehicle = {
        id: `v-${Date.now()}`,
        vehicleNumber: v.vehicleNumber || '',
        vehicleTypeId: v.vehicleTypeId || '',
        categoryId: v.categoryId || '',
        entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      this.parking.occupySpot(f.id, s.r, s.c, {
        customerName: this.customerName() || 'Guest',
        phoneNumber: this.phoneNumber() || '',
        vehicles: [vehiclePayload]
      });
      this.loadApartmentParkingList();
      this.closeAllocation();
    }
  }

  private doAllocate(pid: string, spotId: string, spotLabel: string, apt: any, customer: any, floorId: string, r: number, c: number) {
    const body = {
      projectId: pid,
      apartmentId: apt.plotKey,
      apartmentName: apt.name,
      parkingId: spotId,
      parkingLabel: spotLabel,
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerMobile: customer.customerMobile || '',
      doorNo: customer.doorNo || ''
    };
    this.api.allocateApartmentParking(body).subscribe({
      next: () => {
        const vehicle = this.currentVehicle();
        this.parking.occupySpot(floorId, r, c, {
          apartmentNumber: apt.name,
          customerName: customer.customerName,
          vehicles: [{
            id: `v-${Date.now()}`,
            vehicleNumber: vehicle.vehicleNumber || '',
            vehicleTypeId: vehicle.vehicleTypeId || '',
            categoryId: vehicle.categoryId || '',
            entryTime: new Date().toLocaleTimeString()
          }]
        });
        this.loadApartmentParkingList();
        this.closeAllocation();
        Swal.fire({ icon: 'success', title: 'Allocated!', text: `Spot ${spotLabel} assigned to ${customer.customerName}`, timer: 1800, showConfirmButton: false });
      },
      error: (err: any) => Swal.fire({ icon: 'error', title: 'Allocation Failed', text: err?.error?.message || 'Could not allocate parking spot' })
    });
  }

  // ── REMOVE ALLOCATION ─────────────────────────────────────────────────────
  handleUnoccupy() {
    const existing = this.existingAllocation();
    const s = this.selectedSpot(); const f = this.floor();
    if (!s || !f) return;

    const customerName = existing?.customerName || 'this customer';
    Swal.fire({
      icon: 'warning',
      title: 'Remove Allocation',
      text: `Parking is allocated to ${customerName}. Remove allocation?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel'
    }).then((result: any) => {
      if (!result.isConfirmed) return;

      const doRemove = () => {
        // 1. Clear spot in local state + save spot to DB
        this.parking.occupySpot(f.id, s.r, s.c, null);
        // 2. Also save the full floor to guarantee DB is updated
        this.parking.saveFloorPublic(f.id);
        // 3. Refresh apartment parking list
        this.loadApartmentParkingList();
        this.closeDetails();
        Swal.fire({ icon: 'success', title: 'Removed', timer: 1500, showConfirmButton: false });
      };

      if (existing?.id) {
        // Delete from apartment_parking DB table first
        this.api.removeApartmentParking(existing.id).subscribe({
          next: () => doRemove(),
          error: () => {
            // Even if API fails, still clear locally
            doRemove();
          }
        });
      } else {
        doRemove();
      }
    });
  }

  setVehicleNumber(num: string) { this.currentVehicle.update(v => ({ ...v, vehicleNumber: num.toUpperCase() })); }
  setVehicleType(id: string) { this.currentVehicle.update(v => ({ ...v, vehicleTypeId: id })); }
  setVehicleCategory(id: string) { this.currentVehicle.update(v => ({ ...v, categoryId: id })); }

  // ── VEHICLE MANAGEMENT (non-residential) ──────────────────────────────────
  addVehicle() {
    const v = this.currentVehicle();
    const isPublic = this.floor()?.projectType === 'public';
    if ((!v.vehicleNumber && !isPublic) || !v.vehicleTypeId || !v.categoryId) return;
    const newV: ParkedVehicle = {
      id: `v-${Date.now()}`, vehicleNumber: v.vehicleNumber,
      vehicleTypeId: v.vehicleTypeId!, categoryId: v.categoryId!,
      entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.allocationVehicles.update(vs => [...vs, newV]);
    this.currentVehicle.set({ vehicleNumber: '', vehicleTypeId: this.parking.state().vehicleTypes[0]?.id || '', categoryId: this.parking.state().categories[0]?.id || '' });
  }

  removeVehicle(id: string) { this.allocationVehicles.update(vs => vs.filter(v => v.id !== id)); }

  // ── CLOSE ─────────────────────────────────────────────────────────────────
  closeAllocation() {
    this.isAllocating.set(false); this.isEditingAllocation.set(false);
    this.selectedSpot.set(null); this.selectedCustomer.set(null);
    this.apartmentCustomers.set([]); this.allocationVehicles.set([]);
  }

  closeDetails() { this.isViewingDetails.set(false); this.selectedSpot.set(null); this.existingAllocation.set(null); }
  editAllocation() { this.isViewingDetails.set(false); this.isEditingAllocation.set(true); }
  toggleViewMode() { 
    this.viewMode.update(v => v === '2D' ? '3D' : '2D');
    this.saveViewState();
  }
  zoomIn() { 
    this.scale.update(s => Math.min(2, s + 0.1));
    this.saveViewState();
  }
  zoomOut() { 
    this.scale.update(s => Math.max(0.4, s - 0.1));
    this.saveViewState();
  }
  resetView() { 
    this.rotation.set({ x: 25, y: 0, z: 0 }); 
    this.scale.set(1); 
    this.offset.set({ x: 0, y: 0 });
    this.saveViewState();
  }

  setSpotType(type: SpotType) {
    const s = this.selectedSpot(); const f = this.floor();
    if (s && f) { this.parking.setSpotType(f.id, s.r, s.c, type); this.selectedSpot.set(null); }
  }

  handleContextMenu(e: MouseEvent, r: number, c: number) {
    e.preventDefault(); e.stopPropagation();
    this.selectedSpot.set({ r, c });
    const vw = window.innerWidth; const vh = window.innerHeight;
    let x = e.clientX + 8; let y = e.clientY + 8;
    if (x + 260 > vw) x = e.clientX - 260 - 8;
    if (y + 320 > vh) y = e.clientY - 320 - 8;
    this.menuPos.set({ x: Math.max(8, x), y: Math.max(8, y) });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (this.selectedSpot() && !this.isAllocating() && !this.isViewingDetails() && !this.isEditingAllocation()) {
      if (!(e.target as HTMLElement).closest('.context-menu-panel')) this.selectedSpot.set(null);
    }
  }

  handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.parking-spot') || (e.target as HTMLElement).closest('.modal-content')) return;
    if (e.button === 2 || e.shiftKey) this.isPanning.set(true);
    else if (this.viewMode() === '3D') this.isDragging.set(true);
    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  handleWheel(e: WheelEvent) {
    if (this.isAnyModalOpen()) return;
    if ((e.target as HTMLElement).closest('.parking-floor')) {
      this.scale.update(s => Math.max(0.4, Math.min(2, s - e.deltaY * 0.001)));
    } else {
      this.offset.update(o => ({ x: o.x - e.deltaX * 0.5, y: o.y - e.deltaY * 0.5 }));
    }
    this.saveViewState();
  }

  onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging() && !this.isPanning()) return;
    const dx = e.clientX - this.lastMousePos.x; const dy = e.clientY - this.lastMousePos.y;
    if (this.isPanning()) this.offset.update(o => ({ x: o.x + dx, y: o.y + dy }));
    else if (this.viewMode() === '3D') this.rotation.update(r => ({ ...r, z: r.z - dx * 0.1, x: Math.max(0, Math.min(80, r.x - dy * 0.1)) }));
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.saveViewState();
  };

  onMouseUp = () => { 
    this.isDragging.set(false); 
    this.isPanning.set(false);
    this.saveViewState();
  };

  // ── FLOOR MANAGEMENT PROMPTS ───────────────────────────────────────────
  async addFloorPrompt() {
    const currentFloor = this.floor();
    const preApt = (this.parking as any)._preSelectedApt;
    
    // Resolve which apartment we are dealing with
    const activeAptId = currentFloor?.apartmentId || preApt?.plotKey;
    const activeAptName = preApt?.name || currentFloor?.name || 'this tower';

    const title = activeAptId ? `Add another floor to ${activeAptName}?` : 'Create another floor?';
    
    const { isConfirmed } = await Swal.fire({
      title: 'Structural Expansion',
      text: title,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, add floor',
      confirmButtonColor: '#fbbf24',
      cancelButtonColor: '#334155',
      background: '#ffffff',
      color: '#0f172a'
    });

    if (isConfirmed) {
      if (activeAptId) {
        this.parking.addFloorForApartment(activeAptName, activeAptId);
      } else {
        this.parking.openEditor();
      }
      
      Swal.fire({
        title: 'Floor Added',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  }

  private saveViewState() {
    const state = {
      rotation: this.rotation(),
      scale: this.scale(),
      offset: this.offset(),
      viewMode: this.viewMode()
    };
    sessionStorage.setItem('parkingGridViewState', JSON.stringify(state));
  }

  private loadViewState() {
    const saved = sessionStorage.getItem('parkingGridViewState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.rotation) this.rotation.set(state.rotation);
        if (state.scale) this.scale.set(state.scale);
        if (state.offset) this.offset.set(state.offset);
        if (state.viewMode) this.viewMode.set(state.viewMode);
      } catch (e) {
        console.error('Failed to load view state:', e);
      }
    }
  }

  async removeFloorPrompt() {
    const floors = this.parking.state().floors;
    if (floors.length === 0) return;

    const currentFloor = this.floor();
    const apt = (this.parking as any)._preSelectedApt;
    
    // Prioritize current floor's apartment context, then pre-selected apt
    const activeAptId = currentFloor?.apartmentId || apt?.plotKey;

    const relevantFloors = activeAptId 
      ? floors.filter(f => f.apartmentId === activeAptId)
      : floors;

    if (relevantFloors.length === 0) {
      Swal.fire('No floors found', 'There are no other floors assigned to this apartment tower.', 'info');
      return;
    }

    const options: any = {};
    relevantFloors.forEach(f => { options[f.id] = f.name; });

    const { value: floorId } = await Swal.fire({
      title: 'Decommission Floor',
      text: 'Select the floor you wish to remove permanently:',
      input: 'select',
      inputOptions: options,
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: '#ef4444',
      background: '#ffffff',
      color: '#0f172a',
      inputValidator: (value) => {
        if (!value) return 'You must select a floor!';
        return null;
      }
    });

    if (floorId) {
      const { isConfirmed } = await Swal.fire({
        title: 'Safety Confirmation',
        text: 'This will delete all spot allocations and record data for this floor. Proceed?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete permanently',
        background: '#ffffff'
      });

      if (isConfirmed) {
        await this.parking.deleteFloor(floorId);
        Swal.fire({
          title: 'Floor Removed',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    }
  }
}
