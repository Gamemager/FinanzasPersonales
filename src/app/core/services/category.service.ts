import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Category, CategoryType } from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly _categories = signal<Category[]>([]);
  readonly categories = this._categories.asReadonly();

  private readonly baseUrl = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  fetchAll() {
    return this.http
      .get<ApiResponse<Category[]>>(this.baseUrl)
      .pipe(tap((res) => this._categories.set(res.data)));
  }

  create(name: string, type: CategoryType, icon = 'tag') {
    return this.http
      .post<ApiResponse<Category>>(this.baseUrl, { name, type, icon })
      .pipe(tap((res) => this._categories.update((list) => [...list, res.data])));
  }
}
