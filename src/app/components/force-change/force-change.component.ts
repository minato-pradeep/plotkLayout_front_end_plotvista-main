import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-force-change',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center"
         style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);">

      <div class="w-full max-w-md mx-4">
        <div class="rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]"
             style="background: rgba(15,23,42,0.95); border: 1px solid rgba(245,158,11,0.3); backdrop-filter: blur(20px);">

          <div class="px-8 pt-10 pb-6 text-center border-b" style="border-color: rgba(245,158,11,0.15);">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                 style="background: linear-gradient(135deg, #92400e, #f59e0b);">
              <span class="text-3xl">🔑</span>
            </div>
            <h1 class="text-xl font-black tracking-widest uppercase" style="color: #f0f9ff;">Setup Your Account</h1>
            <p class="text-[11px] mt-2" style="color: #94a3b8;">You must set a new username and password before continuing.</p>
          </div>

          <div class="px-8 py-8 space-y-5">

            @if (message()) {
              <div class="px-4 py-3 rounded-xl text-[11px] font-bold"
                   [style.background]="messageType()==='error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'"
                   [style.border]="messageType()==='error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)'"
                   [style.color]="messageType()==='error' ? '#fca5a5' : '#6ee7b7'">
                {{ message() }}
              </div>
            }

            <!-- Step 1: Username -->
            @if (step() === 1) {
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest mb-4" style="color: #f59e0b;">Step 1 of 2 — Change Username</p>
                <div class="space-y-2">
                  <label class="text-[9px] font-black uppercase tracking-[0.3em]" style="color: #f59e0b;">New Username</label>
                  <div class="flex items-center gap-3 px-4 py-3 rounded-xl"
                       style="background: rgba(30,41,59,0.8); border: 1px solid rgba(245,158,11,0.3);">
                    <span>👤</span>
                    <input type="text" [(ngModel)]="newUsername" placeholder="Choose a username"
                           class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-600"
                           style="color: #f0f9ff;" />
                  </div>
                </div>
                <button (click)="submitUsername()" [disabled]="loading()"
                        class="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest mt-6"
                        style="background: linear-gradient(135deg, #92400e, #f59e0b); color: #fff; border: none;"
                        [style.opacity]="loading() ? '0.7' : '1'">
                  {{ loading() ? 'Saving...' : 'Continue →' }}
                </button>
              </div>
            }

            <!-- Step 2: Password -->
            @if (step() === 2) {
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest mb-4" style="color: #f59e0b;">Step 2 of 2 — Change Password</p>
                <div class="space-y-4">
                  <div class="space-y-2">
                    <label class="text-[9px] font-black uppercase tracking-[0.3em]" style="color: #f59e0b;">Current Password</label>
                    <div class="flex items-center gap-3 px-4 py-3 rounded-xl"
                         style="background: rgba(30,41,59,0.8); border: 1px solid rgba(245,158,11,0.3);">
                      <input type="password" [(ngModel)]="currentPassword" placeholder="Current password"
                             class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-600"
                             style="color: #f0f9ff;" />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <label class="text-[9px] font-black uppercase tracking-[0.3em]" style="color: #f59e0b;">New Password</label>
                    <div class="flex items-center gap-3 px-4 py-3 rounded-xl"
                         style="background: rgba(30,41,59,0.8); border: 1px solid rgba(245,158,11,0.3);">
                      <input type="password" [(ngModel)]="newPassword" placeholder="New password (min 6 chars)"
                             class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-600"
                             style="color: #f0f9ff;" />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <label class="text-[9px] font-black uppercase tracking-[0.3em]" style="color: #f59e0b;">Confirm Password</label>
                    <div class="flex items-center gap-3 px-4 py-3 rounded-xl"
                         style="background: rgba(30,41,59,0.8); border: 1px solid rgba(245,158,11,0.3);">
                      <input type="password" [(ngModel)]="confirmPassword" placeholder="Confirm new password"
                             class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-600"
                             style="color: #f0f9ff;" />
                    </div>
                  </div>
                </div>
                <button (click)="submitPassword()" [disabled]="loading()"
                        class="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest mt-6"
                        style="background: linear-gradient(135deg, #92400e, #f59e0b); color: #fff; border: none;"
                        [style.opacity]="loading() ? '0.7' : '1'">
                  {{ loading() ? 'Saving...' : '✓ Complete Setup' }}
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForceChangeComponent {
  step = signal<1 | 2>(1);
  newUsername = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  message = signal('');
  messageType = signal<'error' | 'success'>('error');

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  private notify(msg: string, type: 'error' | 'success' = 'error') {
    this.message.set(msg); this.messageType.set(type);
  }

  submitUsername() {
    if (!this.newUsername.trim()) { this.notify('Enter a username'); return; }
    this.loading.set(true);
    this.api.changeUsername({ newUsername: this.newUsername.trim() }).subscribe({
      next: (res: any) => {
        const d = res.data;
        // Keep mustChangePassword = true until password is also changed
        this.auth.setAuth({
          token: d.token,
          username: d.username,
          companyId: d.companyId,
          companyName: d.companyName,
          mustChangePassword: true  // stays true until password step completes
        });
        this.notify('Username updated! Now set your password.', 'success');
        this.loading.set(false);
        this.step.set(2);
      },
      error: (err: any) => { this.notify(err.error?.message || 'Error'); this.loading.set(false); }
    });
  }

  submitPassword() {
    if (!this.currentPassword || !this.newPassword) { this.notify('Fill all fields'); return; }
    if (this.newPassword.length < 6) { this.notify('Password must be at least 6 characters'); return; }
    if (this.newPassword !== this.confirmPassword) { this.notify('Passwords do not match'); return; }
    if (this.newPassword === this.currentPassword) { this.notify('New password must be different from current password'); return; }
    this.loading.set(true);
    this.api.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: (res: any) => {
        const d = res.data;
        // mustChangePassword is now false — stored permanently
        this.auth.setAuth({
          token: d.token,
          username: d.username,
          companyId: d.companyId,
          companyName: d.companyName,
          mustChangePassword: false  // explicitly false — never revert
        });
        this.notify('Setup complete! Redirecting...', 'success');
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/dashboard']), 1000);
      },
      error: (err: any) => { this.notify(err.error?.message || 'Error'); this.loading.set(false); }
    });
  }
}
