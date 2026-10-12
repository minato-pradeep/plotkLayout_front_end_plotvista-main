import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface Company {
  id: string;
  companyId?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  notes?: string;
  active: boolean;
}

@Component({
  selector: 'app-company-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen flex flex-col bg-[#f8fafc] overflow-hidden">
      
      <!-- HEADER -->
      <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div class="flex items-center gap-4">
          <button (click)="router.navigate(['/dashboard'])" 
                  class="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-500 border border-slate-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 class="text-base font-black text-slate-900 tracking-tight leading-none">🏢 Company Management</h1>
            <p class="text-[9px] font-bold text-sky-500 uppercase tracking-[0.2em] mt-1">{{ companies().length }} Total Companies</p>
          </div>
        </div>

        <button (click)="openAddModal()" 
                class="px-4 py-2 bg-sky-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all flex items-center gap-2 shadow-lg">
          ➕ Add Company
        </button>
      </header>

      <!-- MAIN CONTENT -->
      <main class="flex-1 overflow-auto p-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-900 text-white">
                <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-12">S.No</th>
                <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Company Name</th>
                <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Contact Person</th>
                <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Phone</th>
                <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Email</th>
                <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Status</th>
                <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (company of companies(); track company.id; let idx = $index) {
                <tr class="border-b border-slate-100 hover:bg-sky-50/50 transition-colors group">
                  <td class="py-3 px-4 text-[11px] font-bold text-slate-400">{{ idx + 1 }}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-[11px] font-black text-sky-600 border border-sky-100">
                        {{ company.name.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <p class="text-[11px] font-black text-slate-800">{{ company.name }}</p>
                        @if (company.address) {
                          <p class="text-[9px] text-slate-400">{{ company.address }}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-[11px] font-bold text-slate-600">{{ company.contactPerson || '—' }}</td>
                  <td class="py-3 px-4 text-[11px] font-bold text-slate-600 font-mono">{{ company.phone || '—' }}</td>
                  <td class="py-3 px-4 text-[11px] font-bold text-slate-600">{{ company.email || '—' }}</td>
                  <td class="py-3 px-4">
                    <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg"
                          [class]="company.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'">
                      {{ company.active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="pv-action-menu">
                      <button class="pv-action-trigger" [class.active]="activeMenuId() === 'comp_' + company.id" (click)="toggleMenu('comp_' + company.id, $event)">⋮</button>
                      @if (activeMenuId() === 'comp_' + company.id) {
                        <div class="pv-action-dropdown">
                          <button (click)="viewCompany(company)" class="pv-action-item">
                            <span>👁️</span> View
                          </button>
                          <button (click)="editCompany(company)" class="pv-action-item">
                            <span>✏️</span> Edit
                          </button>
                          <button (click)="deleteCompany(company)" class="pv-action-item delete">
                            <span>🗑️</span> Delete
                          </button>
                        </div>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (companies().length === 0) {
            <div class="py-16 text-center">
              <div class="text-4xl mb-3 opacity-20">🏢</div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No companies yet</p>
              <button (click)="openAddModal()" class="mt-4 px-4 py-2 bg-sky-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all">
                Add First Company
              </button>
            </div>
          }
        </div>
      </main>

      <!-- ADD/EDIT MODAL -->
      @if (showModal()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4" (click)="closeModal()">
          <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>
          <div class="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in" (click)="$event.stopPropagation()">
            
            <!-- Header -->
            <div class="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">🏢</div>
                <h3 class="text-base font-black text-white">{{ editMode() ? 'Edit Company' : 'Add New Company' }}</h3>
              </div>
              <button (click)="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">✕</button>
            </div>

            <!-- Form -->
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Company Name *</label>
                  <input type="text" [(ngModel)]="formData.name" placeholder="Enter company name"
                         class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                </div>

                <div class="col-span-2">
                  <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Address</label>
                  <input type="text" [(ngModel)]="formData.address" placeholder="Enter address"
                         class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                </div>

                <div>
                  <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Contact Person</label>
                  <input type="text" [(ngModel)]="formData.contactPerson" placeholder="Enter contact person"
                         class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                </div>

                <div>
                  <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Phone</label>
                  <input type="tel" [(ngModel)]="formData.phone" placeholder="Enter phone number"
                         class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                </div>

                <div class="col-span-2">
                  <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Email</label>
                  <input type="email" [(ngModel)]="formData.email" placeholder="Enter email address"
                         class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                </div>

                <div class="col-span-2">
                  <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Notes</label>
                  <textarea [(ngModel)]="formData.notes" placeholder="Enter additional notes" rows="3"
                            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none"></textarea>
                </div>

                <div class="col-span-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="formData.active" class="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                    <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 pb-6 flex gap-3">
              <button (click)="closeModal()" class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button (click)="saveCompany()" class="flex-1 py-3 bg-sky-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all">
                {{ editMode() ? 'Update' : 'Save' }} Company
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class CompanyManagementComponent implements OnInit {
  activeMenuId = signal<string | null>(null);

  @HostListener('document:click')
  closeMenus() { this.activeMenuId.set(null); }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.activeMenuId.update(current => current === id ? null : id);
  }
  private api = inject(ApiService);
  private auth = inject(AuthService);
  router = inject(Router);

  companies = signal<Company[]>([]);
  showModal = signal(false);
  editMode = signal(false);
  
  formData: Company = {
    id: '',
    companyId: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    notes: '',
    active: true
  };

  ngOnInit() {
    this.loadServiceCompanies();
  }

  loadServiceCompanies() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    
    this.api.getServiceCompanies(companyId).subscribe({
      next: (data) => {
        this.companies.set(data || []);
      },
      error: (err) => {
        console.error('Failed to load service companies:', err);
        Swal.fire('Error', 'Failed to load companies', 'error');
      }
    });
  }

  openAddModal() {
    this.editMode.set(false);
    this.formData = {
      id: '',
      companyId: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      contactPerson: '',
      notes: '',
      active: true
    };
    this.showModal.set(true);
  }

  editCompany(company: Company) {
    this.editMode.set(true);
    this.formData = { ...company };
    this.showModal.set(true);
  }

  viewCompany(company: Company) {
    Swal.fire({
      title: company.name,
      html: `
        <div class="text-left space-y-2">
          <p><strong>Contact Person:</strong> ${company.contactPerson || '—'}</p>
          <p><strong>Phone:</strong> ${company.phone || '—'}</p>
          <p><strong>Email:</strong> ${company.email || '—'}</p>
          <p><strong>Address:</strong> ${company.address || '—'}</p>
          <p><strong>Notes:</strong> ${company.notes || '—'}</p>
          <p><strong>Status:</strong> ${company.active ? 'Active' : 'Inactive'}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Close'
    });
  }

  deleteCompany(company: Company) {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${company.name}? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.deleteServiceCompany(company.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Company has been deleted.', 'success');
            this.loadServiceCompanies();
          },
          error: (err) => {
            console.error('Delete failed:', err);
            Swal.fire('Error', 'Failed to delete company', 'error');
          }
        });
      }
    });
  }

  saveCompany() {
    if (!this.formData.name.trim()) {
      Swal.fire('Error', 'Company name is required', 'error');
      return;
    }

    const companyId = this.auth.getCompanyId();
    if (!companyId) {
      Swal.fire('Error', 'Company ID not found', 'error');
      return;
    }

    const data = {
      ...this.formData,
      companyId: this.editMode() ? this.formData.companyId : companyId
    };

    if (this.editMode()) {
      this.api.updateServiceCompany(this.formData.id, data).subscribe({
        next: () => {
          Swal.fire('Success', 'Company updated successfully!', 'success');
          this.loadServiceCompanies();
          this.closeModal();
        },
        error: (err) => {
          console.error('Update failed:', err);
          Swal.fire('Error', 'Failed to update company', 'error');
        }
      });
    } else {
      this.api.createServiceCompany(data).subscribe({
        next: () => {
          Swal.fire('Success', 'Company added successfully!', 'success');
          this.loadServiceCompanies();
          this.closeModal();
        },
        error: (err) => {
          console.error('Create failed:', err);
          Swal.fire('Error', 'Failed to create company', 'error');
        }
      });
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.editMode.set(false);
  }
}
