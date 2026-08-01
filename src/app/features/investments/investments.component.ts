import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvestmentService } from '../../core/services/investment.service';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Inversiones</h1>
        <button (click)="showForm.set(!showForm())"
          class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          {{ showForm() ? 'Cancelar' : '+ Nueva inversión' }}
        </button>
      </div>
      <p class="text-xs text-gray-400 mb-6">
        Registra cualquier lugar donde tengas dinero invertido: una fiducuenta, CDT, criptomonedas, acciones, etc.
        El sistema calcula automáticamente tu rendimiento comparando lo invertido contra el valor actual.
      </p>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="submit()"
          class="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plataforma o activo</label>
            <input formControlName="platformName" placeholder="Ej: Binance, ETF S&P 500, Fiducuenta..." class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            <p class="text-[10px] text-gray-400 mt-1">Dónde está tu dinero invertido.</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto invertido (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="text" inputmode="numeric" appCurrencyInput formControlName="investedAmount" placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>
            <p class="text-[10px] text-gray-400 mt-1">Cuánto dinero has puesto en total, hasta hoy.</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notas (opcional)</label>
            <input formControlName="notes" placeholder="Ej: Meta a largo plazo" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white p-2.5">Guardar inversión</button>
          </div>
        </form>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (inv of investments(); track inv.id) {
          <div class="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p class="font-medium text-gray-900 dark:text-white">{{ inv.platformName }}</p>
            <p class="text-xs text-gray-400 mt-1">Invertido: {{ inv.investedAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ inv.currentValue | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            <p class="text-[10px] text-gray-400">Valor actual de mercado</p>
            <p class="text-sm font-medium mt-1"
               [class.text-green-600]="(inv.netReturn ?? 0) >= 0"
               [class.text-red-600]="(inv.netReturn ?? 0) < 0">
              {{ inv.netReturn ?? 0 | currency:'COP':'symbol-narrow':'1.0-0' }} ({{ inv.returnPercentage ?? 0 }}%)
            </p>
            <p class="text-[10px] text-gray-400">Ganancia o pérdida (valor actual - invertido)</p>

            <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Aportar más dinero</label>
                <p class="text-[9px] text-gray-400 mb-1">Suma un nuevo aporte al total invertido.</p>
                <div class="flex gap-1">
                  <input #contribInput type="text" inputmode="numeric" placeholder="$ 0" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs p-1.5" />
                  <button (click)="contribute(inv.id, contribInput.value); contribInput.value=''" class="text-xs text-indigo-600 hover:underline whitespace-nowrap">OK</button>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Actualizar valor actual</label>
                <p class="text-[9px] text-gray-400 mb-1">Cuánto vale hoy tu inversión en el mercado.</p>
                <div class="flex gap-1">
                  <input #valueInput type="text" inputmode="numeric" placeholder="$ 0" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs p-1.5" />
                  <button (click)="updateValue(inv.id, valueInput.value); valueInput.value=''" class="text-xs text-gray-600 dark:text-gray-300 hover:underline whitespace-nowrap">OK</button>
                </div>
              </div>
            </div>
            <button (click)="remove(inv.id)" class="text-xs text-red-500 hover:underline mt-2">Eliminar inversión</button>
          </div>
        } @empty {
          <p class="text-sm text-gray-400 col-span-full text-center py-6">No tienes inversiones registradas.</p>
        }
      </div>
    </div>
  `,
})
export class InvestmentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);

  readonly investments = this.investmentService.investments;
  readonly showForm = signal(false);

  form = this.fb.nonNullable.group({
    platformName: ['', Validators.required],
    investedAmount: [0, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.investmentService.fetchAll().subscribe();
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.investmentService.create({ ...raw, investedAmount: String(raw.investedAmount) }).subscribe(() => {
      this.showForm.set(false);
      this.form.reset({ platformName: '', investedAmount: 0, notes: '' });
    });
  }

  contribute(id: string, amount: string): void {
    const n = Number(amount.replace(/[^\d]/g, ''));
    if (!n) return;
    this.investmentService.contribute(id, n).subscribe();
  }

  updateValue(id: string, value: string): void {
    const n = Number(value.replace(/[^\d]/g, ''));
    if (!n) return;
    this.investmentService.updateValue(id, n).subscribe();
  }

  remove(id: string): void {
    if (!confirm('¿Eliminar esta inversión? Esta acción no se puede deshacer.')) return;
    this.investmentService.delete(id).subscribe();
  }
}
