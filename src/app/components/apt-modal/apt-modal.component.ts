import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AptConfig } from '../../../types';

const COMMON_FACILITIES = ['Gym', 'Pool', 'Parking', 'Security', 'Lounge', 'Garden', 'WiFi', 'EV Charging'];

const COMMUNITY_SHOPS = [
  { value: 'community_hall', label: 'Community Hall', emoji: '🏛️' },
  { value: 'mini_market',    label: 'Mini Market',    emoji: '🛒' },
  { value: 'pharmacy',       label: 'Pharmacy',       emoji: '💊' },
  { value: 'laundry',        label: 'Laundry',        emoji: '🧺' },
  { value: 'gym_room',       label: 'Gym Room',       emoji: '🏋️' },
  { value: 'salon',          label: 'Salon',          emoji: '💈' },
  { value: 'cafe',           label: 'Café',           emoji: '☕' },
  { value: 'library',        label: 'Library',        emoji: '📚' },
  { value: 'kids_play',      label: 'Kids Play',      emoji: '🎠' },
  { value: 'office',         label: 'Office Space',   emoji: '💼' },
  { value: 'clinic',         label: 'Clinic',         emoji: '🩺' },
  { value: 'atm',            label: 'ATM',            emoji: '🏧' },
];

@Component({
  selector: 'app-apt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" (click)="onClose.emit()"></div>
      <div class="relative w-full max-w-5xl h-[90vh] bg-white rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.2)] overflow-hidden animate-fade-up flex flex-col border border-slate-200">

        <!-- Header -->
        <div class="px-8 py-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ isPg ? 'PG' : 'Tower' }} Configuration</h2>
            <p class="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{{ isPg ? 'Resident' : 'Tower' }} Parameters</p>
          </div>
          <button (click)="onClose.emit()" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all">✕</button>
        </div>

        <div class="flex flex-1 overflow-hidden">
          <!-- LEFT: Config + Facilities + Shop Palette -->
          <div class="w-80 border-r border-slate-100 flex flex-col overflow-y-auto custom-scrollbar bg-slate-50/50">
            <div class="p-6 space-y-6">

              <!-- Floors / Units -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Floors</label>
                  <input type="number" min="1" max="30" [(ngModel)]="floors"
                    class="w-full bg-white border border-slate-200 p-2.5 text-slate-900 font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm shadow-sm"/>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Units/Floor</label>
                  <input type="number" min="1" max="12" [(ngModel)]="unitsPerFloor"
                    class="w-full bg-white border border-slate-200 p-2.5 text-slate-900 font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm shadow-sm"/>
                </div>
              </div>

              <!-- Tower name -->
              <div class="space-y-1.5">
                <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Tower Designation</label>
                <input type="text" [(ngModel)]="blockName"
                  class="w-full bg-white border border-slate-200 p-2.5 text-slate-900 font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm shadow-sm"
                  placeholder="e.g. Sapphire Heights"/>
              </div>

              <!-- Per-Floor Unit Editor -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Per-Floor Units</label>
                  <button (click)="showFloorEditor = !showFloorEditor"
                    class="text-[8px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded-full hover:bg-accent/20 transition-all uppercase tracking-tighter">
                    {{ showFloorEditor ? 'Hide' : 'Customize' }}
                  </button>
                </div>
                @if (showFloorEditor) {
                  <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                    @for (floorNum of getFloorNumbers(); track floorNum) {
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-[9px] font-black text-slate-500 w-8 shrink-0">{{ floorNum === 0 ? 'GF' : floorNum + 'F' }}</span>
                        <div class="flex items-center gap-1 flex-1">
                          <button (click)="setFloorUnits(floorNum === 0 ? -1 : floorNum, getFloorUnits(floorNum === 0 ? -1 : floorNum) - 1)"
                            class="w-5 h-5 rounded bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center hover:bg-slate-200 transition-all">−</button>
                          <span class="text-[10px] font-black text-slate-900 w-4 text-center">{{ getFloorUnits(floorNum === 0 ? -1 : floorNum) }}</span>
                          <button (click)="setFloorUnits(floorNum === 0 ? -1 : floorNum, getFloorUnits(floorNum === 0 ? -1 : floorNum) + 1)"
                            class="w-5 h-5 rounded bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center hover:bg-slate-200 transition-all">+</button>
                        </div>
                        @if (floorUnitOverrides[floorNum === 0 ? -1 : floorNum] != null) {
                          <span class="text-[7px] font-black text-accent uppercase">custom</span>
                        }
                      </div>
                    }
                  </div>
                  <p class="text-[8px] text-slate-400">Default: {{unitsPerFloor}} units/floor. Override per floor above.</p>
                }
              </div>

              <!-- BHK Type -->
              <div class="space-y-1.5">
                <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">BHK Type</label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button *ngFor="let b of bhkOptions" (click)="setSelectedUnitBhk(b)"
                    [class]="'py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 transition-all ' +
                      (selectedUnit && unitBhkMap[selectedUnit] === b ? 'bg-accent text-slate-900 border-accent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-accent/40 hover:text-accent')">
                    {{b}}
                  </button>
                </div>
                <p class="text-[8px] text-slate-600">Select a unit then pick BHK</p>
              </div>

              <!-- Unit Identity (NEW) -->
              <div class="space-y-1.5" *ngIf="selectedUnit">
                <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Unit Identity</label>
                <div class="flex gap-2">
                  <input type="text" [ngModel]="unitNameMap[selectedUnit] || selectedUnit"
                    (ngModelChange)="setUnitName(selectedUnit, $event)"
                    class="w-full bg-white border border-slate-200 p-2.5 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm font-black shadow-sm"
                    placeholder="e.g. 101, Suite A..."/>
                  <button (click)="resetUnitName(selectedUnit)"
                    class="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl transition-all shadow-sm">
                    ↺
                  </button>
                </div>
                <p class="text-[8px] text-slate-600">Custom label for unit {{selectedUnit}}</p>
              </div>

              <!-- Facilities -->
              <div class="space-y-2">
                <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">Facilities</label>
                <div class="flex flex-wrap gap-1.5">
                  <button *ngFor="let f of commonFacilities" (click)="toggleFacility(f)"
                    [class]="'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ' +
                      (facilities.includes(f) ? 'bg-accent text-slate-950 border-accent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-white/20 hover:bg-slate-50')">
                    {{f}}
                  </button>
                </div>
              </div>

              <!-- Community Shop Palette — DRAG FROM HERE -->
              <div class="space-y-2">
                <label class="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">
                  🏪 Community Spaces
                  <span class="text-slate-600 normal-case font-normal ml-1">(drag onto unit)</span>
                </label>
                <div class="grid grid-cols-2 gap-1.5">
                  <div
                    *ngFor="let s of communityShops"
                    draggable="true"
                    (dragstart)="onShopDragStart(s.value)"
                    [class]="'flex items-center gap-2 px-2.5 py-2 rounded-xl text-[9px] font-black transition-all border cursor-grab active:cursor-grabbing select-none shadow-sm ' +
                      (dragShop === s.value ? 'bg-blue-500/30 border-blue-400 scale-95' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-400/40 hover:bg-blue-50/50 hover:text-blue-600')"
                  >
                    <span class="text-base">{{s.emoji}}</span>
                    <span class="truncate">{{s.label}}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- RIGHT: Schematic -->
          <div class="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
            <div class="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <span class="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Real-Time Schematic Unit</span>
                <span *ngIf="pendingMerge.length > 0" class="ml-3 text-[10px] text-purple-600 font-black animate-pulse">{{pendingMerge.length}} units selected — release Ctrl to merge</span>
                <span *ngIf="pendingMerge.length === 0 && selectedUnit" class="ml-3 text-[10px] text-accent font-black">Unit {{selectedUnit}} selected</span>
              </div>
              <div class="flex items-center gap-3 text-[9px] text-slate-500 font-bold">
                <span class="flex items-center gap-1.5"><span class="w-3.5 h-4.5 rounded border border-slate-200 bg-white inline-block"></span> Room</span>
                <span class="flex items-center gap-1.5"><span class="w-3.5 h-4.5 rounded border border-blue-300 bg-blue-50 inline-block"></span> Shop</span>
                <span class="flex items-center gap-1.5"><span class="w-3.5 h-4.5 rounded border border-dashed border-slate-300 opacity-60 inline-block"></span> Removed</span>
              </div>
            </div>

            <div class="flex-1 overflow-auto custom-scrollbar p-6">
              <div class="flex flex-col gap-2 w-max">

                <!-- Floors -->
                <div *ngFor="let floor of getFloorsArray(); let fIdx = index" class="flex gap-2 items-center">
                  <span class="text-[9px] text-slate-600 font-black w-6 text-right shrink-0">{{floors - fIdx}}</span>
                  <ng-container *ngFor="let unit of getUnitsArray(floors - fIdx); let uIdx = index">
                    <div *ngIf="!isMergeSecondary(getUnitId(fIdx, uIdx))"
                      (click)="selectUnit(getUnitId(fIdx, uIdx))"
                      (dragover)="$event.preventDefault()"
                      (drop)="onDropOnUnit(getUnitId(fIdx, uIdx))"
                      [class]="getUnitClass(getUnitId(fIdx, uIdx))"
                      [style.width]="getMergedWidth(getUnitId(fIdx, uIdx))"
                    >
                      <ng-container *ngIf="isUnitSkipped(getUnitId(fIdx, uIdx))">
                        <div class="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t-2 border-l-2 border-white/30 rounded-tl"></div>
                        <div class="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-white/30 rounded-tr"></div>
                        <div class="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b-2 border-l-2 border-white/30 rounded-bl"></div>
                        <div class="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b-2 border-r-2 border-white/30 rounded-br"></div>
                      </ng-container>
                      <ng-container *ngIf="!isUnitSkipped(getUnitId(fIdx, uIdx))">
                        <span *ngIf="getUnitShopEmoji(getUnitId(fIdx, uIdx))" class="text-sm leading-none">{{getUnitShopEmoji(getUnitId(fIdx, uIdx))}}</span>
                        
                        <!-- Room Label/Input -->
                        <div (click)="$event.stopPropagation()" class="flex flex-col items-center justify-center w-full px-1">
                          <input *ngIf="selectedUnit === getUnitId(fIdx, uIdx)" type="text"
                            [ngModel]="unitNameMap[getUnitId(fIdx, uIdx)] || getUnitId(fIdx, uIdx)"
                            (ngModelChange)="setUnitName(getUnitId(fIdx, uIdx), $event)"
                            class="bg-slate-900/10 border-none outline-none text-[8px] font-black text-slate-900 text-center w-full rounded py-0.5 focus:bg-slate-900/20 transition-all"
                            (keydown.enter)="selectedUnit = null" />
                          <span *ngIf="selectedUnit !== getUnitId(fIdx, uIdx)" class="text-[8px] font-black leading-none" 
                            [class]="unitShops[getUnitId(fIdx, uIdx)] ? 'text-blue-600' : 'text-slate-500'">
                            {{ isMergePrimary(getUnitId(fIdx, uIdx)) ? getMergeLabel(getUnitId(fIdx, uIdx)) : (unitNameMap[getUnitId(fIdx, uIdx)] || getUnitId(fIdx, uIdx)) }}
                          </span>
                        </div>
                        <span *ngIf="!isUnitSkipped(getUnitId(fIdx, uIdx))" class="text-[6px] text-accent/70 font-black uppercase leading-none">
                          {{unitBhkMap[getUnitId(fIdx, uIdx)] || ''}}
                        </span>
                        <span *ngIf="pendingMerge.includes(getUnitId(fIdx, uIdx))" class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-purple-500 text-white rounded-full text-[7px] font-black flex items-center justify-center">{{pendingMerge.indexOf(getUnitId(fIdx, uIdx)) + 1}}</span>
                      </ng-container>
                      <button *ngIf="selectedUnit === getUnitId(fIdx, uIdx)"
                        (click)="removeUnit(getUnitId(fIdx, uIdx)); $event.stopPropagation()"
                        class="absolute -top-2 -right-2 w-4 h-4 bg-danger text-white rounded-full text-[8px] flex items-center justify-center shadow-lg z-10 hover:scale-110 transition-all">✕</button>
                      <button *ngIf="selectedUnit === getUnitId(fIdx, uIdx) && isMergePrimary(getUnitId(fIdx, uIdx))"
                        (click)="unmerge(getUnitId(fIdx, uIdx)); $event.stopPropagation()"
                        class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 h-5 bg-blue-500 text-white rounded-full text-[7px] font-black flex items-center gap-0.5 justify-center shadow-lg z-10 hover:bg-blue-400 transition-all whitespace-nowrap">✂ Split</button>
                    </div>
                  </ng-container>
                </div>

                <!-- Ground floor -->
                <div class="flex gap-2 items-center border-t border-white/10 pt-2 mt-1">
                  <span class="text-[9px] text-slate-600 font-black w-6 text-right shrink-0">G</span>
                  <ng-container *ngFor="let unit of getUnitsArray(-1); let uIdx = index">
                    <div *ngIf="!isMergeSecondary('G'+(uIdx+1))"
                      (click)="selectUnit('G'+(uIdx+1))"
                      (dragover)="$event.preventDefault()"
                      (drop)="onDropOnUnit('G'+(uIdx+1))"
                      [class]="getUnitClass('G'+(uIdx+1))"
                      [style.width]="getMergedWidth('G'+(uIdx+1))"
                    >
                      <ng-container *ngIf="isUnitSkipped('G'+(uIdx+1))">
                        <div class="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t-2 border-l-2 border-white/30 rounded-tl"></div>
                        <div class="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-white/30 rounded-tr"></div>
                        <div class="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b-2 border-l-2 border-white/30 rounded-bl"></div>
                        <div class="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b-2 border-r-2 border-white/30 rounded-br"></div>
                      </ng-container>
                      <ng-container *ngIf="!isUnitSkipped('G'+(uIdx+1))">
                        <span *ngIf="getUnitShopEmoji('G'+(uIdx+1))" class="text-sm leading-none">{{getUnitShopEmoji('G'+(uIdx+1))}}</span>
                        
                        <!-- Room Label/Input -->
                        <div (click)="$event.stopPropagation()" class="flex flex-col items-center justify-center w-full px-1">
                          <input *ngIf="selectedUnit === 'G'+(uIdx+1)" type="text"
                            [ngModel]="unitNameMap['G'+(uIdx+1)] || 'G'+(uIdx+1)"
                            (ngModelChange)="setUnitName('G'+(uIdx+1), $event)"
                            class="bg-slate-900/10 border-none outline-none text-[8px] font-black text-slate-900 text-center w-full rounded py-0.5 focus:bg-slate-900/20 transition-all"
                            (keydown.enter)="selectedUnit = null" />
                          <span *ngIf="selectedUnit !== 'G'+(uIdx+1)" class="text-[8px] font-black leading-none" 
                            [class]="unitShops['G'+(uIdx+1)] ? 'text-blue-600' : 'text-slate-500'">
                            {{ isMergePrimary('G'+(uIdx+1)) ? getMergeLabel('G'+(uIdx+1)) : (unitNameMap['G'+(uIdx+1)] || 'G'+(uIdx+1)) }}
                          </span>
                        </div>
                        <span *ngIf="!isUnitSkipped('G'+(uIdx+1))" class="text-[6px] text-accent/70 font-black uppercase leading-none">
                          {{unitBhkMap['G'+(uIdx+1)] || ''}}
                        </span>
                        <span *ngIf="pendingMerge.includes('G'+(uIdx+1))" class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-purple-500 text-white rounded-full text-[7px] font-black flex items-center justify-center">{{pendingMerge.indexOf('G'+(uIdx+1)) + 1}}</span>
                      </ng-container>
                      <button *ngIf="selectedUnit === 'G'+(uIdx+1)"
                        (click)="removeUnit('G'+(uIdx+1)); $event.stopPropagation()"
                        class="absolute -top-2 -right-2 w-4 h-4 bg-danger text-white rounded-full text-[8px] flex items-center justify-center shadow-lg z-10 hover:scale-110 transition-all">✕</button>
                      <button *ngIf="selectedUnit === 'G'+(uIdx+1) && isMergePrimary('G'+(uIdx+1))"
                        (click)="unmerge('G'+(uIdx+1)); $event.stopPropagation()"
                        class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 h-5 bg-blue-500 text-white rounded-full text-[7px] font-black flex items-center gap-0.5 justify-center shadow-lg z-10 hover:bg-blue-400 transition-all whitespace-nowrap">✂ Split</button>
                    </div>
                  </ng-container>
                </div>

              </div>
            </div>

            <!-- Instructions -->
            <div class="px-6 py-3 border-t border-slate-100 bg-white text-[9px] text-slate-400 flex gap-5 shrink-0">
              <span class="flex items-center gap-1.5">🖱️ Click to select</span>
              <span class="flex items-center gap-1.5">⌨️ Ctrl+Click merge</span>
              <span class="flex items-center gap-1.5">✂ Click split</span>
              <span class="flex items-center gap-1.5">🏪 Drag shop</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-5 bg-white flex justify-end items-center gap-4 border-t border-slate-100 shrink-0">
          <button (click)="onClose.emit()" class="px-5 py-2.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors">Abort Configuration</button>
          <button (click)="handleConfirm()" class="bg-accent text-slate-900 font-black px-8 py-2.5 rounded-xl text-[11px] uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-accent/20 hover:brightness-110">
            Initialize Tower
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AptModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isPg = false;
  @Input() initialConfig: any | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<AptConfig>();

  floors = 5;
  unitsPerFloor = 4;
  blockName = '';
  defaultBhk = '';
  facilities: string[] = [];
  commonFacilities = COMMON_FACILITIES;
  communityShops = COMMUNITY_SHOPS;
  bhkOptions = ['1BHK', '2BHK', '3BHK'];

  skippedUnits: string[] = [];
  unitShops: Record<string, string> = {};
  unitBhkMap: Record<string, string> = {};
  unitNameMap: Record<string, string> = {};
  mergeGroups: string[][] = [];
  selectedUnit: string | null = null;
  dragShop: string | null = null;
  pendingMerge: string[] = [];
  isCtrlHeld = false;
  // Per-floor unit overrides: key = floor number (1-based), value = unit count
  floorUnitOverrides: Record<number, number> = {};
  showFloorEditor = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue && this.initialConfig) {
      this.loadConfig(this.initialConfig);
    }
  }

  loadConfig(config: any) {
    this.floors = config.floors || 5;
    this.unitsPerFloor = config.unitsPerFloor || 4;
    this.blockName = config.blockName || '';
    this.defaultBhk = config.defaultBhk || '';
    this.facilities = [...(config.facilities || [])];
    this.skippedUnits = [...(config.skippedUnits || [])];
    this.unitShops = { ...(config.unitShops || {}) };
    this.unitBhkMap = { ...(config.unitBhkMap || {}) };
    this.unitNameMap = { ...(config.unitNameMap || {}) };
    this.mergeGroups = (config.mergeGroups || []).map((g: string[]) => [...g]);
    this.floorUnitOverrides = { ...(config.floorUnitOverrides || {}) };
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
      else if (this.pendingMerge.length === 1) this.selectedUnit = this.pendingMerge[0];
    }
  }

  toggleFacility(f: string) {
    this.facilities = this.facilities.includes(f)
      ? this.facilities.filter(x => x !== f)
      : [...this.facilities, f];
  }

  getUnitId(fIdx: number, uIdx: number) {
    return `${this.floors - fIdx}${String.fromCharCode(65 + uIdx)}`;
  }

  getFloorsArray() { return Array(this.floors).fill(0); }
  getUnitsArray(floorNum?: number) {
    // Ground floor is represented as -1 in floorUnitOverrides, but passed as undefined or 0
    const actualFloor = floorNum === undefined || floorNum === 0 ? -1 : floorNum;
    if (this.floorUnitOverrides[actualFloor] != null) {
      return Array(this.floorUnitOverrides[actualFloor]).fill(0);
    }
    return Array(this.unitsPerFloor).fill(0);
  }
  getFloorUnits(floorNum: number): number {
    return this.floorUnitOverrides[floorNum] ?? this.unitsPerFloor;
  }
  setFloorUnits(floorNum: number, count: number) {
    if (count === this.unitsPerFloor) {
      delete this.floorUnitOverrides[floorNum];
    } else {
      this.floorUnitOverrides = { ...this.floorUnitOverrides, [floorNum]: Math.max(1, Math.min(12, count)) };
    }
  }
  getFloorNumbers(): number[] {
    const arr = [];
    for (let i = this.floors; i >= 1; i--) arr.push(i);
    arr.push(0); // ground floor = 0
    return arr;
  }

  isUnitSkipped(id: string) { return this.skippedUnits.includes(id); }

  selectUnit(id: string) {
    if (this.isCtrlHeld) {
      if (this.pendingMerge.includes(id)) {
        this.pendingMerge = this.pendingMerge.filter(x => x !== id);
      } else {
        this.pendingMerge = [...this.pendingMerge, id];
      }
      this.selectedUnit = null;
    } else {
      this.pendingMerge = [];
      this.selectedUnit = this.selectedUnit === id ? null : id;
    }
  }

  executeMerge() {
    if (this.pendingMerge.length < 2) return;
    // Add to mergeGroups, ensuring they are not part of other groups
    const cleaned = (this.mergeGroups || []).filter(g => !g.some(k => this.pendingMerge.includes(k)));
    this.mergeGroups = [...cleaned, [...this.pendingMerge]];
    this.pendingMerge = [];
    this.selectedUnit = null;
  }

  unmerge(id: string) {
    this.mergeGroups = (this.mergeGroups || []).filter(g => !g.includes(id));
  }

  isMergePrimary(id: string): boolean {
    return !!this.mergeGroups.find(g => g.includes(id) && g[0] === id);
  }

  isMergeSecondary(id: string): boolean {
    return !!this.mergeGroups.find(g => g.includes(id) && g[0] !== id);
  }

  getMergeSpan(id: string): number {
    const g = this.mergeGroups.find(g => g.includes(id));
    return g ? g.length : 1;
  }

  getMergedWidth(id: string): string {
    const span = this.getMergeSpan(id);
    // each unit = 3.5rem wide, gap = 0.5rem between units
    return span > 1 ? `${3.5 * span + 0.5 * (span - 1)}rem` : '3.5rem';
  }

  getMergeLabel(id: string): string {
    const g = this.mergeGroups.find(gr => gr.includes(id));
    return g ? g.join('+') : id;
  }

  removeUnit(id: string) {
    // Toggle skipped — shows corner marks instead of hiding
    this.skippedUnits = this.skippedUnits.includes(id)
      ? this.skippedUnits.filter(x => x !== id)
      : [...this.skippedUnits, id];
    this.selectedUnit = null;
  }

  onShopDragStart(shopValue: string) {
    this.dragShop = shopValue;
  }

  onDropOnUnit(unitId: string) {
    if (!this.dragShop) return;
    this.unitShops = { ...this.unitShops, [unitId]: this.dragShop };
    // Un-skip if it was skipped
    this.skippedUnits = this.skippedUnits.filter(x => x !== unitId);
    this.dragShop = null;
  }

  getUnitShopEmoji(id: string): string {
    const shop = this.unitShops[id];
    return COMMUNITY_SHOPS.find(s => s.value === shop)?.emoji || '';
  }

  getShopLabel(id: string): string {
    const shop = this.unitShops[id];
    return COMMUNITY_SHOPS.find(s => s.value === shop)?.label || '';
  }

  getUnitClass(id: string): string {
    const isSkipped  = this.isUnitSkipped(id);
    const isSelected = this.selectedUnit === id;
    const hasShop    = !!this.unitShops[id];
    const isPending  = this.pendingMerge.includes(id);

    const base = 'w-14 h-18 rounded-xl border-2 cursor-pointer relative flex flex-col items-center justify-center transition-all duration-200 ';

    if (isPending)
      return base + 'bg-purple-500/10 border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.2)] scale-105 z-10';
    if (isSelected)
      return base + 'bg-select/10 border-select shadow-[0_0_15px_rgba(251,191,36,0.2)] scale-110 z-10';
    if (isSkipped)
      return base + 'bg-slate-50 border-dashed border-slate-200 opacity-40 hover:opacity-70';
    if (hasShop)
      return base + 'bg-blue-50 border-blue-300 hover:border-blue-400 hover:bg-blue-100/50';
    return base + 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50';
  }

  setSelectedUnitBhk(bhk: string) {
    if (!this.selectedUnit) return;
    this.unitBhkMap = { ...this.unitBhkMap, [this.selectedUnit]: bhk };
  }

  setUnitName(id: string, name: string) {
    if (!id || !name.trim()) {
      const { [id]: _, ...rest } = this.unitNameMap;
      this.unitNameMap = rest;
      return;
    }
    this.unitNameMap = { ...this.unitNameMap, [id]: name };
  }

  resetUnitName(id: string) {
    const { [id]: _, ...rest } = this.unitNameMap;
    this.unitNameMap = rest;
  }

  handleConfirm() {
    // Auto-calculate parking floors: 1 per 4 residential floors
    const parkingFloors = Math.max(1, Math.ceil(this.floors / 4));
    this.onConfirm.emit({
      floors: this.floors,
      unitsPerFloor: this.unitsPerFloor,
      blockName: this.blockName,
      defaultBhk: this.defaultBhk,
      facilities: this.facilities,
      skippedUnits: this.skippedUnits,
      unitShops: this.unitShops,
      unitBhk: this.unitBhkMap,
      unitNames: this.unitNameMap,
      mergeGroups: this.mergeGroups,
      parkingFloors,
      floorUnitOverrides: Object.keys(this.floorUnitOverrides).length > 0 ? this.floorUnitOverrides : undefined
    });
  }
}
