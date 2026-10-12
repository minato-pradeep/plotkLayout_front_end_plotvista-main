import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Resident, AptConfig } from '../../../types';

@Component({
  selector: 'app-res-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-md" (click)="onClose.emit()"></div>
      <div class="relative w-full max-w-sm rounded-3xl overflow-hidden animate-fade-up"
        style="background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 20px 60px rgba(0,0,0,0.15);">

        <!-- Header -->
        <div [style]="'padding:24px 24px 20px; border-bottom:1px solid #f1f5f9; background:' + (role === 'owner' ? 'linear-gradient(135deg,#f0fdf4,#ffffff)' : 'linear-gradient(135deg,#f0f9ff,#ffffff)')">
          <h2 style="font-size:18px; font-weight:900; color:#0f172a !important; -webkit-text-fill-color:#0f172a !important; letter-spacing:-0.02em; margin:0 0 4px;">
            Register {{role === 'owner' ? 'Owner' : 'Tenant'}}
          </h2>
          <p style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#94a3b8 !important; -webkit-text-fill-color:#94a3b8 !important; margin:0;">
            Identity Verification
          </p>
        </div>

        <!-- Body -->
        <div style="padding:24px; display:flex; flex-direction:column; gap:16px; background:#ffffff;">

          <!-- Role Toggle -->
          <div style="display:flex; gap:10px;">
            <label style="flex:1; display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; border:2px solid; cursor:pointer; transition:all 0.2s;"
              [style.border-color]="role === 'owner' ? '#10b981' : '#e2e8f0'"
              [style.background]="role === 'owner' ? '#f0fdf4' : '#f8fafc'">
              <input type="radio" name="resRole" value="owner" [(ngModel)]="role" style="display:none;">
              <span style="width:16px; height:16px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                [style.border-color]="role === 'owner' ? '#10b981' : '#cbd5e1'">
                <span *ngIf="role === 'owner'" style="width:8px; height:8px; border-radius:50%; background:#10b981; display:block;"></span>
              </span>
              <span style="font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;"
                [style.color]="role === 'owner' ? '#059669' : '#94a3b8'">👤 Owner</span>
            </label>

            <label style="flex:1; display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; border:2px solid; cursor:pointer; transition:all 0.2s;"
              [style.border-color]="role === 'tenant' ? '#0ea5e9' : '#e2e8f0'"
              [style.background]="role === 'tenant' ? '#f0f9ff' : '#f8fafc'">
              <input type="radio" name="resRole" value="tenant" [(ngModel)]="role" style="display:none;">
              <span style="width:16px; height:16px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                [style.border-color]="role === 'tenant' ? '#0ea5e9' : '#cbd5e1'">
                <span *ngIf="role === 'tenant'" style="width:8px; height:8px; border-radius:50%; background:#0ea5e9; display:block;"></span>
              </span>
              <span style="font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;"
                [style.color]="role === 'tenant' ? '#0284c7' : '#94a3b8'">🏠 Tenant</span>
            </label>
          </div>

          <!-- Full Name -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; color:#64748b;">Full Name</label>
            <input #nameInput type="text" [(ngModel)]="name" autocomplete="off"
              placeholder="Enter resident name"
              style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; font-size:14px; outline:none; box-sizing:border-box; caret-color:#0f172a;"
              (focus)="$event.target.style.borderColor='#3b82f6'"
              (blur)="$event.target.style.borderColor='#e2e8f0'" />
          </div>

          <!-- Phone -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; color:#64748b;">Contact Number</label>
            <input type="text" [(ngModel)]="phone" autocomplete="off"
              placeholder="+1 234 567 890"
              style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; font-size:14px; outline:none; box-sizing:border-box; caret-color:#0f172a;"
              (focus)="$event.target.style.borderColor='#3b82f6'"
              (blur)="$event.target.style.borderColor='#e2e8f0'" />
          </div>

          <!-- Unit (apt only) -->
          <div *ngIf="aptConfig" style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; color:#64748b;">Unit Designation</label>
            <select [(ngModel)]="unit"
              style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; font-size:14px; outline:none; box-sizing:border-box; appearance:none;">
              <option value="">Select Unit</option>
              <option *ngFor="let opt of unitOptions" [value]="opt.value">{{opt.label}}</option>
            </select>
          </div>

          <!-- Notes -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; color:#64748b;">Notes</label>
            <textarea [(ngModel)]="note"
              placeholder="Additional notes..."
              style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; font-size:14px; outline:none; box-sizing:border-box; height:80px; resize:none; caret-color:#0f172a;"
              (focus)="$event.target.style.borderColor='#3b82f6'"
              (blur)="$event.target.style.borderColor='#e2e8f0'"></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:10px;">
          <button (click)="onClose.emit()"
            style="padding:8px 16px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#64748b !important; -webkit-text-fill-color:#64748b !important; background:#ffffff; border:1px solid #e2e8f0; cursor:pointer; border-radius:10px;">
            Cancel
          </button>
          <button (click)="handleSave()"
            style="padding:8px 20px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; background:#0f172a; border:none; cursor:pointer; border-radius:10px;">
            Save
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResModalComponent {
  @Input() isOpen = false;
  @Input() role: 'owner' | 'tenant' = 'owner';
  @Input() aptConfig?: AptConfig;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Resident>();

  @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;

  name = '';
  phone = '';
  unit = '';
  note = '';

  get unitOptions() {
    if (!this.aptConfig) return [];
    const options = [];
    for (let f = this.aptConfig.floors; f >= 1; f--) {
      for (let u = 0; u < this.aptConfig.unitsPerFloor; u++) {
        const id = `${f}${String.fromCharCode(65 + u)}`;
        options.push({ value: id, label: `Floor ${f} — Unit ${id}` });
      }
    }
    for (let u = 1; u <= this.aptConfig.unitsPerFloor; u++) {
      const id = `G${u}`;
      options.push({ value: id, label: `Ground — Unit ${id}` });
    }
    return options;
  }

  handleSave() {
    if (!this.name.trim()) return;
    this.onSave.emit({ name: this.name, phone: this.phone, role: this.role, unit: this.unit, note: this.note });
    this.reset();
  }

  reset() {
    this.name = '';
    this.phone = '';
    this.unit = '';
    this.note = '';
  }
}
