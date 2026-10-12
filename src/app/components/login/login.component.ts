import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lp-root">

      <!-- Overlaid text on image (top-left) -->
      <div class="lp-overlay-text">
        <img src="assets/gennext.png" alt="GenNext" class="lp-logo" />
        <h1 class="lp-hero-h1">Smart Community<br/>Management</h1>
        <p class="lp-hero-p">Manage. Monitor. Maximize.</p>
      </div>

      <!-- Feature strip (bottom-left) -->
      <div class="lp-feats">
        <div class="lp-feat">
          <span class="lp-feat-dot green"></span>
          <div>
            <div class="lp-feat-title">Real-time Layout</div>
            <div class="lp-feat-sub">View and manage<br/>plots in real-time</div>
          </div>
        </div>
        <div class="lp-feat">
          <span class="lp-feat-dot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </span>
          <div>
            <div class="lp-feat-title">Smart Analytics</div>
            <div class="lp-feat-sub">Make data-driven<br/>decisions</div>
          </div>
        </div>
        <div class="lp-feat">
          <span class="lp-feat-dot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div>
            <div class="lp-feat-title">Secure &amp; Reliable</div>
            <div class="lp-feat-sub">Enterprise-grade security<br/>for your data</div>
          </div>
        </div>
      </div>

      <!-- Login card (right side, floating over image) -->
      <div class="lp-card">

        <div class="lp-card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>

        <h2 class="lp-card-h2">Welcome <span>Back!</span></h2>
        <p class="lp-card-sub">Sign in to continue to PlotVista</p>

        @if (error()) {
          <div class="lp-error">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ error() }}
          </div>
        }

        <div class="lp-field">
          <label class="lp-lbl">Username</label>
          <div class="lp-inp-wrap" [class.active]="focusUser">
            <svg class="lp-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <input class="lp-inp" type="text" [(ngModel)]="username" placeholder="••••••"
                   (focus)="focusUser=true" (blur)="focusUser=false"
                   (keydown.enter)="login()" />
          </div>
        </div>

        <div class="lp-field">
          <label class="lp-lbl">Password</label>
          <div class="lp-inp-wrap" [class.active]="focusPass">
            <svg class="lp-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <input class="lp-inp" [type]="showPass?'text':'password'" [(ngModel)]="password" placeholder="••••••••"
                   (focus)="focusPass=true" (blur)="focusPass=false"
                   (keydown.enter)="login()" />
            <button type="button" class="lp-eye" (click)="showPass=!showPass">
              @if (showPass) {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              } @else {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              }
            </button>
          </div>
        </div>

        <div class="lp-row">
          <label class="lp-remember">
            <input type="checkbox" class="lp-chk" /> Remember me
          </label>
          @if (!showForgot()) {
            <button type="button" class="lp-forgot-btn" (click)="showForgot.set(true)">Forgot Password?</button>
          }
        </div>

        @if (showForgot()) {
          <div class="lp-forgot-box">
            <p>Contact your administrator to reset your password.</p>
            <button type="button" (click)="showForgot.set(false)">← Back to Sign In</button>
          </div>
        }

        <button class="lp-signin-btn" (click)="login()" [disabled]="loading()">
          @if (!loading()) {
            Sign In &nbsp;→
          } @else {
            <span class="lp-spinner"></span> Authenticating...
          }
        </button>

        <div class="lp-or"><span>or</span></div>

        <button class="lp-google-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
            <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 000 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.6 2.2-7.6 2.2-6.3 0-11.6-3.5-13.5-8.4l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        <p class="lp-footer">© 2026 GenNext Technologies. All rights reserved.</p>

      </div>

    </div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Full screen background image ── */
    .lp-root {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: relative;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 13px;
      background: url('/assets/plot-icons/login.jpg') center center / cover no-repeat;
    }

    /* ── Top-left: logo + heading + tagline ── */
    .lp-overlay-text {
      position: absolute;
      top: 28px;
      left: 32px;
      z-index: 2;
    }
    .lp-logo {
      height: 36px;
      object-fit: contain;
      display: block;
      margin-bottom: 16px;
    }
    .lp-hero-h1 {
      font-size: 2.4rem;
      font-weight: 900;
      color: #111;
      line-height: 1.1;
      margin-bottom: 8px;
    }
    .lp-hero-p {
      font-size: 0.82rem;
      color: #333;
      font-weight: 500;
    }

    /* ── Bottom-left: feature strip ── */
    .lp-feats {
      position: absolute;
      bottom: 28px;
      left: 32px;
      z-index: 2;
      display: flex;
      gap: 28px;
      flex-wrap: wrap;
    }
    .lp-feat {
      display: flex;
      align-items: flex-start;
      gap: 7px;
    }
    .lp-feat-dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255,255,255,0.85);
      border: 1px solid rgba(255,255,255,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .lp-feat-dot.green { background: #16a34a; border-color: #16a34a; }
    .lp-feat-dot.green::after {
      content: '';
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #fff;
    }
    .lp-feat-title { font-size: 0.72rem; font-weight: 700; color: #111; }
    .lp-feat-sub   { font-size: 0.63rem; color: #333; line-height: 1.4; margin-top: 1px; }

    /* ── Login card — floating right side ── */
    .lp-card {
      position: absolute;
      top: 50%;
      right: 60px;
      transform: translateY(-50%);
      z-index: 2;
      background: #fff;
      border-radius: 16px;
      padding: 24px 22px 18px;
      width: 300px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .lp-card-icon {
      width: 48px; height: 48px;
      background: #16a34a;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
      box-shadow: 0 3px 12px rgba(22,163,74,0.4);
    }
    .lp-card-h2 {
      font-size: 1.2rem; font-weight: 700; color: #1a1a1a;
      margin-bottom: 4px; text-align: center;
    }
    .lp-card-h2 span { color: #16a34a; }
    .lp-card-sub {
      font-size: 0.7rem; color: #6b7280;
      text-align: center; margin-bottom: 16px;
    }

    /* Error */
    .lp-error {
      width: 100%; display: flex; align-items: center; gap: 6px;
      padding: 7px 10px; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 7px;
      color: #dc2626; font-size: 0.68rem; font-weight: 600; margin-bottom: 10px;
    }

    /* Fields */
    .lp-field { width: 100%; margin-bottom: 10px; }
    .lp-lbl { display: block; font-size: 0.68rem; font-weight: 600; color: #374151; margin-bottom: 4px; }
    .lp-inp-wrap {
      position: relative; display: flex; align-items: center;
      border: 1.5px solid #d1d5db; border-radius: 7px; background: #fff;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .lp-inp-wrap.active { border-color: #16a34a; box-shadow: 0 0 0 2px rgba(22,163,74,0.12); }
    .lp-ico { position: absolute; left: 9px; pointer-events: none; }
    .lp-inp {
      width: 100%; padding: 9px 32px 9px 30px;
      border: none; outline: none; background: transparent;
      font-size: 0.75rem; color: #111827; font-family: inherit; border-radius: 7px;
    }
    .lp-inp::placeholder { color: #9ca3af; }
    .lp-eye {
      position: absolute; right: 9px; background: none; border: none;
      cursor: pointer; padding: 0; display: flex; align-items: center; opacity: 0.6;
    }
    .lp-eye:hover { opacity: 1; }

    /* Remember / Forgot */
    .lp-row {
      width: 100%; display: flex; align-items: center;
      justify-content: space-between; margin-bottom: 12px;
    }
    .lp-remember { display: flex; align-items: center; gap: 4px; font-size: 0.66rem; color: #374151; cursor: pointer; }
    .lp-chk { width: 12px; height: 12px; accent-color: #16a34a; cursor: pointer; }
    .lp-forgot-btn {
      background: none; border: none; font-size: 0.66rem; font-weight: 700;
      color: #16a34a; cursor: pointer; font-family: inherit; padding: 0;
    }
    .lp-forgot-btn:hover { color: #15803d; }

    /* Forgot box */
    .lp-forgot-box {
      width: 100%; background: #f0fdf4; border: 1px solid #bbf7d0;
      border-radius: 7px; padding: 9px 11px; margin-bottom: 10px;
      font-size: 0.66rem; color: #374151;
    }
    .lp-forgot-box p { margin-bottom: 5px; }
    .lp-forgot-box button {
      background: none; border: none; cursor: pointer;
      font-size: 0.66rem; color: #16a34a; font-weight: 700; font-family: inherit; padding: 0;
    }

    /* Sign In button */
    .lp-signin-btn {
      width: 100%; padding: 10px; background: #16a34a; color: #fff;
      border: none; border-radius: 7px; font-size: 0.8rem; font-weight: 700;
      font-family: inherit; cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 6px; margin-bottom: 10px;
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    }
    .lp-signin-btn:hover:not(:disabled) {
      background: #15803d; transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(22,163,74,0.4);
    }
    .lp-signin-btn:disabled { opacity: 0.7; cursor: not-allowed; }

    /* Spinner */
    .lp-spinner {
      width: 13px; height: 13px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      animation: lp-spin 0.7s linear infinite; display: inline-block;
    }
    @keyframes lp-spin { to { transform: rotate(360deg); } }

    /* Or divider */
    .lp-or {
      width: 100%; text-align: center; position: relative;
      margin-bottom: 9px; font-size: 0.63rem; color: #9ca3af;
    }
    .lp-or::before, .lp-or::after {
      content: ''; position: absolute; top: 50%;
      width: 38%; height: 1px; background: #e5e7eb;
    }
    .lp-or::before { left: 0; }
    .lp-or::after  { right: 0; }
    .lp-or span { background: #fff; padding: 0 8px; position: relative; z-index: 1; }

    /* Google button */
    .lp-google-btn {
      width: 100%; padding: 9px; background: #fff;
      border: 1.5px solid #d1d5db; border-radius: 7px; font-size: 0.72rem;
      font-weight: 600; color: #374151; font-family: inherit; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      gap: 7px; margin-bottom: 12px; transition: background 0.2s;
    }
    .lp-google-btn:hover { background: #f9fafb; }

    /* Footer */
    .lp-footer { font-size: 0.57rem; color: #9ca3af; text-align: center; }

    /* ── Responsive ── */
    @media (max-width: 700px) {
      .lp-overlay-text { display: none; }
      .lp-feats { display: none; }
      .lp-card { right: 50%; transform: translate(50%, -50%); width: calc(100vw - 32px); }
    }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  showPass = false;
  focusUser = false;
  focusPass = false;
  error = signal('');
  loading = signal(false);
  showForgot = signal(false);

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'session_expired') {
      this.error.set('Your session has expired. Please sign in again.');
    }
  }

  login() {
    if (!this.username || !this.password) {
      this.error.set('Please enter username and password');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.login({ username: this.username, password: this.password }).subscribe({
      next: (res: any) => {
        const d = res.data;
        this.auth.setAuth({
          token: d.token,
          username: d.username,
          companyId: d.companyId,
          companyName: d.companyName,
          mustChangePassword: d.mustChangePassword,
          layoutType: d.layoutType
        });
        this.router.navigate([d.mustChangePassword ? '/force-change' : '/dashboard']);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Invalid credentials. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
