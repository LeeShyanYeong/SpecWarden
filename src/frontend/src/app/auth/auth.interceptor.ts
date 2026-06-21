import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Attaches the bearer session to API calls and turns a 401 into a redirect to
 * sign-in (the session expired or was rejected) — unsaved work is simply dropped,
 * matching the explicit-save rule. Auth endpoints are exempt: they carry no
 * session and surface their own failures on the sign-in / sign-up screens.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthApi = req.url.includes('/api/auth/');
  const token = auth.token();
  const authed = token && !isAuthApi
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err) => {
      if (err.status === 401 && !isAuthApi) {
        auth.clearSession();
        void router.navigate(['/signin']);
      }
      return throwError(() => err);
    }),
  );
};
