import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CustomerModalComponent, CustomerModalData } from '../customer-modal/customer-modal.component';
import { PlotCellComponent } from '../plot-cell/plot-cell.component';
import { AptDetailModalComponent } from '../apt-detail-modal/apt-detail-modal.component';
import { PlotData } from '../../../types';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerModalComponent, PlotCellComponent, AptDetailModalComponent],
  template: `
    <div class="h-screen flex flex-col bg-[#f8fafc] overflow-hidden font-sans">
      
      <!-- HEADER -->
      <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 z-50 shadow-sm">
        <div class="flex items-center gap-4">
          <button (click)="router.navigate(['/dashboard'])" 
                  class="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-500 border border-slate-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 class="text-base font-black text-slate-900 tracking-tight leading-none">Resident Management</h1>
            <p class="text-[9px] font-bold text-sky-500 uppercase tracking-[0.2em] mt-1">{{ totalResidentsCount() }} Total Registered Residents</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="downloadFullPDF()" 
                  class="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download All
          </button>
          
          <div class="relative w-64 group">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </span>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Highlight plot or resident..."
                   class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all" />
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        
        <!-- LEFT SIDEBAR: View Toggle + Tree View -->
        <aside class="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
          <!-- View Toggle -->
          <div class="p-4 border-b border-slate-100">
            <div class="flex gap-2 bg-slate-50 p-1 rounded-xl">
              <button (click)="viewMode.set('layout'); treeSelectedNode.set(null)"
                      [class]="'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ' + (viewMode() === 'layout' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')">
                🗺️ Layout
              </button>
              <button (click)="viewMode.set('tree')"
                      [class]="'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ' + (viewMode() === 'tree' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')">
                🌳 Tree
              </button>
            </div>
          </div>

          <!-- Tree View -->
          @if (viewMode() === 'tree') {
            <!-- Tree Search -->
            <div class="px-4 pt-3 pb-1">
              <div class="relative group">
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </span>
                <input type="text" [(ngModel)]="treeSearchQuery" placeholder="Search plots..."
                       class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-[10px] font-bold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
              </div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 pt-2">
              <div class="space-y-1">
                @for (node of getFilteredTreeData(); track node.id) {
                  <div class="animate-fade-in">
                    <!-- Parent Node -->
                    <div (click)="selectTreeNode(node.id)"
                         [class]="'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group ' + (treeSelectedNode() === node.id ? 'bg-sky-50 border-2 border-sky-300 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent')">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        @if (node.children?.length > 0) {
                          <button (click)="toggleTreeNode(node.id); $event.stopPropagation()"
                                  class="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-200 hover:border-slate-300 transition-all shrink-0">
                            <span [class]="'text-[10px] font-black transition-transform duration-200 inline-block ' + (isTreeNodeExpanded(node.id) ? 'rotate-90' : '')">▶</span>
                          </button>
                        } @else {
                          <span class="w-5 shrink-0"></span>
                        }
                        <span class="text-lg shrink-0">{{ node.icon }}</span>
                        <div class="flex-1 min-w-0">
                          <p class="text-[11px] font-black text-slate-900 truncate">{{ node.label }}</p>
                          <p class="text-[9px] text-slate-500 font-bold">{{ node.count }} resident{{ node.count !== 1 ? 's' : '' }}</p>
                        </div>
                      </div>
                      <button (click)="downloadTreeNode(node); $event.stopPropagation()" title="Download residents"
                              class="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all opacity-0 group-hover:opacity-100 shrink-0 text-sm">
                        📥
                      </button>
                    </div>

                    <!-- Child Nodes (Floors) -->
                    @if (isTreeNodeExpanded(node.id) && node.children?.length > 0) {
                      <div class="ml-6 mt-1 space-y-1 border-l-2 border-sky-200 pl-3">
                        @for (child of node.children; track child.id) {
                          <div (click)="selectTreeNode(child.id)"
                               [class]="'flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all group ' + (treeSelectedNode() === child.id ? 'bg-sky-50 border border-sky-300 shadow-sm' : 'bg-white hover:bg-slate-50 border border-slate-100')">
                            <div class="flex items-center gap-2 flex-1 min-w-0">
                              <span class="text-base shrink-0">{{ child.icon }}</span>
                              <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-black text-slate-800 truncate">{{ child.label }}</p>
                                <p class="text-[8px] text-slate-400 font-bold">{{ child.count }} resident{{ child.count !== 1 ? 's' : '' }}</p>
                              </div>
                            </div>
                            <button (click)="downloadTreeNode(child); $event.stopPropagation()" title="Download residents"
                                    class="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all opacity-0 group-hover:opacity-100 text-xs shrink-0">
                              📥
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                @if (getFilteredTreeData().length === 0) {
                  <div class="py-12 text-center">
                    <div class="text-4xl mb-3 opacity-20">🌳</div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ treeSearchQuery ? 'No Matches' : 'No Plots Yet' }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- Download All Button -->
            <div class="p-4 border-t border-slate-100">
              <button (click)="downloadFullPDF()"
                      class="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                📥 Download All Residents
              </button>
            </div>
          }

          <!-- Layout View Placeholder -->
          @if (viewMode() === 'layout') {
            <div class="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div class="text-5xl mb-4 opacity-20">🗺️</div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout View Active</p>
                <p class="text-[9px] text-slate-400 mt-2">Use the main canvas to interact with plots</p>
              </div>
            </div>
          }
        </aside>

        <!-- MAIN CANVAS (Layout View) -->
        @if (viewMode() === 'layout') {
        <main class="flex-1 overflow-auto p-12 bg-[#f1f5f9] custom-scrollbar relative"
              [style.--cell-size.px]="CELL()" [style.--road-size.px]="ROAD()">
          
          <!-- Zoom HUD -->
          <div class="fixed bottom-6 left-6 z-[100] flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-1.5 shadow-xl">
             <button (click)="zoomOut()" class="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 rounded-xl transition-all font-black border border-slate-100">－</button>
             <span class="text-[10px] font-black text-slate-400 w-12 text-center uppercase">{{(zoom() * 100).toFixed(0)}}%</span>
             <button (click)="zoomIn()" class="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 rounded-xl transition-all font-black border border-slate-100">＋</button>
          </div>

          <!-- GRID RENDERER -->
          <div class="inline-block min-w-max animate-fade-in origin-top-left transition-transform duration-300">
            <div *ngFor="let r of getRange(hStreets())" class="flex flex-col gap-0 leading-none">
              
              <!-- Plot Block Row -->
              <div class="flex">
                <ng-container *ngFor="let c of getRange(vStreets())">
                  <div class="bg-white/40 border border-slate-300/30 relative"
                       [style.width.px]="getMaxBlockCols(c) * CELL()" [style.height.px]="getMaxBlockRows(r) * CELL()">
                    
                    <!-- CSS Grid rendering -->
                    <div class="grid h-full w-full"
                         [style.grid-template-columns]="'repeat(' + getBlockCols(r,c) + ',' + CELL() + 'px)'"
                         [style.grid-template-rows]="'repeat(' + getBlockRows(r,c) + ',' + CELL() + 'px)'">
                      <ng-container *ngFor="let pr of getSubRange(getBlockRows(r,c))">
                        <ng-container *ngFor="let pc of getSubRange(getBlockCols(r,c))">
                          
                          <ng-container *ngIf="!isMergeSecondary('r'+r+'c'+c+'pr'+pr+'pc'+pc)">
                            <app-plot-cell 
                              [plotKey]="'r'+r+'c'+c+'pr'+pr+'pc'+pc"
                              [data]="plots()['r'+r+'c'+c+'pr'+pr+'pc'+pc]"
                              [isSelected]="selectedKey() === 'r'+r+'c'+c+'pr'+pr+'pc'+pc"
                              [isMerged]="isMergePrimary('r'+r+'c'+c+'pr'+pr+'pc'+pc)"
                              (cellClick)="onPlotClick('r'+r+'c'+c+'pr'+pr+'pc'+pc)"
                              [customClass]="(isPlotMatched('r'+r+'c'+c+'pr'+pr+'pc'+pc) ? 'ring-4 ring-sky-400 z-30 animate-pulse ' : '') + (isPlotBooked('r'+r+'c'+c+'pr'+pr+'pc'+pc) && !isPlotMatched('r'+r+'c'+c+'pr'+pr+'pc'+pc) ? 'ring-2 ring-amber-400 ring-offset-1 ' : '')">
                            </app-plot-cell>
                          </ng-container>
                          
                          <ng-container *ngIf="isMergeSecondary('r'+r+'c'+c+'pr'+pr+'pc'+pc)">
                            <div class="opacity-0 pointer-events-none" [style.width.px]="CELL()" [style.height.px]="CELL()"></div>
                          </ng-container>

                        </ng-container>
                      </ng-container>
                    </div>
                  </div>

                  <!-- Vertical Road -->
                  <div *ngIf="c < vStreets()" class="bg-slate-300/50 flex flex-col items-center justify-center relative"
                       [style.width.px]="ROAD()" [style.height.px]="getMaxBlockRows(r) * CELL()">
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] rotate-180" style="writing-mode: vertical-rl;">{{ vStreetNames()[c % vStreetNames().length] }}</span>
                  </div>
                </ng-container>
              </div>

              <!-- Horizontal Road -->
              <div *ngIf="r < hStreets()" class="flex">
                <ng-container *ngFor="let c of getRange(vStreets())">
                  <div class="bg-slate-300/50 flex items-center justify-center"
                       [style.width.px]="getMaxBlockCols(c) * CELL()" [style.height.px]="ROAD()">
                    <span *ngIf="c === 0" class="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">{{ hStreetNames()[r % hStreetNames().length] }}</span>
                  </div>
                  <div *ngIf="c < vStreets()" class="bg-slate-400/50" [style.width.px]="ROAD()" [style.height.px]="ROAD()"></div>
                </ng-container>
              </div>

            </div>
          </div>
        </main>
        }

        <!-- MAIN CONTENT (Tree View) — Customer Table -->
        @if (viewMode() === 'tree') {
        <main class="flex-1 overflow-auto bg-[#f1f5f9] flex flex-col">
          @if (getSelectedTreeNodeData(); as nodeData) {
            <!-- Table Header Bar -->
            <div class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ nodeData.icon }}</span>
                <div>
                  <h2 class="text-sm font-black text-slate-900 tracking-tight leading-none">{{ nodeData.label }}</h2>
                  <p class="text-[9px] font-bold text-sky-500 uppercase tracking-widest mt-1">{{ nodeData.bookings?.length || 0 }} Residents</p>
                </div>
                @if (nodeData.parentLabel) {
                  <span class="px-2 py-1 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-lg">{{ nodeData.parentLabel }}</span>
                }
              </div>
              <div class="flex items-center gap-2">
                <div class="relative group">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </span>
                  <input type="text" [(ngModel)]="tableSearchQuery" placeholder="Search in table..."
                         class="w-48 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-bold focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none transition-all" />
                </div>
                <button (click)="downloadTreeNode(nodeData)" 
                        class="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all flex items-center gap-1.5 shadow-sm">
                  📥 Download
                </button>
              </div>
            </div>

            <!-- Customer Data Table -->
            <div class="flex-1 overflow-auto p-6">
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full">
                  <thead>
                    <tr class="bg-slate-900 text-white">
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-12">S.No</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Name</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Mobile</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Plot / Unit</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Role</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest">Status</th>
                      <th class="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (res of getFilteredTableBookings(nodeData.bookings); track res.id || $index; let idx = $index) {
                      <tr class="border-b border-slate-100 hover:bg-sky-50/50 transition-colors group">
                        <td class="py-3 px-4 text-[11px] font-bold text-slate-400">{{ idx + 1 }}</td>
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black uppercase border shadow-inner"
                                 [class]="res.customerType === 'OWNER' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'">
                              {{ (res.customerName || '?').charAt(0) }}
                            </div>
                            <div>
                              <p class="text-[11px] font-black text-slate-800 leading-none">{{ res.customerName || '—' }}</p>
                              <p class="text-[9px] text-slate-400 mt-0.5">{{ res.email || '' }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-4 text-[11px] font-bold text-slate-600 font-mono">{{ res.customerMobile || '—' }}</td>
                        <td class="py-3 px-4">
                          <span class="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">{{ res.plotName || res.plotId }}</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg"
                                [class]="res.customerType === 'OWNER' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">{{ res.customerType || 'Tenant' }}</span>
                        </td>
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full" [class]="res.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-300'"></span>
                            <span class="text-[9px] font-black uppercase tracking-wider text-slate-500">{{ res.status || 'Archived' }}</span>
                          </div>
                        </td>
                        <td class="py-3 px-4">
                          <div class="pv-action-menu">
                            <button class="pv-action-trigger" [class.active]="activeMenuId === 'res_' + (res.id || idx)" (click)="toggleMenu('res_' + (res.id || idx), $event)">⋮</button>
                            <div class="pv-action-dropdown" *ngIf="activeMenuId === 'res_' + (res.id || idx)">
                              <button class="pv-action-item" (click)="editBooking(res)">✏️ Edit</button>
                              <button class="pv-action-item delete" (click)="deleteBooking(res)">🗑️ Delete</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>

                @if (!nodeData.bookings?.length) {
                  <div class="py-16 text-center">
                    <div class="text-4xl mb-3 opacity-20">📭</div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No residents in this selection</p>
                  </div>
                }

                @if (nodeData.bookings?.length && getFilteredTableBookings(nodeData.bookings).length === 0) {
                  <div class="py-12 text-center">
                    <div class="text-3xl mb-2 opacity-20">🔍</div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matches for "{{ tableSearchQuery }}"</p>
                  </div>
                }
              </div>
            </div>
          } @else {
            <!-- No node selected -->
            <div class="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div class="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center text-4xl mb-6 shadow-inner border border-slate-200 border-b-4">🌳</div>
              <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Select a Plot</h2>
              <p class="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider max-w-xs">Click any plot in the tree to view its resident details in a table format.</p>
            </div>
          }
        </main>
        }

        <!-- RIGHT PANEL: INSPECTOR (Layout mode) -->
        @if (viewMode() === 'layout') {
        <aside class="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-40 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
              <span class="text-sky-500 text-base">🆔</span> Plot Inspector
            </span>
            <button *ngIf="selectedKey()" (click)="selectedKey.set(null)" class="text-slate-300 hover:text-slate-500 transition-all text-base">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 custom-scrollbar">
            @if (selectedKey()) {
              <div class="space-y-6 animate-fade-in">
                
                <!-- Plot identity -->
                <div class="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl">
                  <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                   <div class="flex items-center gap-4 mb-4">
                      <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                        {{ getPlotIcon(selectedPlot()?.type) }}
                      </div>
                      <div>
                         <h2 class="text-lg font-black tracking-tight leading-none mb-1">{{ selectedPlot()?.name || selectedKey() }}</h2>
                         <p class="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400">{{ selectedPlot()?.type }}</p>
                      </div>
                   </div>
                   <div class="flex gap-4">
                      <div class="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                         <p class="text-[8px] font-black text-slate-400 uppercase mb-0.5">Plot Size</p>
                         <p class="text-xs font-bold">{{ selectedPlot()?.sqft || '—' }} <span class="text-[10px] text-slate-500 uppercase">sq.ft</span></p>
                      </div>
                   </div>
                </div>

                <!-- Resident List -->
                <div class="space-y-3">
                   <div class="flex items-center justify-between mb-1">
                      <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Registered Residents</h3>
                      <button (click)="openBooking()" class="text-[10px] font-black text-sky-600 hover:underline uppercase tracking-widest">+ Book</button>
                   </div>

                   @if (selectedResidents().length === 0) {
                      <div class="py-12 px-6 flex flex-col items-center justify-center text-center bg-sky-50/50 rounded-[3rem] border border-dashed border-sky-200/60 animate-fade-in shadow-inner">
                         <div class="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-sm border border-sky-100 mb-5 animate-bounce-subtle">🏜️</div>
                         <h4 class="text-xs font-black text-slate-800 uppercase tracking-[0.15em] mb-2 leading-tight">This Plot is Vacant</h4>
                         <p class="text-[10px] text-slate-400 max-w-[180px] leading-relaxed mb-6 font-medium">No customers registered for this location yet. Would you like to add a booking?</p>
                         <button (click)="openBooking()" class="w-full py-4 bg-sky-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-100 transition-all">
                           Book Plot Now
                         </button>
                      </div>
                   } @else {
                      <div class="space-y-3">
                        @for (res of selectedResidents(); track $index) {
                           <div class="group bg-white border border-slate-200 p-4 rounded-3xl hover:border-sky-300 hover:shadow-lg hover:shadow-sky-50 transition-all relative overflow-hidden">
                              <div class="absolute top-0 right-0 w-16 h-16 bg-sky-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div class="flex items-center gap-3 relative">
                                 <div class="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-[13px] font-black text-sky-600 uppercase border border-sky-50 shadow-inner">
                                    {{ (res.customerName || '?').charAt(0) }}
                                 </div>
                                 <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                       <p class="text-[12px] font-black text-slate-800 truncate leading-none mb-1">{{ res.customerName }}</p>
                                       <span class="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase" 
                                             [class]="res.customerType === 'OWNER' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'">
                                          {{ res.customerType }}
                                       </span>
                                    </div>
                                    <p class="text-[10px] font-bold text-slate-500 font-mono">{{ res.customerMobile }}</p>
                                    <p class="text-[9px] text-slate-400 mt-0.5">{{ res.email || '' }}</p>
                                 </div>
                              </div>
                              <div class="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                 <div class="flex items-center gap-2">
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ res.paymentType || 'No Term' }}</span>
                                    @if (res.doorNo) {
                                      <span class="text-[9px] text-slate-300">·</span>
                                      <span class="text-[9px] font-bold text-slate-400">Door {{ res.doorNo }}</span>
                                    }
                                    @if (res.sqFeet) {
                                      <span class="text-[9px] text-slate-300">·</span>
                                      <span class="text-[9px] font-bold text-slate-400">{{ res.sqFeet }} sqft</span>
                                    }
                                 </div>
                                 <div class="flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full" [class]="res.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-300'"></span>
                                    <span class="text-[8px] font-black uppercase tracking-widest text-slate-500">{{ res.status || 'Archived' }}</span>
                                 </div>
                              </div>
                              <div class="pv-action-menu w-full">
                                 <button class="pv-action-trigger w-full gap-2 text-[10px] uppercase font-black" [class.active]="activeMenuId === 'insp_' + $index" (click)="toggleMenu('insp_' + $index, $event)">
                                   Actions ⋮
                                 </button>
                                 <div class="pv-action-dropdown w-full" *ngIf="activeMenuId === 'insp_' + $index">
                                    <button class="pv-action-item" (click)="editBooking(res)">✏️ Edit</button>
                                    <button class="pv-action-item delete" (click)="deleteBooking(res)">🗑️ Delete</button>
                                 </div>
                              </div>
                           </div>
                        }
                      </div>

                      <button (click)="downloadPlotPDF()" class="w-full py-3 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 mt-2">
                        📥 Download Plot Ledger
                      </button>
                   }
                </div>

                <!-- Tower Info for apartment/pg -->
                @if (selectedPlot()?.type === 'apartment' || selectedPlot()?.type === 'pg') {
                   <div class="bg-sky-50 rounded-3xl p-5 border border-sky-100 space-y-4">
                      <div class="flex items-center justify-between">
                         <h3 class="text-[10px] font-black text-sky-700 uppercase tracking-widest">{{ selectedPlot()?.type === 'pg' ? 'PG Building' : 'Tower' }} Schematic</h3>
                         <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span class="text-[9px] font-bold text-sky-600 uppercase">{{ selectedPlot()?.aptConfig?.floors }} Floors</span>
                         </div>
                      </div>

                      <!-- Apartment owner/tenant summary -->
                      @if (aptResidents().length > 0) {
                        <div class="space-y-2">
                          @for (res of aptResidents(); track $index) {
                            <div class="flex items-center justify-between p-2.5 rounded-xl border"
                                 [class]="res.customerType === 'OWNER' ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'">
                              <div class="flex items-center gap-2">
                                <span class="text-[10px]">{{ res.customerType === 'OWNER' ? '👤' : '🏠' }}</span>
                                <div>
                                  <p class="text-[10px] font-black text-slate-800 leading-none">{{ res.customerName }}</p>
                                  <p class="text-[8px] font-bold mt-0.5" [class]="res.customerType === 'OWNER' ? 'text-emerald-600' : 'text-sky-600'">{{ res.customerType }} · {{ res.plotName }}</p>
                                </div>
                              </div>
                              <button (click)="downloadSingleAptResidentPDF(res)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-all text-sm">📥</button>
                            </div>
                          }
                        </div>
                        <button (click)="downloadAptResidentsPDF()" class="w-full py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                          📥 Download All Apt Residents
                        </button>
                      }

                      <p class="text-[9px] text-sky-500 font-bold">Double-click the plot to open the full schematic</p>
                      <button (click)="isAptDetailOpen.set(true)" class="w-full py-4 bg-white border border-sky-200 text-sky-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] hover:shadow-xl hover:shadow-sky-100 transition-all flex items-center justify-center gap-3">
                         🏢 Open Schematic
                      </button>
                   </div>
                }

              </div>
            } @else {
              <div class="h-full flex flex-col items-center justify-center py-20 text-center px-6">
                 <div class="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-4xl mb-6 shadow-inner border border-slate-100 border-b-4">🗺️</div>
                 <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Inspect Residents</h2>
                 <p class="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">Click any plot on the layout map to view detailed resident information, booking history, and registration details.</p>
              </div>
            }
          </div>
        </aside>
        }

      </div>

      <!-- BOOKED PLOT SWAL DIALOG -->
      @if (bookedSwalOpen() && bookedSwalKey()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4" (click)="closeBookedSwal()">
          <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>
          <div class="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in" (click)="$event.stopPropagation()">
            
            <!-- Header -->
            <div class="bg-amber-50 border-b border-amber-100 px-6 py-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">{{ getPlotIcon(bookedSwalPlot()?.type) }}</div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-black text-slate-900 leading-none">{{ bookedSwalPlot()?.name || bookedSwalKey() }}</h3>
                <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Already Booked · {{ bookedSwalResidents().length }} Active Resident{{ bookedSwalResidents().length !== 1 ? 's' : '' }}</p>
              </div>
              <button (click)="closeBookedSwal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 transition-all">✕</button>
            </div>

            <!-- Residents list -->
            <div class="px-6 py-4 max-h-52 overflow-y-auto space-y-2">
            @for (res of bookedSwalResidents(); track res.id) {
                <div class="flex items-center justify-between p-3 rounded-2xl border"
                     [class]="res.customerType === 'OWNER' ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black"
                         [class]="res.customerType === 'OWNER' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'">
                      {{ ((res.customerName || res.name || 'Resident').charAt(0)).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-[12px] font-black text-slate-800 leading-none">{{ res.customerName || res.name || 'Resident' }}</p>
                      <p class="text-[9px] font-bold mt-0.5" [class]="res.customerType === 'OWNER' ? 'text-emerald-600' : 'text-sky-600'">{{ res.customerType || 'Tenant' }} · {{ res.plotName || res.plotId }}</p>
                    </div>
                  </div>
                  <div class="pv-action-menu">
                    <button class="pv-action-trigger" [class.active]="activeMenuId === 'swal_' + res.id" (click)="toggleMenu('swal_' + res.id, $event)">⋮</button>
                    <div class="pv-action-dropdown" *ngIf="activeMenuId === 'swal_' + res.id">
                      <button class="pv-action-item" (click)="swalEdit(res)">✏️ Edit</button>
                      <button class="pv-action-item delete" (click)="swalDelete(res)">🗑️ Delete</button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Actions -->
            <div class="px-6 pb-6 space-y-2">
              <button (click)="swalAddTenant(bookedSwalKey()!)" class="w-full py-3 bg-sky-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
                ➕ Add More Tenant / Owner
              </button>
              @if (bookedSwalPlot()?.type === 'apartment' || bookedSwalPlot()?.type === 'pg') {
                <button (click)="swalOpenSchematic()" class="w-full py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  🏢 Open {{ bookedSwalPlot()?.type === 'pg' ? 'PG' : 'Apartment' }} Schematic
                </button>
              }
              <button (click)="closeBookedSwal()" class="w-full py-2.5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-700 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODALS -->
      @if (customerModalData() && isCustomerModalOpen()) {
        <app-customer-modal
          [data]="customerModalData()!"
          (close)="isCustomerModalOpen.set(false)"
          (saved)="onSaved()"
          (vacated)="onSaved()">
        </app-customer-modal>
      }

      @if (isAptDetailOpen() && selectedKey() && (selectedPlot()?.type === 'apartment' || selectedPlot()?.type === 'pg')) {
         <app-apt-detail-modal
            [isOpen]="isAptDetailOpen()"
            [plotKey]="selectedKey()!"
            [plotData]="selectedPlot()!"
            [projectId]="projectId()"
            (onClose)="isAptDetailOpen.set(false)"
            (onUpdatePlot)="onAptUpdate($event)">
         </app-apt-detail-modal>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  `]
})
export class CustomerManagementComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  router = inject(Router);

  loading = signal(true);
  searchQuery = '';
  activeMenuId: string | null = null;

  // Data Signals
  projectId = signal('');
  hStreets = signal(2);
  vStreets = signal(2);
  plotsPerBlock = signal(2);
  plots = signal<Record<string, PlotData>>({});
  hStreetNames = signal<string[]>([]);
  vStreetNames = signal<string[]>([]);
  mergeGroups = signal<string[][]>([]);
  blockOverrides = signal<Record<string, { rows: number, cols: number }>>({});

  // Interaction Signals
  selectedKey = signal<string | null>(null);
  zoom = signal(0.8);
  isCustomerModalOpen = signal(false);
  isAptDetailOpen = signal(false);
  customerModalData = signal<CustomerModalData | null>(null);

  // View mode: 'layout' or 'tree'
  viewMode = signal<'layout' | 'tree'>('layout');
  // Tree view state
  treeExpandedNodes = signal<Set<string>>(new Set());
  treeSelectedNode = signal<string | null>(null);

  // Resident Cache
  private allBookings = signal<any[]>([]);

  // Computed Properties
  CELL = computed(() => 90 * this.zoom());
  ROAD = computed(() => 60 * this.zoom());

  totalResidentsCount = computed(() => this.allBookings().filter(b => b.status === 'ACTIVE').length);

  selectedPlot = computed(() => {
    const key = this.selectedKey();
    return key ? this.plots()[key] : null;
  });

  // Only ACTIVE bookings for the selected plot (direct + unit-level for apt/pg)
  selectedResidents = computed(() => {
    const key = this.selectedKey();
    if (!key) return [];
    return this.allBookings().filter(b => b.status === 'ACTIVE' && (b.plotId === key || b.plotId?.startsWith(key + '_')));
  });

  // Apartment direct residents — ACTIVE only (same as selectedResidents for apt/pg)
  aptResidents = computed(() => {
    const key = this.selectedKey();
    if (!key) return [];
    return this.allBookings().filter(b => b.status === 'ACTIVE' && (b.plotId === key || b.plotId?.startsWith(key + '_')));
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

      // Load meta (grid dimensions, street names, mergeGroups)
      this.api.getLayoutMeta(companyId).subscribe({
        next: (metaRes: any) => {
          const meta = metaRes.data || {};
          const H = meta.global?.H ?? meta.hStreets ?? 2;
          const V = meta.global?.V ?? meta.vStreets ?? 2;
          const PSB = meta.global?.PSB ?? meta.plotsPerBlock ?? 2;
          this.hStreets.set(H);
          this.vStreets.set(V);
          this.plotsPerBlock.set(PSB);
          this.hStreetNames.set(meta.hStreetNames || []);
          this.vStreetNames.set(meta.vStreetNames || []);
          this.mergeGroups.set(meta.mergeGroups || []);
          this.blockOverrides.set(meta.blockOverrides || {});

          // Load plots separately
          this.api.getLayoutPlots(companyId).subscribe({
            next: (plotsRes: any) => {
              this.plots.set(plotsRes.data || {});

              // Load all bookings
              this.api.getLayoutCustomersAll(pid).subscribe({
                next: (custRes: any) => {
                  this.allBookings.set(custRes.data || []);
                  this.loading.set(false);
                  console.log('✅ Customer management loaded with', custRes.data?.length || 0, 'bookings');
                },
                error: () => this.loading.set(false)
              });
            },
            error: () => this.loading.set(false)
          });
        },
        error: () => this.loading.set(false)
      });
    });
  }

  // ── GRID HELPERS ────────────────────────────────────────────────────────

  getRange(n: number) { return Array(n + 1).fill(0).map((_, i) => i); }
  getSubRange(n: number) { return Array(n).fill(0).map((_, i) => i); }

  getBlockRows(r: number, c: number): number {
    return this.blockOverrides()[`${r}_${c}`]?.rows ?? this.plotsPerBlock();
  }
  getBlockCols(r: number, c: number): number {
    return this.blockOverrides()[`${r}_${c}`]?.cols ?? this.plotsPerBlock();
  }
  getMaxBlockRows(r: number): number {
    let max = 0;
    for (let c = 0; c <= this.vStreets(); c++) max = Math.max(max, this.getBlockRows(r, c));
    return max;
  }
  getMaxBlockCols(c: number): number {
    let max = 0;
    for (let r = 0; r <= this.hStreets(); r++) max = Math.max(max, this.getBlockCols(r, c));
    return max;
  }

  isMergePrimary(key: string): boolean {
    const g = this.mergeGroups().find(g => g.includes(key));
    return !!g && g[0] === key;
  }
  isMergeSecondary(key: string): boolean {
    const g = this.mergeGroups().find(g => g.includes(key));
    return !!g && g[0] !== key;
  }

  // Returns ACTIVE bookings for a plot key — handles both direct plots and apt/pg (unit-level plotIds)
  getPlotBookings(key: string): any[] {
    return this.allBookings().filter(b =>
      b.status === 'ACTIVE' && (b.plotId === key || b.plotId?.startsWith(key + '_'))
    );
  }

  isPlotBooked(key: string): boolean {
    return this.getPlotBookings(key).length > 0;
  }

  isPlotMatched(key: string): boolean {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return false;
    const plot = this.plots()[key];
    if (plot?.name?.toLowerCase().includes(q) || key.toLowerCase().includes(q)) return true;
    return this.getPlotBookings(key)
      .some(b => b.customerName?.toLowerCase().includes(q) || b.customerMobile?.includes(q));
  }

  // ── BOOKED PLOT SWAL ─────────────────────────────────────────────────────

  bookedSwalKey = signal<string | null>(null);
  bookedSwalOpen = signal(false);

  showBookedSwal(key: string) {
    this.bookedSwalKey.set(key);
    this.bookedSwalOpen.set(true);
  }

  closeBookedSwal() {
    this.bookedSwalOpen.set(false);
    this.bookedSwalKey.set(null);
    this.isAptDetailOpen.set(false);
  }

  bookedSwalPlot = computed(() => {
    const k = this.bookedSwalKey();
    return k ? this.plots()[k] : null;
  });

  // All ACTIVE bookings for the swal plot (direct + unit-level for apt/pg)
  bookedSwalResidents = computed(() => {
    const k = this.bookedSwalKey();
    if (!k) return [];
    return this.getPlotBookings(k);
  });

  swalAddTenant(key: string) {
    this.closeBookedSwal();
    const plot = this.plots()[key];
    const existingResidents = this.getPlotBookings(key);

    // Always add-person mode when clicking "Add More" from swal
    this.customerModalData.set({
      plotId: key,
      plotName: plot?.name || key,
      projectId: this.projectId(),
      plotType: plot?.type || 'house',
      sqft: plot?.sqft,
      mode: 'add-person',
      refBooking: existingResidents[0]
    });
    this.isCustomerModalOpen.set(true);
  }

  swalEdit(booking: any) {
    this.closeBookedSwal();
    const plot = this.plots()[booking.plotId] || this.plots()[this.bookedSwalKey()!];
    this.customerModalData.set({
      plotId: booking.plotId, plotName: booking.plotName || plot?.name || booking.plotId,
      projectId: this.projectId(), plotType: plot?.type || 'house',
      sqft: booking.sqFeet, mode: 'edit', editBooking: { ...booking }
    });
    this.isCustomerModalOpen.set(true);
  }

  swalDelete(booking: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: `Remove booking for ${booking.customerName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const del$ = booking.id ? this.api.vacateBooking(booking.id) : this.api.vacatePlot(this.projectId(), booking.plotId);
        del$.subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Booking has been removed.', 'success');
            this.closeBookedSwal();
            this.loadData();
          },
          error: () => Swal.fire('Error', 'Failed to remove booking.', 'error')
        });
      }
    });
  }

  swalOpenSchematic() {
    const key = this.bookedSwalKey()!;
    this.closeBookedSwal();
    this.selectedKey.set(key);
    this.isAptDetailOpen.set(true);
  }

  // ── INTERACTION ──────────────────────────────────────────────────────────

  private lastClickKey = '';
  private lastClickTime = 0;
  private clickTimeout: any = null;

  onPlotClick(key: string) {
    // CRITICAL: Clear modal state immediately so apt-detail-modal @if becomes false and overlay is removed
    this.isAptDetailOpen.set(false);
    this.selectedKey.set(null);

    const now = Date.now();
    const isDouble = key === this.lastClickKey && (now - this.lastClickTime) < 350;
    this.lastClickKey = key;
    this.lastClickTime = now;

    if (this.clickTimeout) { clearTimeout(this.clickTimeout); this.clickTimeout = null; }

    if (isDouble) {
      const plot = this.plots()[key];
      this.selectedKey.set(key);
      if (plot?.type === 'apartment' || plot?.type === 'pg') {
        this.isAptDetailOpen.set(true);
      }
      return;
    }

    this.clickTimeout = setTimeout(() => {
      this.clickTimeout = null;
      const plot = this.plots()[key];

      // Always select the plot first to show in sidebar
      this.selectedKey.set(key);

      // If plot doesn't exist or is vacant/road, just show in sidebar (no swal)
      if (!plot || plot.type === 'road' || plot.type === 'vacant') {
        return;
      }

      // If plot is booked, show swal
      if (this.isPlotBooked(key)) {
        this.showBookedSwal(key);
      }
    }, 260);
  }

  openBooking() {
    const plot = this.selectedPlot();
    const residents = this.selectedResidents();

    if (residents.length >= 1) {
      // One or more residents — show picker with Edit/Add/Delete options
      this.customerModalData.set({
        plotId: this.selectedKey()!,
        plotName: plot?.name || this.selectedKey()!,
        projectId: this.projectId(),
        plotType: plot?.type || 'house',
        sqft: plot?.sqft,
        mode: 'picker',
        allBookings: residents
      });
    } else {
      // No residents — new booking
      this.customerModalData.set({
        plotId: this.selectedKey()!,
        plotName: plot?.name || this.selectedKey()!,
        projectId: this.projectId(),
        plotType: plot?.type || 'house',
        sqft: plot?.sqft,
        mode: 'new'
      });
    }
    this.isCustomerModalOpen.set(true);
  }

  editBooking(booking: any) {
    // Get the plot type from plots data
    const plot = this.plots()[booking.plotId];
    const plotType = plot?.type || 'house';

    console.log('[DEBUG] editBooking - plotId:', booking.plotId);
    console.log('[DEBUG] editBooking - plot:', plot);
    console.log('[DEBUG] editBooking - plotType:', plotType);

    // Fetch only this specific plot's booking to reduce API load
    this.api.getPlotBooking(this.projectId(), booking.plotId).subscribe({
      next: (res: any) => {
        // Handle both single object and array responses
        const bookingData = Array.isArray(res.data) ? res.data[0] : res.data;
        this.customerModalData.set({
          plotId: booking.plotId,
          plotName: booking.plotName || plot?.name || booking.plotId,
          projectId: this.projectId(),
          plotType: plotType,
          sqft: booking.sqFeet,
          mode: 'edit',
          editBooking: bookingData
        });
        this.isCustomerModalOpen.set(true);
      },
      error: () => {
        // Fallback to passed booking if API fails
        this.customerModalData.set({
          plotId: booking.plotId,
          plotName: booking.plotName || plot?.name || booking.plotId,
          projectId: this.projectId(),
          plotType: plotType,
          sqft: booking.sqFeet,
          mode: 'edit',
          editBooking: { ...booking }
        });
        this.isCustomerModalOpen.set(true);
      }
    });
  }

  deleteBooking(booking: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: `Remove booking for ${booking.customerName || 'this resident'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const del$ = booking.id
          ? this.api.vacateBooking(booking.id)
          : this.api.vacatePlot(this.projectId(), booking.plotId);
        del$.subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Booking has been removed.', 'success');
            this.loadData();
          },
          error: () => Swal.fire('Error', 'Failed to remove booking.', 'error')
        });
      }
    });
  }

  onSaved() {
    this.isCustomerModalOpen.set(false);
    this.loadData();
  }

  onAptUpdate(event: { key: string; updates: any }) {
    // Update local plots signal so schematic reflects changes immediately
    this.plots.update(p => {
      const updatedPlot = { ...p[event.key], ...event.updates };
      
      // Persist to backend immediately
      const companyId = this.auth.getCompanyId();
      if (companyId) {
        this.api.savePlot(companyId, event.key, updatedPlot).subscribe();
      }

      return { ...p, [event.key]: updatedPlot };
    });
  }

  zoomIn() { this.zoom.update(z => Math.min(z + 0.1, 1.5)); }
  zoomOut() { this.zoom.update(z => Math.max(z - 0.1, 0.4)); }

  getPlotIcon(type?: string): string {
    const m: Record<string, string> = { apartment: '🏢', house: '🏡', shop: '🛒', hospital: '🏥', security: '🛡️', guesthouse: '🏨', pg: '🏠', park: '🌳', watertank: '🛢️' };
    return m[type || ''] || '📍';
  }

  // ── TREE VIEW ────────────────────────────────────────────────────────

  treeSearchQuery = '';
  tableSearchQuery = '';

  toggleTreeNode(nodeId: string) {
    const expanded = this.treeExpandedNodes();
    const newSet = new Set(expanded);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    this.treeExpandedNodes.set(newSet);
  }

  isTreeNodeExpanded(nodeId: string): boolean {
    return this.treeExpandedNodes().has(nodeId);
  }

  selectTreeNode(nodeId: string) {
    this.treeSelectedNode.set(nodeId);
    this.tableSearchQuery = '';
  }

  /** Returns the full node data for the currently selected tree node */
  getSelectedTreeNodeData(): any | null {
    const selectedId = this.treeSelectedNode();
    if (!selectedId) return null;
    const treeData = this.getTreeData();
    for (const node of treeData) {
      if (node.id === selectedId) return node;
      if (node.children) {
        for (const child of node.children) {
          if (child.id === selectedId) return { ...child, parentLabel: node.label };
        }
      }
    }
    return null;
  }

  /** Filter table bookings based on tableSearchQuery */
  getFilteredTableBookings(bookings: any[]): any[] {
    if (!bookings) return [];
    const q = this.tableSearchQuery.toLowerCase().trim();
    if (!q) return bookings;
    return bookings.filter(b =>
      b.customerName?.toLowerCase().includes(q) ||
      b.customerMobile?.includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.plotName?.toLowerCase().includes(q) ||
      b.plotId?.toLowerCase().includes(q)
    );
  }

  /** Filtered tree data with search support */
  getFilteredTreeData(): any[] {
    const tree = this.getTreeData();
    const q = this.treeSearchQuery.toLowerCase().trim();
    if (!q) return tree;
    return tree.filter(node =>
      node.label.toLowerCase().includes(q) ||
      node.type?.toLowerCase().includes(q) ||
      node.children?.some((c: any) => c.label.toLowerCase().includes(q))
    );
  }

  getTreeData() {
    const plots = this.plots();
    const bookings = this.allBookings().filter(b => b.status === 'ACTIVE');
    const tree: any[] = [];

    // Group plots by type
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

    // Build apartment nodes with floors (show all floors, even those without bookings)
    apartments.forEach(({ key, plot }) => {
      const aptBookings = bookings.filter(b => b.plotId === key || b.plotId?.startsWith(key + '_'));
      const floors = plot.aptConfig?.floors || 0;
      const floorNodes: any[] = [];

      for (let f = 1; f <= floors; f++) {
        const floorBookings = aptBookings.filter(b => {
          if (b.plotId === key) return false;
          const unitId = b.plotId?.split('_')[1];
          return unitId && unitId.startsWith(String(f));
        });
        floorNodes.push({
          id: `${key}_floor_${f}`,
          label: `Floor ${f}`,
          type: 'floor',
          icon: '🏢',
          count: floorBookings.length,
          bookings: floorBookings,
          parentKey: key
        });
      }

      tree.push({
        id: key,
        label: plot.name || key,
        type: 'apartment',
        icon: '🏢',
        count: aptBookings.length,
        bookings: aptBookings,
        children: floorNodes
      });
    });

    // Build PG nodes with floors (show all floors)
    pgs.forEach(({ key, plot }) => {
      const pgBookings = bookings.filter(b => b.plotId === key || b.plotId?.startsWith(key + '_'));
      const floors = plot.aptConfig?.floors || 0;
      const floorNodes: any[] = [];

      for (let f = 1; f <= floors; f++) {
        const floorBookings = pgBookings.filter(b => {
          if (b.plotId === key) return false;
          const unitId = b.plotId?.split('_')[1];
          return unitId && unitId.startsWith(String(f));
        });
        floorNodes.push({
          id: `${key}_floor_${f}`,
          label: `Floor ${f}`,
          type: 'floor',
          icon: '🏠',
          count: floorBookings.length,
          bookings: floorBookings,
          parentKey: key
        });
      }

      tree.push({
        id: key,
        label: plot.name || key,
        type: 'pg',
        icon: '🏠',
        count: pgBookings.length,
        bookings: pgBookings,
        children: floorNodes
      });
    });

    // Build other plot nodes (house, shop, hospital, park, etc.) — show ALL, even vacant
    others.forEach(({ key, plot }) => {
      const plotBookings = bookings.filter(b => b.plotId === key);
      tree.push({
        id: key,
        label: plot.name || key,
        type: plot.type,
        icon: this.getPlotIcon(plot.type),
        count: plotBookings.length,
        bookings: plotBookings,
        children: []
      });
    });

    return tree;
  }

  async downloadTreeNode(node: any) {
    Swal.fire({
      title: 'Generating Report',
      text: 'Please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const { doc, at } = await this.makePDF('l');
      const companyId = this.auth.getCompanyId();

      let allPayments: Record<string, any> = {};
      let allSplits: Record<string, number> = {};
      try {
        const rawPay = localStorage.getItem(`pv_payments_${companyId}`);
        if (rawPay) allPayments = JSON.parse(rawPay);
        const rawSplits = localStorage.getItem(`pv_payments_${companyId}_overrides`);
        if (rawSplits) allSplits = JSON.parse(rawSplits);
      } catch (e) { }

      doc.setFontSize(20); doc.setTextColor(15, 23, 42);
      doc.text(`${node.icon} ${node.label} — Resident Ledger`, 14, 18);
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
      doc.setDrawColor(226, 232, 240); doc.line(14, 27, 282, 27);

      const bookings = node.bookings || [];
      if (!bookings.length) { alert('No residents found.'); return; }

      const rows = bookings.map((b: any) => {
        const plotPay = allPayments[b.plotId] || null;
        const resCount = bookings.filter((x: any) => x.plotId === b.plotId).length;
        const share = allSplits[b.id] != null
          ? allSplits[b.id]
          : (plotPay?.amount ? Math.round(plotPay.amount / resCount) : 0);

        return [
          b.plotName || b.plotId,
          b.customerName || '—',
          b.customerMobile || '—',
          b.email || '—',
          b.professionName || '—',
          b.customerType || 'Resident',
          b.paymentType || '—',
          b.status || 'ACTIVE',
          share > 0 ? `₹${share}` : '—'
        ];
      });

      at({
        startY: 32,
        head: [['Plot/Unit', 'Resident', 'Mobile', 'Email', 'Profession', 'Role', 'Frequency', 'Status', 'Share']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 3: { cellWidth: 35 } }
      });

      const fileName = `${node.label.replace(/\s+/g, '_')}_Residents.pdf`;
      doc.save(fileName);
      Swal.fire('Success', 'Report downloaded successfully!', 'success');
    } catch (e) { console.error(e); Swal.fire('Error', 'PDF generation failed', 'error'); }
  }

  // ── PDF ──────────────────────────────────────────────────────────

  private async makePDF(orientation: 'p' | 'l' = 'p'): Promise<{ doc: any; at: (opts: any) => void }> {
    const jsMod: any = await import('jspdf');
    const atMod: any = await import('jspdf-autotable');
    const JsPDF = jsMod.jsPDF ?? jsMod.default?.jsPDF ?? jsMod.default;
    const doc = new JsPDF(orientation, 'mm', 'a4');
    const fn = atMod.default ?? atMod.autoTable;
    const at = (opts: any) => typeof fn === 'function' && fn.length >= 2 ? fn(doc, opts) : fn(opts);
    return { doc, at };
  }

  async downloadSingleAptResidentPDF(res: any) {
    try {
      const { doc, at } = await this.makePDF();
      doc.setFontSize(18); doc.setTextColor(15, 23, 42);
      doc.text(`Resident: ${res.customerName || '—'}`, 14, 18);
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
      doc.setDrawColor(226, 232, 240); doc.line(14, 27, 196, 27);
      at({
        startY: 32,
        head: [['Field', 'Value']],
        body: [
          ['Name', res.customerName || '—'],
          ['Mobile', res.customerMobile || '—'],
          ['Email', res.email || '—'],
          ['Profession', res.professionName || '—'],
          ['Role', res.customerType || '—'],
          ['Unit', res.plotName || res.plotId],
          ['Payment', res.paymentType || '—'],
          ['Door No', res.doorNo || '—'],
          ['Sq Feet', res.sqFeet ? `${res.sqFeet} sqft` : '—'],
          ['Status', res.status || 'ACTIVE'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 10 }
      });
      doc.save(`Resident_${(res.customerName || 'unknown').replace(/\s+/g, '_')}.pdf`);
    } catch (e) { console.error(e); }
  }

  async downloadAptResidentsPDF() {
    const key = this.selectedKey();
    const plot = this.selectedPlot();
    const residents = this.aptResidents();
    if (!residents.length) { alert('No unit bookings found for this apartment.'); return; }
    try {
      const { doc, at } = await this.makePDF('l');
      doc.setFontSize(18); doc.setTextColor(15, 23, 42);
      doc.text(`${plot?.aptConfig?.blockName || plot?.name || key} — All Residents`, 14, 18);
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
      doc.setDrawColor(226, 232, 240); doc.line(14, 27, 282, 27);
      const rows = residents.map(b => [
        b.plotName || b.plotId,
        b.customerName || '—',
        b.customerMobile || '—',
        b.email || '—',
        b.professionName || '—',
        b.customerType || '—',
        b.paymentType || '—',
        b.doorNo || '—',
        b.sqFeet ? `${b.sqFeet}` : '—',
        b.status || 'ACTIVE'
      ]);
      at({
        startY: 32,
        head: [['Unit', 'Name', 'Mobile', 'Email', 'Profession', 'Role', 'Payment', 'Door', 'Sqft', 'Status']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });
      doc.save(`Apt_${plot?.name || key}_Residents.pdf`);
    } catch (e) { console.error(e); }
  }

  async downloadFullPDF() {
    Swal.fire({
      title: 'Generating Report',
      text: 'Please wait while we generate your PDF...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const { doc, at } = await this.makePDF('l');
      const companyId = this.auth.getCompanyId();

      let allPayments: Record<string, any> = {};
      let allSplits: Record<string, number> = {};
      try {
        const rawPay = localStorage.getItem(`pv_payments_${companyId}`);
        if (rawPay) allPayments = JSON.parse(rawPay);
        const rawSplits = localStorage.getItem(`pv_payments_${companyId}_overrides`);
        if (rawSplits) allSplits = JSON.parse(rawSplits);
      } catch (e) { }

      doc.setFontSize(20); doc.setTextColor(15, 23, 42);
      doc.text('PlotVista — Full Resident Ledger', 14, 18);
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
      doc.setDrawColor(226, 232, 240); doc.line(14, 27, 282, 27);

      const bookings = this.allBookings().filter(b => b.status === 'ACTIVE');
      if (!bookings.length) { alert('No active residents found.'); return; }

      const rows = bookings.map(b => {
        const plotPay = allPayments[b.plotId] || null;
        const resCount = bookings.filter(x => x.plotId === b.plotId).length;
        const share = allSplits[b.id] != null
          ? allSplits[b.id]
          : (plotPay?.amount ? Math.round(plotPay.amount / resCount) : 0);

        return [
          b.plotName || b.plotId,
          b.customerName || '—',
          b.customerMobile || '—',
          b.email || '—',
          b.professionName || '—',
          b.customerType || 'Resident',
          b.paymentType || '—',
          b.status || 'ACTIVE',
          share > 0 ? `\u20B9${share}` : '—'
        ];
      });

      at({
        startY: 32,
        head: [['Plot', 'Resident', 'Mobile', 'Email', 'Profession', 'Role', 'Frequency', 'Status', 'Share']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 3: { cellWidth: 40 } }
      });

      doc.save('Full_Resident_Ledger.pdf');
      Swal.fire('Success', 'Report downloaded successfully!', 'success');
    } catch (e) { console.error(e); Swal.fire('Error', 'PDF generation failed', 'error'); }
  }

  async downloadPlotPDF() {
    const key = this.selectedKey();
    if (!key) return;
    const plot = this.selectedPlot();
    const residents = this.selectedResidents();
    if (!residents.length) { alert('No residents to export for this plot.'); return; }

    let paymentInfo: any = null;
    let manualSplits: Record<string, number> = {};
    try {
      const companyId = this.auth.getCompanyId();
      const rawPay = localStorage.getItem(`pv_payments_${companyId}`);
      if (rawPay) paymentInfo = JSON.parse(rawPay)[key];
      const rawSplits = localStorage.getItem(`pv_payments_${companyId}_overrides`);
      if (rawSplits) manualSplits = JSON.parse(rawSplits);
    } catch (e) { }

    try {
      const { doc, at } = await this.makePDF();
      const firstRes = residents[0];

      // ── HEADER ──
      doc.setFontSize(20); doc.setTextColor(15, 23, 42);
      doc.text('PlotVista — Plot Ledger', 14, 18);
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
      doc.setDrawColor(226, 232, 240); doc.line(14, 27, 196, 27);

      // ── PLOT DETAILS BLOCK ──
      doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text('PLOT DETAILS', 14, 34);
      doc.setFontSize(11); doc.setTextColor(15, 23, 42);
      doc.text(
        `Door No: ${firstRes.doorNo || '—'}    Area: ${plot?.sqft || firstRes.sqFeet || '—'} SQFT    Type: ${(plot?.type || 'HOUSE').toUpperCase()}`,
        14, 41
      );

      let startY = 48;
      if (paymentInfo) {
        doc.setFontSize(9); doc.setTextColor(100, 116, 139);
        doc.text(
          `Total Rent: ₹${paymentInfo.amount || 0}    Period: ${paymentInfo.period || 'Monthly'}    Category: ${paymentInfo.category || '—'}`,
          14, startY
        );
        startY += 8;
      }

      // ── RESIDENTS TABLE ──
      const rows = residents.map(b => {
        const share = manualSplits[b.id] != null
          ? manualSplits[b.id]
          : (paymentInfo?.amount ? Math.round(paymentInfo.amount / residents.length) : 0);

        return [
          b.customerName || '—',
          b.customerMobile || '—',
          b.email || '—',
          b.professionName || '—',
          b.customerType || 'Resident',
          b.paymentType || '—',
          b.status || 'ACTIVE',
          b.note || '—',
          share > 0 ? `\u20B9${share}` : '—'
        ];
      });

      at({
        startY,
        head: [['Resident', 'Mobile', 'Email', 'Profession', 'Role', 'Frequency', 'Status', 'Notes', 'Share']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 2: { cellWidth: 30 }, 7: { cellWidth: 30 } }
      });

      doc.save(`Ledger_${plot?.name || key}.pdf`);
    } catch (e) { console.error(e); alert('PDF generation failed.'); }
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
