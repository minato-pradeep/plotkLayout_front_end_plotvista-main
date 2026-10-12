import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { NgZone } from '@angular/core';
import Swal from 'sweetalert2';
import { getBookingFormConfig, getSections, getFieldsBySection, BookingFormField } from '../../config/booking-form-config';

export interface CustomerModalData {
  plotId: string;
  plotName?: string;
  projectId: string;
  plotType?: string;
  sqft?: number;
  aptConfig?: any;
  vacateMode?: boolean;
  editBooking?: any;
  refBooking?: any;
  mode?: 'new' | 'edit' | 'add-person' | 'picker';
  allBookings?: any[];
}

@Component({
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" (click)="$event.stopPropagation()"
           style="background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 20px 60px rgba(0,0,0,0.12); max-height:92vh;">

        <!-- RESIDENT PICKER -->
        @if (showPicker()) {
          <div class="p-6">
            <div class="mb-5">
              <h2 class="text-base font-bold text-slate-800 mb-1">Manage Residents</h2>
              <p class="text-[11px] text-slate-500">{{ data.plotName || data.plotId }} has {{ pickerBookings().length }} active resident(s)</p>
            </div>

            <div class="space-y-2 mb-5 max-h-64 overflow-y-auto pb-24">
              @for (booking of pickerBookings(); track booking.id) {
                <div class="flex items-center justify-between p-3 rounded-xl border relative"
                     [class]="booking.customerType?.toLowerCase() === 'owner' ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black"
                         [class]="booking.customerType?.toLowerCase() === 'owner' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'">
                      {{ (booking.customerName || booking.name || 'Resident').charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-[13px] font-bold text-slate-800 leading-none">{{ booking.customerName || booking.name || 'Resident' }}</p>
                      <p class="text-[10px] font-bold mt-1" [class]="booking.customerType?.toLowerCase() === 'owner' ? 'text-emerald-600' : 'text-sky-600'">
                        {{ booking.customerType }} · {{ booking.customerMobile }}
                      </p>
                    </div>
                  </div>
                  <div class="pv-action-menu">
                    <button (click)="toggleMenu('picker_' + booking.id, $event)"
                            class="pv-action-trigger" [class.active]="activeMenuId() === 'picker_' + booking.id">
                      ⋮
                    </button>
                    @if (activeMenuId() === 'picker_' + booking.id) {
                      <div class="pv-action-dropdown">
                        <button (click)="pickResident(booking)" class="pv-action-item">
                          <span>✏️</span> Edit
                        </button>
                        <button (click)="deleteResident(booking)" class="pv-action-item delete">
                          <span>🗑️</span> Delete
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="flex gap-2">
              <button (click)="addNewResident()"
                      class="flex-1 py-3 rounded-xl text-[11px] font-bold bg-sky-500 text-white hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
                ➕ Add New Tenant / Owner
              </button>
              <button (click)="close.emit()"
                      class="px-5 py-3 rounded-xl text-[11px] font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        }

        <!-- VACATE CONFIRM -->
        @if (showRemoveConfirm()) {
          <div class="p-8 flex flex-col items-center text-center gap-5">
            <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-red-50 border border-red-100">⚠️</div>
            <div>
              <h2 class="text-base font-bold text-slate-800 mb-2">Remove All Bookings?</h2>
              <p class="text-[12px] leading-relaxed text-slate-500">
                All active bookings for <span class="font-semibold text-slate-700 font-mono">{{ data.plotName || data.plotId }}</span>
                will be archived as <span class="font-bold text-red-500">INACTIVE</span>.
              </p>
            </div>
            <div class="flex gap-3 w-full">
              <button (click)="close.emit()" class="flex-1 py-2.5 rounded-xl text-[11px] font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
              <button (click)="confirmVacate()" [disabled]="saving()"
                      class="flex-1 py-2.5 rounded-xl text-[11px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all">
                {{ saving() ? 'Removing...' : 'Yes, Remove All' }}
              </button>
            </div>
          </div>
        }

        @if (!showRemoveConfirm() && !showPicker()) {
          <!-- Header -->
          <div class="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                   [class]="isEditMode() ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'">
                {{ isEditMode() ? '✏️' : '📋' }}
              </div>
              <div>
                <h2 class="text-sm font-bold text-slate-800">
                  {{ isEditMode() ? 'Edit Resident' : isAddPersonMode() ? 'Add Owner / Tenant' : 'Book Plot' }}
                </h2>
                <p class="text-[10px] text-slate-400 font-mono mt-0.5">{{ data.plotName || data.plotId }}</p>
              </div>
            </div>
            <button (click)="close.emit()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-base">✕</button>
          </div>

          @if (message()) {
            <div class="mx-6 mt-3 px-4 py-2.5 rounded-xl text-[11px] font-semibold shrink-0"
                 [class]="messageType()==='error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'">
              {{ messageContent() }}
            </div>
          }

          <!-- FORM BODY -->
          <div class="px-6 py-5 overflow-y-auto flex-1" style="scrollbar-width:thin; scrollbar-color:#cbd5e1 transparent;">
            
            <!-- Property Summary Card -->
            <div class="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="text-xl">
                    @if (data.plotType === 'apartment') { 🏢 }
                    @else if (data.plotType === 'pg') { 🏠 }
                    @else { 📐 }
                  </span>
                  <p class="text-[11px] font-black uppercase tracking-widest text-slate-800">Property Details</p>
                </div>
                <span class="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100 uppercase tracking-tighter">
                  {{ data.plotType || 'Plot' }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Plot Name</label>
                  <p class="text-xs font-bold text-slate-900 truncate">{{ plotName() || data.plotName || '—' }}</p>
                </div>
                <div>
                  <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Door Number</label>
                  <p class="text-xs font-mono font-bold text-slate-900">{{ doorNo() || 'Not Assigned' }}</p>
                </div>
                <div>
                  <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Square Feet</label>
                  <p class="text-xs font-bold text-slate-900">{{ sqFeet() ? sqFeet() + ' sqft' : (data.sqft ? data.sqft + ' sqft' : '—') }}</p>
                </div>
                <div>
                  <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Payment Frequency</label>
                  <p class="text-xs font-bold text-slate-900">{{ paymentType() || 'Monthly' }}</p>
                </div>
              </div>

              @if (data.plotType === 'apartment' || data.plotType === 'pg') {
                <div class="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-2 gap-3">
                  <div class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <span class="text-[8px] font-black uppercase tracking-tighter text-slate-400 mb-0.5">Total Floors</span>
                    <span class="text-xs font-black text-slate-900">{{data.aptConfig?.floors || '—'}}</span>
                  </div>
                  <div class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <span class="text-[8px] font-black uppercase tracking-tighter text-slate-400 mb-0.5">Units/Floor</span>
                    <span class="text-xs font-black text-slate-900">{{data.aptConfig?.unitsPerFloor || '—'}}</span>
                  </div>
                </div>
              }
            </div>

            @for (section of formSections(); track section) {
              @if (!isAddPersonMode() || !isPropertySection(section)) {
                <div class="mb-5">
                  <p class="field-section-title">{{ getSectionIcon(section) }} {{ section }}</p>
                  <div class="grid grid-cols-2 gap-3">
                    @for (field of getFieldsForSection(section); track field.name) {
                      <div [class.col-span-2]="field.type === 'toggle' || field.type === 'textarea'">
                        
                        @if (field.type !== 'toggle') {
                          <label class="field-label">{{ field.label }} <span *if="field.required" class="text-red-400">*</span></label>
                        }

                        @if (field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'number' || field.type === 'date') {
                          <input [type]="field.type"
                                 [ngModel]="getFieldValue(field.name)" 
                                 (ngModelChange)="setFieldValue(field.name, $event)"
                                 [placeholder]="field.placeholder || ''"
                                 class="field-input"
                                 [class.ring-1]="field.required && !getFieldValue(field.name) && submitted"
                                 [class.ring-red-300]="field.required && !getFieldValue(field.name) && submitted" />
                        }

                        @if (field.type === 'select') {
                          @if (field.name === 'professionId') {
                            <select class="field-input" [ngModel]="getFieldValue(field.name) || ''" (ngModelChange)="onProfessionChange($event)">
                              <option value="">-- Select --</option>
                              @for (p of professions(); track p.id) {
                                <option [value]="p.id">{{ p.name }}</option>
                              }
                            </select>
                          } @else if (field.name === 'customerType') {
                            <div class="flex gap-2 mt-1">
                              <button (click)="setFieldValue(field.name, 'OWNER')"
                                      class="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all"
                                      [class]="getFieldValue(field.name) === 'OWNER' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'">
                                👤 Owner
                              </button>
                              <button (click)="setFieldValue(field.name, 'TENANT')"
                                      class="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all"
                                      [class]="getFieldValue(field.name) === 'TENANT' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'">
                                🏠 Tenant
                              </button>
                            </div>
                          } @else {
                            <select class="field-input" [ngModel]="getFieldValue(field.name)" (ngModelChange)="setFieldValue(field.name, $event)">
                              @for (opt of field.options; track opt.value) {
                                <option [value]="opt.value">{{ opt.label }}</option>
                              }
                            </select>
                          }
                        }

                        @if (field.type === 'toggle') {
                          <div class="flex items-center justify-between p-3 rounded-2xl border"
                               [class]="getToggleBg(field.name)">
                            <div class="flex items-center gap-2">
                              <span class="text-lg">{{ getToggleIcon(field.name) }}</span>
                              <p class="text-[10px] font-black" [class]="getToggleTextClass(field.name)">{{ field.label }}</p>
                            </div>
                            <button (click)="setFieldValue(field.name, !getFieldValue(field.name))"
                                    class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                                    [class]="getFieldValue(field.name) ? getToggleActiveBg(field.name) : 'bg-slate-300'">
                              <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition"
                                    [class]="getFieldValue(field.name) ? 'translate-x-5' : 'translate-x-0'"></span>
                            </button>
                          </div>
                        }
                        
                        @if (field.type === 'textarea') {
                          <textarea [ngModel]="getFieldValue(field.name)" (ngModelChange)="setFieldValue(field.name, $event)"
                                    [placeholder]="field.placeholder || ''" class="field-input" rows="3"></textarea>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            }

            @if (!isAddPersonMode()) {
              <div class="mb-2">
                <p class="field-section-title">📄 Document</p>
                @if (existingDocPath()) {
                  <div class="mb-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] cursor-pointer hover:bg-emerald-100 transition-all" (click)="downloadDocument()">
                    <p class="text-emerald-700 font-semibold mb-1">✓ Document attached</p>
                    <p class="text-emerald-600 truncate hover:underline">📥 {{ existingDocPath() }}</p>
                  </div>
                }
                <input type="file" accept=".pdf,image/*" (change)="onFile($event)"
                       class="field-input text-[11px] cursor-pointer" style="padding:7px 12px;" />
                @if (docFile) {
                  <p class="text-[10px] text-sky-600 mt-1 font-semibold">📎 New file selected: {{ docFile.name }}</p>
                }
              </div>
            }

          </div>

          <!-- Footer -->
          <div class="px-6 py-4 flex justify-end gap-3 shrink-0 border-t border-slate-100 bg-slate-50/60">
            <button (click)="close.emit()" class="px-5 py-2.5 rounded-xl text-[11px] font-semibold border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all">
              Cancel
            </button>
            <button (click)="save()" [disabled]="saving() || !data.projectId"
                    class="px-6 py-2.5 rounded-xl text-[11px] font-semibold bg-sky-500 text-white hover:bg-sky-600 transition-all shadow-sm">
              {{ saving() ? 'Saving...' : isEditMode() ? 'Update' : 'Save' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .field-section-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.25em; color:#64748b; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
    .field-label { display:block; font-size:10px; font-weight:600; color:#64748b; margin-bottom:5px; }
    .field-input { width:100%; padding:9px 12px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; color:#1e293b; font-size:13px; outline:none; box-sizing:border-box; transition:border-color 0.15s, box-shadow 0.15s; }
    .field-input:focus { border-color:#38bdf8; box-shadow:0 0 0 3px rgba(56,189,248,0.12); }
    .field-input::placeholder { color:#94a3b8; }
    @keyframes fadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  `]
})
export class CustomerModalComponent implements OnInit, OnChanges {
  @Input() data!: CustomerModalData;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() vacated = new EventEmitter<void>();

  customerName = signal('');
  customerMobile = signal('');
  email = signal('');
  professionId = signal<string | null>(null);
  professionName = signal('');
  customerType = signal('OWNER');
  sqFeet = signal<number | null>(null);
  plotName = signal('');
  doorNo = signal('');
  carParking = signal(false);
  foodNeeded = signal(false);
  paymentType = signal<string>('MONTHLY');
  fromDate = signal('');
  toDate = signal('');

  professions = signal<any[]>([]);
  saving = signal(false);
  message = signal(false);
  messageContent = signal('');
  messageType = signal<'error' | 'success'>('error');
  showRemoveConfirm = signal(false);
  showPicker = signal(false);
  pickerBookings = signal<any[]>([]);
  activeMenuId = signal<string | null>(null);
  submitted = false;
  docFile: File | null = null;
  existingDocPath = signal<string | null>(null);
  
  // Dynamic fields
  dynamicData = signal<Record<string, any>>({});

  @HostListener('document:click')
  closeMenus() { this.activeMenuId.set(null); }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    if (this.activeMenuId() === id) {
      this.activeMenuId.set(null);
    } else {
      this.activeMenuId.set(id);
    }
  }

  isEditMode() { return this.data?.mode === 'edit'; }
  isAddPersonMode() { return this.data?.mode === 'add-person'; }
  isPropertySection(section: string): boolean {
    const s = section.toLowerCase();
    return s.includes('property') || s.includes('plot') || s.includes('parking detail') || s.includes('room');
  }
  shouldShowDateRange() {
    const config = getBookingFormConfig(this.data?.plotType, this.plotName());
    return config.showDateRange === true;
  }
  shouldShowFoodNeeded() {
    const config = getBookingFormConfig(this.data?.plotType, this.plotName());
    return config.showFoodNeeded === true;
  }
  shouldShowCarParking() {
    const config = getBookingFormConfig(this.data?.plotType, this.plotName());
    return config.showCarParking === true;
  }

  // Dynamic Form Helpers
  formSections(): string[] {
    return getSections(this.data?.plotType, this.plotName());
  }

  getFieldsForSection(section: string): BookingFormField[] {
    return getFieldsBySection(this.data?.plotType, section, this.plotName());
  }

  getSectionIcon(section: string): string {
    const s = section.toLowerCase();
    if (s.includes('customer')) return '👤';
    if (s.includes('plot') || s.includes('property')) return '📐';
    if (s.includes('business') || s.includes('company')) return '🏢';
    if (s.includes('booking') || s.includes('lease') || s.includes('stay')) return '📅';
    if (s.includes('parking')) return '🚗';
    if (s.includes('amenities') || s.includes('options')) return '✨';
    return '📄';
  }

  getToggleIcon(name: string): string {
    if (name === 'carParking') return '🚗';
    if (name === 'foodNeeded') return '🍱';
    return '⚙️';
  }

  getToggleBg(name: string): string {
    if (name === 'carParking') return 'bg-slate-50 border-slate-200/60';
    if (name === 'foodNeeded') return 'bg-orange-50 border-orange-200/60';
    return 'bg-slate-50 border-slate-200/60';
  }

  getToggleTextClass(name: string): string {
    if (name === 'foodNeeded') return 'text-orange-700';
    return 'text-slate-700';
  }

  getToggleActiveBg(name: string): string {
    if (name === 'foodNeeded') return 'bg-orange-500';
    return 'bg-emerald-500';
  }

  getFieldValue(name: string): any {
    switch (name) {
      case 'customerName': return this.customerName();
      case 'customerMobile': return this.customerMobile();
      case 'email': return this.email();
      case 'professionId': return this.professionId();
      case 'customerType': return this.customerType();
      case 'plotName': return this.plotName();
      case 'doorNo': return this.doorNo();
      case 'sqFeet': return this.sqFeet();
      case 'paymentType': return this.paymentType();
      case 'fromDate': return this.fromDate();
      case 'toDate': return this.toDate();
      case 'carParking': return this.carParking();
      case 'foodNeeded': return this.foodNeeded();
      default: return this.dynamicData()[name];
    }
  }

  setFieldValue(name: string, value: any) {
    switch (name) {
      case 'customerName': this.customerName.set(value); break;
      case 'customerMobile': this.customerMobile.set(value); break;
      case 'email': this.email.set(value); break;
      case 'professionId': this.onProfessionChange(value); break;
      case 'customerType': this.customerType.set(value); break;
      case 'plotName': this.plotName.set(value); break;
      case 'doorNo': this.doorNo.set(value); break;
      case 'sqFeet': this.sqFeet.set(value ? +value : null); break;
      case 'paymentType': this.paymentType.set(value); break;
      case 'fromDate': this.fromDate.set(value); break;
      case 'toDate': this.toDate.set(value); break;
      case 'carParking': this.carParking.set(value === true || value === 'true'); break;
      case 'foodNeeded': this.foodNeeded.set(value === true || value === 'true'); break;
      default:
        const current = this.dynamicData();
        this.dynamicData.set({ ...current, [name]: value });
    }
  }

  constructor(private api: ApiService, private auth: AuthService, private ngZone: NgZone) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      // Don't call initForm here - wait for professions to load first
    }
  }

  ngOnInit() {
    // Load professions first, then initialize form after professions are loaded
    this.loadProfessions();
  }

  private initForm() {
    if (!this.data) return;
    this.plotName.set(this.data.plotName || '');
    if (this.data.sqft != null) this.sqFeet.set(this.data.sqft);

    if (this.data.vacateMode) {
      this.showRemoveConfirm.set(true);
      this.showPicker.set(false);
      return;
    }

    if (this.data.mode === 'picker' && this.data.allBookings) {
      this.showPicker.set(true);
      this.showRemoveConfirm.set(false);
      this.pickerBookings.set(this.data.allBookings);
      return;
    }

    if (this.data.mode === 'edit' && this.data.editBooking) {
      this.showPicker.set(false);
      this.showRemoveConfirm.set(false);
      this.prefillFromBooking(this.data.editBooking);
    }

    if (this.data.mode === 'add-person' && this.data.refBooking) {
      this.showPicker.set(false);
      this.showRemoveConfirm.set(false);
      const r = this.data.refBooking;
      this.sqFeet.set(r.sqFeet || this.data.sqft || null);
      this.plotName.set(r.plotName || this.data.plotName || '');
      this.doorNo.set(r.doorNo || '');
      this.carParking.set(r.carParking === true || r.carParking === 'true');
      this.paymentType.set(r.paymentType || 'MONTHLY');
      this.foodNeeded.set(r.foodNeeded === true || r.foodNeeded === 'true');
    }
  }

  private initFormAfterProfessions() {
    // Call initForm after professions are loaded to ensure profession dropdown works
    this.initForm();
  }

  private prefillFromBooking(b: any) {
    if (!b) return;
    console.log('[DEBUG] prefillFromBooking Data:', b);
    console.log('[DEBUG] Plot Type:', this.data.plotType);
    console.log('[DEBUG] Plot Type (lowercase):', this.data.plotType?.toLowerCase());
    console.log('[DEBUG] Is PG?:', this.data.plotType === 'pg' || this.data.plotType?.toLowerCase() === 'pg');

    this.customerName.set(b.customerName || b.name || '');
    this.customerMobile.set(b.customerMobile || b.mobile || b.phone || '');
    this.email.set(b.email || '');

    // Set profession - try to find by name in professions array
    if (b.professionName) {
      const prof = this.professions().find(p => p.name === b.professionName);
      if (prof) {
        this.professionId.set(prof.id);
        this.professionName.set(prof.name);
      } else {
        this.professionId.set(b.professionId || null);
        this.professionName.set(b.professionName || '');
      }
    } else if (b.professionId) {
      const prof = this.professions().find(p => p.id === b.professionId);
      if (prof) {
        this.professionId.set(prof.id);
        this.professionName.set(prof.name);
      } else {
        this.professionId.set(b.professionId);
      }
    }

    this.customerType.set(b.customerType || b.type || 'OWNER');
    this.paymentType.set(b.paymentType || 'MONTHLY');
    this.sqFeet.set(b.sqFeet != null ? +b.sqFeet : (this.data.sqft || null));
    this.plotName.set(b.plotName || this.data.plotName || '');
    this.doorNo.set(b.doorNo || '');
    this.carParking.set(b.carParking === true || b.carParking === 'true');
    this.foodNeeded.set(b.foodNeeded === true || b.foodNeeded === 'true');
    this.existingDocPath.set(b.documentPath || null);
    if (b.fromDate) this.fromDate.set(b.fromDate);
    if (b.toDate) this.toDate.set(b.toDate);

    // Pre-fill extra dynamic fields
    if (b.extraFields) {
      try {
        const extra = typeof b.extraFields === 'string' ? JSON.parse(b.extraFields) : b.extraFields;
        this.dynamicData.set(extra || {});
      } catch (e) {
        console.error('Failed to parse extraFields', e);
      }
    }
  }



  pickResident(booking: any) {
    this.ngZone.run(() => {
      this.showPicker.set(false);
      this.data.mode = 'edit';
      this.data.editBooking = { ...booking };
      this.prefillFromBooking(booking);
    });
  }

  addNewResident() {
    this.showPicker.set(false);
    this.data.mode = 'add-person';
    const ref = this.pickerBookings()[0];
    if (ref) {
      this.sqFeet.set(ref.sqFeet || this.data.sqft || null);
      this.plotName.set(ref.plotName || this.data.plotName || '');
      this.doorNo.set(ref.doorNo || '');
      this.carParking.set(ref.carParking === true || ref.carParking === 'true');
      this.paymentType.set(ref.paymentType || 'MONTHLY');
      this.foodNeeded.set(ref.foodNeeded === true || ref.foodNeeded === 'true');
    }
  }

  deleteResident(booking: any) {
    const name = booking.customerName || booking.name || 'this resident';
    if (!confirm(`Remove booking for ${name}?`)) return;
    this.saving.set(true);
    const del$ = booking.id ? this.api.vacateBooking(booking.id) : this.api.vacatePlot(this.data.projectId, booking.plotId);
    del$.subscribe({
      next: () => {
        this.saving.set(false);
        this.pickerBookings.set(this.pickerBookings().filter(b => b.id !== booking.id));
        this.saved.emit();
        if (this.pickerBookings().length === 0) this.close.emit();
      },
      error: () => { this.showError('Failed to remove'); this.saving.set(false); }
    });
  }

  onProfessionChange(id: string) {
    this.professionId.set(id || null);
    const p = this.professions().find(x => x.id === id);
    this.professionName.set(p ? p.name : '');
  }

  loadProfessions() {
    const cid = this.auth.getCompanyId();
    if (!cid) return;
    this.api.getProfessions(cid).subscribe({
      next: (r: any) => {
        this.professions.set((r.data || []).filter((p: any) => p.status === 'ACTIVE'));
        // Initialize form after professions are loaded
        this.initFormAfterProfessions();
      }
    });
  }

  onFile(e: any) { this.docFile = e.target.files?.[0] || null; }

  downloadDocument() {
    const docPath = this.existingDocPath();
    if (!docPath) {
      console.warn('[DOWNLOAD] No document path found');
      return;
    }

    console.log('[DOWNLOAD] Document path:', docPath);

    // The docPath is already the full path like "/uploads/documents/68bad4e2-9e02-4826-9cbf-491e40dc7a68.pdf"
    // We need to construct the full URL
    const fullUrl = window.location.origin + docPath;
    console.log('[DOWNLOAD] Full URL:', fullUrl);

    // Extract filename from path
    const filename = docPath.split('/').pop() || 'document';
    console.log('[DOWNLOAD] Filename:', filename);

    // Create download link with full URL
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('[DOWNLOAD] Download triggered');
  }

  async save() {
    this.submitted = true;
    if (!this.customerName().trim() || !this.customerMobile().trim()) {
      this.showError('Name and Mobile are required');
      return;
    }
    this.saving.set(true);
    try {
      const isEdit = this.data.mode === 'edit' && this.data.editBooking?.id;
      if (isEdit) {
        await firstValueFrom(this.api.updateBooking(this.data.editBooking.id, this.getPayload(), this.docFile || undefined));
      } else {
        await firstValueFrom(this.api.bookPlot(this.getFormData()));
      }
      this.saved.emit();
      this.close.emit();
    } catch (err: any) {
      this.showError(err.error?.message || 'Failed to save');
      this.saving.set(false);
    }
  }

  private getPayload() {
    const payload: any = {
      customerName: this.customerName().trim(),
      customerMobile: this.customerMobile().trim(),
      email: this.email().trim(),
      professionId: this.professionId(),
      professionName: this.professionName(),
      type: this.customerType(),
      foodNeeded: String(this.foodNeeded()),
      paymentType: this.paymentType(),
      doorNo: this.doorNo(),
      sqFeet: String(this.sqFeet() || ''),
      plotName: this.plotName(),
      carParking: String(this.carParking()),
      status: 'ACTIVE'
    };

    if (this.fromDate()) payload.fromDate = this.fromDate();
    if (this.toDate()) payload.toDate = this.toDate();

    // Attach any extra fields defined in config
    const config = getBookingFormConfig(this.data?.plotType, this.plotName());
    const extraFields: any = {};
    for (const field of config.fields) {
      if (!payload.hasOwnProperty(field.name)) {
         extraFields[field.name] = this.dynamicData()[field.name];
      }
    }
    
    if (Object.keys(extraFields).length > 0) {
      payload.extraFields = JSON.stringify(extraFields);
    }

    return payload;
  }

  private getFormData() {
    const fd = new FormData();
    const p = this.getPayload();
    fd.append('projectId', this.data.projectId);
    fd.append('plotId', this.data.plotId);
    Object.keys(p).forEach(k => fd.append(k, (p as any)[k]));
    if (this.docFile) fd.append('document', this.docFile);
    return fd;
  }

  confirmVacate() {
    this.saving.set(true);
    this.api.vacatePlot(this.data.projectId, this.data.plotId).subscribe({
      next: () => { this.vacated.emit(); this.close.emit(); },
      error: () => { this.showError('Failed to remove'); this.saving.set(false); }
    });
  }

  private showError(m: string) {
    this.messageContent.set(m);
    this.messageType.set('error');
    this.message.set(true);
    this.saving.set(false);
  }
  private showSuccess(m: string) {
    this.messageContent.set(m);
    this.messageType.set('success');
    this.message.set(true);
  }
}
