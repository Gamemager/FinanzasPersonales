import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { COUNTRY_CODES } from '../../shared/data/country-codes';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mi Perfil</h1>
      <p class="text-xs text-gray-400 mb-6">
        Tu nombre, apellido y correo no se pueden modificar. Puedes actualizar tu teléfono y tu contraseña.
      </p>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

        <!-- Información personal -->
        <div class="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-100 dark:border-gray-700">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Información personal</h2>

          @if (profileMessage(); as msg) {
            <div class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm px-3 py-2">
              {{ msg }}
            </div>
          }
          @if (profileError(); as err) {
            <div class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
              {{ err }}
            </div>
          }

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
              <input [value]="user()?.firstName" disabled
                class="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm p-2.5 cursor-not-allowed" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Apellido</label>
              <input [value]="user()?.lastName" disabled
                class="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm p-2.5 cursor-not-allowed" />
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Correo</label>
            <input [value]="user()?.email" disabled
              class="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm p-2.5 cursor-not-allowed" />
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="submitProfile()">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Teléfono</label>
            <div class="flex gap-2 mb-4">
              <select formControlName="phoneCountryCode" class="w-28 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5">
                @for (c of countryCodes; track c.iso) {
                  <option [value]="c.code">{{ c.code }} {{ c.iso }}</option>
                }
              </select>
              <input type="tel" formControlName="phoneNumber" placeholder="3001234567"
                class="flex-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
            <button type="submit" [disabled]="savingProfile()"
              class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {{ savingProfile() ? 'Guardando...' : 'Guardar teléfono' }}
            </button>
          </form>
        </div>

        <!-- Cambiar contraseña -->
        <div class="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-100 dark:border-gray-700">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Cambiar contraseña</h2>

          @if (passwordMessage(); as msg) {
            <div class="mb-4 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm px-3 py-2">
              {{ msg }}
            </div>
          }
          @if (passwordError(); as err) {
            <div class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
              {{ err }}
            </div>
          }

          <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contraseña actual</label>
              <input type="password" formControlName="currentPassword"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nueva contraseña</label>
              <input type="password" formControlName="newPassword"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              <p class="text-[10px] text-gray-400 mt-1">Mínimo 8 caracteres</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Confirmar nueva contraseña</label>
              <input type="password" formControlName="confirmPassword"
                class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-2.5" />
              @if (passwordForm.errors?.['passwordsMismatch'] && passwordForm.get('confirmPassword')?.touched) {
                <p class="text-[10px] text-red-500 mt-1">Las contraseñas no coinciden</p>
              }
            </div>
            <button type="submit" [disabled]="savingPassword()"
              class="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {{ savingPassword() ? 'Guardando...' : 'Cambiar contraseña' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly countryCodes = COUNTRY_CODES;

  readonly savingProfile = signal(false);
  readonly profileMessage = signal<string | null>(null);
  readonly profileError = signal<string | null>(null);

  readonly savingPassword = signal(false);
  readonly passwordMessage = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);

  profileForm = this.fb.nonNullable.group({
    phoneCountryCode: ['+57', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{6,15}$/)]],
  });

  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    this.authService.fetchProfile().subscribe((res) => {
      this.profileForm.patchValue({
        phoneCountryCode: res.data.phoneCountryCode || '+57',
        phoneNumber: res.data.phoneNumber || '',
      });
    });
  }

  submitProfile(): void {
    if (this.profileForm.invalid) return;
    this.savingProfile.set(true);
    this.profileMessage.set(null);
    this.profileError.set(null);

    this.authService.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.profileMessage.set('Teléfono actualizado correctamente');
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.profileError.set(err?.error?.message ?? 'No se pudo actualizar el teléfono');
      },
    });
  }

  submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.passwordMessage.set(null);
    this.passwordError.set(null);

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordMessage.set('Contraseña actualizada correctamente');
        this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.passwordError.set(err?.error?.message ?? 'No se pudo cambiar la contraseña');
      },
    });
  }
}
