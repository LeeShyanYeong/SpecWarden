import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('starts unauthenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('stores the token and becomes authenticated after login', async () => {
    const done = service.login('ada', 'correct-horse');
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'ada', password: 'correct-horse' });
    req.flush({ token: 't0ken', username: 'ada' });
    await done;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('t0ken');
    expect(service.username()).toBe('ada');
  });

  it('stores the token after registration', async () => {
    const done = service.register('ada', 'correct-horse');
    http.expectOne('/api/auth/register').flush({ token: 't0ken', username: 'ada' });
    await done;

    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears the token on logout and sends the bearer credential', async () => {
    const login = service.login('ada', 'correct-horse');
    http.expectOne('/api/auth/login').flush({ token: 't0ken', username: 'ada' });
    await login;

    const logout = service.logout();
    const req = http.expectOne('/api/auth/logout');
    expect(req.request.headers.get('Authorization')).toBe('Bearer t0ken');
    req.flush({});
    await logout;

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.username()).toBeNull();
  });

  it('does not authenticate when login fails', async () => {
    const result = service.login('ada', 'wrong').catch((e) => e);
    http.expectOne('/api/auth/login').flush(
      { error: 'invalid username or password' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await result;

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });
});
