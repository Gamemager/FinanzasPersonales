import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-8">

        @if (!token()) {
          <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Enlace inválido</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Este enlace no es válido o está incompleto. Solicita uno nuevo desde la página de inicio de sesión.
          </p>
          <a routerLink="/auth/forgot-password" class="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Solicitar nuevo enlace</a>
        } @else if (success()) {
          <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Contraseña actualizada</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <a routerLink="/auth/login" class="inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Ir a iniciar sesión</a>
        } @else {
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">Crea una nueva contraseña</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Este enlace es válido por 1 hora y solo puede usarse una vez.</p>

          @if (errorMessage(); as msg) {
            <div class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
              {{ msg }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva contraseña</label>
              <input type="password" formControlName="newPassword"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              <p class="text-xs text-gray-400 mt-1">Mínimo 8 caracteres</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar contraseña</label>
              <input type="password" formControlName="confirmPassword"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              @if (form.errors?.['passwordsMismatch'] && form.get('confirmPassword')?.touched) {
                <p class="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
              }
            </div>
            <button type="submit" [disabled]="submitting()"
              class="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {{ submitting() ? 'Guardando...' : 'Cambiar contraseña' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly success = signal(false);
  readonly token = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  submit(): void {
    const token = this.token();
    if (!token || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword(token, this.form.getRawValue().newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo restablecer la contraseña');
      },
    });
  }
}
