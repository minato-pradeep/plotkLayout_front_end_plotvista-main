import { Injectable, signal, computed } from '@angular/core';

export interface AuthUser {
  token: string;
  username: string;
  companyId: string;
  companyName: string;
  mustChangePassword: boolean;
  layoutType?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'pv_token';
  private readonly USER_KEY = 'pv_user';

  private _user = signal<AuthUser | null>(this.loadUser());

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly mustChangePassword = computed(() => this._user()?.mustChangePassword ?? false);

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  setAuth(user: AuthUser) {
    localStorage.setItem(this.TOKEN_KEY, user.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  updateUser(partial: Partial<AuthUser>) {
    const current = this._user();
    if (!current) return;
    const updated = { ...current, ...partial };
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
    this._user.set(updated);
  }

  getToken(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
  getCompanyId(): string { return this._user()?.companyId ?? ''; }
  getCompanyName(): string { return this._user()?.companyName ?? ''; }
  getLayoutType(): string { return this._user()?.layoutType?.toUpperCase() ?? ''; }
  isPgCompany(): boolean { return this.getLayoutType() === 'PG' || this.getLayoutType() === 'PG_ONLY' || this.getLayoutType() === 'PG_ALL'; }
  isPgOnly(): boolean { return this.getLayoutType() === 'PG_ONLY'; }

  /** Returns true if the stored JWT is expired or missing */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // exp is in seconds; Date.now() is in milliseconds
      return payload.exp ? payload.exp * 1000 < Date.now() : false;
    } catch {
      return false; // If token is not a standard JWT, assume valid
    }
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
  }
}
