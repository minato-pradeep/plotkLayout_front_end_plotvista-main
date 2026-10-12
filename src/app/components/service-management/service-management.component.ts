import {
  Component, signal, ChangeDetectionStrategy, OnInit, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceDataService, ServiceProvider, SERVICE_CATEGORIES } from '../../services/service-data.service';
import { ServiceFormComponent } from './service-form.component';

export interface SavedPayload {
  data: Omit<ServiceProvider, 'id' | 'companyId' | 'createdAt' | 'rating'>;
  photoFile?: File | null;
  logoFile?: File | null;
}

@Component({
  selector: 'app-service-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ServiceFormComponent],
  template: `
<div class="min-h-screen" style="background:#f1f5f9;font-family:'Inter',sans-serif">

  <!-- Header -->
  <header class="sticky top-0 z-40 px-6 py-3 flex items-center justify-between"
          style="background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 8px rgba(0,0,0,0.06)">
    <div class="flex items-center gap-3">
      <button (click)="router.navigate(['/dashboard'])"
              class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all text-slate-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div>
        <h1 class="text-sm font-black text-slate-800 uppercase tracking-widest">🛠️ Services</h1>
        <p class="text-[10px] text-slate-400">
          {{ svc.loading() ? 'Loading…' : svc.services().length + ' providers registered' }}
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button (click)="view.set(view()==='categories'?'manage':'categories')"
              class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all"
              [class]="view()==='manage' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'">
        📋 {{ view()==='manage' ? 'Categories' : 'Manage' }}
      </button>
    </div>
  </header>

  <div class="px-6 py-5 max-w-7xl mx-auto">

    <!-- Action Bar Below Header -->
    <div class="mb-5 flex items-center justify-between gap-4">
      <div class="flex-1">
        @if (selectedCat() || view() === 'manage') {
          <div class="flex gap-3 items-center">
            @if (selectedCat()) {
              <button (click)="selectedCat.set(null)"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shrink-0">
                ← Back
              </button>
            }
            <div class="relative flex-1 max-w-sm">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input [(ngModel)]="searchQ" placeholder="Search by name, type, location…"
                     class="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] border border-slate-200 bg-white outline-none focus:border-blue-300 transition-all" />
            </div>
          </div>
        }
      </div>
      <button (click)="openAdd()"
              class="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
        Add Service
      </button>
    </div>

    <!-- Loading skeleton -->
    @if (svc.loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        @for (i of [1,2,3,4,5,6,7,8,9,10]; track i) {
          <div class="h-28 rounded-2xl animate-pulse" style="background:#e2e8f0"></div>
        }
      </div>
    }

    <!-- MANAGE VIEW -->
    @if (!svc.loading() && view() === 'manage') {
      <div class="rounded-2xl overflow-hidden" style="background:#fff;border:1px solid #e2e8f0;box-shadow:0 2px 12px rgba(0,0,0,0.05)">
        <div class="px-5 py-3 flex items-center justify-between" style="border-bottom:1px solid #f1f5f9;background:#f8fafc">
          <span class="text-[11px] font-black text-slate-600 uppercase tracking-widest">All Service Providers</span>
          <span class="text-[10px] text-slate-400">{{ filteredAll().length }} records</span>
        </div>
        @if (filteredAll().length === 0) {
          <div class="py-16 text-center text-slate-400 text-sm">No services found. Click "+ Add Service" to get started.</div>
        } @else {
          <div class="divide-y divide-slate-50">
            @for (s of filteredAll(); track s.id) {
              <div class="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-all">
                <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-xl"
                     style="background:#f1f5f9">
                  @if (s.photo || s.logo) {
                    <img [src]="imgSrc(s.photo || s.logo)" class="w-full h-full object-cover" />
                  } @else {
                    {{ getCatEmoji(s.workTypes[0]) }}
                  }
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[13px] font-bold text-slate-800 truncate">{{ s.name }}</span>
                    @if (s.verified) {
                      <span class="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">✅ Verified</span>
                    }
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded-full border"
                          [class]="s.active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-400 border-red-100'">
                      {{ s.active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5 truncate">
                    {{ s.workTypes.join(', ') }} · {{ s.phones[0] }}
                    @if (s.locationQuery) { · {{ s.locationQuery }} }
                  </div>
                </div>
                <div class="pv-action-menu">
                  <button class="pv-action-trigger" [class.active]="activeMenuId() === 'svc_' + s.id" (click)="toggleMenu('svc_' + s.id, $event)">⋮</button>
                  @if (activeMenuId() === 'svc_' + s.id) {
                    <div class="pv-action-dropdown">
                      <button (click)="openEdit(s)" class="pv-action-item">
                        <span>✏️</span> Edit
                      </button>
                      <button (click)="onDelete(s.id)" class="pv-action-item delete">
                        <span>🗑️</span> Delete
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- CATEGORIES VIEW -->
    @if (!svc.loading() && view() === 'categories' && !selectedCat()) {
      <div>
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Browse by Category</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          @for (cat of categories; track cat.id) {
            <button (click)="selectedCat.set(cat.id)"
                    class="group flex flex-col items-center gap-2 p-5 rounded-2xl transition-all hover:-translate-y-0.5"
                    style="background:#fff;border:1.5px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
              <span class="text-3xl">{{ cat.emoji }}</span>
              <span class="text-[11px] font-black text-slate-700 uppercase tracking-wide">{{ cat.label }}</span>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style="background:#f1f5f9;color:#64748b">
                {{ countForCat(cat.id) }} providers
              </span>
            </button>
          }
        </div>
      </div>
    }

    <!-- CATEGORY DETAIL VIEW -->
    @if (!svc.loading() && view() === 'categories' && selectedCat()) {
      @let catInfo = getCatInfo(selectedCat()!);
      <div>
        <div class="flex items-center gap-2 mb-5">
          <span class="text-2xl">{{ catInfo?.emoji }}</span>
          <div>
            <h2 class="text-base font-black text-slate-800">{{ catInfo?.label }}</h2>
            <p class="text-[10px] text-slate-400">{{ filteredByCat().length }} service providers</p>
          </div>
        </div>

        @if (filteredByCat().length === 0) {
          <div class="py-20 text-center rounded-2xl" style="background:#fff;border:1px solid #e2e8f0">
            <div class="text-4xl mb-3">{{ catInfo?.emoji }}</div>
            <p class="text-slate-500 text-sm font-semibold">No providers in this category yet.</p>
            <button (click)="openAdd()" class="mt-4 px-5 py-2 rounded-xl text-[11px] font-black uppercase bg-blue-500 text-white hover:bg-blue-600 transition-all">
              + Add First Provider
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (s of filteredByCat(); track s.id) {
              <div (click)="selectedService.set(s)"
                   class="rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
                   style="background:#fff;border:1.5px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
                <div class="h-28 flex items-center justify-center relative"
                     style="background:linear-gradient(135deg,#f8fafc,#f1f5f9)">
                  @if (s.photo || s.logo) {
                    <img [src]="imgSrc(s.photo || s.logo)" class="h-full w-full object-cover" />
                  } @else {
                    <span class="text-5xl opacity-60">{{ getCatEmoji(s.workTypes[0]) }}</span>
                  }
                  <span class="absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full border"
                        [class]="s.active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-400 border-red-100'">
                    {{ s.active ? '● Active' : '○ Inactive' }}
                  </span>
                  @if (s.verified) {
                    <span class="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">✓ Verified</span>
                  }
                </div>
                <div class="p-3">
                  <div class="flex items-start justify-between gap-1">
                    <h3 class="text-[13px] font-black text-slate-800 leading-tight truncate">{{ s.name }}</h3>
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          [class]="s.type==='company' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'">
                      {{ s.type === 'company' ? '🏢' : '👤' }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    @for (wt of s.workTypes.slice(0,3); track wt) {
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{{ wt }}</span>
                    }
                    @if (s.workTypes.length > 3) {
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">+{{ s.workTypes.length - 3 }}</span>
                    }
                  </div>
                  <div class="mt-2 space-y-0.5">
                    @if (s.phones[0]) {
                      <div class="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>📞</span> {{ s.phones[0] }}
                      </div>
                    }
                    @if (s.locationQuery) {
                      <div class="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                        <span>📍</span> {{ s.locationQuery }}
                      </div>
                    }
                    @if (s.workingHours) {
                      <div class="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>🕐</span> {{ s.workingHours }}
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

  </div>
</div>

<!-- Service Detail Modal -->
@if (selectedService()) {
  @let s = selectedService()!;
  <div class="fixed inset-0 z-[400] flex items-center justify-center p-4"
       style="background:rgba(15,23,42,0.65);backdrop-filter:blur(6px)"
       (click)="selectedService.set(null)">
    <div class="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
         style="background:#fff;border:1px solid #e2e8f0;box-shadow:0 24px 64px rgba(0,0,0,0.18);max-height:90vh"
         (click)="$event.stopPropagation()">

      <div class="h-36 relative flex items-center justify-center shrink-0"
           style="background:linear-gradient(135deg,#f8fafc,#e2e8f0)">
        @if (s.photo || s.logo) {
          <img [src]="imgSrc(s.photo || s.logo)" class="h-full w-full object-cover" />
        } @else {
          <span class="text-6xl opacity-50">{{ getCatEmoji(s.workTypes[0]) }}</span>
        }
        <button (click)="selectedService.set(null)"
                class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-slate-500 hover:bg-white transition-all text-sm shadow">✕</button>
        @if (s.verified) {
          <span class="absolute top-3 left-3 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow">✓ Verified</span>
        }
      </div>

      <div class="flex-1 overflow-y-auto p-5 space-y-4" style="scrollbar-width:thin">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-black text-slate-800">{{ s.name }}</h2>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  [class]="s.type==='company' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'">
              {{ s.type === 'company' ? '🏢 Company' : '👤 Individual' }}
            </span>
          </div>
          <div class="flex flex-col items-center gap-1 shrink-0">
            <span class="text-[9px] font-black uppercase text-slate-400">Availability</span>
            <button (click)="onToggle(s)"
                    class="relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
                    [class]="s.active ? 'bg-emerald-500' : 'bg-slate-300'">
              <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
                    [class]="s.active ? 'translate-x-6' : 'translate-x-0'"></span>
            </button>
            <span class="text-[9px] font-black" [class]="s.active ? 'text-emerald-600' : 'text-slate-400'">
              {{ s.active ? 'ON' : 'OFF' }}
            </span>
          </div>
        </div>

        <div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Services Offered</p>
          <div class="flex flex-wrap gap-1.5">
            @for (wt of s.workTypes; track wt) {
              <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {{ getCatEmoji(wt) }} {{ wt }}
              </span>
            }
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          @if (s.phones.length) {
            <div class="p-3 rounded-xl" style="background:#f8fafc;border:1px solid #f1f5f9">
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">📞 Phone</p>
              @for (ph of s.phones; track ph) {
                <p class="text-[12px] font-semibold text-slate-700">{{ ph }}</p>
              }
            </div>
          }
          @if (s.locationQuery) {
            <div class="p-3 rounded-xl" style="background:#f8fafc;border:1px solid #f1f5f9">
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">📍 Location</p>
              <p class="text-[12px] font-semibold text-slate-700">{{ s.locationQuery }}</p>
              <p class="text-[10px] text-slate-400">Within {{ s.radius }} km</p>
            </div>
          }
          @if (s.workingHours) {
            <div class="p-3 rounded-xl" style="background:#f8fafc;border:1px solid #f1f5f9">
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">🕐 Working Hours</p>
              <p class="text-[12px] font-semibold text-slate-700">{{ s.workingHours }}</p>
            </div>
          }
          @if (s.experience) {
            <div class="p-3 rounded-xl" style="background:#f8fafc;border:1px solid #f1f5f9">
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">🏅 Experience</p>
              <p class="text-[12px] font-semibold text-slate-700">{{ s.experience }} years</p>
            </div>
          }
        </div>

        @if (s.addresses.length && s.addresses[0]) {
          <div class="p-3 rounded-xl" style="background:#f8fafc;border:1px solid #f1f5f9">
            <p class="text-[9px] font-black text-slate-400 uppercase mb-1">🏠 Address</p>
            @for (addr of s.addresses; track addr) {
              <p class="text-[12px] font-semibold text-slate-700">{{ addr }}</p>
            }
          </div>
        }

        @if (s.description) {
          <div class="p-3 rounded-xl" style="background:#f8fafc;border:1px solid #f1f5f9">
            <p class="text-[9px] font-black text-slate-400 uppercase mb-1">📝 Description</p>
            <p class="text-[12px] text-slate-600 leading-relaxed">{{ s.description }}</p>
          </div>
        }
      </div>

      <div class="px-5 py-3 flex justify-end items-center shrink-0 gap-3"
           style="border-top:1px solid #f1f5f9;background:#f8fafc">
        <!-- Modern Meatball for Tablet/Mobile Detail View consistency if needed, but for detail footer we can use buttons or meatball -->
        <!-- User specifically asked for 'action want to be in three dots' -->
        <div class="pv-action-menu">
          <button class="pv-action-trigger" [class.active]="activeMenuId() === 'detail_' + s.id" (click)="toggleMenu('detail_' + s.id, $event)">⋮</button>
          @if (activeMenuId() === 'detail_' + s.id) {
            <div class="pv-action-dropdown" style="bottom: 100%; top: auto; margin-bottom: 8px;">
              <button (click)="openEdit(s); selectedService.set(null)" class="pv-action-item">
                <span>✏️</span> Edit
              </button>
              <button (click)="onDelete(s.id); selectedService.set(null)" class="pv-action-item delete">
                <span>🗑️</span> Delete
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  </div>
}

<!-- Add / Edit Form -->
@if (showForm()) {
  <app-service-form
    [editData]="editTarget()"
    (close)="showForm.set(false); editTarget.set(null)"
    (saved)="onSaved($event)">
  </app-service-form>
}

<!-- Toast -->
@if (toast()) {
  <div class="fixed bottom-6 right-6 z-[600] px-5 py-3 rounded-2xl text-[12px] font-bold shadow-xl transition-all"
       [class]="toastType()==='error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'">
    {{ toast() }}
  </div>
}
  `
})
export class ServiceManagementComponent implements OnInit {
  activeMenuId = signal<string | null>(null);

  @HostListener('document:click')
  closeMenus() { this.activeMenuId.set(null); }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.activeMenuId.update(current => current === id ? null : id);
  }
  view = signal<'categories' | 'manage'>('categories');
  selectedCat = signal<string | null>(null);
  selectedService = signal<ServiceProvider | null>(null);
  showForm = signal(false);
  editTarget = signal<ServiceProvider | null>(null);
  searchQ = '';
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  constructor(
    public svc: ServiceDataService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { 
    this.svc.reload();
  }

  get categories() {
    return this.svc.categories();
  }

  filteredAll() {
    const q = this.searchQ.toLowerCase();
    return this.svc.services().filter(s =>
      !q || s.name.toLowerCase().includes(q) ||
      s.workTypes.some(w => w.toLowerCase().includes(q)) ||
      s.locationQuery.toLowerCase().includes(q)
    );
  }

  filteredByCat() {
    const q = this.searchQ.toLowerCase();
    return this.svc.services().filter(s =>
      s.workTypes.includes(this.selectedCat()!) &&
      (!q || s.name.toLowerCase().includes(q) ||
       s.locationQuery.toLowerCase().includes(q))
    );
  }

  countForCat(catId: string) {
    return this.svc.services().filter(s => s.workTypes.includes(catId)).length;
  }

  getCatInfo(id: string) { return this.svc.categories().find(c => c.id === id); }
  getCatEmoji(id: string) { return this.svc.categories().find(c => c.id === id)?.emoji ?? '🛠️'; }

  /** Prefix server-side paths with backend base URL; leave base64 data-urls as-is */
  imgSrc(path: string): string {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return 'http://localhost:8082' + path;
  }

  openAdd() { this.editTarget.set(null); this.showForm.set(true); }
  openEdit(s: ServiceProvider) { this.editTarget.set(s); this.showForm.set(true); }

  onSaved(payload: SavedPayload) {
    const target = this.editTarget();
    const obs = target
      ? this.svc.update(target.id, payload.data, payload.photoFile, payload.logoFile)
      : this.svc.create(payload.data, payload.photoFile, payload.logoFile);

    obs.subscribe({
      next: () => {
        this.showForm.set(false);
        this.editTarget.set(null);
        this.showToast(target ? 'Service updated ✓' : 'Service added ✓', 'success');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.showToast('Save failed: ' + (err?.error?.message ?? err?.message ?? 'Unknown error'), 'error');
        this.cdr.markForCheck();
      }
    });
  }

  onDelete(id: string) {
    if (!confirm('Delete this service provider?')) return;
    this.svc.delete(id).subscribe({
      next: () => { this.showToast('Deleted ✓', 'success'); this.cdr.markForCheck(); },
      error: () => { this.svc.reload(); this.showToast('Delete failed', 'error'); this.cdr.markForCheck(); }
    });
  }

  onToggle(s: ServiceProvider) {
    this.svc.toggleActive(s.id).subscribe({
      error: () => { this.svc.reload(); this.cdr.markForCheck(); }
    });
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => { this.toast.set(''); this.cdr.markForCheck(); }, 3000);
  }
}
