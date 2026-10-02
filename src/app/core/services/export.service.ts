import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type ExportModule = 'all' | 'accounts' | 'transactions' | 'cards' | 'investments' | 'loans' | 'upcoming';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private http = inject(HttpClient);

  export(module: ExportModule = 'all'): void {
    this.http
      .get(`${environment.apiUrl}/export/excel?module=${module}`, { responseType: 'blob' })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = module === 'all' ? 'finanzas-completo.xlsx' : `finanzas-${module}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }
}
