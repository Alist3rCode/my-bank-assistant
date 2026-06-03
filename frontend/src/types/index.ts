export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export type AccountType = "checking" | "savings" | "credit" | "investment";

export interface Account {
  id: number;
  name: string;
  account_type: AccountType;
  balance: number;
  currency: string;
  iban: string | null;
  is_active: boolean;
  last_sync_at: string | null;
}

export type TransactionCategory =
  | "alimentation"
  | "transport"
  | "logement"
  | "sante"
  | "loisirs"
  | "shopping"
  | "abonnements"
  | "revenus"
  | "epargne"
  | "impots"
  | "restaurants"
  | "voyages"
  | "education"
  | "autre";

export interface Transaction {
  id: number;
  account_id: number;
  amount: number;
  currency: string;
  description: string;
  clean_description: string | null;
  merchant_name: string | null;
  transaction_date: string;
  category: TransactionCategory;
  ai_category: string | null;
  ai_tags: string[] | null;
  is_recurring: boolean;
  recurrence_label: string | null;
  is_anomaly: boolean;
  note: string | null;
  created_at: string;
}

export interface Budget {
  id: number;
  category: TransactionCategory;
  monthly_limit: number;
  month: number;
  year: number;
  alert_threshold: number;
  spent_amount: number;
  remaining: number;
  percent_used: number;
  created_at: string;
}

export type SavingType = "livret_a" | "livret_jeune" | "pel" | "cel" | "assurance_vie" | "pea" | "cash" | "other";

export interface Saving {
  id: number;
  name: string;
  saving_type: SavingType;
  current_amount: number;
  target_amount: number | null;
  interest_rate: number;
  deadline: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export type ProjectStatus = "active" | "completed" | "paused" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high";

export interface Project {
  id: number;
  name: string;
  description: string | null;
  emoji: string | null;
  target_amount: number;
  saved_amount: number;
  monthly_contribution: number | null;
  deadline: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress_percent: number;
  ai_simulation: Record<string, unknown> | null;
  created_at: string;
}

export type InsightType =
  | "anomaly"
  | "prediction"
  | "categorization"
  | "savings_opportunity"
  | "budget_alert"
  | "recurring_detected"
  | "price_increase"
  | "goal_update"
  | "scenario";

export type InsightSeverity = "info" | "warning" | "critical";

export interface AIInsight {
  id: number;
  insight_type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}
