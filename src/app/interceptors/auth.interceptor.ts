import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token is invalid or expired — clear session and force re-login
        console.warn(`[AuthInterceptor] 401 received on ${req.url}. Session expired, redirecting to login.`);
        auth.logout();
        router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
      }
      // 403 is NOT handled here — it means the user is authenticated but lacks permission
      // for a specific resource. Let each component handle it with a specific error message
      // instead of logging the user out (which would be disruptive and misleading).
      return throwError(() => error);
    })
  );
};
