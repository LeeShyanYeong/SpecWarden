import { Routes } from '@angular/router';
import { Board } from './board';
import { SignIn } from './auth/sign-in';
import { SignUp } from './auth/sign-up';
import { Account } from './auth/account';
import { authGuard } from './auth/auth.guard';
import { guestGuard } from './auth/guest.guard';
import { boardCanDeactivateGuard } from './board-deactivate.guard';

export const routes: Routes = [
  { path: '', component: Board, canActivate: [authGuard], canDeactivate: [boardCanDeactivateGuard] },
  { path: 'signin', component: SignIn, canActivate: [guestGuard] },
  { path: 'signup', component: SignUp, canActivate: [guestGuard] },
  { path: 'account', component: Account, canActivate: [authGuard] },
];
