import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostListener, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlotData } from '../../../types';
import { CustomerModalComponent, CustomerModalData } from '../customer-modal/customer-modal.component';
import { ApiService } from '../../services/api.service';

const COMMON_FACILITIES = ['Gym', 'Pool', 'Parking', 'Security', 'Lounge', 'Garden', 'WiFi', 'EV Charging'];

const COMMUNITY_SHOPS = [
  { value: 'community_hall', label: 'Community Hall', emoji: '🏛️' },
  { value: 'mini_market', label: 'Mini Market', emoji: '🛒' },
  { value: 'pharmacy', label: 'Pharmacy', emoji: '💊' },
  { value: 'laundry', label: 'Laundry', emoji: '🧺' },
  { value: 'gym_room', label: 'Gym Room', emoji: '🏋️' },
  { value: 'salon', label: 'Salon', emoji: '💈' },
  { value: 'cafe', label: 'Café', emoji: '☕' },
  { value: 'library', label: 'Library', emoji: '📚' },
  { value: 'kids_play', label: 'Kids Play', emoji: '🎠' },
  { value: 'office', label: 'Office Space', emoji: '💼' },
  { value: 'clinic', label: 'Clinic', emoji: '🩺' },
  { value: 'atm', label: 'ATM', emoji: '🏧' },
];

@Component({
  selector: 'app-apt-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerModalComponent],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[150] flex items-center justify-center p-2">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" (click)="$event.target === $event.currentTarget && onClose.emit()"></div>
      <div (click)="$event.stopPropagation()" class="relative w-full max-w-[96vw] h-[94vh] rounded-[2rem] overflow-hidden flex flex-col animate-fade-up" style="background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 20px 60px rgba(0,0,0,0.12);">

        <!-- Top Header -->
        <div class="px-8 py-5 flex items-center justify-between shrink-0" style="border-bottom:1px solid #e2e8f0; background:#ffffff;">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-apt/10 border border-apt/20 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🏢</div>
            <div>
              <h2 class="text-2xl font-black text-slate-900 tracking-tighter">{{plotData.aptConfig?.blockName || (plotData.type === 'pg' ? 'PG Building' : 'Tower')}}</h2>
              <p class="text-accent text-[10px] font-bold uppercase tracking-[0.3em] mt-0.5 opacity-80">
                {{plotData.aptConfig?.floors}} Floors · {{plotData.aptConfig?.unitsPerFloor}} {{plotData.type === 'pg' ? 'Rooms' : 'Units'}}/Floor · {{plotKey}}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <!-- Legend -->
            <div class="flex items-center gap-3 text-[9px] text-slate-500 mr-4 font-bold">
              <span class="flex items-center gap-1.5"><span class="w-4 h-5 rounded border border-slate-200 bg-white inline-block"></span>Vacant</span>
              <span class="flex items-center gap-1.5"><span class="w-4 h-5 rounded border border-emerald-400 bg-emerald-50 inline-block"></span>Owner</span>
              <span class="flex items-center gap-1.5"><span class="w-4 h-5 rounded border border-sky-400 bg-sky-50 inline-block"></span>Tenant</span>
              <span class="flex items-center gap-1.5"><span class="w-4 h-5 rounded border border-violet-400 bg-violet-50 inline-block"></span>Both</span>
              <span class="flex items-center gap-1.5"><span class="w-4 h-5 rounded border border-blue-400/50 bg-blue-50 inline-block"></span>Shop</span>
              <span class="flex items-center gap-1.5"><span class="w-4 h-5 rounded border-dashed border border-slate-300 opacity-60 inline-block"></span>Removed</span>
            </div>
            <button (click)="onClose.emit()" class="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all text-slate-600 text-lg">✕</button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex flex-1 overflow-hidden">

          <!-- LEFT: Tabbed panel (Facilities | Bill & PDF) -->
          <div class="w-64 flex flex-col shrink-0" style="background:#ffffff; border-right:1px solid #e2e8f0;">
            <!-- Tab bar -->
            <div class="flex shrink-0" style="border-bottom:1px solid #e2e8f0;">
              <button (click)="leftTab='facilities'"
                [class]="'flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ' + (leftTab==='facilities' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-slate-400 hover:text-slate-600')">
                Facilities
              </button>
            </div>

            <!-- FACILITIES TAB -->
            <div *ngIf="leftTab==='facilities'" class="flex flex-col overflow-y-auto custom-scrollbar flex-1">
              <div class="p-5" style="border-bottom:1px solid #e2e8f0;">
                <h3 class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 flex items-center justify-between">
                  <span>Facilities</span>
                  <span class="text-accent text-[8px] font-normal lowercase tracking-normal">Click to toggle</span>
                </h3>
                <div class="flex flex-wrap gap-1.5">
                  <button *ngFor="let f of commonFacilities" (click)="handleFacilityClick(f)"
                    [disabled]="readOnly"
                    [class]="'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ' +
                      (plotData.aptConfig!.facilities.includes(f) ? 'bg-accent text-slate-950 border-accent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-accent/40 hover:bg-slate-50') + (readOnly ? ' cursor-default' : ' cursor-pointer')">
                    {{f}}
                  </button>
                </div>
              </div>
              <div class="p-5" style="border-bottom:1px solid #e2e8f0;">
                <h3 class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 flex items-center justify-between">
                  <span>Community Palette</span>
                  <span class="text-slate-600 text-[8px] font-normal lowercase tracking-normal">Drag onto unit</span>
                </h3>
                <div class="grid grid-cols-2 gap-2">
                  <div *ngFor="let s of communityShops" [draggable]="!readOnly" (dragstart)="handleShopDragStart(s.value)"
                    [class]="'flex items-center gap-2 px-2.5 py-2.5 bg-white rounded-xl border border-slate-200 transition-all group ' + (readOnly ? 'cursor-default' : 'hover:border-blue-400 hover:bg-blue-50 cursor-grab active:cursor-grabbing')">
                    <span class="text-base group-hover:scale-110 transition-transform">{{s.emoji}}</span>
                    <span class="text-[9px] font-black text-slate-600 group-hover:text-blue-600 truncate">{{s.label}}</span>
                  </div>
                </div>
              </div>
              <div class="p-5 mt-auto" style="border-top:1px solid #e2e8f0;">
                <h3 class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Room Summary</h3>
                <div class="space-y-2">
                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <span class="text-[10px] text-slate-500 font-bold">Total Rooms</span>
                    <span class="text-accent font-black">{{(plotData.aptConfig?.floors || 0) * (plotData.aptConfig?.unitsPerFloor || 0)}}</span>
                  </div>
                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <span class="text-[10px] text-slate-500 font-bold">Parking Floors</span>
                    <span class="text-blue-500 font-black">{{plotData.aptConfig?.parkingFloors || 0}}</span>
                  </div>
                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <span class="text-[10px] text-slate-500 font-bold">Occupied</span>
                    <span class="text-house font-black">{{buildingBookings().length}}</span>
                  </div>
                  <div class="flex items-center justify-between p-2.5 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                    <span class="text-[10px] text-blue-600 font-bold">Shops</span>
                    <span class="text-blue-500 font-black">{{getShopCount()}}</span>
                  </div>
                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <span class="text-[10px] text-slate-500 font-bold">Removed</span>
                    <span class="text-danger font-black">{{plotData.aptConfig?.skippedUnits?.length || 0}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- SERVICES TAB REMOVED -->
            <div *ngIf="false" class="flex flex-col overflow-y-auto custom-scrollbar flex-1 p-4 space-y-3"></div>
          </div>

          <!-- CENTER: Schematic -->
          <div class="flex-1 flex flex-col overflow-hidden" style="background:#f0f4f8;">
            <div class="px-6 py-3 border-b flex items-center justify-between shrink-0" style="background:#ffffff; border-color:#e2e8f0;">
              <span class="text-[10px] uppercase tracking-[0.2em] font-black" style="color:#64748b;">Real-Time Schematic Unit</span>
              <div class="flex items-center gap-4">
                <span *ngIf="pendingMerge.length > 0" class="text-[10px] text-purple-400 font-black animate-pulse">{{pendingMerge.length}} units selected — release Ctrl to merge</span>
                <span *ngIf="pendingMerge.length === 0 && selectedUnit" class="text-[10px] text-accent font-black">
                  Unit {{selectedUnit}} —
                  <span [class]="isShopUnit(selectedUnit) ? 'text-blue-400' : 'text-house'">
                    {{isShopUnit(selectedUnit) ? getShopLabel(selectedUnit) : 'Residential'}}
                  </span>
                </span>
              </div>
            </div>

            <div class="flex-1 overflow-auto custom-scrollbar p-8 flex items-start justify-center" style="background-image:radial-gradient(circle,#c8d4e0 1px,transparent 1px);background-size:24px 24px;" (dragover)="$event.preventDefault()">
              <div class="flex flex-col gap-3">

                <!-- Floors (top = highest floor) -->
                <div *ngFor="let floor of floorsArray; let fIdx = index" class="flex gap-3 items-center">
                  <span class="text-[10px] font-black w-8 text-right shrink-0" style="color:#64748b;">
                    {{plotData.aptConfig!.floors - fIdx}}F
                  </span>
                  <ng-container *ngFor="let unit of getUnitsArrayForFloor(plotData.aptConfig!.floors - fIdx); let uIdx = index">
                    <div *ngIf="!isMergeSecondary(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                      (click)="onUnitCellClick($event, getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                      (drop)="handleDrop(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                      [class]="getUnitClass(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                      [style.width]="getMergedWidth(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                    >
                      <ng-container *ngIf="isUnitSkipped(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))">
                        <div class="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-white/30 rounded-tl"></div>
                        <div class="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-white/30 rounded-tr"></div>
                        <div class="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-white/30 rounded-bl"></div>
                        <div class="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-white/30 rounded-br"></div>
                      </ng-container>
                      <ng-container *ngIf="!isUnitSkipped(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))">
                        <span *ngIf="getShopEmoji(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))" class="text-2xl leading-none">{{getShopEmoji(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))}}</span>
                        
                        <!-- Room Label/Input -->
                        <div (click)="$event.stopPropagation(); $event.stopImmediatePropagation()" class="flex flex-col items-center justify-center w-full px-2">
                          <input *ngIf="selectedUnit === getUnitId(plotData.aptConfig!.floors - fIdx, uIdx) && !readOnly" type="text"
                            [ngModel]="plotData.aptConfig?.unitNames?.[getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)] || getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)"
                            (ngModelChange)="updateUnitName(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx), $event)"
                            (click)="$event.stopPropagation(); $event.stopImmediatePropagation()"
                            class="bg-white/10 border-none outline-none text-[11px] font-black text-white text-center w-full rounded py-1 focus:bg-white/20 transition-all font-mono"
                            (keydown.enter)="$event.stopPropagation()" />
                          <span *ngIf="selectedUnit !== getUnitId(plotData.aptConfig!.floors - fIdx, uIdx) || readOnly" 
                            (click)="$event.stopPropagation(); $event.stopImmediatePropagation(); selectUnit(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                            class="text-[11px] font-black leading-none mt-1"
                            [class]="isShopUnit(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)) ? 'text-blue-200' : 'text-white/80'">
                            {{ isMergePrimary(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)) ? getMergeLabel(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)) : (plotData.aptConfig?.unitNames?.[getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)] || getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)) }}
                          </span>
                        </div>
                        <span *ngIf="isShopUnit(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))" class="text-[7px] text-blue-200 font-black uppercase leading-none text-center px-1 truncate w-full">{{getShopLabel(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))}}</span>
                        <span *ngIf="!isShopUnit(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))" class="text-[7px] font-black uppercase leading-none"
                          [class]="getBhkColor(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))">
                          {{getUnitBhk(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)) || 'ROOM'}}
                        </span>
                        <div *ngIf="isUnitOccupied(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                          class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                          [class]="isShopUnit(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)) ? 'bg-blue-400' : 'bg-house'">
                        </div>
                        <span *ngIf="pendingMerge.includes(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))" class="absolute -top-2 -left-2 w-4 h-4 bg-purple-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">{{pendingMerge.indexOf(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)) + 1}}</span>
                        <button *ngIf="showSplitButton(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx))"
                          (click)="handleSplit(getUnitId(plotData.aptConfig!.floors - fIdx, uIdx)); $event.stopPropagation()"
                          class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 h-5 bg-blue-500 text-white rounded-full text-[8px] font-black flex items-center gap-0.5 justify-center shadow-lg z-10 hover:bg-blue-400 transition-all whitespace-nowrap">✂ Split</button>
                      </ng-container>
                    </div>
                  </ng-container>
                </div>

                <!-- Ground Floor -->
                <div class="flex gap-3 items-center pt-3 mt-1" style="border-top:2px solid #e2e8f0;">
                  <span class="text-[10px] font-black w-8 text-right shrink-0" style="color:#64748b;">GF</span>
                  <ng-container *ngFor="let unit of unitsArray; let uIdx = index">
                    <div *ngIf="!isMergeSecondary('G'+(uIdx+1))"
                      (click)="onUnitCellClick($event, 'G'+(uIdx+1))"
                      (drop)="handleDrop('G'+(uIdx+1))"
                      [class]="getUnitClass('G'+(uIdx+1))"
                      [style.width]="getMergedWidth('G'+(uIdx+1))"
                    >
                      <ng-container *ngIf="isUnitSkipped('G'+(uIdx+1))">
                        <div class="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-white/30 rounded-tl"></div>
                        <div class="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-white/30 rounded-tr"></div>
                        <div class="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-white/30 rounded-bl"></div>
                        <div class="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-white/30 rounded-br"></div>
                      </ng-container>
                      <ng-container *ngIf="!isUnitSkipped('G'+(uIdx+1))">
                        <span *ngIf="getShopEmoji('G'+(uIdx+1))" class="text-2xl leading-none">{{getShopEmoji('G'+(uIdx+1))}}</span>
                        
                        <!-- Room Label/Input -->
                        <div (click)="$event.stopPropagation(); $event.stopImmediatePropagation()" class="flex flex-col items-center justify-center w-full px-2">
                          <input *ngIf="selectedUnit === 'G'+(uIdx+1) && !readOnly" type="text"
                            [ngModel]="plotData.aptConfig?.unitNames?.['G'+(uIdx+1)] || 'G'+(uIdx+1)"
                            (ngModelChange)="updateUnitName('G'+(uIdx+1), $event)"
                            (click)="$event.stopPropagation(); $event.stopImmediatePropagation()"
                            class="bg-white/10 border-none outline-none text-[11px] font-black text-white text-center w-full rounded py-1 focus:bg-white/20 transition-all font-mono"
                            (keydown.enter)="$event.stopPropagation()" />
                          <span *ngIf="selectedUnit !== 'G'+(uIdx+1) || readOnly"
                            (click)="$event.stopPropagation(); $event.stopImmediatePropagation(); selectUnit('G'+(uIdx+1))"
                            class="text-[11px] font-black leading-none mt-1"
                            [class]="isShopUnit('G'+(uIdx+1)) ? 'text-blue-200' : 'text-white/80'">
                            {{ isMergePrimary('G'+(uIdx+1)) ? getMergeLabel('G'+(uIdx+1)) : (plotData.aptConfig?.unitNames?.['G'+(uIdx+1)] || 'G'+(uIdx+1)) }}
                          </span>
                        </div>
                        <span *ngIf="isShopUnit('G'+(uIdx+1))" class="text-[7px] text-blue-200 font-black uppercase leading-none text-center px-1 truncate w-full">{{getShopLabel('G'+(uIdx+1))}}</span>
                        <span *ngIf="!isShopUnit('G'+(uIdx+1))" class="text-[7px] font-black uppercase leading-none"
                          [class]="getBhkColor('G'+(uIdx+1))">
                          {{getUnitBhk('G'+(uIdx+1)) || 'BASE'}}
                        </span>
                        <div *ngIf="isUnitOccupied('G'+(uIdx+1))" class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-house rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <span *ngIf="pendingMerge.includes('G'+(uIdx+1))" class="absolute -top-2 -left-2 w-4 h-4 bg-purple-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">{{pendingMerge.indexOf('G'+(uIdx+1)) + 1}}</span>
                        <button *ngIf="showSplitButton('G'+(uIdx+1))"
                          (click)="handleSplit('G'+(uIdx+1)); $event.stopPropagation()"
                          class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 h-5 bg-blue-500 text-white rounded-full text-[8px] font-black flex items-center gap-0.5 justify-center shadow-lg z-10 hover:bg-blue-400 transition-all whitespace-nowrap">✂ Split</button>
                      </ng-container>
                    </div>
                  </ng-container>
                </div>

              </div>
            </div>

            <div class="px-6 py-2 text-[9px] text-slate-400 flex gap-5 shrink-0" style="border-top:1px solid #e2e8f0; background:#ffffff;">
              <span>🖱️ Click to inspect</span>
              <span>⌨️ Ctrl+Click multi-select → merge</span>
              <span>✂ Click merged → Split</span>
              <span>● Green = occupied</span>
            </div>
          </div>

          <!-- RIGHT: Unit Inspector -->
          <div class="w-80 flex flex-col shrink-0" style="background:#ffffff; border-left:1px solid #e2e8f0;">
            <div class="p-6" style="border-bottom:1px solid #e2e8f0;">
              <h3 class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Unit Inspector</h3>
              <div *ngIf="selectedUnit">
                <div class="flex items-center gap-3 mb-3">
                  <span *ngIf="getShopEmoji(selectedUnit)" class="text-3xl">{{getShopEmoji(selectedUnit)}}</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <input *ngIf="!readOnly" type="text" [ngModel]="plotData.aptConfig?.unitNames?.[selectedUnit] || selectedUnit"
                        (ngModelChange)="updateUnitName(selectedUnit, $event)"
                        class="bg-transparent border-none outline-none text-2xl font-black text-slate-900 w-full hover:bg-slate-900/5 rounded px-1 transition-all" />
                      <h4 *ngIf="readOnly" class="text-2xl font-black text-slate-900">{{plotData.aptConfig?.unitNames?.[selectedUnit] || selectedUnit}}</h4>
                    </div>
                    <div class="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                      [class]="isShopUnit(selectedUnit) ? 'text-blue-400' : (plotData.type === 'pg' ? 'text-emerald-500' : 'text-house')">
                      {{isShopUnit(selectedUnit) ? getShopLabel(selectedUnit) : (plotData.type === 'pg' ? 'PG Room/Bed' : 'Residential Room')}}
                    </div>
                  </div>
                </div>

                 <!-- BHK Selection -->
                <div *ngIf="!isShopUnit(selectedUnit) && !isUnitSkipped(selectedUnit)" class="mb-4">
                  <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block">BHK Type</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button *ngFor="let b of ['1BHK', '2BHK', '3BHK']" (click)="!readOnly && setUnitBhk(selectedUnit, b)"
                      [disabled]="readOnly"
                      [class]="'py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ' +
                        (getUnitBhk(selectedUnit) === b ? 'bg-accent text-slate-950 border-accent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-accent/40') + (readOnly ? ' cursor-default' : '')">
                      {{b}}
                    </button>
                  </div>
                </div>

                <!-- BHK Detail Card -->
                <div *ngIf="getUnitBhk(selectedUnit) && !isShopUnit(selectedUnit) && !isUnitSkipped(selectedUnit)" class="rounded-xl border border-accent/20 bg-accent/5 p-3 mb-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] font-black uppercase tracking-widest text-accent">🏠 {{getUnitBhk(selectedUnit)}}</span>
                    <span class="text-[8px] text-slate-500 font-bold">Standard Specs</span>
                  </div>
                  <div class="grid grid-cols-3 gap-1.5">
                    <div class="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                      <div class="text-base">🛏️</div>
                      <div class="text-[10px] font-black text-slate-900">{{getBhkDetails(selectedUnit).bedrooms}}</div>
                      <div class="text-[7px] text-slate-500 uppercase">Bed</div>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                      <div class="text-base">🛁</div>
                      <div class="text-[10px] font-black text-slate-900">{{getBhkDetails(selectedUnit).bathrooms}}</div>
                      <div class="text-[7px] text-slate-500 uppercase">Bath</div>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                      <div class="text-base">🪑</div>
                      <div class="text-[10px] font-black text-slate-900">{{getBhkDetails(selectedUnit).hall}}</div>
                      <div class="text-[7px] text-slate-500 uppercase">Hall</div>
                    </div>
                  </div>
                </div>

                <!-- Unit Action Buttons -->
                <div *ngIf="!readOnly" class="grid grid-cols-2 gap-2 mb-4">
                  <!-- Remove/Restore Unit -->
                  <button (click)="toggleSkipUnit(selectedUnit)"
                    [class]="'py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ' + 
                      (isUnitSkipped(selectedUnit) ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' : 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20')">
                    {{ isUnitSkipped(selectedUnit) ? '⎌ Restore Unit' : '🗑️ Remove Unit' }}
                  </button>

                  <!-- Remove Shop -->
                  <button *ngIf="isShopUnit(selectedUnit)" (click)="removeShop(selectedUnit)"
                    class="py-2 bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500/20 transition-all">
                    🚫 Clear Shop
                  </button>
                </div>
              </div>
              <div *ngIf="!selectedUnit" class="text-sm text-slate-600 italic">Select a unit to inspect</div>
            </div>

            <div *ngIf="selectedUnit" class="flex shrink-0" style="border-bottom:1px solid #e2e8f0; background:#f8fafc;">
              <button (click)="inspectorTab = 'occupants'"
                [class]="'flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ' + (inspectorTab === 'occupants' ? 'text-white border-accent bg-accent/5' : 'text-slate-500 border-transparent hover:text-slate-300')">
                Occupants
              </button>
              <button (click)="inspectorTab = 'financials'"
                [class]="'flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ' + (inspectorTab === 'financials' ? 'text-white border-accent bg-accent/5' : 'text-slate-500 border-transparent hover:text-slate-300')">
                Financials
              </button>
            </div>

            <div class="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div *ngIf="selectedUnit">

                <!-- Occupants -->
                <div *ngIf="inspectorTab === 'occupants'" class="space-y-3">
                  <ng-container *ngIf="getOccupants(selectedUnit).length > 0; else noOccupant">
                    <div *ngFor="let occupant of getOccupants(selectedUnit); let i = index"
                      class="bg-slate-800/60 border border-white/10 p-4 rounded-2xl relative overflow-hidden hover:border-white/20 transition-all">
                      <div class="absolute top-0 left-0 w-1 h-full"
                        [class]="isShopUnit(selectedUnit) ? 'bg-blue-500' : 'bg-house'"></div>
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <span class="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Resident {{i+1}}</span>
                          <div class="text-sm font-black text-slate-900">{{occupant.name || occupant.customerName || 'Resident'}}</div>
                          <div class="flex items-center gap-2 mt-0.5">
                            <div class="text-[10px] font-bold uppercase"
                              [class]="isShopUnit(selectedUnit) ? 'text-blue-600' : 'text-emerald-600'">{{occupant.role || occupant.customerType}}</div>
                            <span *ngIf="occupant.paymentType" class="text-[8px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100 font-black uppercase tracking-tighter">{{occupant.paymentType}}</span>
                          </div>
                          
                          <div *ngIf="getUnitBhk(selectedUnit)" class="text-[8px] text-accent font-black mt-1">🏠 {{getUnitBhk(selectedUnit)}}</div>
                          <div *ngIf="getUnitSqft(selectedUnit)" class="text-[8px] text-blue-500 font-black mt-1">📐 {{getUnitSqft(selectedUnit)}} ft²</div>
                          <div *ngIf="occupant.foodNeeded" class="text-[8px] text-orange-500 font-bold mt-1 flex items-center gap-1">
                            🍱 Food Needed
                          </div>
                          <div class="mt-2 text-[10px] text-slate-400 font-mono">
                            📞 {{occupant.phone || 'N/A'}}
                          </div>
                        </div>

                        <div *ngIf="!readOnly" class="flex flex-col items-end gap-3">
                          <span class="text-xl">{{isShopUnit(selectedUnit) ? '🛒' : '👤'}}</span>
                          <div class="pv-action-menu">
                            <button class="pv-action-trigger" [class.active]="activeMenuId === 'occ_' + i" (click)="toggleMenu('occ_' + i, $event)">⋮</button>
                            <div class="pv-action-dropdown" *ngIf="activeMenuId === 'occ_' + i">
                              <button class="pv-action-item" (click)="openUnitForm(selectedUnit!, $event)">✏️ Edit</button>
                              <button class="pv-action-item delete" (click)="openVacateForm(selectedUnit!, $event)">🗑️ Vacate</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ng-container>
                  <ng-template #noOccupant>
                    <div class="border border-dashed border-white/10 p-8 rounded-2xl text-center opacity-40">
                      <div class="text-3xl mb-2">👻</div>
                      <span class="text-[10px] font-black text-white uppercase tracking-[0.3em]">Vacant</span>
                    </div>
                  </ng-template>

                  <!-- Book / View Customer Button -->
                  <div *ngIf="!readOnly" class="space-y-2">
                    <button (click)="openUnitForm(selectedUnit, $event)"
                      class="w-full py-2.5 bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-wider rounded-xl hover:bg-accent/20 transition-all flex items-center justify-center gap-2">
                      📋 Book / View Customer
                    </button>
                  </div>
                </div>

                <!-- Financials -->
                <div *ngIf="inspectorTab === 'financials'" class="space-y-4">
                  <div class="bg-slate-800/40 border border-white/5 p-5 rounded-2xl focus-within:border-accent/50 transition-all">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
                      <span class="text-accent">💰</span> Monthly Rent
                    </label>
                    <div class="flex items-center text-xl font-black text-slate-900">
                      <span class="mr-2 text-slate-400">$</span>
                      <input [disabled]="readOnly" type="number" [(ngModel)]="unitRent" (change)="saveUnitDetail()"
                        class="w-full bg-transparent border-none p-0 text-slate-900 focus:outline-none font-black"
                        [class.cursor-default]="readOnly"/>
                    </div>
                  </div>
                  <div class="bg-slate-800/40 border border-white/5 p-5 rounded-2xl focus-within:border-accent/50 transition-all">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
                      <span class="text-accent">📐</span> Area SQFT
                    </label>
                    <div class="flex items-center text-xl font-black text-slate-900">
                      <input [disabled]="readOnly" type="number" [(ngModel)]="unitSqft" (change)="saveUnitDetail()"
                        class="w-full bg-transparent border-none p-0 text-slate-900 focus:outline-none font-black"
                        [class.cursor-default]="readOnly"/>
                      <span class="ml-2 text-slate-400 text-sm">ft²</span>
                    </div>
                  </div>
                  <!-- Parking Section -->
                  <div class="bg-slate-800/40 border border-white/5 p-5 rounded-2xl">
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                         <span class="text-blue-400">🚗</span> Parking Floors
                      </label>
                      <button *ngIf="!readOnly" (click)="autoCalcParking()" class="text-[8px] font-black text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full hover:bg-sky-400/20 transition-all uppercase tracking-tighter">Auto Calc</button>
                    </div>
                    <div class="flex items-center gap-3">
                      <button *ngIf="!readOnly" (click)="updateParkingFloors(-1)" class="w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-600 hover:bg-slate-200 transition-all">−</button>
                      <span class="text-xl font-black text-slate-900 font-mono">{{plotData.aptConfig?.parkingFloors || 0}}</span>
                      <button *ngIf="!readOnly" (click)="updateParkingFloors(1)" class="w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-600 hover:bg-slate-200 transition-all">+</button>
                      <span class="text-[9px] text-slate-400 font-bold ml-auto uppercase opacity-60">Calculated based on {{plotData.aptConfig?.floors}} Floors</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Modal for unit booking -->
    @if (isCustomerModalOpen() && customerModalData()) {
      <app-customer-modal
        [data]="customerModalData()!"
        (close)="isCustomerModalOpen.set(false)"
        (saved)="isCustomerModalOpen.set(false); loadBuildingBookings()">
      </app-customer-modal>
    }

    <!-- Unit Resident Form Modal (legacy, hidden) -->
    <div *ngIf="false && isUnitFormOpen" class="fixed inset-0 z-[300] flex items-center justify-center p-4" (click)="isUnitFormOpen = false">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-md"></div>
      <div class="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-up" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="text-lg font-black text-slate-900">Unit {{unitFormData.unit}}</h3>
            <p class="text-[10px] text-accent uppercase tracking-widest font-bold">Add Resident</p>
          </div>
          <button (click)="isUnitFormOpen = false" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Full Name</label>
            <input type="text" [(ngModel)]="unitFormData.name" placeholder="Enter name"
              class="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-accent/50 transition-all placeholder:text-slate-600" />
          </div>

          <!-- Phone -->
          <div>
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Phone Number</label>
            <input type="text" [(ngModel)]="unitFormData.phone" placeholder="Enter phone"
              class="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-accent/50 transition-all placeholder:text-slate-600" />
          </div>

          <!-- Role -->
          <div>
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Role</label>
            <select [(ngModel)]="unitFormData.role"
              class="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-accent/50 transition-all">
              <option value="owner">Owner</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>

          <!-- BHK -->
          <div>
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">BHK Type</label>
            <select [(ngModel)]="unitFormData.bhk"
              class="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-accent/50 transition-all">
              <option value="">Select BHK</option>
              <option value="1BHK">1 BHK</option>
              <option value="2BHK">2 BHK</option>
              <option value="3BHK">3 BHK</option>
            </select>
          </div>
        </div>

        <button (click)="saveUnitResident()"
          class="mt-6 w-full py-3 bg-accent text-slate-900 font-black text-sm uppercase tracking-wider rounded-xl hover:brightness-110 transition-all shadow-lg shadow-accent/20">
          💾 Save Resident
        </button>
      </div>
    </div>
  `,
  styles: [`
    .animate-in { animation: fadeIn 0.15s ease-out; }
  `],
  changeDetection: ChangeDetectionStrategy.Default
})
export class AptDetailModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() plotKey = '';
  @Input() plotData!: PlotData;
  @Input() projectId = '';
  @Input() readOnly = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onUnitSelect = new EventEmitter<string>();
  @Output() onUpdatePlot = new EventEmitter<any>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue === true || changes['plotKey']?.currentValue) {
      this.loadBuildingBookings();
    }
  }

  loadBuildingBookings() {
    if (!this.projectId || !this.plotKey) return;
    // Fetch all bookings whose plotId starts with this plotKey (covers units like plotKey_5A)
    this.api.getLayoutCustomersAll(this.projectId).subscribe({
      next: (res: any) => {
        const all: any[] = res.data || [];
        this.buildingBookings.set(all.filter(b =>
          b.plotId === this.plotKey || b.plotId?.startsWith(this.plotKey + '_')
        ));
      },
      error: () => {}
    });
  }

  private api = inject(ApiService);

  // Customer modal for unit booking
  isCustomerModalOpen = signal(false);
  customerModalData = signal<CustomerModalData | null>(null);
  // All backend bookings for this building (loaded on open)
  buildingBookings = signal<any[]>([]);

  selectedUnit: string | null = null;
  communityShops = COMMUNITY_SHOPS;
  commonFacilities = COMMON_FACILITIES;
  inspectorTab: 'occupants' | 'financials' = 'occupants';
  leftTab: 'facilities' = 'facilities';
  unitRent = 0;
  unitSqft = 0;
  dragShop: string | null = null;
  pendingMerge: string[] = [];
  isCtrlHeld = false;
  activeMenuId: string | null = null;

  // Billing state (removed)
  private billData: Record<string, { amount: number; period: string }> = {};

  private get billKey() { return `pv_apt_bill_${this.plotKey}`; }

  getUnitBookings(unitId: string): any[] {
    const unitPlotId = `${this.plotKey}_${unitId}`;
    return this.buildingBookings().filter(b => b.plotId === unitPlotId && b.status === 'ACTIVE');
  }



  message = signal('');
  messageType = signal<'error' | 'success'>('success');

  isUnitFormOpen = false;
  unitFormData: { unit: string; name: string; phone: string; role: 'owner' | 'tenant'; bhk: string } = {
    unit: '', name: '', phone: '', role: 'tenant', bhk: ''
  };

  openUnitForm(unitId: string, event?: Event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const unitPlotId = `${this.plotKey}_${unitId}`;
    const unitName = this.plotData.aptConfig?.unitNames?.[unitId] || unitId;
    const blockName = this.plotData.aptConfig?.blockName || (this.plotData.type === 'pg' ? 'PG Building' : 'Apartment');
    const existingBookings = this.getUnitBookings(unitId);

    if (existingBookings.length >= 1) {
      // One or more residents — show picker with Edit/Add/Delete options
      this.customerModalData.set({
        plotId: unitPlotId,
        plotName: `${blockName} · ${this.plotData.type === 'pg' ? 'Room' : 'Unit'} ${unitName}`,
        projectId: this.projectId,
        plotType: this.plotData.type,
        sqft: this.getUnitSqft(unitId),
        aptConfig: this.plotData.aptConfig,
        mode: 'picker',
        allBookings: existingBookings
      });
    } else {
      // No residents — new booking
      this.customerModalData.set({
        plotId: unitPlotId,
        plotName: `${blockName} · ${this.plotData.type === 'pg' ? 'Room' : 'Unit'} ${unitName}`,
        projectId: this.projectId,
        plotType: this.plotData.type,
        sqft: this.getUnitSqft(unitId),
        aptConfig: this.plotData.aptConfig,
        mode: 'new'
      });
    }
    this.isCustomerModalOpen.set(true);
  }

  openVacateForm(unitId: string, event?: Event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const unitPlotId = `${this.plotKey}_${unitId}`;
    const unitName = this.plotData.aptConfig?.unitNames?.[unitId] || unitId;
    const blockName = this.plotData.aptConfig?.blockName || (this.plotData.type === 'pg' ? 'PG Building' : 'Apartment');
    this.customerModalData.set({
      plotId: unitPlotId,
      plotName: `${blockName} · ${this.plotData.type === 'pg' ? 'Room' : 'Unit'} ${unitName}`,
      projectId: this.projectId,
      plotType: this.plotData.type,
      sqft: this.getUnitSqft(unitId),
      aptConfig: this.plotData.aptConfig,
      vacateMode: true
    });
    this.isCustomerModalOpen.set(true);
  }

  updateUnitName(unitId: string, newName: string) {
    if (!unitId) return;
    const unitNames = { ...(this.plotData.aptConfig?.unitNames || {}) };
    if (!newName.trim()) {
      delete unitNames[unitId];
    } else {
      unitNames[unitId] = newName;
    }
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, unitNames } }
    });
  }

  getUnitBhk(unitId: string): string {
    return this.plotData.aptConfig?.unitBhk?.[unitId] || '';
  }

  getUnitSqft(unitId: string): number {
    return this.plotData.aptConfig?.unitDetails?.[unitId]?.sqft || 0;
  }

  getBhkColor(unitId: string): string {
    const bhk = this.getUnitBhk(unitId);
    if (bhk === '1BHK') return 'text-green-300/80';
    if (bhk === '2BHK') return 'text-yellow-300/80';
    if (bhk === '3BHK') return 'text-pink-300/80';
    return 'text-slate-400/70';
  }

  getBhkDetails(unitId: string): { bedrooms: number; bathrooms: number; hall: number; kitchen: number; sqft: string } {
    const bhk = this.getUnitBhk(unitId);
    const map: Record<string, { bedrooms: number; bathrooms: number; hall: number; kitchen: number; sqft: string }> = {
      '1BHK': { bedrooms: 1, bathrooms: 1, hall: 1, kitchen: 1, sqft: '450–600' },
      '2BHK': { bedrooms: 2, bathrooms: 2, hall: 1, kitchen: 1, sqft: '750–1000' },
      '3BHK': { bedrooms: 3, bathrooms: 2, hall: 1, kitchen: 1, sqft: '1100–1400' },
    };
    return map[bhk] || { bedrooms: 0, bathrooms: 0, hall: 0, kitchen: 0, sqft: '—' };
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Control') this.isCtrlHeld = true;
    if (e.key === 'Escape') { this.pendingMerge = []; this.selectedUnit = null; }
  }
  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Control') {
      this.isCtrlHeld = false;
      if (this.pendingMerge.length >= 2) this.executeMerge();
      else if (this.pendingMerge.length === 1) { this.selectedUnit = this.pendingMerge[0]; this.pendingMerge = []; }
    }
  }

  get floorsArray() { return Array(this.plotData.aptConfig?.floors || 0).fill(0); }
  get unitsArray() { return Array(this.plotData.aptConfig?.unitsPerFloor || 0).fill(0); }
  getUnitsArrayForFloor(floorNum: number) {
    const override = this.plotData.aptConfig?.floorUnitOverrides?.[floorNum];
    return Array(override ?? this.plotData.aptConfig?.unitsPerFloor ?? 0).fill(0);
  }

  getUnitId(floor: number, unitIdx: number) {
    return `${floor}${String.fromCharCode(65 + unitIdx)}`;
  }

  isUnitSkipped(id: string) {
    return this.plotData.aptConfig?.skippedUnits?.includes(id) || false;
  }

  isShopUnit(id: string | null): boolean {
    if (!id) return false;
    return !!(this.plotData.aptConfig?.unitShops?.[id]);
  }

  getShopEmoji(id: string): string {
    const shopVal = this.plotData.aptConfig?.unitShops?.[id];
    return COMMUNITY_SHOPS.find(s => s.value === shopVal)?.emoji || '';
  }

  getShopLabel(id: string): string {
    const shopVal = this.plotData.aptConfig?.unitShops?.[id];
    return COMMUNITY_SHOPS.find(s => s.value === shopVal)?.label || '';
  }

  isUnitOccupied(unitId: string) {
    const unitPlotId = `${this.plotKey}_${unitId}`;
    return this.buildingBookings().some(b => b.plotId === unitPlotId && b.status === 'ACTIVE');
  }

  getOccupants(unitId: string) {
    const unitPlotId = `${this.plotKey}_${unitId}`;
    return this.buildingBookings().filter(b => b.plotId === unitPlotId && b.status === 'ACTIVE');
  }

  handleFacilityClick(f: string) {
    if (this.readOnly) return;
    this.toggleFacility(f);
  }

  handleShopDragStart(val: string) {
    if (this.readOnly) return;
    this.onShopDragStart(val);
  }

  handleDrop(id: string) {
    if (this.readOnly) return;
    this.onDropOnUnit(id);
  }

  showSplitButton(id: string) {
    return this.selectedUnit === id && this.isMergePrimary(id) && !this.readOnly;
  }

  handleSplit(id: string) {
    if (this.readOnly) return;
    this.splitUnit(id);
  }

  onUnitCellClick(event: MouseEvent, id: string) {
    if ((event.target as HTMLElement).tagName === 'INPUT') return;
    this.selectUnit(id);
  }

  selectUnit(id: string) {
    if (this.isCtrlHeld) {
      this.pendingMerge = this.pendingMerge.includes(id)
        ? this.pendingMerge.filter(x => x !== id)
        : [...this.pendingMerge, id];
      this.selectedUnit = null;
    } else {
      this.pendingMerge = [];
      this.selectedUnit = id;
      if (this.readOnly) {
        this.onUnitSelect.emit(id);
      }
      const detail = this.plotData.aptConfig?.unitDetails?.[id];
      this.unitRent = detail?.rent || 0;
      this.unitSqft = detail?.sqft || 0;
      this.inspectorTab = 'occupants';

      
      // Fetch live occupants for unit (Option A)
      const unitKey = `${this.plotKey}_${id}`;
      this.api.getPlotBooking(this.projectId, unitKey).subscribe(res => {
        if (res?.data) {
           const existingIdx = this.plotData.residents.findIndex(r => r.unit === id);
        }
      });
    }
  }

  // ── PDF EXPORT ──────────────────────────────────────────────────────────

  private async makePDF(orientation: 'p' | 'l' = 'p'): Promise<{ doc: any; at: (opts: any) => void }> {
    const jsMod: any = await import('jspdf');
    const atMod: any = await import('jspdf-autotable');
    const JsPDF = jsMod.jsPDF ?? jsMod.default?.jsPDF ?? jsMod.default;
    const doc = new JsPDF(orientation, 'mm', 'a4');
    const fn = atMod.default ?? atMod.autoTable;
    const at = (opts: any) => typeof fn === 'function' && fn.length >= 2 ? fn(doc, opts) : fn(opts);
    return { doc, at };
  }

  async downloadUnitPDF() {
    if (!this.selectedUnit) return;
    try {
      const { doc, at } = await this.makePDF();
      const unitName = this.plotData.aptConfig?.unitNames?.[this.selectedUnit] || this.selectedUnit;
      doc.setFontSize(18); doc.text(`Unit Ledger: ${unitName}`, 14, 20);
      // Use backend bookings for this unit
      const unitPlotId = `${this.plotKey}_${this.selectedUnit}`;
      const bookings = this.buildingBookings().filter(b => b.plotId === unitPlotId);
      const rows = bookings.length
        ? bookings.map(b => [b.customerName || '—', b.customerMobile || '—', b.customerType || '—', b.paymentType || '—', b.status || 'ACTIVE'])
        : this.getOccupants(this.selectedUnit).map(r => [r.name, r.phone, r.role || '—', r.paymentType || '—', 'Active']);
      at({ startY: 30, head: [['Name', 'Mobile', 'Role', 'Payment', 'Status']], body: rows, theme: 'striped' });
      doc.save(`Ledger_${this.plotKey}_${this.selectedUnit}.pdf`);
    } catch (e) { console.error(e); }
  }

  async downloadBuildingPDF() {
    try {
      const { doc, at } = await this.makePDF('l');
      const buildingName = this.plotData.aptConfig?.blockName || 'Building';
      doc.setFontSize(18); doc.text(`Full Building Ledger: ${buildingName}`, 14, 20);
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
      // Use all backend bookings for this building
      const bookings = this.buildingBookings();
      const rows = bookings.length
        ? bookings.map(b => [b.plotName || b.plotId, b.customerName || '—', b.customerMobile || '—', b.customerType || '—', b.paymentType || '—', b.status || 'ACTIVE'])
        : this.plotData.residents.map(r => [r.unit || '—', r.name, r.phone, r.role || '—', r.paymentType || '—', 'Active']);
      at({ startY: 32, head: [['Unit', 'Name', 'Mobile', 'Role', 'Payment', 'Status']], body: rows, theme: 'grid',
           headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 }, bodyStyles: { fontSize: 9 } });
      doc.save(`Building_Ledger_${this.plotKey}.pdf`);
    } catch (e) { console.error(e); }
  }

  executeMerge() {
    if (this.pendingMerge.length < 2) return;
    const mergeGroups = (this.plotData.aptConfig?.mergeGroups || []).filter(g => !g.some(k => this.pendingMerge.includes(k)));
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, mergeGroups: [...mergeGroups, [...this.pendingMerge]] } }
    });
    this.pendingMerge = [];
    this.selectedUnit = null;
  }

  splitUnit(id: string) {
    const mergeGroups = (this.plotData.aptConfig?.mergeGroups || []).filter(g => !g.includes(id));
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, mergeGroups } }
    });
    this.selectedUnit = null;
  }

  getShopCount(): number {
    return Object.keys(this.plotData.aptConfig?.unitShops || {}).length;
  }

  onDropOnUnit(unitId: string) {
    if (!this.dragShop) return;
    const unitShops = { ...(this.plotData.aptConfig?.unitShops || {}), [unitId]: this.dragShop };
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, unitShops } }
    });
    this.dragShop = null;
  }

  removeShop(unitId: string) {
    const unitShops = { ...(this.plotData.aptConfig?.unitShops || {}) };
    delete unitShops[unitId];
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, unitShops } }
    });
  }

  isMergePrimary(id: string): boolean {
    return !!this.plotData.aptConfig?.mergeGroups?.find(g => g.includes(id) && g[0] === id);
  }

  isMergeSecondary(id: string): boolean {
    return !!this.plotData.aptConfig?.mergeGroups?.find(g => g.includes(id) && g[0] !== id);
  }

  getMergeSpan(id: string): number {
    const g = this.plotData.aptConfig?.mergeGroups?.find(g => g.includes(id));
    return g ? g.length : 1;
  }

  getMergedWidth(id: string): string {
    const span = this.getMergeSpan(id);
    // each unit = 5rem wide, gap = 0.75rem between units
    return span > 1 ? `${5 * span + 0.75 * (span - 1)}rem` : '5rem';
  }

  getMergeLabel(id: string): string {
    const g = this.plotData.aptConfig?.mergeGroups?.find(gr => gr.includes(id));
    return g ? g.map(k => (this.plotData.aptConfig?.unitNames?.[k] || k)).join('+') : id;
  }

  getUnitClass(id: string): string {
    const isSkipped = this.isUnitSkipped(id);
    const isSelected = this.selectedUnit === id;
    const hasShop = this.isShopUnit(id);
    const isPending = this.pendingMerge.includes(id);

    // Use backend bookings for color coding (accurate multi-resident support)
    const unitPlotId = `${this.plotKey}_${id}`;
    const bookings = this.buildingBookings().filter(b => b.plotId === unitPlotId && b.status === 'ACTIVE');
    const hasOwner = bookings.some(b => (b.customerType as string)?.toLowerCase() === 'owner')
      || this.plotData.residents.some(r => r.unit === id && (r.role as string).toLowerCase() === 'owner');
    const hasTenant = bookings.some(b => (b.customerType as string)?.toLowerCase() === 'tenant')
      || this.plotData.residents.some(r => r.unit === id && (r.role as string).toLowerCase() === 'tenant');
    const isOccupied = bookings.length > 0 || this.plotData.residents.some(r => r.unit === id);

    const base = 'w-20 h-24 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col items-center justify-center gap-0.5 ';

    if (isPending) return base + 'bg-purple-500/20 border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.3)] scale-105 z-10';
    if (isSelected) return base + 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.25)] scale-110 z-10 bg-amber-50';
    if (isSkipped) return base + 'bg-slate-100 border-dashed border-slate-300 opacity-40 hover:opacity-70';
    if (hasShop) return base + 'bg-blue-50 border-blue-300 hover:border-blue-400 hover:bg-blue-100 hover:scale-105';
    if (hasOwner && hasTenant) return base + 'bg-violet-50 border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.3)] hover:scale-105';
    if (hasOwner) return base + 'bg-emerald-50 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)] hover:scale-105';
    if (hasTenant) return base + 'bg-sky-50 border-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.3)] hover:scale-105';
    if (isOccupied) return base + 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 hover:scale-105';
    return base + 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 hover:scale-105';
  }

  toggleFacility(f: string) {
    const facilities = this.plotData.aptConfig!.facilities.includes(f)
      ? this.plotData.aptConfig!.facilities.filter(x => x !== f)
      : [...this.plotData.aptConfig!.facilities, f];
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, facilities } }
    });
  }

  toggleSkipUnit(id: string | null) {
    if (!id) return;
    const skippedUnits = this.plotData.aptConfig?.skippedUnits || [];
    const updated = skippedUnits.includes(id)
      ? skippedUnits.filter(x => x !== id)
      : [...skippedUnits, id];
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, skippedUnits: updated } }
    });
  }

  setUnitBhk(id: string | null, bhk: string) {
    if (!id) return;
    const unitBhk = { ...(this.plotData.aptConfig?.unitBhk || {}), [id]: bhk };
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, unitBhk } }
    });
  }

  saveUnitDetail() {
    if (!this.selectedUnit) return;
    const unitDetails = { ...(this.plotData.aptConfig?.unitDetails || {}) };
    unitDetails[this.selectedUnit] = { rent: this.unitRent, sqft: this.unitSqft };
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, unitDetails } }
    });
  }

  updateParkingFloors(delta: number) {
    const current = this.plotData.aptConfig?.parkingFloors || 0;
    const parkingFloors = Math.max(0, current + delta);
    this.onUpdatePlot.emit({
      key: this.plotKey,
      updates: { aptConfig: { ...this.plotData.aptConfig!, parkingFloors } }
    });
  }

  autoCalcParking() {
    const floors = this.plotData.aptConfig?.floors || 0;
    const unitsPerFloor = this.plotData.aptConfig?.unitsPerFloor || 0;
    
    if (floors === 0 || unitsPerFloor === 0) {
      this.message.set('Cannot calculate: floors or units per floor is 0');
      this.messageType.set('error');
      return;
    }

    this.api.calculateAndCreateParkingFloors(floors, unitsPerFloor).subscribe({
      next: (response: any) => {
        const result = response?.data || response;
        const parkingFloors = result?.parkingFloors || Math.ceil(floors / 4);
        this.onUpdatePlot.emit({
          key: this.plotKey,
          updates: { aptConfig: { ...this.plotData.aptConfig!, parkingFloors } }
        });
        
        this.message.set(`✓ Parking calculated: ${result?.totalSpots} spots across ${parkingFloors} floors`);
        this.messageType.set('success');
      },
      error: (e: any) => {
        console.error('Parking calculation failed:', e);
        this.message.set('Failed to calculate parking floors');
        this.messageType.set('error');
      }
    });
  }

  onShopDragStart(shopValue: string) {
    this.dragShop = shopValue;
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
