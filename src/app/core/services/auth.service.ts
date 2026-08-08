import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse, User } from '../models/finance.models';

const TOKEN_KEY = 'finanzas_token';
const USER_KEY = 'finanzas_user';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ---- Estado reactivo con Signals ----
  private readonly _user = signal<User | null>(this.loadUserFromStorage());
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  constructor(private http: HttpClient, private router: Router) {}

  register(payload: RegisterPayload) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(tap((res) => this.setSession(res.data)));
  }

  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.setSession(res.data)));
  }

  forgotPassword(email: string) {
    return this.http.post<ApiResponse<null>>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<ApiResponse<null>>(`${environment.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  fetchProfile() {
    return this.http.get<ApiResponse<User>>(`${environment.apiUrl}/auth/me`).pipe(
      tap((res) => {
        this._user.set(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      }),
    );
  }

  updateProfile(payload: { phoneCountryCode: string; phoneNumber: string }) {
    return this.http.put<ApiResponse<User>>(`${environment.apiUrl}/auth/me`, payload).pipe(
      tap((res) => {
        this._user.set(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      }),
    );
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/auth/me/password`, {
      currentPassword,
      newPassword,
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  private setSession(data: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this._token.set(data.token);
    this._user.set(data.user);
  }

  private loadUserFromStorage(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
