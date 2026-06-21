import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from './auth.service';

describe('guestGuard', () => {
  const setup = (authenticated: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated } },
      ],
    });
  };

  it('redirects an authenticated user to the board at /', () => {
    setup(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(null!, null!));
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('allows an unauthenticated user through', () => {
    setup(false);
    const result = TestBed.runInInjectionContext(() => guestGuard(null!, null!));
    expect(result).toBe(true);
  });
});
