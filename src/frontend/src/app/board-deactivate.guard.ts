import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Board } from './board';
import { BoardStore } from './board-store';
import { AuthService } from './auth/auth.service';

export const boardCanDeactivateGuard: CanDeactivateFn<Board> = () => {
  const store = inject(BoardStore);
  const auth = inject(AuthService);
  // If the session was already cleared (e.g. by a 401 interceptor) let navigation
  // proceed without prompting — the user has already lost their session.
  if (!auth.isAuthenticated() || !store.isDirty()) return true;
  return window.confirm('You have unsaved changes. Leave anyway?');
};
