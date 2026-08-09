import { Component, EventEmitter, Input, computed, inject, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TransactionService } from '../../core/services/transaction.service';
import { AccountService } from '../../core/services/account.service';
import { CategoryService } from '../../core/services/category.service';
import { Transaction, TransactionType } from '../../core/models/finance.models';
import { CurrencyInputDirective } from '../../shared/directives/currency-input.directive';

@Component({
  selector: 'app-transaction-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CurrencyInputDirective],
  templateUrl: './transaction-modal.component.html',
})
export class TransactionModalComponent implements OnInit {
  /** Si se pasa, el modal entra en modo edición y precarga estos datos. */
  @Input() editTransaction: Transaction | null = null;
  @Output() closed = new EventEmitter<boolean>(); // emite true si se creó/editó una transacción

  private fb = inject(FormBuilder);
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);

  readonly accounts = this.accountService.accounts;
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedType = signal<TransactionType>('expense');
  readonly showNewCategoryInput = signal(false);
  readonly newCategoryName = signal('');

  readonly isEditMode = computed(() => !!this.editTransaction);

  readonly transactionTypes: TransactionType[] = ['expense', 'income', 'transfer'];

  readonly filteredCategories = computed(() =>
    this.categoryService
      .categories()
      .filter((c) => c.type === (this.selectedType() === 'income' ? 'income' : 'expense')),
  );

  form = this.fb.nonNullable.group({
    type: ['expense' as TransactionType, Validators.required],
    accountId: ['', Validators.required],
    destinationAccountId: [''],
    categoryId: [''],
    amount: [0, [Validators.required, Validators.min(1)]],
    description: [''],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
  });

  ngOnInit(): void {
    if (this.accounts().length === 0) {
      this.accountService.fetchAll().subscribe();
    }
    this.categoryService.fetchAll().subscribe();

    if (this.editTransaction) {
      const tx = this.editTransaction;
      this.selectedType.set(tx.type);
      this.form.patchValue({
        type: tx.type,
        accountId: tx.accountId,
        destinationAccountId: tx.destinationAccountId ?? '',
        categoryId: tx.categoryId ?? '',
        amount: Number(tx.amount),
        description: tx.description ?? '',
        date: tx.date,
      });
    }
  }

  setType(type: TransactionType): void {
    this.selectedType.set(type);
    this.form.patchValue({ categoryId: '' });
    this.form.patchValue({ type });
  }

  toggleNewCategory(): void {
    this.showNewCategoryInput.update((v) => !v);
  }

  createCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    const type = this.selectedType() === 'income' ? 'income' : 'expense';
    this.categoryService.create(name, type).subscribe((res) => {
      this.form.patchValue({ categoryId: res.data.id });
      this.newCategoryName.set('');
      this.showNewCategoryInput.set(false);
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const payload: any = { ...raw, amount: String(raw.amount) };

    if (!payload.categoryId) delete payload.categoryId;
    if (payload.type === 'transfer') {
      if (!payload.destinationAccountId) {
        this.submitting.set(false);
        this.errorMessage.set('Selecciona la cuenta destino');
        return;
      }
    } else {
      delete payload.destinationAccountId;
    }

    const request = this.editTransaction
      ? this.transactionService.update(this.editTransaction.id, payload)
      : this.transactionService.create(payload);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closed.emit(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo guardar el movimiento');
      },
    });
  }

  dismiss(): void {
    this.closed.emit(false);
  }
}
