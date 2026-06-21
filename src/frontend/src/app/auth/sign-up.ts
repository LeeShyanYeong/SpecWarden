import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, MIN_PASSWORD_LENGTH } from './auth.service';

/**
 * Sign-up screen. The password minimum is checked client-side so a too-short
 * password is rejected before any request is sent; the server re-checks and
 * stays authoritative. On success the user lands on their account.
 */
@Component({
  selector: 'app-sign-up',
  imports: [FormsModule, RouterLink],
  template: `
    <section data-testid="sign-up-screen">
      <h1>Create your account</h1>
      <form (ngSubmit)="submit()">
        <input data-testid="username" name="username" [(ngModel)]="usernameInput" placeholder="Username" autocomplete="username" />
        <input data-testid="password" name="password" type="password" [(ngModel)]="passwordInput" placeholder="Password" autocomplete="new-password" />
        <button data-testid="sign-up-submit" type="submit">Create account</button>
      </form>
      @if (error()) {
        <p data-testid="auth-error">{{ error() }}</p>
      }
      <a routerLink="/signin">I already have an account</a>
    </section>
  `,
})
export class SignUp {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected usernameInput = '';
  protected passwordInput = '';
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    this.error.set('');
    if (this.passwordInput.length < MIN_PASSWORD_LENGTH) {
      this.error.set(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return; // client-side guard: no registration request is sent
    }
    try {
      await this.auth.register(this.usernameInput, this.passwordInput);
      await this.router.navigate(['/']);
    } catch {
      this.error.set('That username is not available.');
    }
  }
}
