import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, UpcomingPurchase } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class UpcomingPurchaseService {
  private readonly _purchases = signal<UpcomingPurchase[]>([]);
  readonly purchases = this._purchases.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/upcoming-purchases`;

  constructor(private http: HttpClient) {}

  fetchAll() {
    return this.http
      .get<ApiResponse<UpcomingPurchase[]>>(this.baseUrl)
      .pipe(tap((res) => this._purchases.set(res.data)));
  }

  create(payload: Partial<UpcomingPurchase>) {
    return this.http
      .post<ApiResponse<UpcomingPurchase>>(this.baseUrl, payload)
      .pipe(tap(() => this.fetchAll().subscribe()));
  }

  update(id: string, payload: Partial<UpcomingPurchase>) {
    return this.http
      .put<ApiResponse<UpcomingPurchase>>(`${this.baseUrl}/${id}`, payload)
      .pipe(tap(() => this.fetchAll().subscribe()));
  }

  complete(id: string) {
    return this.http
      .post<ApiResponse<UpcomingPurchase | null>>(`${this.baseUrl}/${id}/complete`, {})
      .pipe(tap(() => this.fetchAll().subscribe()));
  }

  delete(id: string) {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this._purchases.update((list) => list.filter((p) => p.id !== id))));
  }
}
