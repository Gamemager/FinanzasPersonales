import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvestmentService } from '../../core/services/investment.service';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';
import { Investment } from '../../core/models/finance.models';

type ActionType = 'contribute' | 'update' | 'withdraw';

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
      </p>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="submit()"
          class="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plataforma o activo</label>
            <input formControlName="platformName" placeholder="Ej: Binance, ETF S&P 500..." class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto invertido (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="text" inputmode="numeric" appCurrencyInput formControlName="investedAmount" placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>
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
          @let isPositive = (inv.netReturn ?? 0) >= 0;
          <div class="rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-gray-900 dark:text-white">{{ inv.platformName }}</p>
              <button (click)="remove(inv.id)" class="text-gray-300 hover:text-red-500 text-xs" title="Eliminar inversión">✕</button>
            </div>
            <p class="text-xs text-gray-400 mb-1">Valor actual</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ inv.currentValue | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

            <div class="flex items-center gap-2 mt-2 mb-3">
              <span class="text-xs px-2 py-0.5 rounded-full"
                [class.bg-green-100]="isPositive" [class.text-green-700]="isPositive"
                [class.bg-red-100]="!isPositive" [class.text-red-700]="!isPositive">
                {{ isPositive ? '+' : '' }}{{ inv.returnPercentage ?? 0 }}%
              </span>
              <span class="text-xs text-gray-400">desde que invertiste {{ inv.investedAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
            </div>

            <div class="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-4">
              <div class="h-full rounded-full"
                [class.bg-green-500]="isPositive" [class.bg-red-500]="!isPositive"
                [style.width.%]="progressWidth(inv)"></div>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <button (click)="openModal(inv, 'contribute')" class="flex flex-col items-center gap-1 py-2 text-xs text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <span class="text-base leading-none">＋</span>Aportar
              </button>
              <button (click)="openModal(inv, 'update')" class="flex flex-col items-center gap-1 py-2 text-xs text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <span class="text-base leading-none">↻</span>Actualizar
              </button>
              <button (click)="openModal(inv, 'withdraw')" class="flex flex-col items-center gap-1 py-2 text-xs text-red-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <span class="text-base leading-none">↓</span>Retirar
              </button>
            </div>
          </div>
        } @empty {
          <p class="text-sm text-gray-400 col-span-full text-center py-6">No tienes inversiones registradas.</p>
        }
      </div>

      <!-- Modal de acción (aportar / actualizar / retirar) -->
      @if (actionTarget(); as target) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">{{ modalTitle() }}</h3>
            <p class="text-xs text-gray-400 mb-4">{{ target.platformName }} · valor actual {{ target.currentValue | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ modalFieldLabel() }}</label>
            <div class="relative mb-4">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input #amountInput type="text" inputmode="numeric" appCurrencyInput placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>

            <div class="flex gap-3">
              <button type="button" (click)="actionTarget.set(null)" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200">Cancelar</button>
              <button type="button" (click)="confirmAction(amountInput.value)" class="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white">Confirmar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class InvestmentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);

  readonly investments = this.investmentService.investments;
  readonly showForm = signal(false);

  readonly actionTarget = signal<Investment | null>(null);
  readonly actionType = signal<ActionType>('contribute');

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

  remove(id: string): void {
    if (!confirm('¿Eliminar esta inversión? Esta acción no se puede deshacer.')) return;
    this.investmentService.delete(id).subscribe();
  }

  progressWidth(inv: Investment): number {
    const pct = Math.abs(inv.returnPercentage ?? 0);
    return Math.min(pct, 100);
  }

  openModal(inv: Investment, type: ActionType): void {
    this.actionTarget.set(inv);
    this.actionType.set(type);
  }

  modalTitle(): string {
    const type = this.actionType();
    return type === 'contribute' ? 'Aportar más dinero' : type === 'update' ? 'Actualizar valor actual' : 'Retirar dinero';
  }

  modalFieldLabel(): string {
    const type = this.actionType();
    return type === 'contribute'
      ? 'Monto a aportar'
      : type === 'update'
        ? 'Nuevo valor total de la inversión'
        : 'Monto a retirar';
  }

  confirmAction(rawValue: string): void {
    const target = this.actionTarget();
    const n = Number(rawValue.replace(/[^\d]/g, ''));
    if (!target || !n) return;

    const type = this.actionType();
    const obs =
      type === 'contribute'
        ? this.investmentService.contribute(target.id, n)
        : type === 'update'
          ? this.investmentService.updateValue(target.id, n)
          : this.investmentService.withdraw(target.id, n);

    obs.subscribe(() => this.actionTarget.set(null));
  }
}
