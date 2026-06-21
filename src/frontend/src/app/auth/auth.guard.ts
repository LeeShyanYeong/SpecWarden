import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Protects a route: lets a signed-in user through, otherwise sends them to the
 * sign-in screen. The board route is deliberately NOT guarded in this slice —
 * gating the board belongs to the private-user-boards feature.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/signin']);
};
