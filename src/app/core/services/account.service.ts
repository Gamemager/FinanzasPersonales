import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account, ApiResponse } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly _accounts = signal<Account[]>([]);
  readonly accounts = this._accounts.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) {}

  fetchAll() {
    return this.http
      .get<ApiResponse<Account[]>>(this.baseUrl)
      .pipe(tap((res) => this._accounts.set(res.data)));
  }

  create(payload: Partial<Account>) {
    return this.http
      .post<ApiResponse<Account>>(this.baseUrl, payload)
      .pipe(tap((res) => this._accounts.update((list) => [...list, res.data])));
  }

  update(id: string, payload: Partial<Account>) {
    return this.http.put<ApiResponse<Account>>(`${this.baseUrl}/${id}`, payload).pipe(
      tap((res) =>
        this._accounts.update((list) => list.map((a) => (a.id === id ? res.data : a))),
      ),
    );
  }

  delete(id: string) {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this._accounts.update((list) => list.filter((a) => a.id !== id))));
  }
}
