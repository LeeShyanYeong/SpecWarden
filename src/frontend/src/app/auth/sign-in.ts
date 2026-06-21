import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Sign-in screen. On success the user lands on their account; any failure shows
 * one generic message — unknown-user and wrong-password are indistinguishable
 * (no user enumeration). The actual call lives in AuthService.
 */
@Component({
  selector: 'app-sign-in',
  imports: [FormsModule, RouterLink],
  template: `
    <section data-testid="sign-in-screen">
      <h1>Sign in</h1>
      <form (ngSubmit)="submit()">
        <input data-testid="username" name="username" [(ngModel)]="usernameInput" placeholder="Username" autocomplete="username" />
        <input data-testid="password" name="password" type="password" [(ngModel)]="passwordInput" placeholder="Password" autocomplete="current-password" />
        <button data-testid="sign-in-submit" type="submit">Sign in</button>
      </form>
      @if (error()) {
        <p data-testid="auth-error">{{ error() }}</p>
      }
      <a routerLink="/signup">Create an account</a>
    </section>
  `,
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected usernameInput = '';
  protected passwordInput = '';
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    this.error.set('');
    try {
      await this.auth.login(this.usernameInput, this.passwordInput);
      await this.router.navigate(['/account']);
    } catch {
      this.error.set('invalid username or password');
    }
  }
}
