import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Client-side mirror of the server's minimum; the server remains authoritative. */
export const MIN_PASSWORD_LENGTH = 8;

interface AuthResponse {
  token: string;
  username: string;
}

/**
 * Talks to the auth REST contract and holds the session token. The token is the
 * bearer credential the server issues on register/login; it is kept in
 * localStorage so a reload stays signed in until it expires or is signed out.
 * Components delegate all auth work here (ARCH-4: logic in services).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly TokenKey = 'auth_token';

  private readonly http = inject(HttpClient);
  private readonly base = '/api/auth';

  /** The signed-in username for the current SPA session (null until known). */
  readonly username = signal<string | null>(null);

  isAuthenticated(): boolean {
    return !!this.token();
  }

  token(): string | null {
    return localStorage.getItem(AuthService.TokenKey);
  }

  async register(username: string, password: string): Promise<void> {
    this.store(await this.post('register', username, password));
  }

  async login(username: string, password: string): Promise<void> {
    this.store(await this.post('login', username, password));
  }

  async logout(): Promise<void> {
    const token = this.token();
    try {
      await firstValueFrom(
        this.http.post(`${this.base}/logout`, {}, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      );
    } finally {
      this.clearSession();
    }
  }

  /** Drops the local session (no server call) — used by logout and on a 401. */
  clearSession(): void {
    localStorage.removeItem(AuthService.TokenKey);
    this.username.set(null);
  }

  private post(path: string, username: string, password: string): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.base}/${path}`, { username, password }));
  }

  private store(res: AuthResponse): void {
    localStorage.setItem(AuthService.TokenKey, res.token);
    this.username.set(res.username);
  }
}
