import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, AlertTriangle, Plus, HelpCircle } from "lucide-react";
import { accountsApi, savingsApi, projectsApi, aiApi, transactionsApi } from "../services/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Account } from "../types";
import { useState } from "react";
import BridgeConfigHelp from "../components/BridgeConfigHelp";

const CATEGORY_COLORS: Record<string, string> = {
  alimentation: "#f97316",
  transport: "#3b82f6",
  logement: "#8b5cf6",
  loisirs: "#ec4899",
  restaurants: "#f59e0b",
  abonnements: "#06b6d4",
  shopping: "#10b981",
  sante: "#ef4444",
  autre: "#6b7280",
};

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export default function Dashboard() {
  const now = new Date();
  const [connecting, setConnecting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { data: bridgeStatus } = useQuery({
    queryKey: ["bridge-status"],
    queryFn: () => accountsApi.connectStatus().then((r) => r.data),
    staleTime: 60_000,
  });

  const bridgeConfigured = bridgeStatus?.configured ?? true;
  const missingFields = bridgeStatus?.missing_fields ?? [];

  const handleConnectBank = async () => {
    if (!bridgeConfigured) {
      setShowHelp(true);
      return;
    }
    setConnecting(true);
    try {
      const callbackUrl = `${window.location.origin}/connect/callback`;
      const { data } = await accountsApi.connectStart(callbackUrl);
      window.location.href = data.connect_url;
    } catch {
      setConnecting(false);
    }
  };

  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => accountsApi.list().then((r) => r.data) });
  const { data: savingsTotal } = useQuery({ queryKey: ["savings-total"], queryFn: () => savingsApi.total().then((r) => r.data) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list("active").then((r) => r.data) });
  const { data: insights = [] } = useQuery({ queryKey: ["insights"], queryFn: () => aiApi.insights().then((r) => r.data) });
  const { data: monthlyStats = [] } = useQuery({
    queryKey: ["monthly-stats", now.getFullYear(), now.getMonth() + 1],
    queryFn: () => transactionsApi.monthlyStats(now.getFullYear(), now.getMonth() + 1).then((r) => r.data),
  });

  const totalBalance = accounts.reduce((acc: number, a: Account) => acc + a.balance, 0);
  const unreadInsights = insights.filter((i) => !i.is_read && !i.is_dismissed);
  const criticalInsights = unreadInsights.filter((i) => i.severity === "critical");

  const pieData = monthlyStats.map((s) => ({
    name: s.category,
    value: s.total,
    color: CATEGORY_COLORS[s.category] || "#6b7280",
  }));

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-gray-400 text-sm mt-1">{format(now, "EEEE d MMMM yyyy", { locale: fr })}</p>
      </div>

      {criticalInsights.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">{criticalInsights.length} alerte(s) critique(s)</p>
            <p className="text-xs text-gray-400 mt-0.5">{criticalInsights[0]?.title}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Wallet size={18} />} label="Solde total" value={fmt(totalBalance)} color="blue" />
        <StatCard icon={<PiggyBank size={18} />} label="Épargne totale" value={fmt(savingsTotal?.total_savings ?? 0)} color="green" />
        <StatCard icon={<Target size={18} />} label="Projets actifs" value={String(projects.length)} color="purple" />
        <StatCard
          icon={unreadInsights.length > 0 ? <AlertTriangle size={18} /> : <TrendingUp size={18} />}
          label="Alertes IA"
          value={String(unreadInsights.length)}
          color={unreadInsights.length > 0 ? "orange" : "green"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Comptes bancaires</h2>
            <div className="flex items-center gap-2">
              {!bridgeConfigured && (
                <button
                  onClick={() => setShowHelp(true)}
                  title="Configuration Bridge API manquante — cliquer pour l'aide"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-colors"
                >
                  <AlertTriangle size={13} />
                  Non configuré
                  <HelpCircle size={13} className="ml-0.5" />
                </button>
              )}
              <button
                onClick={handleConnectBank}
                disabled={connecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                <Plus size={14} />
                {connecting ? "Connexion…" : "Connecter"}
              </button>
            </div>
          </div>

          {!bridgeConfigured && (
            <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                La connexion bancaire via Bridge API n'est pas encore configurée.{" "}
                <button
                  onClick={() => setShowHelp(true)}
                  className="underline underline-offset-2 hover:text-amber-200 transition-colors"
                >
                  Voir comment configurer
                </button>
              </p>
            </div>
          )}

          <div className="space-y-3">
            {accounts.length === 0 && <p className="text-gray-500 text-sm">Aucun compte connecté</p>}
            {accounts.map((account: Account) => (
              <div key={account.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{account.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{account.account_type}</p>
                </div>
                <p className={`text-sm font-semibold ${account.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmt(account.balance, account.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-white mb-4">Dépenses du mois par catégorie</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune donnée ce mois-ci</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l) => l} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-white mb-4">Projets en cours</h2>
        <div className="space-y-4">
          {projects.length === 0 && <p className="text-gray-500 text-sm">Aucun projet actif</p>}
          {projects.slice(0, 4).map((project) => (
            <div key={project.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white">
                  {project.emoji} {project.name}
                </span>
                <span className="text-xs text-gray-400">
                  {fmt(project.saved_amount)} / {fmt(project.target_amount)}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${project.progress_percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{project.progress_percent.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-white mb-4">Dernières analyses IA</h2>
        <div className="space-y-3">
          {unreadInsights.length === 0 && <p className="text-gray-500 text-sm">Aucune analyse disponible</p>}
          {unreadInsights.slice(0, 3).map((insight) => (
            <div key={insight.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                insight.severity === "critical" ? "bg-red-400" :
                insight.severity === "warning" ? "bg-yellow-400" : "bg-blue-400"
              }`} />
              <div>
                <p className="text-sm font-medium text-white">{insight.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {showHelp && (
      <BridgeConfigHelp
        missingFields={missingFields}
        onClose={() => setShowHelp(false)}
      />
    )}
    </>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    purple: "bg-purple-500/10 text-purple-400",
    orange: "bg-orange-500/10 text-orange-400",
  };
  return (
    <div className="card flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// Re-export TrendingDown to avoid unused import warning
const _unused = TrendingDown;
void _unused;
