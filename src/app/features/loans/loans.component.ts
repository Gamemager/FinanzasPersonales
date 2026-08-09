import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoanService } from '../../core/services/loan.service';
import { LoanType } from '../../core/models/finance.models';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Préstamos</h1>
        <button (click)="showForm.set(!showForm())"
          class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          {{ showForm() ? 'Cancelar' : '+ Nuevo préstamo' }}
        </button>
      </div>
      <p class="text-xs text-gray-400 mb-6">
        "Me deben" es dinero que tú prestaste y esperas que te devuelvan. "Debo" es dinero que te prestaron
        a ti. La fecha límite es opcional, solo la usamos como recordatorio.
      </p>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="submit()"
          class="mb-6 grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre de la persona o entidad</label>
            <input formControlName="personName" placeholder="Ej: Carlos Pérez" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">¿Qué tipo de préstamo es?</label>
            <select formControlName="type" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
              <option value="lent_by_me">Me deben (yo presté el dinero)</option>
              <option value="borrowed_by_me">Debo (a mí me prestaron)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto total (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="text" inputmode="numeric" appCurrencyInput formControlName="totalAmount" placeholder="0"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5 pl-7" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha límite (opcional)</label>
            <input formControlName="dueDate" type="date" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white p-2.5">Guardar préstamo</button>
          </div>
        </form>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (loan of loans(); track loan.id) {
          <div class="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <p class="font-medium text-gray-900 dark:text-white">{{ loan.personName }}</p>
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-0.5 rounded-full"
                  [class.bg-green-100]="loan.type === 'lent_by_me'"
                  [class.text-green-700]="loan.type === 'lent_by_me'"
                  [class.bg-red-100]="loan.type === 'borrowed_by_me'"
                  [class.text-red-700]="loan.type === 'borrowed_by_me'">
                  {{ loan.type === 'lent_by_me' ? 'Me deben' : 'Debo' }}
                </span>
                <button (click)="remove(loan.id)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-1">Total: {{ loan.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ loan.remainingAmount | currency:'COP':'symbol-narrow':'1.0-0' }} pendiente</p>
            <p class="text-xs mt-1"
               [class.text-green-600]="loan.status === 'paid'"
               [class.text-yellow-600]="loan.status === 'active'"
               [class.text-red-600]="loan.status === 'overdue'">
              {{ loan.status === 'paid' ? 'Pagado' : loan.status === 'active' ? 'Activo' : 'Vencido' }}
            </p>

            @if (loan.status !== 'paid') {
              <div class="mt-3">
                <label class="block text-[10px] text-gray-400 mb-1">Registrar abono (COP)</label>
                <div class="flex gap-1">
                  <input #paymentInput type="text" inputmode="numeric" appCurrencyInput placeholder="$ 0" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-xs p-1.5" />
                  <button (click)="addPayment(loan.id, paymentInput.value); paymentInput.value=''" class="text-xs text-indigo-600 hover:underline whitespace-nowrap">Registrar</button>
                </div>
              </div>
            }

            @if (loan.payments && loan.payments.length > 0) {
              <div class="mt-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Historial de abonos</p>
                @for (p of loan.payments; track p.id) {
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ p.date }} — {{ p.amountPaid | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="text-sm text-gray-400 col-span-full text-center py-6">No tienes préstamos registrados.</p>
        }
      </div>
    </div>
  `,
})
export class LoansComponent implements OnInit {
  private fb = inject(FormBuilder);
  private loanService = inject(LoanService);

  readonly loans = this.loanService.loans;
  readonly showForm = signal(false);

  form = this.fb.nonNullable.group({
    personName: ['', Validators.required],
    type: ['lent_by_me' as LoanType, Validators.required],
    totalAmount: [0, Validators.required],
    dueDate: [''],
  });

  ngOnInit(): void {
    this.loanService.fetchAll().subscribe();
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: any = { ...raw, totalAmount: String(raw.totalAmount) };
    if (!payload.dueDate) delete payload.dueDate;
    this.loanService.create(payload).subscribe(() => {
      this.showForm.set(false);
      this.form.reset({ personName: '', type: 'lent_by_me', totalAmount: 0, dueDate: '' });
    });
  }

  addPayment(loanId: string, amount: string): void {
    const n = Number(amount.replace(/[^\d]/g, ''));
    if (!n) return;
    this.loanService.addPayment(loanId, { amountPaid: n, date: new Date().toISOString().substring(0, 10) }).subscribe();
  }

  remove(loanId: string): void {
    if (!confirm('¿Eliminar este préstamo y su historial de abonos? Esta acción no se puede deshacer.')) return;
    this.loanService.delete(loanId).subscribe();
  }
}
