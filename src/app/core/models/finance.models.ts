export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type AccountType = 'cash' | 'bank' | 'wallet';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: string; // numeric viene como string desde Postgres
  currency: string;
  createdAt?: string;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  type: CategoryType;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  amount: string;
  type: TransactionType;
  description?: string;
  date: string;
  account?: Account;
  category?: Category;
}

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  currentBalance: string;
}

export interface CardTransaction {
  id: string;
  creditCardId: string;
  categoryId?: string;
  amount: string;
  installmentsTotal: number;
  installmentsPaid: number;
  description?: string;
  date: string;
}

export interface Investment {
  id: string;
  userId: string;
  platformName: string;
  investedAmount: string;
  currentValue: string;
  notes?: string;
  updatedAt: string;
  netReturn?: number;
  returnPercentage?: number;
}

export type LoanType = 'lent_by_me' | 'borrowed_by_me';
export type LoanStatus = 'active' | 'paid' | 'overdue';

export interface LoanPayment {
  id: string;
  loanId: string;
  amountPaid: string;
  date: string;
  notes?: string;
}

export interface Loan {
  id: string;
  userId: string;
  personName: string;
  totalAmount: string;
  remainingAmount: string;
  type: LoanType;
  dueDate?: string;
  status: LoanStatus;
  payments?: LoanPayment[];
}

export interface NetWorthBreakdown {
  totalAccounts: number;
  totalInvestments: number;
  totalToCollect: number;
  totalToPay: number;
  totalCardDebt: number;
}

export interface NetWorthResponse {
  netWorth: number;
  breakdown: NetWorthBreakdown;
}

export interface ExpenseByCategory {
  categoryId: string | null;
  categoryName: string;
  icon: string;
  total: number;
}

export interface MonthlyIncomeExpense {
  month: string;
  income: number;
  expense: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
