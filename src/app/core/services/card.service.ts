import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CreditCard } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly _cards = signal<CreditCard[]>([]);
  readonly cards = this._cards.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/cards`;

  constructor(private http: HttpClient) {}

  fetchAll() {
    return this.http
      .get<ApiResponse<CreditCard[]>>(this.baseUrl)
      .pipe(tap((res) => this._cards.set(res.data)));
  }

  create(payload: Partial<CreditCard>) {
    return this.http
      .post<ApiResponse<CreditCard>>(this.baseUrl, payload)
      .pipe(tap((res) => this._cards.update((list) => [...list, res.data])));
  }

  delete(cardId: string) {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${cardId}`)
      .pipe(tap(() => this._cards.update((list) => list.filter((c) => c.id !== cardId))));
  }

  addPurchase(cardId: string, payload: { amount: number; installmentsTotal: number; description?: string; date: string; categoryId?: string }) {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${cardId}/transactions`, payload);
  }

  getProjection(cardId: string) {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${cardId}/projection`);
  }

  pay(cardId: string, payload: { accountId: string; amount: number; date: string }) {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${cardId}/pay`, payload).pipe(
      tap(() => this.fetchAll().subscribe()),
    );
  }
}
