import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardService } from '../../core/services/card.service';
import { AccountService } from '../../core/services/account.service';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';

interface InstallmentRow {
  id: string;
  description: string;
  installmentAmount: number;
  remainingInstallments: number;
  totalRemaining: number;
}

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tarjetas de Crédito</h1>
        <button (click)="showCardForm.set(!showCardForm())"
          class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          {{ showCardForm() ? 'Cancelar' : '+ Nueva tarjeta' }}
        </button>
      </div>
      <p class="text-xs text-gray-400 mb-6">
        El <strong>día de corte</strong> es cuando se cierra tu ciclo de facturación (después de esa fecha las compras pasan al siguiente extracto).
        El <strong>día límite de pago</strong> es la fecha antes de la cual debes pagar sin generar intereses.
      </p>

      @if (showCardForm()) {
        <form [formGroup]="cardForm" (ngSubmit)="submitCard()"
          class="mb-6 grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre de la tarjeta</label>
            <input formControlName="name" placeholder="Ej: Visa Bancolombia" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Límite de crédito (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="text" inputmode="numeric" appCurrencyInput formControlName="creditLimit" placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Día de corte (1-31)</label>
            <input formControlName="closingDay" type="number" min="1" max="31" placeholder="Ej: 15" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Día límite de pago (1-31)</label>
            <input formControlName="dueDay" type="number" min="1" max="31" placeholder="Ej: 25" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white p-2.5">Guardar tarjeta</button>
          </div>
        </form>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (card of cards(); track card.id) {
          <div class="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p class="font-medium text-gray-900 dark:text-white">{{ card.name }}</p>
            <p class="text-xs text-gray-400 mt-1">Corte: día {{ card.closingDay }} · Pago: día {{ card.dueDay }}</p>
            <p class="text-lg font-bold text-red-600 dark:text-red-400 mt-2">{{ card.currentBalance | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            <p class="text-xs text-gray-400">Límite: {{ card.creditLimit | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

            <div class="flex gap-3 mt-3 flex-wrap">
              <button (click)="selectedCardId.set(card.id); showPurchaseForm.set(true); showPayForm.set(false)"
                class="text-xs text-indigo-600 hover:underline">+ Registrar compra</button>
              <button (click)="selectedCardId.set(card.id); showPayForm.set(true); showPurchaseForm.set(false)"
                class="text-xs text-green-600 hover:underline">Pagar tarjeta</button>
              <button (click)="toggleProjection(card.id)"
                class="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                {{ expandedCardId() === card.id ? 'Ocultar cuotas' : 'Ver cuotas' }}
              </button>
              <button (click)="removeCard(card.id)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </div>

            <!-- Detalle de compras a cuotas -->
            @if (expandedCardId() === card.id) {
              <div class="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                @if (loadingProjection()) {
                  <p class="text-xs text-gray-400">Cargando...</p>
                } @else if (projectionRows().length === 0) {
                  <p class="text-xs text-gray-400">Esta tarjeta no tiene compras registradas.</p>
                } @else {
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="text-gray-400 text-left">
                        <th class="font-medium pb-1">Compra</th>
                        <th class="font-medium pb-1">Cuota</th>
                        <th class="font-medium pb-1 text-right">Restantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of projectionRows(); track row.id) {
                        <tr class="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                          <td class="py-1.5">{{ row.description || 'Sin descripción' }}</td>
                          <td class="py-1.5">{{ row.installmentAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                          <td class="py-1.5 text-right">{{ row.remainingInstallments }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <p class="text-xs font-medium text-gray-600 dark:text-gray-300 mt-2">
                    Compromiso mensual total: {{ totalMonthlyCommitment() | currency:'COP':'symbol-narrow':'1.0-0' }}
                  </p>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="text-sm text-gray-400 col-span-full text-center py-6">No tienes tarjetas registradas.</p>
        }
      </div>

      @if (showPurchaseForm()) {
        <form [formGroup]="purchaseForm" (ngSubmit)="submitPurchase()"
          class="mt-6 grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción de la compra</label>
            <input formControlName="description" placeholder="Ej: Laptop, vuelo, etc." class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto total (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="text" inputmode="numeric" appCurrencyInput formControlName="amount" placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Número de cuotas</label>
            <input formControlName="installmentsTotal" type="number" min="1" placeholder="Ej: 12 (o 1 si es de contado)" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de la compra</label>
            <input formControlName="date" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white p-2.5">Registrar compra</button>
          </div>
        </form>
      }

      @if (showPayForm()) {
        <form [formGroup]="payForm" (ngSubmit)="submitPay()"
          class="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cuenta desde la que pagas</label>
            <select formControlName="accountId" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
              <option value="" disabled>Selecciona una cuenta</option>
              @for (acc of accounts(); track acc.id) {
                <option [value]="acc.id">{{ acc.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto a pagar (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="text" inputmode="numeric" appCurrencyInput formControlName="amount" placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de pago</label>
            <input formControlName="date" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-green-600 text-sm font-semibold text-white p-2.5">Confirmar pago</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class CardsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cardService = inject(CardService);
  private accountService = inject(AccountService);

  readonly cards = this.cardService.cards;
  readonly accounts = this.accountService.accounts;

  readonly showCardForm = signal(false);
  readonly showPurchaseForm = signal(false);
  readonly showPayForm = signal(false);
  readonly selectedCardId = signal<string | null>(null);

  readonly expandedCardId = signal<string | null>(null);
  readonly loadingProjection = signal(false);
  readonly projectionRows = signal<InstallmentRow[]>([]);
  readonly totalMonthlyCommitment = signal(0);

  cardForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    creditLimit: [0, Validators.required],
    closingDay: [1, Validators.required],
    dueDay: [10, Validators.required],
  });

  purchaseForm = this.fb.nonNullable.group({
    description: [''],
    amount: [0, Validators.required],
    installmentsTotal: [1, Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
  });

  payForm = this.fb.nonNullable.group({
    accountId: ['', Validators.required],
    amount: [0, Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
  });

  ngOnInit(): void {
    this.cardService.fetchAll().subscribe();
    this.accountService.fetchAll().subscribe();
  }

  submitCard(): void {
    if (this.cardForm.invalid) return;
    const raw = this.cardForm.getRawValue();
    this.cardService.create({ ...raw, creditLimit: String(raw.creditLimit) }).subscribe(() => {
      this.showCardForm.set(false);
      this.cardForm.reset({ name: '', creditLimit: 0, closingDay: 1, dueDay: 10 });
    });
  }

  removeCard(cardId: string): void {
    if (!confirm('¿Eliminar esta tarjeta y todo su historial de compras? Esta acción no se puede deshacer.')) return;
    this.cardService.delete(cardId).subscribe();
  }

  submitPurchase(): void {
    const cardId = this.selectedCardId();
    if (!cardId || this.purchaseForm.invalid) return;
    this.cardService.addPurchase(cardId, this.purchaseForm.getRawValue()).subscribe(() => {
      this.cardService.fetchAll().subscribe();
      this.showPurchaseForm.set(false);
      if (this.expandedCardId() === cardId) this.loadProjection(cardId);
    });
  }

  submitPay(): void {
    const cardId = this.selectedCardId();
    if (!cardId || this.payForm.invalid) return;
    this.cardService.pay(cardId, this.payForm.getRawValue()).subscribe(() => {
      this.showPayForm.set(false);
    });
  }

  toggleProjection(cardId: string): void {
    if (this.expandedCardId() === cardId) {
      this.expandedCardId.set(null);
      return;
    }
    this.expandedCardId.set(cardId);
    this.loadProjection(cardId);
  }

  private loadProjection(cardId: string): void {
    this.loadingProjection.set(true);
    this.cardService.getProjection(cardId).subscribe({
      next: (res) => {
        this.projectionRows.set(res.data.projection);
        this.totalMonthlyCommitment.set(res.data.totalMonthlyCommitment);
        this.loadingProjection.set(false);
      },
      error: () => this.loadingProjection.set(false),
    });
  }
}
