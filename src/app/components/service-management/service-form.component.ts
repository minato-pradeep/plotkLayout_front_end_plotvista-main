import {
  Component, Input, Output, EventEmitter, OnInit,
  signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ServiceProvider, ServiceCategory, ServiceDataService } from '../../services/service-data.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-service-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
<div class="fixed inset-0 z-[500] flex items-center justify-center p-4"
     style="background:rgba(15,23,42,0.65);backdrop-filter:blur(6px)"
     (click)="close.emit()">
  <div class="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
       style="background:#fff;border:1px solid #e2e8f0;box-shadow:0 24px 64px rgba(0,0,0,0.18);max-height:94vh"
       (click)="$event.stopPropagation()">

    <!-- Header -->
    <div class="px-6 py-4 flex items-center justify-between shrink-0"
         style="border-bottom:1px solid #e2e8f0;background:#f8fafc">
      <div>
        <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">
          {{ editData ? '✏️ Edit Service' : '➕ Add Service Provider' }}
        </h2>
        <p class="text-[10px] text-slate-400 mt-0.5">Fill in the details below</p>
      </div>
      <button (click)="close.emit()"
              class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-all text-base">✕</button>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto p-6 space-y-5"
         style="scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent">

      <!-- Type Toggle -->
      <div>
        <label class="flbl">Provider Type</label>
        <div class="flex gap-3 mt-1">
          <button (click)="form.type='individual'"
                  [class]="'flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase border-2 transition-all ' +
                    (form.type==='individual' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')">
            👤 Individual
          </button>
          <button (click)="form.type='company'"
                  [class]="'flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase border-2 transition-all ' +
                    (form.type==='company' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')">
            🏢 Company
          </button>
        </div>
      </div>

      <!-- Name -->
      <div>
        <label class="flbl">{{ form.type === 'company' ? 'Company Name' : 'Full Name' }} *</label>
        <input [(ngModel)]="form.name"
               [placeholder]="form.type==='company' ? 'e.g. ABC Services Pvt Ltd' : 'e.g. Rajan Kumar'"
               class="finp" [class.border-red-300]="submitted && !form.name.trim()" />
      </div>

      <!-- Work Types -->
      <div>
        <label class="flbl">Work Types * (select all that apply)</label>
        @if (categories().length === 0) {
          <div class="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[11px] text-slate-500">Loading services...</span>
          </div>
        } @else {
          <div class="flex flex-wrap gap-2 mt-1.5">
            @for (cat of categories(); track cat.id) {
              <button (click)="toggleWorkType(cat.id)"
                      [class]="'px-3 py-1.5 rounded-full text-[10px] font-black border-2 transition-all ' +
                        (form.workTypes.includes(cat.id)
                          ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600')">
                {{ cat.emoji }} {{ cat.label }}
              </button>
            }
          </div>
        }
        @if (submitted && form.workTypes.length === 0) {
          <p class="text-[10px] text-red-500 mt-1 font-semibold">Select at least one work type</p>
        }
      </div>

      <!-- Photo + Logo -->
      <div [class]="form.type === 'company' ? 'grid grid-cols-2 gap-4' : ''">
        <div>
          <label class="flbl">{{ form.type === 'company' ? 'Representative Photo' : 'Photo' }}</label>
          <div class="flex items-center gap-3 mt-1">
            <div class="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                 style="background:#f1f5f9;border:1.5px dashed #cbd5e1">
              @if (form.photo) {
                <img [src]="form.photo" class="w-full h-full object-cover" />
              } @else {
                <span class="text-2xl">📷</span>
              }
            </div>
            <label class="flex-1 cursor-pointer">
              <div class="px-3 py-2 rounded-xl text-[11px] font-bold text-center"
                   style="background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb">
                {{ photoFileName || 'Choose Photo' }}
              </div>
              <input type="file" accept="image/*" class="hidden" (change)="onPhoto($event)" />
            </label>
          </div>
        </div>
        @if (form.type === 'company') {
          <div>
            <label class="flbl">Company Logo</label>
            <div class="flex items-center gap-3 mt-1">
              <div class="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                   style="background:#f5f3ff;border:1.5px dashed #c4b5fd">
                @if (form.logo) {
                  <img [src]="form.logo" class="w-full h-full object-cover" />
                } @else {
                  <span class="text-2xl">🏢</span>
                }
              </div>
              <label class="flex-1 cursor-pointer">
                <div class="px-3 py-2 rounded-xl text-[11px] font-bold text-center"
                     style="background:#f5f3ff;border:1px solid #c4b5fd;color:#7c3aed">
                  {{ logoFileName || 'Choose Logo' }}
                </div>
                <input type="file" accept="image/*" class="hidden" (change)="onLogo($event)" />
              </label>
            </div>
          </div>
        }
      </div>

      <!-- Phones -->
      <div>
        <label class="flbl">Phone Numbers *</label>
        @for (ph of form.phones; track $index; let i = $index) {
          <div class="flex gap-2 mt-1.5">
            <input [(ngModel)]="form.phones[i]" placeholder="e.g. 9876543210"
                   class="finp flex-1" [class.border-red-300]="submitted && i===0 && !form.phones[0].trim()" />
            @if (form.phones.length > 1) {
              <button (click)="removePhone(i)"
                      class="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all shrink-0 border border-red-100 text-sm">✕</button>
            }
          </div>
        }
        <button (click)="addPhone()"
                class="mt-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 transition-all">
          + Add Phone
        </button>
      </div>

      <!-- Addresses -->
      <div>
        <label class="flbl">Addresses</label>
        @for (addr of form.addresses; track $index; let i = $index) {
          <div class="flex gap-2 mt-1.5">
            <input [(ngModel)]="form.addresses[i]" placeholder="e.g. 12, MG Road, Bangalore"
                   class="finp flex-1" />
            @if (form.addresses.length > 1) {
              <button (click)="removeAddress(i)"
                      class="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all shrink-0 border border-red-100 text-sm">✕</button>
            }
          </div>
        }
        <button (click)="addAddress()"
                class="mt-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 transition-all">
          + Add Address
        </button>
      </div>

      <!-- Location -->
      <div>
        <label class="flbl">Location / Area</label>
        <input [(ngModel)]="form.locationQuery" placeholder="e.g. Koramangala, Bangalore"
               class="finp" (ngModelChange)="onLocationChange()" />
        @if (mapUrl) {
          <div class="mt-2 rounded-xl overflow-hidden" style="height:180px;border:1px solid #e2e8f0">
            <iframe [src]="mapUrl" width="100%" height="180"
                    style="border:0" allowfullscreen loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        }
      </div>

      <!-- Radius + Experience -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="flbl">Service Radius: {{ form.radius }} km</label>
          <input type="range" min="1" max="50" [(ngModel)]="form.radius"
                 class="w-full mt-2 accent-blue-500" />
          <div class="flex justify-between text-[9px] text-slate-400 font-bold mt-0.5">
            <span>1 km</span><span>50 km</span>
          </div>
        </div>
        <div>
          <label class="flbl">Experience (years)</label>
          <input type="number" min="0" max="50" [(ngModel)]="form.experience"
                 placeholder="e.g. 5" class="finp" />
        </div>
      </div>

      <!-- Working Hours -->
      <div>
        <label class="flbl">Working Hours</label>
        <input [(ngModel)]="form.workingHours"
               placeholder="e.g. Mon–Sat, 8 AM – 8 PM" class="finp" />
      </div>

      <!-- Verified Status -->
      <div>
        <label class="flbl">Verification Status</label>
        <div class="flex items-center justify-between mt-1.5 p-3 rounded-xl"
             style="background:#f8fafc;border:1px solid #e2e8f0">
          <span class="text-[11px] font-black"
                [class]="form.verified ? 'text-emerald-600' : 'text-slate-500'">
            {{ form.verified ? '✅ Verified' : '⏳ Not Verified' }}
          </span>
          <button (click)="form.verified = !form.verified"
                  class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
                  [class]="form.verified ? 'bg-emerald-500' : 'bg-slate-300'">
            <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200"
                  [class]="form.verified ? 'translate-x-5' : 'translate-x-0'"></span>
          </button>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="flbl">Description (optional)</label>
        <textarea [(ngModel)]="form.description" rows="3"
                  placeholder="Brief description of services offered..."
                  class="finp resize-none"></textarea>
      </div>

      @if (errorMsg()) {
        <div class="px-4 py-2.5 rounded-xl text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
          {{ errorMsg() }}
        </div>
      }
    </div>

    <!-- Footer -->
    <div class="px-6 py-4 flex justify-end gap-3 shrink-0"
         style="border-top:1px solid #e2e8f0;background:#f8fafc">
      <button (click)="close.emit()"
              class="px-5 py-2.5 rounded-xl text-[11px] font-semibold border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all">
        Cancel
      </button>
      <button (click)="submit()"
              class="px-6 py-2.5 rounded-xl text-[11px] font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-sm">
        {{ editData ? 'Update' : 'Save Service' }}
      </button>
    </div>
  </div>
</div>
  `,
  styles: [`
    .flbl { display:block; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px; }
    .finp { width:100%; padding:9px 12px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; color:#1e293b; font-size:13px; outline:none; box-sizing:border-box; transition:border-color 0.15s, box-shadow 0.15s; }
    .finp:focus { border-color:#93c5fd; box-shadow:0 0 0 3px rgba(59,130,246,0.08); }
    .finp::placeholder { color:#94a3b8; }
  `]
})
export class ServiceFormComponent implements OnInit {
  @Input() editData: ServiceProvider | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{
    data: Omit<ServiceProvider, 'id' | 'companyId' | 'createdAt' | 'rating'>;
    photoFile?: File | null;
    logoFile?: File | null;
  }>();

  categories = signal<ServiceCategory[]>([]);
  apartments = signal<{ id: string; name: string }[]>([]);
  errorMsg = signal('');
  submitted = false;
  photoFileName = '';
  logoFileName = '';
  photoFile: File | null = null;
  logoFile: File | null = null;
  mapUrl: SafeResourceUrl | null = null;
  private mapTimer: any;

  form: {
    type: 'individual' | 'company';
    name: string;
    workTypes: string[];
    phones: string[];
    addresses: string[];
    photo: string;
    logo: string;
    locationQuery: string;
    radius: number;
    verified: boolean;
    active: boolean;
    description: string;
    experience: number;
    workingHours: string;
  } = {
    type: 'individual', name: '', workTypes: [], phones: [''], addresses: [''],
    photo: '', logo: '', locationQuery: '', radius: 10, verified: false,
    active: true, description: '', experience: 0, workingHours: ''
  };

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private svc: ServiceDataService
  ) {}

  ngOnInit() {
    this.loadCategories();
    if (this.editData) {
      const e = this.editData;
      this.form = {
        type: e.type, name: e.name, workTypes: [...e.workTypes],
        phones: e.phones.length ? [...e.phones] : [''],
        addresses: e.addresses.length ? [...e.addresses] : [''],
        photo: e.photo, logo: e.logo, locationQuery: e.locationQuery,
        radius: e.radius, verified: e.verified, active: e.active,
        description: e.description,
        experience: e.experience, workingHours: e.workingHours
      };
      if (e.locationQuery) this.buildMapUrl(e.locationQuery);
    }
  }

  private readonly DEFAULT_CATEGORIES: ServiceCategory[] = [
    { id: 'Plumbing',     label: 'Plumbing',     emoji: '🔧' },
    { id: 'Electrician',  label: 'Electrician',  emoji: '⚡' },
    { id: 'Laundry',      label: 'Laundry',      emoji: '🧺' },
    { id: 'Cleaning',     label: 'Cleaning',     emoji: '🧹' },
    { id: 'Carpenter',    label: 'Carpenter',    emoji: '🪚' },
    { id: 'AC Repair',    label: 'AC Repair',    emoji: '❄️' },
    { id: 'Painting',     label: 'Painting',     emoji: '🎨' },
    { id: 'Pest Control', label: 'Pest Control', emoji: '🐛' },
    { id: 'Security',     label: 'Security',     emoji: '🛡️' },
    { id: 'Others',       label: 'Others',       emoji: '📦' },
  ];

  private loadCategories() {
    // First use already-loaded categories from service (instant, no API call needed)
    const existing = this.svc.categories();
    if (existing.length > 0) {
      this.categories.set(existing);
      this.cdr.markForCheck();
      return;
    }

    // Fallback: fetch from API
    this.api.getServices().subscribe({
      next: (res: any) => {
        const services = res.data ?? [];
        const emojiMap: Record<string, string> = {
          'Plumbing': '🔧', 'Electrician': '⚡', 'Laundry': '🧺',
          'Cleaning': '🧹', 'Carpenter': '🪚', 'AC Repair': '❄️',
          'Painting': '🎨', 'Pest Control': '🐛', 'Security': '🛡️', 'Others': '📦',
        };
        const cats: ServiceCategory[] = services
          .filter((s: any) => s.status === 'ACTIVE' || s.status === 'active' || s.status === 'Active')
          .map((s: any) => ({
            id: s.name,
            label: s.name,
            emoji: emojiMap[s.name] || '🛠️'
          }));
        // If API returns nothing useful, use hardcoded defaults
        this.categories.set(cats.length > 0 ? cats : this.DEFAULT_CATEGORIES);
        this.cdr.markForCheck();
      },
      error: () => {
        // API failed — show defaults so the form is never stuck on "Loading..."
        this.categories.set(this.DEFAULT_CATEGORIES);
        this.cdr.markForCheck();
      }
    });
  }

  onLocationChange() {
    clearTimeout(this.mapTimer);
    this.mapTimer = setTimeout(() => {
      if (this.form.locationQuery.trim()) this.buildMapUrl(this.form.locationQuery);
      else this.mapUrl = null;
      this.cdr.markForCheck();
    }, 800);
  }

  private buildMapUrl(q: string) {
    const url = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  toggleWorkType(id: string) {
    const idx = this.form.workTypes.indexOf(id);
    if (idx >= 0) this.form.workTypes.splice(idx, 1);
    else this.form.workTypes.push(id);
  }

  addPhone() { this.form.phones.push(''); }
  removePhone(i: number) { this.form.phones.splice(i, 1); }
  addAddress() { this.form.addresses.push(''); }
  removeAddress(i: number) { this.form.addresses.splice(i, 1); }

  onPhoto(e: any) {
    const file: File = e.target.files?.[0];
    if (!file) return;
    this.photoFile = file;
    this.photoFileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev: any) => { this.form.photo = ev.target.result; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  onLogo(e: any) {
    const file: File = e.target.files?.[0];
    if (!file) return;
    this.logoFile = file;
    this.logoFileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev: any) => { this.form.logo = ev.target.result; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  submit() {
    this.submitted = true;
    this.errorMsg.set('');
    if (!this.form.name.trim()) { this.errorMsg.set('Name is required'); return; }
    if (this.form.workTypes.length === 0) { this.errorMsg.set('Select at least one work type'); return; }
    if (!this.form.phones[0]?.trim()) { this.errorMsg.set('At least one phone number is required'); return; }

    this.saved.emit({
      data: {
        type: this.form.type,
        name: this.form.name.trim(),
        workTypes: [...this.form.workTypes],
        phones: this.form.phones.filter(p => p.trim()),
        addresses: this.form.addresses.filter(a => a.trim()),
        photo: this.photoFile ? '' : this.form.photo,   // cleared if new file chosen
        logo: this.form.type === 'company' ? (this.logoFile ? '' : this.form.logo) : '',
        locationQuery: this.form.locationQuery,
        radius: this.form.radius,
        verified: this.form.verified,
        active: this.form.active,
        description: this.form.description,
        experience: this.form.experience,
        workingHours: this.form.workingHours
      },
      photoFile: this.photoFile,
      logoFile: this.logoFile
    });
  }
}
