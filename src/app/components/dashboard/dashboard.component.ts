import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  companyName = computed(() => this.auth.getCompanyName() || 'Company');
  username    = computed(() => { const u = this.auth.user()?.username || ''; return u ? u.charAt(0).toUpperCase() + u.slice(1) : ''; });

  showSettings    = signal(false);
  settingsLoading = signal(false);
  settingsMsg     = signal('');
  settingsMsgType = signal<'error' | 'success'>('error');

  newUsername     = '';
  currentPassword = '';
  newPassword     = '';
  confirmPassword = '';

  currentTime = signal('');
  currentDate = signal('');
  sessionTime = signal('00:00:00');

  private _timer: any;
  private _sessionStart = Date.now();

  // Layout type from project
  layoutType = signal<string>('');
  isParking = computed(() => this.layoutType().toLowerCase() === 'parking');

  // Real stat values (animated)
  statTotal     = signal(0);
  statBooked    = signal(0);
  statAvailable = signal(0);
  statPeople    = signal(0);

  // Real plot type breakdown for layout card
  plotTypeBreakdown = signal<{ label: string; count: number; pct: number; color: string }[]>([]);

  // Real parking breakdown
  parkingBreakdown = signal<{ label: string; count: number; pct: number; color: string }[]>([]);

  // Legend data
  legendItems = signal<{ label: string; count: number; color: string }[]>([]);

  // Booked percent for progress bar
  bookedPct = signal(0);

  // Loading state
  loading = signal(true);

  // Raw targets for animation
  private _targets = { total: 0, booked: 0, available: 0, people: 0 };

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this._tick();
    this._timer = setInterval(() => this._tick(), 1000);
    this._loadDashboardData();
  }

  ngOnDestroy() { clearInterval(this._timer); }

  private _tick() {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    this.currentDate.set(now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    const elapsed = Math.floor((Date.now() - this._sessionStart) / 1000);
    const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    this.sessionTime.set(`${h}:${m}:${s}`);
  }

  private _loadDashboardData() {
    const companyId = this.auth.getCompanyId();
    if (!companyId) { this.loading.set(false); return; }

    forkJoin({
      project: this.api.getProject(companyId).pipe(catchError(() => of(null))),
      meta:    this.api.getLayoutMeta(companyId).pipe(catchError(() => of(null))),
      plots:   this.api.getLayoutPlots(companyId).pipe(catchError(() => of(null))),
    }).subscribe(({ project, meta, plots }) => {
      this.loading.set(false);
      if (!project?.data) return;

      const p = project.data;
      const projectId = p.id;
      this.layoutType.set(p.companyLayoutType || '');

      // ── TOTAL CAPACITY from meta (respects block overrides) ──
      const metaData = meta?.data || {};
      const H   = metaData.global?.H ?? metaData.hStreets ?? 2;
      const V   = metaData.global?.V ?? metaData.vStreets ?? 2;
      const PSB = metaData.global?.PSB ?? metaData.plotsPerBlock ?? 2;
      const blockOverrides: Record<string, { rows: number; cols: number }> = metaData.blockOverrides || {};
      let totalPlots = 0;
      for (let r = 0; r <= H; r++)
        for (let c = 0; c <= V; c++) {
          const ov = blockOverrides[`${r}_${c}`];
          totalPlots += ov ? ov.rows * ov.cols : PSB * PSB;
        }

      // ── PLOT TYPE BREAKDOWN from DB plots ──
      const allPlots: Record<string, any> = plots?.data || {};
      const typeCounts: Record<string, number> = {};
      Object.values(allPlots).forEach((plot: any) => {
        const t = plot?.type || 'vacant';
        if (t !== 'vacant') typeCounts[t] = (typeCounts[t] || 0) + 1;
      });

      const typeColorMap: Record<string, string> = {
        apartment: '#2563eb', house: '#8b5cf6', park: '#10b981',
        shop: '#f59e0b', road: '#94a3b8', hospital: '#ef4444',
        watertank: '#38bdf8', security: '#f97316', pg: '#a855f7',
        guesthouse: '#ec4899', gate: '#64748b'
      };
      const legendItems = Object.entries(typeCounts)
        .filter(([t]) => t !== 'road')
        .map(([t, c]) => ({ label: this._formatType(t), count: c, color: typeColorMap[t] || '#94a3b8' }))
        .sort((a, b) => b.count - a.count);
      this.legendItems.set(legendItems);

      const nonVacant = Object.entries(typeCounts).filter(([t]) => t !== 'road');
      const nonVacantTotal = nonVacant.reduce((s, [, c]) => s + c, 0) || 1;
      this.plotTypeBreakdown.set(
        nonVacant.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, c]) => ({
          label: this._formatType(t), count: c,
          pct: Math.round((c / nonVacantTotal) * 100),
          color: typeColorMap[t] || '#94a3b8'
        }))
      );

      // ── PARKING STATS ──
      let parking: any = {};
      try { parking = typeof p.parkingJson === 'string' ? JSON.parse(p.parkingJson) : (p.parkingJson || {}); } catch { parking = {}; }
      const floors: any[] = parking.floors || [];
      const vehicleTypeCounts: Record<string, number> = {};
      let totalSlots = 0, occupiedSlots = 0;
      floors.forEach((floor: any) => {
        (floor.grid || []).forEach((row: any[]) => {
          row.forEach((spot: any) => {
            if (spot?.type === 'parking') {
              totalSlots++;
              if (spot.occupied) {
                occupiedSlots++;
                const vt = spot.allocation?.vehicles?.[0]?.vehicleTypeName || 'Other';
                vehicleTypeCounts[vt] = (vehicleTypeCounts[vt] || 0) + 1;
              }
            }
          });
        });
      });
      const parkingColors = ['#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#38bdf8'];
      const parkingBreakdown = Object.entries(vehicleTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([label, count], i) => ({ label, count, pct: totalSlots > 0 ? Math.round((count / totalSlots) * 100) : 0, color: parkingColors[i] || '#94a3b8' }));
      if (parkingBreakdown.length === 0 && floors.length > 0) {
        const occPct = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
        this.parkingBreakdown.set([
          { label: 'Occupied', count: occupiedSlots, pct: occPct, color: '#f59e0b' },
          { label: 'Free', count: totalSlots - occupiedSlots, pct: 100 - occPct, color: '#10b981' }
        ]);
      } else {
        this.parkingBreakdown.set(parkingBreakdown);
      }

      // ── BOOKED / RESIDENTS from layout plots (same rules as /layout page) ──
      const { booked, residents } = this._computeLayoutStats(allPlots);
      const available = Math.max(0, totalPlots - booked);
      const bPct = totalPlots > 0 ? Math.round((booked / totalPlots) * 100) : 0;
      this.bookedPct.set(bPct);
      this._targets = { total: totalPlots, booked, available, people: residents };
      this._animateStats();
    });
  }

  /** Normalize plot type strings from DB / custom sub-classifications. */
  private _normalizePlotType(type: string | undefined): string {
    return (type || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
  }

  /** Each grid cell may be unsplit or split into two halves — count slots, not parent keys. */
  private _iterPlotSlots(plot: any): { type: string }[] {
    if (!plot) return [];
    if (plot.splitDirection && plot.splitData) {
      const slots: { type: string }[] = [];
      for (const half of ['a', 'b'] as const) {
        const h = plot.splitData[half];
        if (h) slots.push({ type: h.type || 'vacant' });
      }
      return slots.length ? slots : [{ type: plot.type || 'vacant' }];
    }
    return [{ type: plot.type || 'vacant' }];
  }

  /**
   * Booked = non-vacant, non-road properties placed on the layout (live plot data).
   * Residents = count of house, apartment, pg, and guest house slots only.
   */
  private _computeLayoutStats(allPlots: Record<string, any>): { booked: number; residents: number } {
    const residentialTypes = new Set(['house', 'apartment', 'pg', 'guesthouse']);
    let booked = 0;
    let residents = 0;
    Object.values(allPlots).forEach((plot: any) => {
      for (const slot of this._iterPlotSlots(plot)) {
        const t = this._normalizePlotType(slot.type);
        if (t && t !== 'vacant' && t !== 'road') booked++;
        if (residentialTypes.has(t)) residents++;
      }
    });
    return { booked, residents };
  }

  private _formatType(t: string): string {
    const map: Record<string, string> = {
      house: 'Villa', apartment: 'Apartment', park: 'Park',
      shop: 'Shop', road: 'Road', hospital: 'Hospital',
      watertank: 'Water Tank', security: 'Security', vacant: 'Vacant', gate: 'Gate'
    };
    return map[t] || t.charAt(0).toUpperCase() + t.slice(1);
  }

  private _animateStats() {
    const { total, booked, available, people } = this._targets;
    const targets = [total, booked, available, people];
    const sigs    = [this.statTotal, this.statBooked, this.statAvailable, this.statPeople];
    const frames  = 50;
    targets.forEach((target, i) => {
      let frame = 0;
      const iv = setInterval(() => {
        frame++;
        const ease = 1 - Math.pow(1 - frame / frames, 3);
        sigs[i].set(Math.round(target * ease));
        if (frame >= frames) { sigs[i].set(target); clearInterval(iv); }
      }, 24);
    });
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getInitials(): string {
    const n = this.username();
    return n ? n.slice(0, 2).toUpperCase() : 'PV';
  }

  goTo(path: string) { this.router.navigate([path]); }
  logout() { this.auth.logout(); this.router.navigate(['/login']); }

  private notify(msg: string, type: 'error' | 'success' = 'error') {
    this.settingsMsg.set(msg);
    this.settingsMsgType.set(type);
    if (type === 'success') setTimeout(() => this.settingsMsg.set(''), 3000);
  }

  changeUsername() {
    if (!this.newUsername.trim()) { this.notify('Enter a new username'); return; }
    this.settingsLoading.set(true);
    this.api.changeUsername({ newUsername: this.newUsername.trim() }).subscribe({
      next: (res: any) => {
        const d = res.data;
        this.auth.setAuth({ token: d.token, username: d.username, companyId: d.companyId, companyName: d.companyName, mustChangePassword: false });
        this.newUsername = '';
        this.notify('Username updated!', 'success');
        this.settingsLoading.set(false);
      },
      error: (err: any) => { this.notify(err.error?.message || 'Error'); this.settingsLoading.set(false); }
    });
  }

  changePassword() {
    if (!this.currentPassword || !this.newPassword) { this.notify('Fill all password fields'); return; }
    if (this.newPassword.length < 6) { this.notify('Min 6 characters'); return; }
    if (this.newPassword !== this.confirmPassword) { this.notify('Passwords do not match'); return; }
    this.settingsLoading.set(true);
    this.api.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: (res: any) => {
        const d = res.data;
        this.auth.setAuth({ token: d.token, username: d.username, companyId: d.companyId, companyName: d.companyName, mustChangePassword: false });
        this.currentPassword = ''; this.newPassword = ''; this.confirmPassword = '';
        this.notify('Password updated!', 'success');
        this.settingsLoading.set(false);
      },
      error: (err: any) => { this.notify(err.error?.message || 'Error'); this.settingsLoading.set(false); }
    });
  }
}
