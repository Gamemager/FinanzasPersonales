import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardService } from '../../core/services/card.service';
import { AccountService } from '../../core/services/account.service';
import { CategoryService } from '../../core/services/category.service';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';

interface InstallmentRow {
  id: string;
  description: string;
  date: string;
  categoryId: string | null;
  amount: number;
  amountPaid: number;
  installmentsTotal: number;
  installmentAmount: number;
  remainingInstallments: number;
  totalRemaining: number;
  beforeCutoff: boolean;
}

interface CardPayment {
  id: string;
  amount: number;
  date: string;
  type: 'installment' | 'full_payment';
  purchaseDescription: string | null;
}

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CurrencyInputDirective],
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
        El <strong>día de corte</strong> es cuando se cierra tu ciclo de facturación. El <strong>día límite de pago</strong>
        es la fecha antes de la cual debes pagar sin generar intereses. La <strong>tasa EA</strong> (efectiva anual) es
        solo informativa.
      </p>

      @if (showCardForm()) {
        <form [formGroup]="cardForm" (ngSubmit)="submitCard()"
          class="mb-6 grid grid-cols-1 sm:grid-cols-6 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
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
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tasa EA % (opcional)</label>
            <input formControlName="interestRateEA" type="number" step="0.01" min="0" placeholder="Ej: 28.5" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white p-2.5">Guardar tarjeta</button>
          </div>
        </form>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (card of cards(); track card.id) {
          <div class="rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
            <p class="font-medium text-gray-900 dark:text-white">{{ card.name }}</p>
            <p class="text-xs text-gray-400 mt-1">
              Corte: día {{ card.closingDay }} · Pago: día {{ card.dueDay }}
              @if (card.interestRateEA) { · Tasa EA: {{ card.interestRateEA }}% }
            </p>
            <p class="text-lg font-bold text-red-600 dark:text-red-400 mt-2">{{ card.currentBalance | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            <p class="text-xs text-gray-400">Límite: {{ card.creditLimit | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

            <div class="flex gap-3 mt-3 flex-wrap">
              <button (click)="selectedCardId.set(card.id); showPurchaseForm.set(true); showPayForm.set(false)"
                class="text-xs text-indigo-600 hover:underline">+ Registrar compra</button>
              <button (click)="openPayForm(card)"
                class="text-xs text-green-600 hover:underline">Pagar tarjeta completa</button>
              <button (click)="toggleProjection(card.id)"
                class="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                {{ expandedCardId() === card.id ? 'Ocultar cuotas' : 'Ver cuotas' }}
              </button>
              <button (click)="toggleHistory(card.id)"
                class="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                {{ historyCardId() === card.id ? 'Ocultar historial' : 'Ver historial de pagos' }}
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
                  <p class="text-[10px] text-gray-400 mb-2">Último corte: {{ lastClosingDate() }}</p>

                  <div class="flex gap-1 mb-3">
                    @for (f of cutoffFilterOptions; track f) {
                      <button
                        (click)="cutoffFilter.set(f)"
                        [class.bg-indigo-600]="cutoffFilter() === f"
                        [class.text-white]="cutoffFilter() === f"
                        [class.bg-gray-100]="cutoffFilter() !== f"
                        [class.text-gray-600]="cutoffFilter() !== f"
                        [class.dark:bg-gray-700]="cutoffFilter() !== f"
                        [class.dark:text-gray-300]="cutoffFilter() !== f"
                        class="rounded-lg px-2 py-1 text-[10px] font-medium"
                      >
                        {{ f === 'all' ? 'Todas' : f === 'before' ? 'Antes del corte' : 'Después del corte' }}
                      </button>
                    }
                  </div>

                  <div class="space-y-2">
                    @for (row of filteredProjectionRows(); track row.id) {
                      <div class="flex items-center justify-between text-xs">
                        <div class="min-w-0">
                          <p class="text-gray-700 dark:text-gray-200 truncate">{{ row.description || 'Sin descripción' }}</p>
                          <p class="text-gray-400">{{ row.date }} · Cuota {{ row.installmentAmount | currency:'COP':'symbol-narrow':'1.0-0' }} · {{ row.remainingInstallments }} restantes · Pendiente {{ row.totalRemaining | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
                        </div>
                        <div class="flex items-center gap-2 ml-2 flex-shrink-0">
                          @if (row.remainingInstallments > 0) {
                            <button (click)="openAbonoModal(card.id, row)" class="text-xs text-indigo-600 hover:underline whitespace-nowrap">Abonar</button>
                          }
                          <button (click)="openEditPurchase(card.id, row)" class="text-gray-300 hover:text-indigo-500" title="Editar">✎</button>
                          <button (click)="removePurchase(card.id, row.id)" class="text-gray-300 hover:text-red-500" title="Eliminar">✕</button>
                        </div>
                      </div>
                    } @empty {
                      <p class="text-xs text-gray-400">No hay compras en este filtro.</p>
                    }
                  </div>

                  <div class="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                    <p class="text-xs font-medium text-gray-900 dark:text-white">
                      A pagar en el próximo corte: {{ totalDueAtCutoff() | currency:'COP':'symbol-narrow':'1.0-0' }}
                    </p>
                    <p class="text-[10px] text-gray-400">
                      Compromiso total (todas las cuotas activas): {{ totalMonthlyCommitment() | currency:'COP':'symbol-narrow':'1.0-0' }}
                    </p>
                  </div>
                }
              </div>
            }

            <!-- Historial de pagos -->
            @if (historyCardId() === card.id) {
              <div class="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                @if (loadingHistory()) {
                  <p class="text-xs text-gray-400">Cargando...</p>
                } @else if (paymentHistory().length === 0) {
                  <p class="text-xs text-gray-400">Todavía no has hecho pagos ni abonos en esta tarjeta.</p>
                } @else {
                  <div class="space-y-2 max-h-64 overflow-y-auto thin-scrollbar pr-1">
                    @for (p of paymentHistory(); track p.id) {
                      <div class="flex items-center justify-between text-xs">
                        <div class="min-w-0">
                          <p class="text-gray-700 dark:text-gray-200 truncate">
                            {{ p.type === 'full_payment' ? 'Pago de tarjeta completo' : ('Abono a: ' + (p.purchaseDescription || 'compra')) }}
                          </p>
                          <p class="text-gray-400">{{ p.date }}</p>
                        </div>
                        <p class="font-medium text-red-600 whitespace-nowrap ml-2">-{{ p.amount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
                      </div>
                    }
                  </div>
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
          class="mt-6 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 space-y-3">
          @if (purchaseError(); as err) {
            <div class="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-3 py-2">{{ err }}</div>
          }
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-3">
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
              <input formControlName="installmentsTotal" type="number" min="1" placeholder="Ej: 12" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoría (opcional)</label>
              <div class="flex gap-2">
                <select formControlName="categoryId" class="flex-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
                  <option value="">Sin categoría</option>
                  @for (cat of expenseCategories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
                <button type="button" (click)="showNewPurchaseCategory.set(!showNewPurchaseCategory())" class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm text-gray-600 dark:text-gray-300">+</button>
              </div>
              @if (showNewPurchaseCategory()) {
                <div class="flex gap-2 mt-2">
                  <input [(ngModel)]="newPurchaseCategoryName" [ngModelOptions]="{standalone: true}" placeholder="Ej: Tecnología"
                    class="flex-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs p-1.5" />
                  <button type="button" (click)="createPurchaseCategory()" class="rounded-lg bg-indigo-600 px-2 text-xs font-medium text-white">Crear</button>
                </div>
              }
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de la compra</label>
              <input formControlName="date" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
          </div>
          <button type="submit" class="rounded-lg bg-indigo-600 text-sm font-semibold text-white px-4 py-2.5">Registrar compra</button>
        </form>
      }

      @if (showPayForm()) {
        <form [formGroup]="payForm" (ngSubmit)="submitPay()"
          class="mt-6 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 space-y-3">

          @if (payMinDue() > 0) {
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Mínimo (según el corte): <strong class="text-gray-700 dark:text-gray-200">{{ payMinDue() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
              · Total que debes: <strong class="text-gray-700 dark:text-gray-200">{{ payMaxOwed() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
            </p>
          }

          @if (payError(); as err) {
            <div class="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-3 py-2">{{ err }}</div>
          }

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cuenta desde la que pagas</label>
              <select formControlName="accountId" (change)="onPayAccountChange($any($event.target).value)"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
                <option value="" disabled>Selecciona una cuenta</option>
                @for (acc of accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }}</option>
                }
              </select>
              @if (payAccountBalance(); as bal) {
                <p class="text-[10px] text-gray-400 mt-1">Saldo disponible: {{ bal | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
              }
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
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoría (opcional)</label>
              <div class="flex gap-2">
                <select formControlName="categoryId" class="flex-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
                  <option value="">Sin categoría</option>
                  @for (cat of expenseCategories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
                <button type="button" (click)="showNewCategoryInput.set(!showNewCategoryInput())" class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm text-gray-600 dark:text-gray-300">+</button>
              </div>
              @if (showNewCategoryInput()) {
                <div class="flex gap-2 mt-2">
                  <input [(ngModel)]="newCategoryName" [ngModelOptions]="{standalone: true}" placeholder="Ej: Tarjetas"
                    class="flex-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs p-1.5" />
                  <button type="button" (click)="createCategory()" class="rounded-lg bg-indigo-600 px-2 text-xs font-medium text-white">Crear</button>
                </div>
              }
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de pago</label>
              <input formControlName="date" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
          </div>
          <button type="submit" class="rounded-lg bg-green-600 text-sm font-semibold text-white px-4 py-2.5">Confirmar pago</button>
        </form>
      }

      <!-- Modal de editar compra -->
      @if (editPurchaseTarget(); as target) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Editar compra</h3>
            @if (target.amountPaid > 0) {
              <p class="text-[10px] text-gray-400 mb-3">Ya se abonaron {{ target.amountPaid | currency:'COP':'symbol-narrow':'1.0-0' }} a esta compra. El monto nuevo no puede ser menor a eso.</p>
            }
            <form [formGroup]="editPurchaseForm" (ngSubmit)="submitEditPurchase()" class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción</label>
                <input formControlName="description" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto total (COP)</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="text" inputmode="numeric" appCurrencyInput formControlName="amount" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Número de cuotas</label>
                <input formControlName="installmentsTotal" type="number" min="1" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de la compra</label>
                <input formControlName="date" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              </div>
              @if (editPurchaseError(); as err) {
                <div class="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-3 py-2">{{ err }}</div>
              }
              <div class="flex gap-3 pt-2">
                <button type="button" (click)="editPurchaseTarget.set(null)" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200">Cancelar</button>
                <button type="submit" class="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal de abono a compra específica -->
      @if (abonoTarget(); as target) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Abonar a: {{ target.description || 'esta compra' }}</h3>
            <p class="text-xs text-gray-400 mb-4">Cuota: {{ target.installmentAmount | currency:'COP':'symbol-narrow':'1.0-0' }} · {{ target.remainingInstallments }} cuotas restantes · Pendiente: {{ target.totalRemaining | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

            <div class="flex gap-1 mb-3">
              <button type="button" (click)="abonoMode.set('installments')"
                [class.bg-indigo-600]="abonoMode() === 'installments'" [class.text-white]="abonoMode() === 'installments'"
                [class.bg-gray-100]="abonoMode() !== 'installments'" [class.dark:bg-gray-700]="abonoMode() !== 'installments'"
                class="flex-1 rounded-lg py-1.5 text-xs font-medium">Por cuotas</button>
              <button type="button" (click)="abonoMode.set('amount')"
                [class.bg-indigo-600]="abonoMode() === 'amount'" [class.text-white]="abonoMode() === 'amount'"
                [class.bg-gray-100]="abonoMode() !== 'amount'" [class.dark:bg-gray-700]="abonoMode() !== 'amount'"
                class="flex-1 rounded-lg py-1.5 text-xs font-medium">Por monto</button>
            </div>

            <form [formGroup]="abonoForm" (ngSubmit)="submitAbono()" class="space-y-3">
              @if (abonoMode() === 'installments') {
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">¿Cuántas cuotas quieres pagar?</label>
                  <input formControlName="installmentsToPay" type="number" [max]="target.remainingInstallments" min="1"
                    class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
                </div>
              } @else {
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto a abonar (COP)</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="text" inputmode="numeric" appCurrencyInput formControlName="amount" placeholder="0"
                      class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
                  </div>
                </div>
              }
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cuenta desde la que pagas</label>
                <select formControlName="accountId" (change)="onAbonoAccountChange($any($event.target).value)" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
                  <option value="" disabled>Selecciona una cuenta</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }}</option>
                  }
                </select>
                @if (abonoAccountBalance(); as bal) {
                  <p class="text-[10px] text-gray-400 mt-1">Saldo disponible: {{ bal | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
                }
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                <input formControlName="date" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              </div>
              @if (abonoError(); as err) {
                <div class="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-3 py-2">{{ err }}</div>
              }
              <div class="flex gap-3 pt-2">
                <button type="button" (click)="abonoTarget.set(null)" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200">Cancelar</button>
                <button type="submit" class="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white">Abonar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class CardsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cardService = inject(CardService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);

  readonly cards = this.cardService.cards;
  readonly accounts = this.accountService.accounts;

  readonly expenseCategories = computed(() => this.categoryService.categories().filter((c) => c.type === 'expense'));

  readonly showCardForm = signal(false);
  readonly showPurchaseForm = signal(false);
  readonly showPayForm = signal(false);
  readonly selectedCardId = signal<string | null>(null);

  readonly expandedCardId = signal<string | null>(null);
  readonly loadingProjection = signal(false);
  readonly projectionRows = signal<InstallmentRow[]>([]);
  readonly totalMonthlyCommitment = signal(0);
  readonly totalDueAtCutoff = signal(0);
  readonly lastClosingDate = signal('');
  readonly cutoffFilter = signal<'all' | 'before' | 'after'>('all');
  readonly cutoffFilterOptions: Array<'all' | 'before' | 'after'> = ['all', 'before', 'after'];

  readonly historyCardId = signal<string | null>(null);
  readonly loadingHistory = signal(false);
  readonly paymentHistory = signal<CardPayment[]>([]);

  readonly filteredProjectionRows = computed(() => {
    const filter = this.cutoffFilter();
    const rows = this.projectionRows();
    if (filter === 'before') return rows.filter((r) => r.beforeCutoff);
    if (filter === 'after') return rows.filter((r) => !r.beforeCutoff);
    return rows;
  });

  readonly abonoTarget = signal<InstallmentRow | null>(null);
  readonly abonoMode = signal<'installments' | 'amount'>('installments');
  readonly abonoAccountBalance = signal<number | null>(null);
  readonly abonoError = signal<string | null>(null);
  private abonoCardId = '';

  readonly editPurchaseTarget = signal<InstallmentRow | null>(null);
  readonly editPurchaseError = signal<string | null>(null);
  private editPurchaseCardId = '';

  // Estado del formulario de "Pagar tarjeta completa"
  readonly payMinDue = signal(0);
  readonly payMaxOwed = signal(0);
  readonly payAccountBalance = signal<number | null>(null);
  readonly payError = signal<string | null>(null);
  readonly showNewCategoryInput = signal(false);
  newCategoryName = '';
  readonly showNewPurchaseCategory = signal(false);
  newPurchaseCategoryName = '';

  cardForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    creditLimit: [0, Validators.required],
    closingDay: [1, Validators.required],
    dueDay: [10, Validators.required],
    interestRateEA: [null as number | null],
  });

  purchaseForm = this.fb.nonNullable.group({
    description: [''],
    amount: [0, Validators.required],
    installmentsTotal: [1, Validators.required],
    categoryId: [''],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
  });

  payForm = this.fb.nonNullable.group({
    accountId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    categoryId: [''],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
  });

  abonoForm = this.fb.nonNullable.group({
    installmentsToPay: [1],
    amount: [0],
    accountId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
  });

  editPurchaseForm = this.fb.nonNullable.group({
    description: [''],
    amount: [0, Validators.required],
    installmentsTotal: [1, Validators.required],
    date: ['', Validators.required],
  });

  ngOnInit(): void {
    this.cardService.fetchAll().subscribe();
    this.accountService.fetchAll().subscribe();
    this.categoryService.fetchAll().subscribe();
  }

  submitCard(): void {
    if (this.cardForm.invalid) return;
    const raw = this.cardForm.getRawValue();
    const payload: any = { ...raw, creditLimit: String(raw.creditLimit) };
    if (!payload.interestRateEA) delete payload.interestRateEA;
    this.cardService.create(payload).subscribe(() => {
      this.showCardForm.set(false);
      this.cardForm.reset({ name: '', creditLimit: 0, closingDay: 1, dueDay: 10, interestRateEA: null });
    });
  }

  removeCard(cardId: string): void {
    if (!confirm('¿Eliminar esta tarjeta y todo su historial de compras? Esta acción no se puede deshacer.')) return;
    this.cardService.delete(cardId).subscribe();
  }

  createPurchaseCategory(): void {
    const name = this.newPurchaseCategoryName.trim();
    if (!name) return;
    this.categoryService.create(name, 'expense').subscribe((res) => {
      this.purchaseForm.patchValue({ categoryId: res.data.id });
      this.newPurchaseCategoryName = '';
      this.showNewPurchaseCategory.set(false);
    });
  }

  readonly purchaseError = signal<string | null>(null);

  submitPurchase(): void {
    const cardId = this.selectedCardId();
    if (!cardId || this.purchaseForm.invalid) return;
    const raw = this.purchaseForm.getRawValue();
    const payload: any = { ...raw };
    if (!payload.categoryId) delete payload.categoryId;
    this.purchaseError.set(null);
    this.cardService.addPurchase(cardId, payload).subscribe({
      next: () => {
        this.cardService.fetchAll().subscribe();
        this.showPurchaseForm.set(false);
        if (this.expandedCardId() === cardId) this.loadProjection(cardId);
      },
      error: (err) => {
        this.purchaseError.set(err?.error?.message ?? 'No se pudo registrar la compra');
      },
    });
  }

  toggleProjection(cardId: string): void {
    if (this.expandedCardId() === cardId) {
      this.expandedCardId.set(null);
      return;
    }
    this.expandedCardId.set(cardId);
    this.cutoffFilter.set('all');
    this.loadProjection(cardId);
  }

  private loadProjection(cardId: string): void {
    this.loadingProjection.set(true);
    this.cardService.getProjection(cardId).subscribe({
      next: (res) => {
        this.projectionRows.set(res.data.projection);
        this.totalMonthlyCommitment.set(res.data.totalMonthlyCommitment);
        this.totalDueAtCutoff.set(res.data.totalDueAtCutoff);
        this.lastClosingDate.set(res.data.lastClosingDate);
        this.loadingProjection.set(false);
      },
      error: () => this.loadingProjection.set(false),
    });
  }

  toggleHistory(cardId: string): void {
    if (this.historyCardId() === cardId) {
      this.historyCardId.set(null);
      return;
    }
    this.historyCardId.set(cardId);
    this.loadingHistory.set(true);
    this.cardService.getPayments(cardId).subscribe({
      next: (res) => {
        this.paymentHistory.set(res.data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false),
    });
  }

  // ---- Editar / eliminar compra ----

  openEditPurchase(cardId: string, row: InstallmentRow): void {
    this.editPurchaseCardId = cardId;
    this.editPurchaseError.set(null);
    this.editPurchaseTarget.set(row);
    this.editPurchaseForm.reset({
      description: row.description,
      amount: row.amount,
      installmentsTotal: row.installmentsTotal,
      date: row.date,
    });
  }

  submitEditPurchase(): void {
    const target = this.editPurchaseTarget();
    if (!target || this.editPurchaseForm.invalid) return;
    const raw = this.editPurchaseForm.getRawValue();
    const payload: any = { ...raw, amount: String(raw.amount) };

    this.cardService.updatePurchase(this.editPurchaseCardId, target.id, payload).subscribe({
      next: () => {
        this.cardService.fetchAll().subscribe();
        this.editPurchaseTarget.set(null);
        this.loadProjection(this.editPurchaseCardId);
      },
      error: (err) => {
        this.editPurchaseError.set(err?.error?.message ?? 'No se pudo editar la compra');
      },
    });
  }

  removePurchase(cardId: string, cardTxId: string): void {
    if (!confirm('¿Eliminar esta compra? Se descontará de tu tarjeta lo que quedaba pendiente de pagar por ella.')) return;
    this.cardService.deletePurchase(cardId, cardTxId).subscribe(() => {
      this.cardService.fetchAll().subscribe();
      this.loadProjection(cardId);
    });
  }

  // ---- Abonar a una compra específica ----

  openAbonoModal(cardId: string, row: InstallmentRow): void {
    this.abonoCardId = cardId;
    this.abonoTarget.set(row);
    this.abonoMode.set('installments');
    this.abonoAccountBalance.set(null);
    this.abonoError.set(null);
    this.abonoForm.reset({ installmentsToPay: 1, amount: 0, accountId: '', date: new Date().toISOString().substring(0, 10) });
  }

  onAbonoAccountChange(accountId: string): void {
    const acc = this.accounts().find((a) => a.id === accountId);
    this.abonoAccountBalance.set(acc ? Number(acc.balance) : null);
  }

  submitAbono(): void {
    const target = this.abonoTarget();
    if (!target || this.abonoForm.invalid) return;

    const raw = this.abonoForm.getRawValue();
    const payload: any = { accountId: raw.accountId, date: raw.date };

    if (this.abonoMode() === 'installments') {
      if (!raw.installmentsToPay || raw.installmentsToPay > target.remainingInstallments) {
        this.abonoError.set(`No puedes abonar más de ${target.remainingInstallments} cuotas.`);
        return;
      }
      payload.installmentsToPay = raw.installmentsToPay;
    } else {
      if (!raw.amount || raw.amount > target.totalRemaining + 0.01) {
        this.abonoError.set(`No puedes abonar más de lo pendiente (${target.totalRemaining.toLocaleString('es-CO')}).`);
        return;
      }
      payload.amount = raw.amount;
    }

    this.abonoError.set(null);
    this.cardService.payInstallment(this.abonoCardId, target.id, payload).subscribe({
      next: () => {
        this.abonoTarget.set(null);
        this.loadProjection(this.abonoCardId);
      },
      error: (err) => {
        this.abonoError.set(err?.error?.message ?? 'No se pudo registrar el abono');
      },
    });
  }

  // ---- Pagar tarjeta completa ----

  openPayForm(card: { id: string; currentBalance: string }): void {
    this.selectedCardId.set(card.id);
    this.showPayForm.set(true);
    this.showPurchaseForm.set(false);
    this.payError.set(null);
    this.payAccountBalance.set(null);
    this.payMaxOwed.set(Number(card.currentBalance));
    this.payMinDue.set(0);
    this.payForm.reset({ accountId: '', amount: 0, categoryId: '', date: new Date().toISOString().substring(0, 10) });

    this.cardService.getProjection(card.id).subscribe((res) => {
      this.payMinDue.set(res.data.totalDueAtCutoff);
    });
  }

  onPayAccountChange(accountId: string): void {
    const acc = this.accounts().find((a) => a.id === accountId);
    this.payAccountBalance.set(acc ? Number(acc.balance) : null);
  }

  createCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name) return;
    this.categoryService.create(name, 'expense').subscribe((res) => {
      this.payForm.patchValue({ categoryId: res.data.id });
      this.newCategoryName = '';
      this.showNewCategoryInput.set(false);
    });
  }

  submitPay(): void {
    const cardId = this.selectedCardId();
    if (!cardId || this.payForm.invalid) return;

    const raw = this.payForm.getRawValue();
    const maxOwed = this.payMaxOwed();

    if (raw.amount > maxOwed) {
      this.payError.set(`No puedes pagar más de lo que debes (${maxOwed.toLocaleString('es-CO')}).`);
      return;
    }

    this.payError.set(null);
    const payload: any = { ...raw };
    if (!payload.categoryId) delete payload.categoryId;

    this.cardService.pay(cardId, payload).subscribe({
      next: () => {
        this.showPayForm.set(false);
      },
      error: (err) => {
        this.payError.set(err?.error?.message ?? 'No se pudo registrar el pago');
      },
    });
  }
}
