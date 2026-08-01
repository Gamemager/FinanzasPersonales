import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  ExpenseByCategory,
  MonthlyIncomeExpense,
  NetWorthResponse,
} from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly _netWorth = signal<NetWorthResponse | null>(null);
  private readonly _expensesByCategory = signal<ExpenseByCategory[]>([]);
  private readonly _monthlyData = signal<MonthlyIncomeExpense[]>([]);

  readonly netWorth = this._netWorth.asReadonly();
  readonly expensesByCategory = this._expensesByCategory.asReadonly();
  readonly monthlyData = this._monthlyData.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  fetchNetWorth() {
    return this.http
      .get<ApiResponse<NetWorthResponse>>(`${this.baseUrl}/net-worth`)
      .pipe(tap((res) => this._netWorth.set(res.data)));
  }

  fetchExpensesByCategory(from?: string, to?: string) {
    let url = `${this.baseUrl}/expenses-by-category`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) url += `?${params.join('&')}`;

    return this.http
      .get<ApiResponse<ExpenseByCategory[]>>(url)
      .pipe(tap((res) => this._expensesByCategory.set(res.data)));
  }

  fetchMonthlyIncomeExpense(granularity: 'day' | 'week' | 'month' = 'month', from?: string, to?: string) {
    let params = new HttpParams().set('granularity', granularity);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http
      .get<ApiResponse<MonthlyIncomeExpense[]>>(`${this.baseUrl}/monthly-income-expense`, { params })
      .pipe(tap((res) => this._monthlyData.set(res.data)));
  }
}
