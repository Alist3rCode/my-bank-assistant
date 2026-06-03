import axios from "axios";
import type { Token, User, Account, Transaction, Budget, Saving, Project, AIInsight } from "../types";

const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<Token>("/auth/login", new URLSearchParams({ username: email, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  register: (email: string, password: string, full_name: string) =>
    api.post<Token>("/auth/register", { email, password, full_name }),
  me: () => api.get<User>("/auth/me"),
};

// ── Accounts ──────────────────────────────────────────────────────────────────
export const accountsApi = {
  list: () => api.get<Account[]>("/accounts/"),
  summary: (id: number) => api.get<{ balance: number; monthly_income: number; monthly_expenses: number; monthly_net: number }>(`/accounts/${id}/summary`),
  sync: (id: number) => api.post<{ message: string; account_id: number; new_transactions: number }>(`/accounts/sync/${id}`),
  connectStart: (redirect_url: string) =>
    api.post<{ connect_url: string }>("/accounts/connect/start", { redirect_url }),
  connectCallback: (item_uuid: string) =>
    api.post<{ connection_id: number; bank_name: string; accounts_count: number }>("/accounts/connect/callback", { item_uuid }),
};

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: { account_id?: number; category?: string; from_date?: string; to_date?: string; search?: string; limit?: number; offset?: number }) =>
    api.get<Transaction[]>("/transactions/", { params }),
  create: (data: Partial<Transaction>) => api.post<Transaction>("/transactions/", data),
  update: (id: number, data: Partial<Transaction>) => api.patch<Transaction>(`/transactions/${id}`, data),
  categorize: (id: number) => api.post<Transaction>(`/transactions/${id}/categorize`),
  monthlyStats: (year: number, month: number) =>
    api.get<{ category: string; total: number }[]>("/transactions/stats/monthly", { params: { year, month } }),
};

// ── Budgets ───────────────────────────────────────────────────────────────────
export const budgetsApi = {
  list: (month: number, year: number) => api.get<Budget[]>("/budgets/", { params: { month, year } }),
  create: (data: Partial<Budget>) => api.post<Budget>("/budgets/", data),
  update: (id: number, data: Partial<Budget>) => api.patch<Budget>(`/budgets/${id}`, data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
};

// ── Savings ───────────────────────────────────────────────────────────────────
export const savingsApi = {
  list: () => api.get<Saving[]>("/savings/"),
  create: (data: Partial<Saving>) => api.post<Saving>("/savings/", data),
  update: (id: number, data: Partial<Saving>) => api.patch<Saving>(`/savings/${id}`, data),
  delete: (id: number) => api.delete(`/savings/${id}`),
  total: () => api.get<{ total_savings: number }>("/savings/summary/total"),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: (status?: string) => api.get<Project[]>("/projects/", { params: status ? { status } : undefined }),
  create: (data: Partial<Project>) => api.post<Project>("/projects/", data),
  update: (id: number, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  allocate: (id: number, saving_id: number, amount: number) =>
    api.post<Project>(`/projects/${id}/allocate`, { saving_id, amount }),
  simulate: (id: number) => api.post(`/projects/${id}/simulate`),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  insights: () => api.get<AIInsight[]>("/ai/insights"),
  markRead: (id: number) => api.post(`/ai/insights/${id}/read`),
  dismiss: (id: number) => api.post(`/ai/insights/${id}/dismiss`),
  analyzeAnomalies: () => api.post("/ai/analyze/anomalies"),
  analyzeCashflow: () => api.post("/ai/analyze/cashflow"),
  analyzeHiddenSavings: () => api.post("/ai/analyze/hidden-savings"),
  simulateLifeChange: (change_description: string, purchase_goal?: string) =>
    api.post("/ai/simulate/life-change", { change_description, purchase_goal }),
  batchCategorize: () => api.post("/ai/categorize/batch"),
};

export default api;
