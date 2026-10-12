import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface PaymentData {
  plotId: string;
  plotName: string;
  paymentAmount: number;
  paymentMethod: 'OWN' | 'TENANT' | 'COMPANY';
  paymentCompanyId?: string;
  paymentCompanyName?: string;
  residentSplits?: ResidentSplit[]; // per-resident custom amounts
}

interface ResidentInfo {
  customerId: string;
  customerName: string;
  customerMobile: string;
  doorNo: string;
  type: string;
}

interface ResidentSplit {
  customerId: string;
  customerName: string;
  type: string;
  doorNo: string;
  amount: number; // individual amount for this resident
}

interface TreeNode {
  id: string;
  label: string;
  type: string;
  icon: string;
  plotIds: string[];
  children?: TreeNode[];
}

@Component({
  selector: 'app-payment-management',
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
            <h1 class="text-base font-black text-slate-900 tracking-tight leading-none">💰 Payment Management</h1>
            <p class="text-[9px] font-bold text-sky-500 uppercase tracking-[0.2em] mt-1">{{ totalPlots() }} Total Plots</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p class="text-[9px] font-black text-slate-900 uppercase tracking-widest">Total Amount</p>
            <p class="text-lg font-black text-slate-900">₹{{ totalAmount() | number:'1.0-0' }}</p>
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        
        <!-- LEFT SIDEBAR: Tree View -->
        <aside class="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
          
          <!-- Statistics Section -->
          <div class="p-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50">
            <h3 class="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span class="text-blue-500">📊</span> Payment Statistics
            </h3>
            <div class="space-y-2">
              @for (stat of paymentStats(); track stat.method) {
                <div class="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div class="flex items-center gap-2">
                    <span class="text-base">{{ stat.icon }}</span>
                    <span class="text-[10px] font-bold text-slate-700">{{ stat.label }}</span>
                  </div>
                  <span class="text-[12px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">{{ stat.count }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="p-4 border-b border-slate-100 space-y-2">
            <button (click)="openSettings()" class="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              ⚙️ Settings
            </button>
            <button (click)="openCompanyManagement()" class="w-full py-2.5 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
              🏢 Manage Companies
            </button>
          </div>

          <!-- Tree View -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">

            @for (node of treeData(); track node.id) {
              <div>
                <!-- Parent Node -->
                <div (click)="selectNode(node)"
                     [class]="'p-3 rounded-xl cursor-pointer transition-all ' + (selectedNodeId() === node.id ? 'bg-blue-50 border-2 border-blue-300 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent')">
                  <div class="flex items-center gap-2">
                    @if (node.children?.length) {
                      <button (click)="toggleNode(node.id); $event.stopPropagation()"
                              class="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-200 hover:border-slate-300 transition-all shrink-0">
                        <span [class]="'text-[10px] font-black transition-transform duration-200 inline-block ' + (expandedNodes().has(node.id) ? 'rotate-90' : '')">▶</span>
                      </button>
                    } @else {
                      <span class="w-5 shrink-0"></span>
                    }
                    <span class="text-lg shrink-0">{{ node.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-[11px] font-black text-slate-900 truncate">{{ node.label }}</p>
                      <p class="text-[9px] text-slate-500 font-bold">{{ node.plotIds.length }} plot{{ node.plotIds.length !== 1 ? 's' : '' }}</p>
                    </div>
                  </div>
                </div>

                <!-- Child Nodes -->
                @if (expandedNodes().has(node.id) && node.children?.length) {
                  <div class="ml-6 mt-1 space-y-1 border-l-2 border-blue-200 pl-3">
                    @for (child of node.children; track child.id) {
                      <div (click)="selectNode(child)"
                           [class]="'p-2.5 rounded-lg cursor-pointer transition-all ' + (selectedNodeId() === child.id ? 'bg-blue-50 border border-blue-300 shadow-sm' : 'bg-white hover:bg-slate-50 border border-slate-100')">
                        <div class="flex items-center gap-2">
                          <span class="text-base shrink-0">{{ child.icon }}</span>
                          <div class="flex-1 min-w-0">
                            <p class="text-[10px] font-black text-slate-800 truncate">{{ child.label }}</p>
                            <p class="text-[8px] text-slate-400 font-bold">{{ child.plotIds.length }} plot{{ child.plotIds.length !== 1 ? 's' : '' }}</p>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            @if (treeData().length === 0) {
              <div class="py-12 text-center">
                <div class="text-4xl mb-3 opacity-20">📊</div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Plots Yet</p>
              </div>
            }
          </div>

          <!-- Download Button -->
          <div class="p-4 border-t border-slate-100">
            <button (click)="downloadReport()" class="w-full py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
              📥 Download Report
            </button>
          </div>
        </aside>

        <!-- MAIN CONTENT: Payment Table -->
        <main class="flex-1 overflow-auto bg-[#f1f5f9] flex flex-col">
          @if (selectedNode(); as node) {
            <!-- Table Header Bar -->
            <div class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ node.icon }}</span>
                <div>
                  <h2 class="text-sm font-black text-slate-900 tracking-tight leading-none">{{ node.label }}</h2>
                  <p class="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">{{ node.plotIds.length }} Plots</p>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Node Total</p>
                  <p class="text-lg font-black text-emerald-600">₹{{ getNodeTotal(node) | number:'1.0-0' }}</p>
                </div>
              </div>
            </div>

            <!-- Payment Table -->
            <div class="flex-1 overflow-auto p-6">
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full">
                  <thead>
                    <tr class="bg-slate-900 text-white">
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-12">S.No</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Plot ID</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Plot Name</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-48">Payment Amount (₹)</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-44">Split Amount</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-56">Payment Method</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (plotId of node.plotIds; track plotId; let idx = $index) {
                      <tr class="border-b border-slate-100 hover:bg-blue-50/50 transition-colors group">
                        <td class="py-3 px-4 text-[11px] font-bold text-slate-400">{{ idx + 1 }}</td>
                        <td class="py-3 px-4">
                          <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{{ plotId }}</span>
                        </td>
                        <td class="py-3 px-4 text-[11px] font-bold text-slate-700">{{ getPlotName(plotId) }}</td>
                        <td class="py-3 px-4">
                          <input type="number" 
                                 [value]="getPaymentAmount(plotId)"
                                 (change)="updateAmount(plotId, $event)"
                                 placeholder="0"
                                 class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                        </td>
                        <td class="py-3 px-4">
                          @if (getResidentCount(plotId) >= 1) {
                            <button (click)="openSplitModal(plotId)"
                              class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm"
                              [class.bg-amber-50]="getResidentCount(plotId) > 1"
                              [class.border-amber-200]="getResidentCount(plotId) > 1"
                              [class.bg-emerald-50]="getResidentCount(plotId) === 1"
                              [class.border-emerald-200]="getResidentCount(plotId) === 1">
                              <span class="text-base">{{ getResidentCount(plotId) > 1 ? '⚖️' : '👤' }}</span>
                              <div class="text-left">
                                <p class="text-[11px] font-black"
                                  [class.text-amber-700]="getResidentCount(plotId) > 1"
                                  [class.text-emerald-700]="getResidentCount(plotId) === 1">
                                  {{ getSplitLabel(plotId) }}
                                </p>
                                <p class="text-[9px] font-bold"
                                  [class.text-amber-500]="getResidentCount(plotId) > 1"
                                  [class.text-emerald-500]="getResidentCount(plotId) === 1">
                                  {{ getResidentCount(plotId) }} resident{{ getResidentCount(plotId) !== 1 ? 's' : '' }} · Edit
                                </p>
                              </div>
                            </button>
                          } @else {
                            <span class="text-[11px] font-bold text-slate-400 px-3">— No residents</span>
                          }
                        </td>
                        <td class="py-3 px-4">
                          <div class="space-y-1">
                            <select (change)="updateMethod(plotId, $event)"
                                    class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                              <option value="OWN" [selected]="getPaymentMethod(plotId) === 'OWN'">🏠 Own</option>
                              <option value="TENANT" [selected]="getPaymentMethod(plotId) === 'TENANT'">👤 Tenant</option>
                              <option value="COMPANY" [selected]="getPaymentMethod(plotId) === 'COMPANY'">🏢 Company</option>
                            </select>
                            @if (getPaymentMethod(plotId) === 'COMPANY') {
                              <select (change)="updateCompany(plotId, $event)"
                                      class="w-full px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-[10px] font-semibold focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none">
                                <option value="" [selected]="!getPaymentCompanyId(plotId)">-- Select Company --</option>
                                @for (company of companies(); track company.id) {
                                  <option [value]="company.id" [selected]="getPaymentCompanyId(plotId) === company.id">{{ company.name }}</option>
                                }
                              </select>
                            }
                          </div>
                        </td>
                        <td class="py-3 px-4">
                          <button (click)="savePlotPayment(plotId)"
                                  class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 transition-all">
                            Save
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr class="bg-slate-50 border-t-2 border-slate-300">
                      <td colspan="3" class="py-3 px-4 text-right">
                        <span class="text-[11px] font-black text-slate-700 uppercase tracking-widest">Subtotal:</span>
                      </td>
                      <td class="py-3 px-4">
                        <span class="text-base font-black text-emerald-600">₹{{ getNodeTotal(node) | number:'1.0-0' }}</span>
                      </td>
                      <td colspan="3"></td>
                    </tr>
                  </tfoot>
                </table>

                @if (node.plotIds.length === 0) {
                  <div class="py-16 text-center">
                    <div class="text-4xl mb-3 opacity-20">📭</div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No plots in this selection</p>
                  </div>
                }
              </div>
            </div>
          } @else {
            <!-- No node selected -->
            <div class="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-slate-200">💰</div>
              <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Select a Plot Group</h2>
              <p class="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider max-w-xs">Click any group in the tree to manage payment details for those plots.</p>
            </div>
          }
        </main>

      </div>

      <!-- Settings Modal -->
      @if (showSettingsModal()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4" (click)="closeSettings()">
          <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>
          <div class="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in" (click)="$event.stopPropagation()">
            
            <!-- Header -->
            <div class="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">⚙️</div>
                <h3 class="text-base font-black text-white">Payment Settings</h3>
              </div>
              <button (click)="closeSettings()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">✕</button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-4">
              <div class="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <h4 class="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>⚡</span> Bulk Update All Plots
                </h4>
                
                <div class="space-y-3">
                  <div>
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Default Amount</label>
                    <input type="number" [(ngModel)]="bulkAmount" placeholder="Enter amount"
                           class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  
                  <div>
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Default Method</label>
                    <select [(ngModel)]="bulkMethod" (change)="onBulkMethodChange()"
                            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      <option value="OWN">🏠 Own</option>
                      <option value="TENANT">👤 Tenant</option>
                      <option value="COMPANY">🏢 Company</option>
                    </select>
                  </div>

                  @if (bulkMethod === 'COMPANY') {
                    <div>
                      <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Select Company</label>
                      <select [(ngModel)]="bulkCompanyId" (change)="onBulkCompanyChange()"
                              class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                        <option value="">-- Select Company --</option>
                        @for (company of companies(); track company.id) {
                          <option [value]="company.id">{{ company.name }}</option>
                        }
                      </select>
                    </div>
                  }

                  <button (click)="applyBulkUpdate()" [disabled]="!bulkAmount || (bulkMethod === 'COMPANY' && !bulkCompanyId)"
                          class="w-full py-3 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                    Apply to All Plots
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 pb-6">
              <button (click)="closeSettings()" class="w-full py-2.5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-700 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Company Management Modal -->
      @if (showCompanyModal()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4" (click)="closeCompanyModal()">
          <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>
          <div class="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in" (click)="$event.stopPropagation()">
            
            <!-- Header -->
            <div class="bg-blue-600 px-6 py-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">🏢</div>
                <h3 class="text-base font-black text-white">{{ companyModalMode === 'list' ? 'Manage Companies' : (companyModalMode === 'add' ? 'Add Company' : 'Edit Company') }}</h3>
              </div>
              <button (click)="closeCompanyModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">✕</button>
            </div>

            <!-- List View -->
            @if (companyModalMode === 'list') {
              <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                  <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ companies().length }} Companies</p>
                  <button (click)="openAddCompany()" class="px-4 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">
                    ➕ Add New
                  </button>
                </div>

                <div class="max-h-96 overflow-y-auto space-y-2">
                  @for (company of companies(); track company.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all group">
                      <div class="flex items-center gap-3 flex-1">
                        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[12px] font-black text-blue-600">
                          {{ company.name.charAt(0).toUpperCase() }}
                        </div>
                        <div class="flex-1">
                          <p class="text-[12px] font-black text-slate-800">{{ company.name }}</p>
                          <p class="text-[10px] text-slate-500">{{ company.contactPerson || 'No contact' }} • {{ company.phone || 'No phone' }}</p>
                        </div>
                      </div>
                      <div class="pv-action-menu">
                        <button class="pv-action-trigger" [class.active]="activeMenuId === 'comp_' + company.id" (click)="toggleMenu('comp_' + company.id, $event)">⋮</button>
                        <div class="pv-action-dropdown" *ngIf="activeMenuId === 'comp_' + company.id">
                          <button class="pv-action-item" (click)="openEditCompany(company)">✏️ Edit</button>
                          <button class="pv-action-item delete" (click)="deleteCompany(company)">🗑️ Delete</button>
                        </div>
                      </div>
                    </div>
                  }

                  @if (companies().length === 0) {
                    <div class="py-12 text-center">
                      <div class="text-4xl mb-3 opacity-20">🏢</div>
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No companies yet</p>
                      <button (click)="openAddCompany()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">
                        Add First Company
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Add/Edit Form -->
            @if (companyModalMode === 'add' || companyModalMode === 'edit') {
              <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div class="grid grid-cols-2 gap-4">
                  <div class="col-span-2">
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Company Name *</label>
                    <input type="text" [(ngModel)]="companyFormData.name" placeholder="Enter company name"
                           class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>

                  <div class="col-span-2">
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Address</label>
                    <input type="text" [(ngModel)]="companyFormData.address" placeholder="Enter address"
                           class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>

                  <div>
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Contact Person</label>
                    <input type="text" [(ngModel)]="companyFormData.contactPerson" placeholder="Enter contact person"
                           class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>

                  <div>
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Phone</label>
                    <input type="tel" [(ngModel)]="companyFormData.phone" placeholder="Enter phone number"
                           class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>

                  <div class="col-span-2">
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Email</label>
                    <input type="email" [(ngModel)]="companyFormData.email" placeholder="Enter email address"
                           class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>

                  <div class="col-span-2">
                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Notes</label>
                    <textarea [(ngModel)]="companyFormData.notes" placeholder="Enter additional notes" rows="3"
                              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"></textarea>
                  </div>

                  <div class="col-span-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="companyFormData.active" class="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500" />
                      <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Form Footer -->
              <div class="px-6 pb-6 flex gap-3">
                <button (click)="companyModalMode = 'list'" class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                  ← Back
                </button>
                <button (click)="saveCompany()" class="flex-1 py-3 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">
                  {{ companyModalMode === 'add' ? 'Add' : 'Update' }} Company
                </button>
              </div>
            }
          </div>
        </div>
      }
      <!-- Split Amount Editor Modal -->
      @if (splitModalPlotId()) {
        <div class="fixed inset-0 z-[300] flex items-center justify-center p-4" (click)="closeSplitModal()">
          <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>
          <div class="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden" (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">⚖️</span>
                <div>
                  <h3 class="text-base font-black text-white">Split Payment</h3>
                  <p class="text-[10px] text-amber-100 font-bold mt-0.5">{{ getPlotName(splitModalPlotId()!) }} · {{ getResidentCount(splitModalPlotId()!) }} residents</p>
                </div>
              </div>
              <button (click)="closeSplitModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all">✕</button>
            </div>

            <!-- Total & Reset -->
            <div class="px-6 pt-5 pb-3 flex items-center justify-between bg-amber-50 border-b border-amber-100">
              <div>
                <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Total Plot Amount</p>
                <p class="text-xl font-black text-amber-800">₹{{ getPaymentAmount(splitModalPlotId()!) | number:'1.0-0' }}</p>
              </div>
              <div class="text-right">
                <p class="text-[9px] font-black uppercase tracking-widest" [class.text-emerald-600]="splitTotal() === getPaymentAmount(splitModalPlotId()!)" [class.text-red-500]="splitTotal() !== getPaymentAmount(splitModalPlotId()!)">
                  Split Total: ₹{{ splitTotal() | number:'1.0-0' }}
                </p>
                @if (splitTotal() !== getPaymentAmount(splitModalPlotId()!)) {
                  <p class="text-[9px] text-red-500 font-bold">⚠ Doesn't match total</p>
                }
                <button (click)="resetSplitToEqual()" class="mt-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-200 transition-all">
                  ↺ Reset Equal
                </button>
              </div>
            </div>

            <!-- Resident Rows -->
            <div class="p-6 space-y-3 max-h-80 overflow-y-auto">
              @for (split of splitEdits(); track split.customerId) {
                <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    [class.bg-emerald-100]="split.type === 'OWNER'"
                    [class.bg-sky-100]="split.type !== 'OWNER'">
                    {{ split.type === 'OWNER' ? '🏠' : '👤' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[12px] font-black text-slate-900 truncate">{{ split.customerName }}</p>
                    <p class="text-[9px] font-bold uppercase tracking-widest"
                      [class.text-emerald-600]="split.type === 'OWNER'"
                      [class.text-sky-600]="split.type !== 'OWNER'">
                      {{ split.type }} {{ split.doorNo ? '· Door ' + split.doorNo : '' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-slate-400 font-bold text-sm">₹</span>
                    <input type="number" [ngModel]="split.amount"
                      (ngModelChange)="updateSplitAmount(split.customerId, +$event)"
                      class="w-28 px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-right" />
                  </div>
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 flex gap-3 border-t border-slate-100 bg-slate-50">
              <button (click)="closeSplitModal()" class="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button (click)="saveSplits()" class="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 shadow-lg">
                ✓ Save Split
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `]
})
export class PaymentManagementComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  router = inject(Router);

  loading = signal(true);
  projectId = signal('');
  plots = signal<Record<string, any>>({});
  payments = signal<Record<string, PaymentData>>({});
  companies = signal<{id: string; name: string}[]>([]);
  residents = signal<Record<string, ResidentInfo[]>>({});

  // Split editor modal
  splitModalPlotId = signal<string | null>(null);
  splitEdits = signal<ResidentSplit[]>([]);

  get splitModalOpen() { return this.splitModalPlotId() !== null; }
  
  treeData = signal<TreeNode[]>([]);
  expandedNodes = signal<Set<string>>(new Set());
  selectedNodeId = signal<string | null>(null);
  activeMenuId: string | null = null;
  
  // Settings modal
  showSettingsModal = signal(false);
  showCompanyModal = signal(false);
  companyModalMode: 'list' | 'add' | 'edit' = 'list';
  selectedCompany: any = null;
  companyFormData = {
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
  
  bulkAmount = 0;
  bulkMethod: 'OWN' | 'TENANT' | 'COMPANY' = 'OWN';
  bulkCompanyId = '';
  bulkCompanyName = '';

  openSettings() {
    this.showSettingsModal.set(true);
  }

  closeSettings() {
    this.showSettingsModal.set(false);
  }

  openCompanyManagement() {
    this.companyModalMode = 'list';
    this.showCompanyModal.set(true);
  }

  closeCompanyModal() {
    this.showCompanyModal.set(false);
    this.companyModalMode = 'list';
    this.selectedCompany = null;
  }

  openAddCompany() {
    this.companyModalMode = 'add';
    this.companyFormData = {
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
  }

  openEditCompany(company: any) {
    this.companyModalMode = 'edit';
    this.selectedCompany = company;
    this.companyFormData = { ...company };
  }

  saveCompany() {
    if (!this.companyFormData.name.trim()) {
      Swal.fire('Error', 'Company name is required', 'error');
      return;
    }

    const companyId = this.auth.getCompanyId();
    if (!companyId) {
      Swal.fire('Error', 'Company ID not found', 'error');
      return;
    }

    const data = {
      ...this.companyFormData,
      companyId: this.companyModalMode === 'edit' ? this.companyFormData.companyId : companyId
    };

    if (this.companyModalMode === 'edit') {
      this.api.updateServiceCompany(this.companyFormData.id, data).subscribe({
        next: () => {
          Swal.fire('Success', 'Company updated successfully!', 'success');
          this.loadCompanies();
          this.companyModalMode = 'list';
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
          this.loadCompanies();
          this.companyModalMode = 'list';
        },
        error: (err) => {
          console.error('Create failed:', err);
          Swal.fire('Error', 'Failed to create company', 'error');
        }
      });
    }
  }

  deleteCompany(company: any) {
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
            this.loadCompanies();
          },
          error: (err) => {
            console.error('Delete failed:', err);
            Swal.fire('Error', 'Failed to delete company', 'error');
          }
        });
      }
    });
  }

  totalPlots = computed(() => Object.keys(this.plots()).length);
  totalAmount = computed(() => {
    return Object.values(this.payments()).reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
  });

  selectedNode = computed(() => {
    const id = this.selectedNodeId();
    if (!id) return null;
    const tree = this.treeData();
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children) {
        for (const child of node.children) {
          if (child.id === id) return child;
        }
      }
    }
    return null;
  });

  paymentStats = computed(() => {
    const stats = { OWN: 0, TENANT: 0, COMPANY: 0 };
    const payments = this.payments();
    
    // Count all plots with their payment methods
    Object.keys(this.plots()).forEach(plotId => {
      const plot = this.plots()[plotId];
      if (plot.type && plot.type !== 'road' && plot.type !== 'vacant') {
        const payment = payments[plotId];
        if (payment) {
          stats[payment.paymentMethod]++;
        } else {
          stats['OWN']++; // Default to OWN if no payment data
        }
      }
    });
    
    return [
      { method: 'OWN', label: 'Own', icon: '🏠', count: stats.OWN },
      { method: 'TENANT', label: 'Tenant', icon: '👤', count: stats.TENANT },
      { method: 'COMPANY', label: 'Company', icon: '🏢', count: stats.COMPANY }
    ];
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) return;
    this.loading.set(true);

    this.api.getProject(companyId).subscribe(res => {
      if (!res?.data) { this.loading.set(false); return; }
      const pid = String(res.data.id);
      this.projectId.set(pid);

      this.api.getLayoutPlots(companyId).subscribe({
        next: (plotsRes: any) => {
          this.plots.set(plotsRes.data || {});
          this.buildTreeData();

          // Load payments and residents in parallel
          this.api.getCompanyPayments(pid).subscribe({
            next: (payRes: any) => {
              const payMap: Record<string, PaymentData> = {};
              (payRes.data || []).forEach((p: any) => {
                payMap[p.plotId] = {
                  plotId: p.plotId,
                  plotName: p.plotName,
                  paymentAmount: p.paymentAmount || 0,
                  paymentMethod: p.paymentMethod || 'OWN',
                  paymentCompanyId: p.paymentCompanyId,
                  paymentCompanyName: p.paymentCompanyName
                };
              });
              this.payments.set(payMap);
              this.loading.set(false);
            },
            error: () => this.loading.set(false)
          });

          // Load all residents for split amount calculation
          this.api.getLayoutCustomersAll(pid).subscribe({
            next: (res: any) => {
              const residentMap: Record<string, ResidentInfo[]> = {};
              (res?.data || []).forEach((lc: any) => {
                if (lc.status === 'INACTIVE') return;
                const plotId = lc.plotId;
                if (!residentMap[plotId]) residentMap[plotId] = [];
                residentMap[plotId].push({
                  customerId: lc.customerId,
                  customerName: lc.customerName || '',
                  customerMobile: lc.customerMobile || '',
                  doorNo: lc.doorNo || '',
                  type: lc.customerType || 'OWNER'
                });
              });
              this.residents.set(residentMap);
            },
            error: () => {}
          });
        },
        error: () => this.loading.set(false)
      });
    });

    this.loadCompanies();
  }

  loadCompanies() {
    const companyId = this.auth.getCompanyId();
    console.log('Loading companies for companyId:', companyId);
    
    if (!companyId) {
      console.error('No company ID found');
      // Load without companyId filter as fallback
      this.api.getServiceCompanies('').subscribe({
        next: (data) => {
          console.log('Service companies loaded (no filter):', data);
          this.companies.set(data || []);
        },
        error: (err) => {
          console.error('Failed to load service companies:', err);
          this.companies.set([]);
        }
      });
      return;
    }
    
    this.api.getActiveServiceCompanies(companyId).subscribe({
      next: (data) => {
        console.log('Active service companies loaded:', data);
        this.companies.set(data || []);
      },
      error: (err) => {
        console.error('Failed to load active service companies:', err);
        // Fallback: load all companies if active endpoint fails
        this.api.getServiceCompanies(companyId).subscribe({
          next: (allData) => {
            console.log('All service companies loaded:', allData);
            this.companies.set(allData || []);
          },
          error: (err2) => {
            console.error('Failed to load all service companies:', err2);
            this.companies.set([]);
          }
        });
      }
    });
  }

  buildTreeData() {
    const plots = this.plots();
    const tree: TreeNode[] = [];
    const apartments: any[] = [];
    const pgs: any[] = [];
    const others: any[] = [];

    Object.entries(plots).forEach(([key, plot]) => {
      if (plot.type === 'apartment') {
        apartments.push({ key, plot });
      } else if (plot.type === 'pg') {
        pgs.push({ key, plot });
      } else if (plot.type && plot.type !== 'road' && plot.type !== 'vacant') {
        others.push({ key, plot });
      }
    });

    apartments.forEach(({ key, plot }) => {
      const floors = plot.aptConfig?.floors || 0;
      const unitsPerFloor = plot.aptConfig?.unitsPerFloor || 0;
      const floorNodes: TreeNode[] = [];
      
      for (let f = 1; f <= floors; f++) {
        const floorPlotIds: string[] = [];
        
        // Add individual units in this floor
        for (let u = 1; u <= unitsPerFloor; u++) {
          const unitId = `${key}_${f}${String(u).padStart(2, '0')}`;
          floorPlotIds.push(unitId);
        }
        
        floorNodes.push({
          id: `${key}_floor_${f}`,
          label: `Floor ${f}`,
          type: 'floor',
          icon: '🏢',
          plotIds: floorPlotIds
        });
      }
      
      // Collect all plot IDs for the apartment
      const allAptPlotIds = floorNodes.flatMap(fn => fn.plotIds);
      
      tree.push({
        id: key,
        label: plot.name || key,
        type: 'apartment',
        icon: '🏢',
        plotIds: allAptPlotIds,
        children: floorNodes
      });
    });

    pgs.forEach(({ key, plot }) => {
      const floors = plot.aptConfig?.floors || 0;
      const unitsPerFloor = plot.aptConfig?.unitsPerFloor || 0;
      const floorNodes: TreeNode[] = [];
      
      for (let f = 1; f <= floors; f++) {
        const floorPlotIds: string[] = [];
        
        // Add individual units in this floor
        for (let u = 1; u <= unitsPerFloor; u++) {
          const unitId = `${key}_${f}${String(u).padStart(2, '0')}`;
          floorPlotIds.push(unitId);
        }
        
        floorNodes.push({
          id: `${key}_floor_${f}`,
          label: `Floor ${f}`,
          type: 'floor',
          icon: '🏠',
          plotIds: floorPlotIds
        });
      }
      
      // Collect all plot IDs for the PG
      const allPgPlotIds = floorNodes.flatMap(fn => fn.plotIds);
      
      tree.push({
        id: key,
        label: plot.name || key,
        type: 'pg',
        icon: '🏠',
        plotIds: allPgPlotIds,
        children: floorNodes
      });
    });

    others.forEach(({ key, plot }) => {
      tree.push({
        id: key,
        label: plot.name || key,
        type: plot.type,
        icon: this.getPlotIcon(plot.type),
        plotIds: [key]
      });
    });

    this.treeData.set(tree);
  }

  getPlotIcon(type: string): string {
    const icons: Record<string, string> = {
      house: '🏡', shop: '🛒', hospital: '🏥', security: '🛡️',
      guesthouse: '🏨', park: '🌳', watertank: '🛢️'
    };
    return icons[type] || '📍';
  }

  toggleNode(nodeId: string) {
    const expanded = this.expandedNodes();
    const newSet = new Set(expanded);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    this.expandedNodes.set(newSet);
  }

  selectNode(node: TreeNode) {
    this.selectedNodeId.set(node.id);
  }

  getPlotName(plotId: string): string {
    return this.plots()[plotId]?.name || plotId;
  }

  getPaymentAmount(plotId: string): number {
    return this.payments()[plotId]?.paymentAmount || 0;
  }

  getPaymentMethod(plotId: string): string {
    return this.payments()[plotId]?.paymentMethod || 'OWN';
  }

  getPaymentCompanyId(plotId: string): string {
    return this.payments()[plotId]?.paymentCompanyId || '';
  }

  // ── Split Amount Helpers ──────────────────────────────────────────────────

  getResidents(plotId: string): ResidentInfo[] {
    return this.residents()[plotId] || [];
  }

  getResidentCount(plotId: string): number {
    return this.getResidents(plotId).length;
  }

  getDefaultSplitAmount(plotId: string): number {
    const amount = this.getPaymentAmount(plotId);
    const count = this.getResidentCount(plotId);
    if (!amount || count <= 1) return amount;
    return Math.round((amount / count) * 100) / 100;
  }

  getSplitLabel(plotId: string): string {
    const count = this.getResidentCount(plotId);
    const amount = this.getPaymentAmount(plotId);
    if (count === 0) return '—';
    const splits = this.payments()[plotId]?.residentSplits;
    if (splits?.length) {
      // Custom splits exist
      const total = splits.reduce((s, r) => s + r.amount, 0);
      return '₹' + total.toLocaleString('en-IN') + ' (custom)';
    }
    if (!amount) return '—';
    if (count === 1) return '₹' + amount.toLocaleString('en-IN');
    const split = this.getDefaultSplitAmount(plotId);
    return '₹' + split.toLocaleString('en-IN') + ' × ' + count;
  }

  getResidentTooltip(plotId: string): string {
    const residents = this.getResidents(plotId);
    if (residents.length === 0) return 'No residents';
    const splits = this.payments()[plotId]?.residentSplits;
    return residents.map(r => {
      const custom = splits?.find(s => s.customerId === r.customerId);
      const amt = custom ? '₹' + custom.amount : 'default';
      return `${r.customerName} (${r.type}) — ${amt}`;
    }).join('\n');
  }

  // Open split editor modal
  openSplitModal(plotId: string) {
    const residents = this.getResidents(plotId);
    if (residents.length === 0) {
      Swal.fire('No Residents', 'No residents are booked to this plot.', 'info');
      return;
    }
    const totalAmount = this.getPaymentAmount(plotId);
    const defaultSplit = residents.length > 0 ? Math.round((totalAmount / residents.length) * 100) / 100 : 0;
    const existingSplits = this.payments()[plotId]?.residentSplits || [];

    const edits: ResidentSplit[] = residents.map(r => {
      const existing = existingSplits.find(s => s.customerId === r.customerId);
      return {
        customerId: r.customerId,
        customerName: r.customerName,
        type: r.type,
        doorNo: r.doorNo,
        amount: existing ? existing.amount : defaultSplit
      };
    });
    this.splitEdits.set(edits);
    this.splitModalPlotId.set(plotId);
  }

  closeSplitModal() {
    this.splitModalPlotId.set(null);
    this.splitEdits.set([]);
  }

  updateSplitAmount(customerId: string, value: number) {
    this.splitEdits.update(edits =>
      edits.map(e => e.customerId === customerId ? { ...e, amount: value } : e)
    );
  }

  splitTotal(): number {
    return this.splitEdits().reduce((s, e) => s + (e.amount || 0), 0);
  }

  resetSplitToEqual() {
    const plotId = this.splitModalPlotId();
    if (!plotId) return;
    const total = this.getPaymentAmount(plotId);
    const count = this.splitEdits().length;
    const equal = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
    this.splitEdits.update(edits => edits.map(e => ({ ...e, amount: equal })));
  }

  saveSplits() {
    const plotId = this.splitModalPlotId();
    if (!plotId) return;
    const splits = this.splitEdits();
    // Save splits into payments
    this.payments.update(p => ({
      ...p,
      [plotId]: { ...p[plotId], plotId, residentSplits: [...splits] }
    }));
    // Also update total amount to sum of splits
    const total = splits.reduce((s, e) => s + (e.amount || 0), 0);
    this.payments.update(p => ({
      ...p,
      [plotId]: { ...p[plotId], paymentAmount: total }
    }));
    this.closeSplitModal();
    // Auto-save to backend
    this.savePlotPayment(plotId);
  }

  updateAmount(plotId: string, event: any) {
    const amount = parseFloat(event.target.value) || 0;
    this.payments.update(p => ({
      ...p,
      [plotId]: { ...p[plotId], plotId, paymentAmount: amount }
    }));
  }

  updateMethod(plotId: string, event: any) {
    const method = event.target.value as 'OWN' | 'TENANT' | 'COMPANY';
    this.payments.update(p => ({
      ...p,
      [plotId]: { ...p[plotId], plotId, paymentMethod: method }
    }));
  }

  updateCompany(plotId: string, event: any) {
    const companyId = event.target.value;
    const company = this.companies().find(c => c.id === companyId);
    this.payments.update(p => ({
      ...p,
      [plotId]: {
        ...p[plotId],
        plotId,
        paymentCompanyId: companyId,
        paymentCompanyName: company?.name || ''
      }
    }));
  }

  savePlotPayment(plotId: string) {
    const payment = this.payments()[plotId];
    if (!payment) {
      Swal.fire('Error', 'No payment data found for this plot', 'error');
      return;
    }

    const companyId = this.auth.getCompanyId();
    const projectId = this.projectId();

    if (!companyId || !projectId) {
      Swal.fire('Error', 'Missing company or project information', 'error');
      return;
    }

    const payload = {
      projectId,
      plotId,
      plotName: this.getPlotName(plotId),
      companyId,
      paymentAmount: payment.paymentAmount || 0,
      paymentMethod: payment.paymentMethod || 'OWN',
      paymentCompanyId: payment.paymentCompanyId || null,
      paymentCompanyName: payment.paymentCompanyName || null,
      residentSplits: payment.residentSplits || []
    };

    // Check token before attempting save
    if (this.auth.isTokenExpired()) {
      Swal.fire('Session Expired', 'Your session has expired. Please log in again.', 'warning')
        .then(() => this.router.navigate(['/login']));
      return;
    }

    this.api.updateCompanyPayment(projectId, plotId, payload).subscribe({
      next: (res) => {
        console.log('Save payment success:', res);
        Swal.fire('Saved!', 'Payment saved successfully!', 'success');
      },
      error: (err) => {
        console.error('Save payment error — status:', err.status);
        console.error('Save payment error — url:', err.url);
        console.error('Save payment error — body:', err.error);
        console.error('Save payment payload sent:', payload);
        if (err.status === 403) {
          const serverMsg = err.error?.message || err.error?.error || JSON.stringify(err.error) || 'No message from server';
          Swal.fire('Access Denied (403)',
            `Server message: "${serverMsg}"<br><br>
             <small>projectId: ${projectId}<br>
             plotId: ${plotId}<br>
             companyId: ${companyId}</small>`,
            'error');
        } else if (err.status === 401) {
          Swal.fire('Session Expired', 'Your session has expired. Please log in again.', 'warning')
            .then(() => this.router.navigate(['/login']));
        } else if (err.status === 0) {
          Swal.fire('Network Error', 'Cannot reach the server. Please check your connection and try again.', 'error');
        } else {
          Swal.fire('Error', `Failed to save payment. Server responded with: ${err.status} ${err.error?.message || err.statusText || 'Unknown error'}`, 'error');
        }
      }
    });
  }

  downloadReport() {
    const selectedId = this.selectedNodeId();
    if (!selectedId) {
      Swal.fire('Info', 'Please select an apartment, floor, or plot from the tree', 'info');
      return;
    }

    Swal.fire({
      title: 'Generating Report',
      text: 'Please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Simulate report generation
    setTimeout(() => {
      Swal.fire('Success', 'Report downloaded successfully!', 'success');
    }, 1500);
  }

  onBulkMethodChange() {
    if (this.bulkMethod !== 'COMPANY') {
      this.bulkCompanyId = '';
      this.bulkCompanyName = '';
    }
  }

  onBulkCompanyChange() {
    const company = this.companies().find(c => c.id === this.bulkCompanyId);
    this.bulkCompanyName = company?.name || '';
  }

  applyBulkUpdate() {
    Swal.fire({
      title: 'Confirm Bulk Update',
      text: `Apply ₹${this.bulkAmount} to all plots with ${this.bulkMethod} method?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update All',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        if (!this.bulkAmount) {
          Swal.fire('Error', 'Please enter an amount', 'error');
          return;
        }
        if (this.bulkMethod === 'COMPANY' && !this.bulkCompanyId) {
          Swal.fire('Error', 'Please select a company', 'error');
          return;
        }

        // Collect ALL unit-level plot IDs from the tree (includes apartment unit IDs like r0c2pr1pc0_101)
        const allPlotIds: string[] = [];
        this.treeData().forEach(node => {
          node.plotIds.forEach(id => allPlotIds.push(id));
        });
        // Remove duplicates
        const uniquePlotIds = [...new Set(allPlotIds)];

        const companyId = this.auth.getCompanyId();
        const projectId = this.projectId();

        this.api.bulkUpdateCompanyPayments(projectId, {
          plotIds: uniquePlotIds,
          paymentAmount: this.bulkAmount,
          paymentMethod: this.bulkMethod,
          companyId,
          companyName: '',
          paymentCompanyId: this.bulkCompanyId || null,
          paymentCompanyName: this.bulkCompanyName || null
        }).subscribe({
          next: () => {
            // Optimistic local update — immediately pre-fill the UI
            const updatedPayments: Record<string, PaymentData> = { ...this.payments() };
            uniquePlotIds.forEach(plotId => {
              updatedPayments[plotId] = {
                plotId,
                plotName: updatedPayments[plotId]?.plotName || plotId,
                paymentAmount: this.bulkAmount,
                paymentMethod: this.bulkMethod,
                paymentCompanyId: this.bulkCompanyId || undefined,
                paymentCompanyName: this.bulkCompanyName || undefined
              };
            });
            this.payments.set(updatedPayments);

            Swal.fire('Success', 'All plots updated successfully!', 'success');
            this.closeSettings();
          },
          error: (err) => {
            console.error('Bulk update error:', err);
            if (err.status === 403) {
              Swal.fire('Access Denied', 'You do not have permission to update payments. Please contact your administrator.', 'error');
            } else if (err.status === 401) {
              Swal.fire('Session Expired', 'Your session has expired. Please log in again.', 'warning')
                .then(() => this.router.navigate(['/login']));
            } else {
              Swal.fire('Error', `Bulk update failed. Server responded with: ${err.status} ${err.error?.message || err.statusText || 'Unknown error'}`, 'error');
            }
          }
        });
      }
    });
  }

  getNodeTotal(node: TreeNode): number {
    return node.plotIds.reduce((sum, plotId) => {
      return sum + (this.payments()[plotId]?.paymentAmount || 0);
    }, 0);
  }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.activeMenuId = null;
  }
}
