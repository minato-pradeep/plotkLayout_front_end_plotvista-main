import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PlotData, PlotType, AptConfig } from '../../../types';

@Component({
  selector: 'app-plot-cell',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div [style.z-index]="data?.gate ? 50 : null" class="relative overflow-visible w-full h-full group hover:z-[60]">
      <!-- SPLIT VIEW -->
      <div
        *ngIf="data?.splitDirection; else normalView"
        class="w-full h-full flex p-1 gap-1 items-center justify-center overflow-visible"
        [class]="data?.splitDirection === 'v' ? 'flex-row' : 'flex-col'"
      >
        <div
          *ngFor="let half of ['a', 'b']"
          [style.visibility]="hiddenHalf === half ? 'hidden' : 'visible'"
          [style.pointer-events]="hiddenHalf === half ? 'none' : 'auto'"
          (click)="onSplitClick.emit(half === 'a' ? 'a' : 'b'); $event.stopPropagation()"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event, half === 'a' ? 'a' : 'b')"
          [class]="'relative flex flex-col items-center justify-center p-1 transition-all hover:brightness-[0.98] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200 ' + 
                   (selectedHalf === half ? 'ring-2 ring-inset ring-slate-900 z-10 shadow-lg scale-[1.02]' : '')"
          [style.flex]="'0 0 calc(50% - 0.5rem)'"
          [style.height]="data!.splitDirection === 'v' ? 'calc(100% - 0.5rem)' : 'calc(50% - 0.5rem)'"
          [style.width]="data!.splitDirection === 'v' ? 'calc(50% - 0.5rem)' : 'calc(100% - 0.5rem)'"
          [style.background]="getSplitHalfColor(half === 'a' ? 'a' : 'b')"
        >
          <span class="text-xs w-8 h-8 block" [innerHTML]="getTypeIcon(data!.splitData![half === 'a' ? 'a' : 'b'].type, data!.splitData![half === 'a' ? 'a' : 'b'].shopType)"></span>
          <div class="w-full mt-1 px-1 overflow-hidden">
            <div class="text-[8px] font-black uppercase text-slate-900 truncate text-center w-full px-1">
              {{ data!.splitData![half === 'a' ? 'a' : 'b'].name || data!.splitData![half === 'a' ? 'a' : 'b'].type }}
            </div>
          </div>

          <!-- Small Split Label Input (on hover) -->
          <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity p-1">
            <div class="flex flex-col items-center w-full">
              <input 
                type="text" 
                [ngModel]="data!.splitData![half === 'a' ? 'a' : 'b'].name" 
                (ngModelChange)="onNameChange.emit({half: half === 'a' ? 'a' : 'b', name: $event})"
                (click)="$event.stopPropagation()"
                class="bg-transparent text-[8px] font-mono text-white/50 text-center uppercase tracking-[0.2em] w-[90%] outline-none focus:text-white"
                placeholder="LABEL"
              />
            </div>
          </div>
        </div>
      </div>
  
      <!-- NORMAL VIEW -->
      <ng-template #normalView>
        <div
          (click)="onClick.emit(); cellClick.emit()"
          (contextmenu)="onContextMenu($event)"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event, null)"
          [attr.draggable]="(data?.type && data?.type !== 'vacant') ? 'true' : 'false'"
          [class]="'plot-cell group ' + (isGhost ? 'plot-ghost' : getPlotClass()) + ' ' + customClass"
          [ngClass]="{
            'selected': isSelected,
            'w-full h-full': isLarge,
            'road-joint': data?.type === 'road',
            'opacity-0': isGhost && !data?.gate
          }"
        >
          <ng-container *ngIf="!isGhost">
            <!-- Truly vacant, no residents -->
            <div *ngIf="!data?.residents?.length && (!data || data.type === 'vacant')" class="flex flex-col items-center justify-center w-full h-full">
              <img src="assets/plot-icons/vacant.png" alt="vacant" class="w-28 h-28 object-contain opacity-50" draggable="false" style="pointer-events: none; user-select: none;" />
            </div>
    
            <!-- Typed plot (house, apt, park, etc.) -->
            <div *ngIf="data && data.type !== 'road' && data.type !== 'vacant'" class="flex flex-col items-center justify-between w-full h-full relative p-1">
              <div class="flex-1 flex items-center justify-center relative z-10" 
                   [style.width]="isLarge ? '70%' : 'calc(0.65 * var(--cell-size, 96px))'" 
                   [style.height]="isLarge ? '70%' : 'calc(0.65 * var(--cell-size, 96px))'">
                <span class="w-full h-full block flex items-center justify-center p-2" [innerHTML]="getTypeIcon(data.type, data.shopType)"></span>
              </div>
              <div [class]="'w-full text-center font-black uppercase tracking-tight truncate px-1 pb-0.5 ' + getTypeTextClass(data.type)"
                [style.font-size]="'calc(0.10 * var(--cell-size, 96px))'">
                {{ data.name || data.type }}
              </div>
              <div *ngIf="data.residents.length > 0" 
                   class="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] leading-none font-black w-4 h-4 rounded-full flex items-center justify-center ring-[2.5px] ring-slate-900 shadow-md z-20"
                   title="{{ data.residents.length }} residents">
                {{ data.residents.length }}
              </div>
            </div>
    
            <!-- Vacant plot WITH residents -->
            <div *ngIf="data?.residents?.length && (!data || data.type === 'vacant')" class="flex flex-col items-center justify-center text-center p-1 w-full h-full relative">
              <div class="text-base mb-0.5">&#128100;</div>
              <div class="text-[8px] font-black text-white truncate w-full px-1">{{ data?.residents?.[0]?.name }}</div>
              <div class="text-[7px] uppercase tracking-wide mt-0.5"
                [class]="data?.residents?.[0]?.role === 'owner' ? 'text-house' : 'text-apt'">
                {{ data?.residents?.[0]?.role }}
              </div>
              <div class="absolute -top-1 -right-1 bg-accent text-slate-900 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                {{ data?.residents?.length }}
              </div>
            </div>
    
    
    
            <!-- Road -->
            <div *ngIf="data?.type === 'road'" class="absolute inset-0 flex items-center justify-center overflow-visible plot-3d-road road-block">
              <div class="absolute inset-0 bg-[#64748b]"></div>
              <div *ngIf="(data?.roadDirection === 'v' || (roadConnectivity?.top || roadConnectivity?.bottom))" 
                class="h-full w-[2px] pointer-events-none z-[1] mx-auto" 
                [style.background-image]="'linear-gradient(to bottom, #fbbf24 50%, transparent 50%)'" 
                [style.background-size]="'2px 60px'"></div>
              <div *ngIf="(data?.roadDirection === 'h' || !data?.roadDirection || (roadConnectivity?.left || roadConnectivity?.right))" 
                class="w-full h-[2px] absolute top-1/2 -translate-y-1/2 pointer-events-none z-[1]" 
                [style.background-image]="'linear-gradient(to right, #fbbf24 50%, transparent 50%)'" 
                [style.background-size]="'60px 2px'"></div>
              <div *ngIf="data?.name && data?.name !== 'STREET'" 
                [class]="'absolute inset-0 flex items-center justify-center z-[50] m-auto bg-slate-900 border border-white/20 rounded-full shadow-2xl transition-all duration-300 ' + 
                         (data?.roadDirection === 'v' ? 'flex-col w-fit h-fit min-h-[100px] max-h-[280px] px-1.5 py-4' : 'flex-row w-fit h-fit min-w-[100px] max-w-[280px] px-4 py-1.5')">
                <div [class]="'flex items-center gap-2 w-full ' + (data?.roadDirection === 'v' ? 'flex-col grow' : 'flex-row')">
                  <span class="text-[10px] opacity-80 shrink-0 pointer-events-none self-center">🛣️</span>
                  <div [class]="'relative flex-1 flex items-center justify-center ' + (data?.roadDirection === 'v' ? 'min-h-[40px] w-full' : 'min-w-[40px] h-full')">
                    <span class="text-[10px] font-mono font-black uppercase tracking-widest invisible px-1" 
                      [style]="(data?.roadDirection === 'v' ? 'writing-mode: vertical-rl; overflow: hidden; width: 0;' : 'white-space: pre;') + ' color: white !important;'">{{data?.name || ''}}</span>
                    <input type="text" 
                      [ngModel]="data?.name" 
                      (ngModelChange)="onNameChange.emit({half: null, name: $event})" 
                      (click)="$event.stopPropagation()" 
                      (keydown)="$event.stopPropagation()" 
                      class="absolute inset-0 w-full h-full text-[10px] font-mono font-black uppercase tracking-widest bg-transparent border-none outline-none text-center focus:outline-none transition-all" 
                      [style]="(data?.roadDirection === 'v' ? 'writing-mode: vertical-rl;' : '') + ' color: white !important; -webkit-text-fill-color: white !important; font-weight: 900; caret-color: white;'"
                      placeholder="STREET" />
                  </div>
                </div>
              </div>
              <div *ngIf="roadConnectivity?.top" class="absolute top-0 left-0 right-0 h-[1px] bg-[#0a0c10] z-[1]"></div>
              <div *ngIf="roadConnectivity?.bottom" class="absolute bottom-0 left-0 right-0 h-[1px] bg-[#0a0c10] z-[1]"></div>
              <div *ngIf="roadConnectivity?.left" class="absolute top-0 bottom-0 left-0 w-[1px] bg-[#0a0c10] z-[1]"></div>
              <div *ngIf="roadConnectivity?.right" class="absolute top-0 bottom-0 right-0 w-[1px] bg-[#0a0c10] z-[1]"></div>
            </div>
          </ng-container>

          <!-- Premium Gate Rendering -->
          <ng-container *ngIf="data?.gate && !isMerged">
            <!-- TOP Gate -->
            <div *ngIf="data!.gate!.position === 'top'"
              class="absolute top-0 left-0 right-0 z-[100] flex flex-col items-center justify-start overflow-visible pointer-events-none"
              [style.margin-top]="'calc(-0.15 * var(--cell-size, 96px))'">
              
              <div *ngIf="data!.gate!.label" 
                class="px-2 py-0.5 rounded-sm text-[6px] font-black uppercase tracking-[0.2em] mb-1.5 shadow-sm border bg-white"
                [class]="data!.gate!.label.toLowerCase().includes('exit') ? 'text-red-500 border-red-100' : 'text-slate-900 border-slate-100'">
                {{data!.gate!.label}}
              </div>

              <div class="flex items-start justify-center w-full overflow-visible">
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-t border-white/30" [style.width]="'calc(0.1 * var(--cell-size, 96px))'" [style.height]="'calc(0.18 * var(--cell-size, 96px))'"></div>
                <div [style]="getBarStyle(data!.gate!.type, data!.gate!.label)" class="grow max-w-[65%] rounded-full mt-1.5 flex items-center justify-center border-t border-white/20 shadow-inner relative" [style.height]="'calc(0.04 * var(--cell-size, 96px))'">
                  <div *ngIf="data!.gate!.type === 'cyber'" class="w-full h-full animate-pulse bg-cyan-400/40 blur-[3px]"></div>
                </div>
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-t border-white/30" [style.width]="'calc(0.1 * var(--cell-size, 96px))'" [style.height]="'calc(0.18 * var(--cell-size, 96px))'"></div>
              </div>
            </div>

            <!-- BOTTOM Gate -->
            <div *ngIf="data!.gate!.position === 'bottom'"
              class="absolute bottom-0 left-0 right-0 z-[100] flex flex-col items-center justify-end overflow-visible pointer-events-none"
              [style.margin-bottom]="'calc(-0.15 * var(--cell-size, 96px))'">
              
              <div class="flex items-end justify-center w-full overflow-visible">
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-b border-black/20" [style.width]="'calc(0.1 * var(--cell-size, 96px))'" [style.height]="'calc(0.18 * var(--cell-size, 96px))'"></div>
                <div [style]="getBarStyle(data!.gate!.type, data!.gate!.label)" class="grow max-w-[65%] rounded-full mb-1.5 transition-all duration-500 relative flex items-center justify-center border-b border-black/20 shadow-inner" [style.height]="'calc(0.04 * var(--cell-size, 96px))'">
                  <div *ngIf="data!.gate!.type === 'cyber'" class="w-full h-full animate-pulse bg-cyan-400/40 blur-[3px]"></div>
                </div>
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-b border-black/20" [style.width]="'calc(0.1 * var(--cell-size, 96px))'" [style.height]="'calc(0.18 * var(--cell-size, 96px))'"></div>
              </div>

              <div *ngIf="data!.gate!.label" 
                class="px-2 py-0.5 rounded-sm text-[6px] font-black uppercase tracking-[0.2em] mt-1.5 shadow-sm border bg-white"
                [class]="data!.gate!.label.toLowerCase().includes('exit') ? 'text-red-500 border-red-100' : 'text-slate-900 border-slate-100'">
                {{data!.gate!.label}}
              </div>
            </div>

            <!-- LEFT Gate -->
            <div *ngIf="data!.gate!.position === 'left'"
              class="absolute left-0 top-0 bottom-0 z-[100] flex items-center justify-center overflow-visible pointer-events-none"
              [style.margin-left]="'calc(-0.15 * var(--cell-size, 96px))'">
              
              <div *ngIf="data!.gate!.label" 
                class="px-1.5 py-1 rounded-sm text-[6px] font-black uppercase tracking-[0.2em] mx-1 shadown-sm border bg-white whitespace-nowrap"
                [class]="data!.gate!.label.toLowerCase().includes('exit') ? 'text-red-500 border-red-100' : 'text-slate-900 border-slate-100'"
                style="writing-mode: vertical-rl; transform: rotate(180deg);">
                {{data!.gate!.label}}
              </div>

              <div class="flex flex-col items-center justify-center h-full overflow-visible">
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-l border-white/30" [style.width]="'calc(0.12 * var(--cell-size, 96px))'" [style.height]="'calc(0.12 * var(--cell-size, 96px))'"></div>
                <div [style]="getBarStyle(data!.gate!.type, data!.gate!.label)" class="grow max-h-[65%] rounded-full ml-1.5 transition-all duration-500 relative flex items-center justify-center border-l border-white/20 shadow-inner overflow-hidden" [style.width]="'calc(0.06 * var(--cell-size, 96px))'">
                  <div *ngIf="data!.gate!.type === 'cyber'" class="w-full h-full animate-pulse bg-current opacity-40 blur-[2px]"></div>
                </div>
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-l border-white/30" [style.width]="'calc(0.12 * var(--cell-size, 96px))'" [style.height]="'calc(0.12 * var(--cell-size, 96px))'"></div>
              </div>
            </div>

            <!-- RIGHT Gate -->
            <div *ngIf="data!.gate!.position === 'right'"
              class="absolute right-0 top-0 bottom-0 z-[100] flex items-center justify-center overflow-visible pointer-events-none"
              [style.margin-right]="'calc(-0.15 * var(--cell-size, 96px))'">
              
              <div class="flex flex-col items-center justify-center h-full overflow-visible">
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-r border-black/20" [style.width]="'calc(0.12 * var(--cell-size, 96px))'" [style.height]="'calc(0.12 * var(--cell-size, 96px))'"></div>
                <div [style]="getBarStyle(data!.gate!.type, data!.gate!.label)" class="grow max-h-[65%] rounded-full mr-1.5 transition-all duration-500 relative flex items-center justify-center border-r border-black/20 shadow-inner overflow-hidden" [style.width]="'calc(0.06 * var(--cell-size, 96px))'">
                  <div *ngIf="data!.gate!.type === 'cyber'" class="w-full h-full animate-pulse bg-current opacity-40 blur-[2px]"></div>
                </div>
                <div [style]="getPillarStyle(data!.gate!.type, data!.gate!.label)" class="rounded-sm shrink-0 shadow-xl border-r border-black/20" [style.width]="'calc(0.12 * var(--cell-size, 96px))'" [style.height]="'calc(0.12 * var(--cell-size, 96px))'"></div>
              </div>

              <div *ngIf="data!.gate!.label" 
                class="px-1.5 py-1 rounded-sm text-[6px] font-black uppercase tracking-[0.2em] mx-1 shadow-sm border bg-white whitespace-nowrap"
                [class]="data!.gate!.label.toLowerCase().includes('exit') ? 'text-red-500 border-red-100' : 'text-slate-900 border-slate-100'"
                style="writing-mode: vertical-rl;">
                {{data!.gate!.label}}
              </div>
            </div>
          </ng-container>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .plot-cell {
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: calc(0.12 * var(--cell-size, 96px));
    }
    .plot-cell:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
      z-index: 10;
    }
    .plot-cell.selected {
      box-shadow: inset 0 0 0 3px #14b8a6, 0 8px 30px rgba(20, 184, 166, 0.3);
      border-color: transparent;
    }
    .road-joint {
      border: none !important;
      background: transparent !important;
    }
  `]
})
export class PlotCellComponent {
  @Input() data: PlotData | null = null;
  @Input() plotKey: string = '';
  @Input() isSelected = false;
  @Input() selectedHalf: 'a' | 'b' | null = null;
  @Input() hiddenHalf: 'a' | 'b' | null = null;
  @Input() isLarge = false;
  @Input() customClass = '';
  @Input() isGhost = false;
  @Input() isMerged = false;
  @Input() roadConnectivity: { top: boolean, bottom: boolean, left: boolean, right: boolean } | null = null;
  @Output() onClick = new EventEmitter<void>();
  @Output() cellClick = new EventEmitter<void>();
  @Output() onRightClick = new EventEmitter<MouseEvent>();
  @Output() onSplitClick = new EventEmitter<'a' | 'b'>();
  @Output() onSqftChange = new EventEmitter<number>();
  @Output() onNameChange = new EventEmitter<{ half: 'a' | 'b' | null, name: string }>();
  @Output() onDropType = new EventEmitter<{ event: DragEvent, half: 'a' | 'b' | null }>();

  private sanitizer = inject(DomSanitizer);

  getPlotClass(): string {
    if (!this.data) return 'plot-vacant';
    let className = `plot-type-${this.data.type}`;
    if (this.data.type === 'shop' && this.data.shopType) {
      className += ` plot-shop-${this.data.shopType.toLowerCase().replace(/\s+/g, '-')}`;
    }
    return className;
  }

  getTypeIcon(type: PlotType | undefined, shopType?: string): SafeHtml | string {
    if (type === 'road') return '🛣️';
    if (!type || type === 'vacant') return '⬜';

    let iconFile = `${type}.png`;

    if (type === 'house') {
      iconFile = 'villa.png';
    } else if (type === 'guesthouse') {
      iconFile = 'GuestHouse.png';
    } else if (type === 'communityHall') {
      iconFile = 'CommunityHall.png';
    } else if (type === 'swimmingPool') {
      iconFile = 'SwimmingPool.png';
    } else if (type === 'pg') {
      iconFile = 'apartment.png';
    } else if (type === 'shop') {
      const shopMap: Record<string, string> = {
        'gym': 'gym.png',
        'playstation': 'playstation.png',
        'bank': 'bank.png',
        'atm': 'bank.png',
        'miniclinic': 'mini clinic.png',
        'pharmacy': 'pharmacy.png',
        'bakery': 'bakery.png',
        'grosary': 'grosary.png',
        'grocery': 'grosary.png',
        'laundry': 'laundary (1).png',
        'tailoring': 'tailor (1).png',
        'salon': 'spa (1).png',
        'spa': 'spa (1).png',
      };
      if (shopType && shopMap[shopType.toLowerCase()]) {
        iconFile = shopMap[shopType.toLowerCase()];
      } else {
        iconFile = 'shop.png';
      }
    }

    const imgSrc = `assets/plot-icons/${iconFile}`;
    return this.sanitizer.bypassSecurityTrustHtml(`<img src="${imgSrc}" class="w-full h-full object-contain pointer-events-none transition-all duration-300 transform scale-110 group-hover:scale-125" style="mix-blend-mode: multiply; filter: contrast(1.05);" />`);
  }

  getTypeTextClass(type: PlotType | undefined): string {
    if (type === 'road' || !type || type === 'vacant') return 'text-slate-600';
    return 'text-slate-900';
  }

  getSplitHalfColor(half: 'a' | 'b'): string {
    if (!this.data?.splitData) return 'transparent';
    const type = this.data.splitData[half].type;
    switch (type) {
      case 'house': return '#f59e0b';
      case 'apartment': return '#2563eb';
      case 'park': return '#10b981';
      case 'shop': return '#06b6d4';
      case 'watertank': return '#0891b2';
      case 'hospital': return '#ef4444';
      case 'security': return '#8b5cf6';
      default: return '#ffffff';
    }
  }

  onContextMenu(e: MouseEvent) {
    e.preventDefault();
    this.onRightClick.emit(e);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  }

  onDrop(e: DragEvent, half: 'a' | 'b' | null) {
    e.preventDefault();
    this.onDropType.emit({ event: e, half });
  }

  getPillarStyle(type: string | undefined, label?: string): string {
    if (!type) return 'background: #94a3b8;';
    const isExit = label?.toLowerCase().includes('exit');
    const color = isExit ? '#ef4444' : (type === 'cyber' ? '#1d4ed8' : '#1e293b');
    const accent = isExit ? '#fee2e2' : (type === 'cyber' ? '#38bdf8' : '#475569');
    
    if (type === 'cyber') {
      return `background: linear-gradient(135deg, ${accent} 0%, ${color} 100%); border: 1px solid ${isExit ? '#991b1b' : '#1e3a8a'}; box-shadow: 0 0 15px ${isExit ? 'rgba(239,68,68,0.4)' : 'rgba(14,165,233,0.4)'};`;
    }
    return `background: linear-gradient(135deg, ${accent} 0%, ${color} 100%); border: 1px solid ${isExit ? '#991b1b' : '#0f172a'};`;
  }

  getBarStyle(type: string | undefined, label?: string): string {
    if (!type) return 'background: #64748b;';
    const isExit = label?.toLowerCase().includes('exit');
    if (isExit) return 'background: linear-gradient(to bottom, #f87171, #ef4444); border: 1px solid #991b1b;';
    
    switch (type) {
      case 'cyber': return 'background: linear-gradient(to bottom, #0ea5e9, #2563eb); border: 1px solid #1e40af;';
      case 'side': return 'background: linear-gradient(to bottom, #1e293b, #0f172a); border: 1px solid #020617;';
      default: return 'background: #64748b;';
    }
  }
}
