import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Transaction } from '../models/finance.models';

export interface TransactionFilters {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _loading = signal<boolean>(false);

  readonly transactions = this._transactions.asReadonly();
  readonly loading = this._loading.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  fetchAll(filters: TransactionFilters = {}) {
    this._loading.set(true);
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.accountId) params = params.set('accountId', filters.accountId);
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);

    return this.http.get<ApiResponse<Transaction[]>>(this.baseUrl, { params }).pipe(
      tap((res) => {
        this._transactions.set(res.data);
        this._loading.set(false);
      }),
    );
  }

  create(payload: Partial<Transaction>) {
    return this.http
      .post<ApiResponse<Transaction>>(this.baseUrl, payload)
      .pipe(tap((res) => this._transactions.update((list) => [res.data, ...list])));
  }

  update(id: string, payload: Partial<Transaction>) {
    return this.http
      .put<ApiResponse<Transaction>>(`${this.baseUrl}/${id}`, payload)
      .pipe(tap((res) => this._transactions.update((list) => list.map((t) => (t.id === id ? res.data : t)))));
  }

  delete(id: string) {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this._transactions.update((list) => list.filter((t) => t.id !== id))));
  }
}
