import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingSpot } from '../../parking.types';
import { ParkingStateService } from '../../services/parking-state.service';
import { getVehicleEmoji } from '../../utils/icon-map.util';

@Component({
  selector: 'app-parking-spot',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (spot().type === 'empty') {
      <div class="w-full h-full min-h-[80px] rounded-xl border-2 border-dashed border-slate-400 bg-slate-50/30 parking-spot"
        (click)="onClick.emit()" (contextmenu)="onContextMenu.emit($event)"></div>
    } @else if (spot().type === 'road' || spot().type === 'road_v' || spot().type === 'road_h' || spot().type === 'intersection' || spot().type === 'tjunction') {
      <div class="w-full h-full min-h-[80px] bg-slate-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-all relative shadow-[0_8px_0_0_rgba(0,0,0,0.2)] parking-spot"
        (click)="onClick.emit()" (contextmenu)="onContextMenu.emit($event)">
        @if (showLeft() || showRight()) {
          <div class="h-1 bg-yellow-400/40 absolute top-1/2 -translate-y-1/2 border-y border-dashed border-yellow-400/20"
            [ngClass]="{ 'w-full': showLeft() && showRight(), 'w-1/2': showLeft() !== showRight(), 'left-0': showLeft() && !showRight(), 'right-0': !showLeft() && showRight() }"></div>
        }
        @if (showTop() || showBottom()) {
          <div class="w-1 bg-yellow-400/40 absolute left-1/2 -translate-x-1/2 border-x border-dashed border-yellow-400/20"
            [ngClass]="{ 'h-full': showTop() && showBottom(), 'h-1/2': showTop() !== showBottom(), 'top-0': showTop() && !showBottom(), 'bottom-0': !showTop() && showBottom() }"></div>
        }
        <div class="absolute inset-2 border border-white/5 rounded-lg"></div>
      </div>
    } @else if (spot().type === 'lift') {
      <div class="relative w-full h-full min-h-[80px] flex items-center justify-center cursor-pointer parking-spot"
        (click)="onClick.emit()" (contextmenu)="onContextMenu.emit($event)">
        <div class="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider">{{ spot().label || 'LIFT' }}</div>
        <div class="w-16 h-20 bg-blue-500/10 border-2 border-blue-400/50 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🛗</span>
        </div>
      </div>
    } @else if (spot().type === 'escalator') {
      <div class="relative w-full h-full min-h-[80px] flex items-center justify-center cursor-pointer parking-spot"
        (click)="onClick.emit()" (contextmenu)="onContextMenu.emit($event)">
        <div class="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider">{{ spot().label || 'ESC' }}</div>
        <div class="w-16 h-20 bg-slate-100 border-2 border-slate-300 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🪜</span>
        </div>
      </div>
    } @else if (spot().type === 'stairs') {
      <div class="relative w-full h-full min-h-[80px] flex items-center justify-center cursor-pointer parking-spot"
        (click)="onClick.emit()" (contextmenu)="onContextMenu.emit($event)">
        <div class="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider">{{ spot().label || 'STAIRS' }}</div>
        <div class="w-16 h-20 bg-slate-200 border-2 border-slate-300 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🪜</span>
        </div>
      </div>
    } @else if (spot().type === 'hydraulic') {
      <div class="relative w-full h-full min-h-[80px] flex items-center justify-center cursor-pointer parking-spot"
        (click)="onClick.emit()" (contextmenu)="onContextMenu.emit($event)">
        <div class="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider">{{ spot().label || 'STACKER' }}</div>
        <div class="w-16 h-20 rounded-xl flex items-center justify-center"
          [class.bg-blue-100]="spot().occupied" [class.bg-slate-200]="!spot().occupied"
          [class.border-blue-400]="spot().occupied" [class.border-slate-300]="!spot().occupied"
          style="border-width:2px">
          @if (spot().occupied && vehicleType()) {
            <span class="text-3xl">{{ iconName() }}</span>
          } @else {
            <span class="text-2xl">🔧</span>
          }
        </div>
      </div>
    } @else {
      <div class="relative w-full h-full preserve-3d parking-spot transition-transform duration-200 hover:-translate-y-1.5 hover:scale-[1.02]"
        (click)="onClick.emit()" (contextmenu)="onContextMenu.emit($event)">
        @if (spot().occupied) {
          <div class="absolute inset-0 bg-black/10 blur-md rounded-xl translate-y-4 scale-95"></div>
        }
        <div class="relative w-full h-full min-h-[80px] border-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all preserve-3d"
          [ngClass]="{ 'border-solid shadow-[0_12px_0_0_rgba(0,0,0,0.1)] bg-white -translate-y-2': spot().occupied, 'border-dashed hover:bg-white/80': !spot().occupied }"
          [style.backgroundColor]="spot().occupied ? (vehicleType()?.bgColor || '#fff') : (category()?.color + '10' || '#f8fafc')"
          [style.borderColor]="category()?.color || '#cbd5e1'">
          <div class="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider">{{ spot().label }}</div>
          @if (spot().occupied) {
            <div class="preserve-3d">
              @if (vehicleType()) {
                <span class="text-[32px] leading-none select-none" style="transform:translateZ(20px);display:block;text-shadow:0px 1px 0px rgba(0,0,0,0.4),0px 4px 0px rgba(0,0,0,0.28),0px 8px 16px rgba(0,0,0,0.4);">{{ iconName() }}</span>
              }
            </div>
          } @else {
            <div class="text-[10px] font-bold tracking-widest opacity-80" [style.color]="category()?.color">FREE</div>
          }
          @if (spot().occupied && vehicleCount() > 0) {
            <div class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-blue-600 rounded-full border-2 border-white shadow-md flex items-center justify-center z-20">
              <span class="text-[9px] font-black text-white leading-none">{{ vehicleCount() }}</span>
            </div>
          }
          @if (category()) {
            <div class="absolute bottom-2 right-2 w-2 h-2 rounded-full shadow-sm" [style.backgroundColor]="category()!.color"></div>
          }
        </div>
      </div>
    }
  `
})
export class ParkingSpotComponent {
  parking = inject(ParkingStateService);
  spot = input.required<ParkingSpot>();
  neighbors = input<{ top: boolean; bottom: boolean; left: boolean; right: boolean }>();
  onClick = output<void>();
  onContextMenu = output<MouseEvent>();

  vehicleType = computed(() => {
    const a = this.spot().allocation;
    if (!a || a.vehicles.length === 0) return null;
    return this.parking.state().vehicleTypes.find(v => v.id === a.vehicles[0].vehicleTypeId) || null;
  });

  category = computed(() => this.parking.state().categories.find(c => c.id === this.spot().categoryId) || null);
  iconName = computed(() => { const vt = this.vehicleType(); return vt ? getVehicleEmoji(vt.icon) : '🚗'; });
  vehicleCount = computed(() => this.spot().allocation?.vehicles.length || 0);

  isIntersection = computed(() => this.spot().type === 'intersection' || this.spot().type === 'tjunction');
  showTop = computed(() => this.isIntersection() ? (this.neighbors()?.top ?? true) : this.spot().type === 'road_v');
  showBottom = computed(() => this.isIntersection() ? (this.neighbors()?.bottom ?? true) : this.spot().type === 'road_v');
  showLeft = computed(() => this.isIntersection() ? (this.neighbors()?.left ?? true) : (this.spot().type === 'road' || this.spot().type === 'road_h'));
  showRight = computed(() => this.isIntersection() ? (this.neighbors()?.right ?? true) : (this.spot().type === 'road' || this.spot().type === 'road_h'));
}
