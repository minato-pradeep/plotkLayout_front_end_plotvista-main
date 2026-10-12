import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    if (this.auth.mustChangePassword()) { this.router.navigate(['/force-change']); return false; }
    return true;
  }
}

@Injectable({ providedIn: 'root' })
export class ForceChangeGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login']); return false; }
    // If password already changed, don't allow re-entry to force-change
    if (!this.auth.mustChangePassword()) { this.router.navigate(['/dashboard']); return false; }
    return true;
  }
}
