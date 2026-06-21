import { Routes } from '@angular/router';
import { Board } from './board';
import { SignIn } from './auth/sign-in';
import { SignUp } from './auth/sign-up';
import { Account } from './auth/account';
import { authGuard } from './auth/auth.guard';

/**
 * App routes. The board is now behind the login wall (private per user); a
 * signed-out visitor is sent to /signin. The auth screens stay public, and
 * /account remains a guarded signed-in page.
 */
export const routes: Routes = [
  { path: '', component: Board, canActivate: [authGuard] },
  { path: 'signin', component: SignIn },
  { path: 'signup', component: SignUp },
  { path: 'account', component: Account, canActivate: [authGuard] },
];
