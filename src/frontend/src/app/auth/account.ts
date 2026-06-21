import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * The signed-in landing page (route-guarded). Confirms who is signed in and hosts
 * the Sign out control. In this slice it is the app's "protected page"; gating the
 * board itself arrives with the private-user-boards feature.
 */
@Component({
  selector: 'app-account',
  template: `
    <section data-testid="account-screen">
      <h1>Your account</h1>
      <p data-testid="account-username">Signed in as {{ auth.username() ?? 'you' }}</p>
      <button data-testid="sign-out" (click)="signOut()">Sign out</button>
    </section>
  `,
})
export class Account {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/signin']);
  }
}
