import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="flex h-screen bg-gray-50 dark:bg-gray-900 relative">

      <!-- Overlay oscuro al abrir el sidebar en móvil -->
      @if (sidebarOpen()) {
        <div
          (click)="sidebarOpen.set(false)"
          class="fixed inset-0 bg-black/50 z-30 sm:hidden"
        ></div>
      }

      <!-- Sidebar: drawer en móvil, fijo en desktop -->
      <aside
        [class.translate-x-0]="sidebarOpen()"
        [class.-translate-x-full]="!sidebarOpen()"
        class="fixed sm:static inset-y-0 left-0 z-40 w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col p-3 transition-transform duration-200 sm:translate-x-0"
      >
        <div class="flex items-center gap-2 px-2 py-3 mb-2">
          <span class="text-xl">💰</span>
          <span class="font-bold text-gray-900 dark:text-white">Finanzas</span>
        </div>

        <nav class="flex flex-col gap-1">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-indigo-600 text-white"
              [routerLinkActiveOptions]="{ exact: false }"
              (click)="sidebarOpen.set(false)"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span>{{ item.icon }}</span>{{ item.label }}
            </a>
          }
        </nav>

        <div class="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-1">
          <button
            (click)="toggleDarkMode()"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {{ isDark() ? '☀️ Modo claro' : '🌙 Modo oscuro' }}
          </button>
          <button
            (click)="logout()"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      <!-- Contenido -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Topbar solo visible en móvil, con botón hamburguesa -->
        <div class="sm:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button (click)="toggleSidebar()" class="text-gray-600 dark:text-gray-300 text-xl leading-none">☰</button>
          <span class="font-semibold text-gray-900 dark:text-white">Finanzas</span>
        </div>

        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly isDark = signal(this.getInitialDarkMode());
  readonly sidebarOpen = signal(false);

  readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/accounts', label: 'Cuentas', icon: '🏦' },
    { path: '/cards', label: 'Tarjetas', icon: '💳' },
    { path: '/investments', label: 'Inversiones', icon: '📈' },
    { path: '/loans', label: 'Préstamos', icon: '🤝' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  private getInitialDarkMode(): boolean {
    const stored = localStorage.getItem('finanzas_dark_mode');
    const initial = stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', initial);
    return initial;
  }

  toggleDarkMode(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('finanzas_dark_mode', String(next));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
