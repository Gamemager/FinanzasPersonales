import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">Restablecer contraseña</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ingresa el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.
        </p>

        @if (sent()) {
          <div class="rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm px-3 py-3">
            Si el correo está registrado, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.
          </div>
        } @else {
          @if (errorMessage(); as msg) {
            <div class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
              {{ msg }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" formControlName="email" placeholder="tu@correo.com"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
            <button type="submit" [disabled]="submitting()"
              class="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {{ submitting() ? 'Enviando...' : 'Enviar enlace' }}
            </button>
          </form>
        }

        <p class="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
          <a routerLink="/auth/login" class="text-indigo-600 dark:text-indigo-400 font-medium">Volver a iniciar sesión</a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly sent = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Ocurrió un error, intenta de nuevo');
      },
    });
  }
}
