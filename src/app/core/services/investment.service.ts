import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Investment } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private readonly _investments = signal<Investment[]>([]);
  readonly investments = this._investments.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/investments`;

  constructor(private http: HttpClient) {}

  fetchAll() {
    return this.http
      .get<ApiResponse<Investment[]>>(this.baseUrl)
      .pipe(tap((res) => this._investments.set(res.data)));
  }

  create(payload: Partial<Investment>) {
    return this.http
      .post<ApiResponse<Investment>>(this.baseUrl, payload)
      .pipe(tap((res) => this._investments.update((list) => [...list, res.data])));
  }

  delete(id: string) {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this._investments.update((list) => list.filter((i) => i.id !== id))));
  }

  contribute(id: string, amount: number) {
    return this.http
      .post<ApiResponse<Investment>>(`${this.baseUrl}/${id}/contribute`, { amount })
      .pipe(tap((res) => this.replace(id, res.data)));
  }

  updateValue(id: string, currentValue: number) {
    return this.http
      .put<ApiResponse<Investment>>(`${this.baseUrl}/${id}/value`, { currentValue })
      .pipe(tap((res) => this.replace(id, res.data)));
  }

  withdraw(id: string, amount: number) {
    return this.http
      .post<ApiResponse<Investment>>(`${this.baseUrl}/${id}/withdraw`, { amount })
      .pipe(tap((res) => this.replace(id, res.data)));
  }

  private replace(id: string, updated: Investment): void {
    this._investments.update((list) => list.map((i) => (i.id === id ? updated : i)));
  }
}
