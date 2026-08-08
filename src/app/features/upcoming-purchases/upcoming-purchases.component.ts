import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UpcomingPurchaseService } from '../../core/services/upcoming-purchase.service';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';
import { RecurrenceType, UpcomingPurchase } from '../../core/models/finance.models';

@Component({
  selector: 'app-upcoming-purchases',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Próximas Compras</h1>
        <button (click)="showForm.set(!showForm())"
          class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          {{ showForm() ? 'Cancelar' : '+ Nueva compra' }}
        </button>
      </div>
      <p class="text-xs text-gray-400 mb-6">
        Recordatorios de cosas que planeas comprar o pagar en una fecha específica. No afectan tus cuentas ni
        se convierten en movimientos automáticamente — son solo para que no se te olviden.
      </p>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="submit()"
          class="mb-6 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
              <input formControlName="name" placeholder="Ej: Comida del mes" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor estimado (COP)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="text" inputmode="numeric" appCurrencyInput formControlName="amount" placeholder="0"
                  class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
              <input formControlName="dueDate" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Comentario (opcional)</label>
            <input formControlName="comment" placeholder="Ej: Revisar precios en D1" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" formControlName="isRecurring" id="isRecurring" class="rounded" />
            <label for="isRecurring" class="text-sm text-gray-700 dark:text-gray-300">Es una compra periódica (se repite sola)</label>
          </div>

          @if (form.get('isRecurring')?.value) {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 border-l-2 border-indigo-100 dark:border-indigo-900">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">¿Cada cuánto se repite?</label>
                <select formControlName="recurrenceType" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
                  <option value="monthly">Mensual (mismo día cada mes)</option>
                  <option value="days">Cada X días</option>
                </select>
              </div>
              @if (form.get('recurrenceType')?.value === 'days') {
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">¿Cada cuántos días?</label>
                  <input formControlName="recurrenceIntervalDays" type="number" min="1" placeholder="Ej: 15" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
                </div>
              }
            </div>
          }

          <button type="submit" class="rounded-lg bg-indigo-600 text-sm font-semibold text-white px-4 py-2.5">Guardar compra</button>
        </form>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (p of purchases(); track p.id) {
          @let status = getStatus(p.dueDate);
          <div class="rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-gray-900 dark:text-white">{{ p.name }}</p>
              @if (p.isRecurring) {
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {{ p.recurrenceType === 'monthly' ? 'Mensual' : 'Cada ' + p.recurrenceIntervalDays + 'd' }}
                </span>
              }
            </div>
            <p class="text-lg font-bold text-gray-900 dark:text-white">{{ p.amount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            @if (p.comment) {
              <p class="text-xs text-gray-400 mt-1">{{ p.comment }}</p>
            }
            <p class="text-xs mt-2 font-medium"
               [class.text-red-600]="status === 'vencida'"
               [class.text-yellow-600]="status === 'hoy'"
               [class.text-gray-500]="status === 'futura'">
              {{ status === 'vencida' ? 'Vencida' : status === 'hoy' ? 'Hoy' : 'En ' + daysUntil(p.dueDate) + ' días' }}
              · {{ p.dueDate }}
            </p>

            <div class="flex gap-3 mt-3">
              <button (click)="complete(p.id)" class="text-xs text-green-600 hover:underline">Ya la compré</button>
              <button (click)="startEdit(p)" class="text-xs text-indigo-600 hover:underline">Reprogramar</button>
              <button (click)="remove(p.id)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </div>
          </div>
        } @empty {
          <p class="text-sm text-gray-400 col-span-full text-center py-6">No tienes compras próximas planeadas.</p>
        }
      </div>

      <!-- Modal de reprogramar / convertir en periódica -->
      @if (editTarget(); as target) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Reprogramar: {{ target.name }}</h3>

            <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nueva fecha</label>
                <input formControlName="dueDate" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              </div>

              <div class="flex items-center gap-2">
                <input type="checkbox" formControlName="isRecurring" id="editIsRecurring" class="rounded" />
                <label for="editIsRecurring" class="text-sm text-gray-700 dark:text-gray-300">Convertir en periódica</label>
              </div>

              @if (editForm.get('isRecurring')?.value) {
                <div class="grid grid-cols-2 gap-3 pl-6 border-l-2 border-indigo-100 dark:border-indigo-900">
                  <select formControlName="recurrenceType" class="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
                    <option value="monthly">Mensual</option>
                    <option value="days">Cada X días</option>
                  </select>
                  @if (editForm.get('recurrenceType')?.value === 'days') {
                    <input formControlName="recurrenceIntervalDays" type="number" min="1" placeholder="Días" class="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
                  }
                </div>
              }

              <div class="flex gap-3 pt-2">
                <button type="button" (click)="editTarget.set(null)" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200">Cancelar</button>
                <button type="submit" class="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class UpcomingPurchasesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private purchaseService = inject(UpcomingPurchaseService);

  readonly purchases = this.purchaseService.purchases;
  readonly showForm = signal(false);
  readonly editTarget = signal<UpcomingPurchase | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    amount: [0, Validators.required],
    comment: [''],
    dueDate: [new Date().toISOString().substring(0, 10), Validators.required],
    isRecurring: [false],
    recurrenceType: ['monthly' as RecurrenceType],
    recurrenceIntervalDays: [15],
  });

  editForm = this.fb.nonNullable.group({
    dueDate: ['', Validators.required],
    isRecurring: [false],
    recurrenceType: ['monthly' as RecurrenceType],
    recurrenceIntervalDays: [15],
  });

  ngOnInit(): void {
    this.purchaseService.fetchAll().subscribe();
  }

  getStatus(dueDate: string): 'vencida' | 'hoy' | 'futura' {
    const today = new Date().toISOString().substring(0, 10);
    if (dueDate < today) return 'vencida';
    if (dueDate === today) return 'hoy';
    return 'futura';
  }

  daysUntil(dueDate: string): number {
    const diff = new Date(dueDate + 'T00:00:00').getTime() - new Date(new Date().toISOString().substring(0, 10) + 'T00:00:00').getTime();
    return Math.round(diff / 86400000);
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: any = { ...raw, amount: String(raw.amount) };
    if (!payload.isRecurring) {
      delete payload.recurrenceType;
      delete payload.recurrenceIntervalDays;
    }
    this.purchaseService.create(payload).subscribe(() => {
      this.showForm.set(false);
      this.form.reset({
        name: '',
        amount: 0,
        comment: '',
        dueDate: new Date().toISOString().substring(0, 10),
        isRecurring: false,
        recurrenceType: 'monthly',
        recurrenceIntervalDays: 15,
      });
    });
  }

  complete(id: string): void {
    this.purchaseService.complete(id).subscribe();
  }

  remove(id: string): void {
    if (!confirm('¿Eliminar esta compra planeada?')) return;
    this.purchaseService.delete(id).subscribe();
  }

  startEdit(p: UpcomingPurchase): void {
    this.editTarget.set(p);
    this.editForm.reset({
      dueDate: p.dueDate,
      isRecurring: p.isRecurring,
      recurrenceType: p.recurrenceType ?? 'monthly',
      recurrenceIntervalDays: p.recurrenceIntervalDays ?? 15,
    });
  }

  submitEdit(): void {
    const target = this.editTarget();
    if (!target || this.editForm.invalid) return;
    const raw = this.editForm.getRawValue();
    const payload: any = { ...raw };
    if (!payload.isRecurring) {
      payload.recurrenceType = null;
      payload.recurrenceIntervalDays = null;
    }
    this.purchaseService.update(target.id, payload).subscribe(() => {
      this.editTarget.set(null);
    });
  }
}
