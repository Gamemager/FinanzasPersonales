import { Component, computed, ElementRef, inject, OnInit, AfterViewInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { DashboardService } from '../../core/services/dashboard.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionModalComponent } from '../transactions/transaction-modal.component';

type Granularity = 'day' | 'week' | 'month';
type NetWorthComponent = 'accounts' | 'investments' | 'toCollect' | 'toPay' | 'cardDebt';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxChartsModule, TransactionModalComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private accountService = inject(AccountService);

  @ViewChild('barChartContainer') barChartContainer?: ElementRef<HTMLDivElement>;
  readonly barChartWidth = signal(600);
  private resizeObserver?: ResizeObserver;

  // Estado de UI
  readonly showTransactionModal = signal(false);
  readonly granularity = signal<Granularity>('month');
  readonly granularityOptions: Granularity[] = ['day', 'week', 'month'];
  readonly selectedMonth = signal(new Date().toISOString().substring(0, 7)); // YYYY-MM, solo aplica para granularity="day"

  // Filtro del gráfico de dona: mismo estilo día/semana/mes, independiente del de barras
  readonly pieGranularity = signal<Granularity>('month');
  readonly pieSelectedMonth = signal(new Date().toISOString().substring(0, 7));
  readonly showPieCategoryFilter = signal(false);
  readonly excludedCategories = signal<Set<string>>(new Set());

  // Filtro de Patrimonio Neto: qué componentes incluir en el número grande
  readonly netWorthIncluded = signal<Record<NetWorthComponent, boolean>>({
    accounts: true,
    investments: true,
    toCollect: true,
    toPay: true,
    cardDebt: true,
  });

  // Datos expuestos directamente desde los servicios (Signals)
  readonly netWorth = this.dashboardService.netWorth;
  readonly expensesByCategory = this.dashboardService.expensesByCategory;
  readonly monthlyData = this.dashboardService.monthlyData;
  readonly accounts = this.accountService.accounts;

  // Patrimonio neto recalculado según los checkboxes marcados
  readonly filteredNetWorth = computed(() => {
    const nw = this.netWorth();
    if (!nw) return 0;
    const inc = this.netWorthIncluded();
    const assets =
      (inc.accounts ? nw.breakdown.totalAccounts : 0) +
      (inc.investments ? nw.breakdown.totalInvestments : 0) +
      (inc.toCollect ? nw.breakdown.totalToCollect : 0);
    const liabilities = (inc.toPay ? nw.breakdown.totalToPay : 0) + (inc.cardDebt ? nw.breakdown.totalCardDebt : 0);
    return assets - liabilities;
  });

  readonly allCategoryNames = computed(() => this.expensesByCategory().map((e) => e.categoryName));

  // Computed: transforma los datos del backend al formato que espera ngx-charts, excluyendo categorías desmarcadas
  readonly pieChartData = computed(() =>
    this.expensesByCategory()
      .filter((e) => !this.excludedCategories().has(e.categoryName))
      .map((e) => ({ name: e.categoryName, value: e.total })),
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

  readonly barChartView = computed<[number, number]>(() => [this.barChartWidth(), 300]);

  readonly colorScheme: Color = {
    name: 'finanzas',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#a855f7'],
  };

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    if (!this.barChartContainer) return;
    const el = this.barChartContainer.nativeElement;
    this.updateBarChartWidth(el);
    this.resizeObserver = new ResizeObserver(() => this.updateBarChartWidth(el));
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private updateBarChartWidth(el: HTMLDivElement): void {
    const width = el.clientWidth;
    if (width > 0) this.barChartWidth.set(width);
  }

  private loadDashboardData(): void {
    this.dashboardService.fetchNetWorth().subscribe();
    this.loadPieChart();
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

  // ---- Filtro del gráfico de dona ----

  setPieGranularity(g: Granularity): void {
    this.pieGranularity.set(g);
    this.loadPieChart();
  }

  onPieMonthChange(value: string): void {
    this.pieSelectedMonth.set(value);
    this.loadPieChart();
  }

  private loadPieChart(): void {
    const g = this.pieGranularity();
    const today = new Date();

    if (g === 'day') {
      const [year, month] = this.pieSelectedMonth().split('-').map(Number);
      const from = new Date(year, month - 1, 1).toISOString().substring(0, 10);
      const to = new Date(year, month, 0).toISOString().substring(0, 10);
      this.dashboardService.fetchExpensesByCategory(from, to).subscribe();
    } else if (g === 'week') {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      this.dashboardService
        .fetchExpensesByCategory(start.toISOString().substring(0, 10), today.toISOString().substring(0, 10))
        .subscribe();
    } else {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      this.dashboardService
        .fetchExpensesByCategory(start.toISOString().substring(0, 10), today.toISOString().substring(0, 10))
        .subscribe();
    }
  }

  toggleCategory(name: string): void {
    this.excludedCategories.update((set) => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  isCategoryExcluded(name: string): boolean {
    return this.excludedCategories().has(name);
  }

  // ---- Filtro de Patrimonio Neto ----

  toggleNetWorthComponent(component: NetWorthComponent): void {
    this.netWorthIncluded.update((inc) => ({ ...inc, [component]: !inc[component] }));
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
