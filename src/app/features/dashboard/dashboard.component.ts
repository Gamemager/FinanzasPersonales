import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { DashboardService } from '../../core/services/dashboard.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionModalComponent } from '../transactions/transaction-modal.component';

type Granularity = 'day' | 'week' | 'month';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxChartsModule, TransactionModalComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private accountService = inject(AccountService);

  // Estado de UI
  readonly showTransactionModal = signal(false);
  readonly granularity = signal<Granularity>('month');
  readonly granularityOptions: Granularity[] = ['day', 'week', 'month'];
  readonly selectedMonth = signal(new Date().toISOString().substring(0, 7)); // YYYY-MM, solo aplica para granularity="day"

  // Datos expuestos directamente desde los servicios (Signals)
  readonly netWorth = this.dashboardService.netWorth;
  readonly expensesByCategory = this.dashboardService.expensesByCategory;
  readonly monthlyData = this.dashboardService.monthlyData;
  readonly accounts = this.accountService.accounts;

  // Computed: transforma los datos del backend al formato que espera ngx-charts
  readonly pieChartData = computed(() =>
    this.expensesByCategory().map((e) => ({ name: e.categoryName, value: e.total })),
  );

  readonly barChartData = computed(() => [
    {
      name: 'Ingresos',
      series: this.monthlyData().map((m) => ({ name: m.month, value: m.income })),
    },
    {
      name: 'Gastos',
      series: this.monthlyData().map((m) => ({ name: m.month, value: m.expense })),
    },
  ]);

  readonly colorScheme: Color = {
    name: 'finanzas',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#a855f7'],
  };

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.dashboardService.fetchNetWorth().subscribe();
    this.dashboardService.fetchExpensesByCategory().subscribe();
    this.loadIncomeExpenseChart();
    this.accountService.fetchAll().subscribe();
  }

  setGranularity(g: Granularity): void {
    this.granularity.set(g);
    this.loadIncomeExpenseChart();
  }

  onMonthChange(value: string): void {
    this.selectedMonth.set(value);
    this.loadIncomeExpenseChart();
  }

  private loadIncomeExpenseChart(): void {
    const g = this.granularity();
    if (g === 'day') {
      const [year, month] = this.selectedMonth().split('-').map(Number);
      const from = new Date(year, month - 1, 1).toISOString().substring(0, 10);
      const to = new Date(year, month, 0).toISOString().substring(0, 10);
      this.dashboardService.fetchMonthlyIncomeExpense('day', from, to).subscribe();
    } else {
      this.dashboardService.fetchMonthlyIncomeExpense(g).subscribe();
    }
  }

  openTransactionModal(): void {
    this.showTransactionModal.set(true);
  }

  onTransactionModalClosed(created: boolean): void {
    this.showTransactionModal.set(false);
    if (created) {
      // Refrescar métricas tras registrar un movimiento
      this.loadDashboardData();
    }
  }
}
