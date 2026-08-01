import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Loan } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class LoanService {
  private readonly _loans = signal<Loan[]>([]);
  readonly loans = this._loans.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/loans`;

  constructor(private http: HttpClient) {}

  fetchAll() {
    return this.http
      .get<ApiResponse<Loan[]>>(this.baseUrl)
      .pipe(tap((res) => this._loans.set(res.data)));
  }

  create(payload: Partial<Loan>) {
    return this.http
      .post<ApiResponse<Loan>>(this.baseUrl, payload)
      .pipe(tap((res) => this._loans.update((list) => [res.data, ...list])));
  }

  delete(loanId: string) {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${loanId}`)
      .pipe(tap(() => this._loans.update((list) => list.filter((l) => l.id !== loanId))));
  }

  addPayment(loanId: string, payload: { amountPaid: number; date: string; notes?: string }) {
    return this.http
      .post<ApiResponse<any>>(`${this.baseUrl}/${loanId}/payments`, payload)
      .pipe(tap(() => this.fetchAll().subscribe()));
  }
}
