import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountType } from '../../core/models/finance.models';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mis Cuentas</h1>
        <button (click)="showForm.set(!showForm())"
          class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          {{ showForm() ? 'Cancelar' : '+ Nueva cuenta' }}
        </button>
      </div>
      <p class="text-xs text-gray-400 mb-6">
        Una cuenta es cualquier lugar donde guardas dinero: efectivo en tu bolsillo, una cuenta bancaria,
        o una billetera digital como Nu o Nequi. El saldo inicial es cuánto tienes ahí hoy.
      </p>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="submit()"
          class="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre de la cuenta</label>
            <input formControlName="name" placeholder="Ej: Bancolombia, Nu, Efectivo..." class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo de cuenta</label>
            <select formControlName="type" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
              <option value="cash">Efectivo</option>
              <option value="bank">Cuenta bancaria</option>
              <option value="wallet">Billetera digital (Nu, Nequi, etc.)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Saldo inicial (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="text" inputmode="numeric" appCurrencyInput formControlName="balance" placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white p-2.5">Guardar cuenta</button>
          </div>
        </form>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (acc of accounts(); track acc.id) {
          <div class="rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
            <p class="text-xs uppercase text-gray-400">{{ acc.type }}</p>
            <p class="font-medium text-gray-900 dark:text-white mt-1">{{ acc.name }}</p>
            <p class="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{{ acc.balance | currency:acc.currency:'symbol-narrow':'1.0-0' }}</p>

            <div class="flex gap-3 mt-3">
              <button (click)="toggleHistory(acc.id)" class="text-xs text-indigo-600 hover:underline">
                {{ expandedAccountId() === acc.id ? 'Ocultar movimientos' : 'Ver movimientos' }}
              </button>
              <button (click)="remove(acc.id)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </div>

            @if (expandedAccountId() === acc.id) {
              <div class="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">

                <!-- Filtros -->
                <div class="grid grid-cols-3 gap-2 mb-3">
                  <input type="date" [value]="filterFrom()" (change)="onFilterChange('from', $any($event.target).value)"
                    class="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-[11px] p-1.5" />
                  <input type="date" [value]="filterTo()" (change)="onFilterChange('to', $any($event.target).value)"
                    class="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-[11px] p-1.5" />
                  <select [value]="filterCategoryId()" (change)="onFilterChange('categoryId', $any($event.target).value)"
                    class="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-[11px] p-1.5">
                    <option value="">Todas</option>
                    @for (cat of categories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                </div>

                @if (loadingHistory()) {
                  <p class="text-xs text-gray-400">Cargando...</p>
                } @else if (accountTransactions().length === 0) {
                  <p class="text-xs text-gray-400">No hay movimientos en el rango seleccionado.</p>
                } @else {
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    @for (tx of accountTransactions(); track tx.id) {
                      <div class="flex items-center justify-between text-xs">
                        <div class="min-w-0">
                          <p class="text-gray-700 dark:text-gray-200 truncate">{{ tx.description || (tx.category?.name ?? 'Sin descripción') }}</p>
                          <p class="text-gray-400">{{ tx.date }} · {{ tx.category?.name ?? 'Sin categoría' }}</p>
                        </div>
                        <p class="font-medium whitespace-nowrap ml-2"
                           [class.text-green-600]="tx.type === 'income'"
                           [class.text-red-600]="tx.type === 'expense'"
                           [class.text-indigo-600]="tx.type === 'transfer'">
                          {{ tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '' }}{{ tx.amount | currency:'COP':'symbol-narrow':'1.0-0' }}
                        </p>
                      </div>
                    }
                  </div>
                  <p class="text-[10px] text-gray-400 mt-2">{{ accountTransactions().length }} movimientos en el rango seleccionado</p>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="text-sm text-gray-400 col-span-full text-center py-6">No tienes cuentas registradas todavía.</p>
        }
      </div>
    </div>
  `,
})
export class AccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);

  readonly accounts = this.accountService.accounts;
  readonly categories = this.categoryService.categories;
  readonly showForm = signal(false);

  readonly expandedAccountId = signal<string | null>(null);
  readonly loadingHistory = signal(false);
  readonly accountTransactions = signal<any[]>([]);

  readonly filterFrom = signal('');
  readonly filterTo = signal('');
  readonly filterCategoryId = signal('');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['cash' as AccountType, Validators.required],
    balance: [0],
    currency: ['COP'],
  });

  ngOnInit(): void {
    this.accountService.fetchAll().subscribe();
    this.categoryService.fetchAll().subscribe();
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.accountService.create({ ...raw, balance: String(raw.balance) }).subscribe(() => {
      this.showForm.set(false);
      this.form.reset({ name: '', type: 'cash', balance: 0, currency: 'COP' });
    });
  }

  remove(id: string): void {
    if (!confirm('¿Eliminar esta cuenta? Esta acción no se puede deshacer.')) return;
    this.accountService.delete(id).subscribe();
  }

  toggleHistory(accountId: string): void {
    if (this.expandedAccountId() === accountId) {
      this.expandedAccountId.set(null);
      return;
    }
    this.expandedAccountId.set(accountId);
    this.filterFrom.set('');
    this.filterTo.set('');
    this.filterCategoryId.set('');
    this.loadHistory(accountId);
  }

  onFilterChange(field: 'from' | 'to' | 'categoryId', value: string): void {
    if (field === 'from') this.filterFrom.set(value);
    if (field === 'to') this.filterTo.set(value);
    if (field === 'categoryId') this.filterCategoryId.set(value);

    const accountId = this.expandedAccountId();
    if (accountId) this.loadHistory(accountId);
  }

  private loadHistory(accountId: string): void {
    this.loadingHistory.set(true);
    const filters: any = { accountId };
    if (this.filterFrom()) filters.from = this.filterFrom();
    if (this.filterTo()) filters.to = this.filterTo();
    if (this.filterCategoryId()) filters.categoryId = this.filterCategoryId();

    this.transactionService.fetchAll(filters).subscribe({
      next: (res: any) => {
        this.accountTransactions.set(res.data ?? this.transactionService.transactions());
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false),
    });
  }
}
