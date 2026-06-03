import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, RefreshCw, X, TrendingUp, AlertTriangle, PiggyBank, BarChart3 } from "lucide-react";
import { aiApi } from "../services/api";
import type { AIInsight } from "../types";

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/5",
  warning: "border-yellow-500/30 bg-yellow-500/5",
  critical: "border-red-500/30 bg-red-500/5",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400",
  warning: "bg-yellow-500/10 text-yellow-400",
  critical: "bg-red-500/10 text-red-400",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  anomaly: <AlertTriangle size={15} />,
  prediction: <TrendingUp size={15} />,
  savings_opportunity: <PiggyBank size={15} />,
  budget_alert: <BarChart3 size={15} />,
  scenario: <Sparkles size={15} />,
};

export default function AIInsights() {
  const qc = useQueryClient();
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["insights"],
    queryFn: () => aiApi.insights().then((r) => r.data),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => aiApi.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });

  const [lifeChangeForm, setLifeChangeForm] = useState({ change: "", goal: "" });
  const [lifeChangeResult, setLifeChangeResult] = useState<Record<string, unknown> | null>(null);

  const anomalyMutation = useMutation({ mutationFn: () => aiApi.analyzeAnomalies(), onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }) });
  const cashflowMutation = useMutation({ mutationFn: () => aiApi.analyzeCashflow(), onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }) });
  const hiddenSavingsMutation = useMutation({ mutationFn: () => aiApi.analyzeHiddenSavings(), onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }) });
  const batchMutation = useMutation({ mutationFn: () => aiApi.batchCategorize(), onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }) });
  const lifeMutation = useMutation({
    mutationFn: () => aiApi.simulateLifeChange(lifeChangeForm.change, lifeChangeForm.goal || undefined).then((r) => r.data),
    onSuccess: (data) => setLifeChangeResult(data as Record<string, unknown>),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Sparkles size={22} className="text-purple-400" />
        IA & Analyses
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ActionCard
          icon={<AlertTriangle size={16} />}
          label="Détecter anomalies"
          color="red"
          loading={anomalyMutation.isPending}
          onClick={() => anomalyMutation.mutate()}
        />
        <ActionCard
          icon={<TrendingUp size={16} />}
          label="Projection trésorerie"
          color="blue"
          loading={cashflowMutation.isPending}
          onClick={() => cashflowMutation.mutate()}
        />
        <ActionCard
          icon={<PiggyBank size={16} />}
          label="Économies cachées"
          color="green"
          loading={hiddenSavingsMutation.isPending}
          onClick={() => hiddenSavingsMutation.mutate()}
        />
        <ActionCard
          icon={<RefreshCw size={16} />}
          label="Catégoriser tout"
          color="purple"
          loading={batchMutation.isPending}
          onClick={() => batchMutation.mutate()}
        />
      </div>

      <div className="card">
        <h2 className="font-semibold text-white mb-4">Simulateur de vie</h2>
        <p className="text-sm text-gray-400 mb-4">
          Décrivez un changement de vie (ex: "naissance d'un enfant", "augmentation de loyer de 200€") et évaluez son impact sur votre budget.
        </p>
        <div className="space-y-3">
          <textarea
            className="input w-full resize-none"
            rows={2}
            placeholder="Changement de vie (ex: déménagement dans une ville plus chère, +350€/mois de loyer)"
            value={lifeChangeForm.change}
            onChange={(e) => setLifeChangeForm({ ...lifeChangeForm, change: e.target.value })}
          />
          <input
            className="input w-full"
            placeholder="Achat envisagé (optionnel, ex: moto 8000€)"
            value={lifeChangeForm.goal}
            onChange={(e) => setLifeChangeForm({ ...lifeChangeForm, goal: e.target.value })}
          />
          <button
            onClick={() => lifeMutation.mutate()}
            disabled={lifeMutation.isPending || !lifeChangeForm.change}
            className="btn-primary"
          >
            {lifeMutation.isPending ? "Simulation en cours..." : "Simuler"}
          </button>
        </div>

        {lifeChangeResult && (
          <div className="mt-5 p-4 bg-gray-800 rounded-lg space-y-2">
            <p className="text-sm font-medium text-white">Résultat de la simulation</p>
            {(lifeChangeResult.new_monthly_balance !== undefined) && (
              <p className="text-sm text-gray-300">
                Nouveau reste à vivre mensuel :{" "}
                <span className={`font-semibold ${Number(lifeChangeResult.new_monthly_balance) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(lifeChangeResult.new_monthly_balance))}
                </span>
              </p>
            )}
            {Array.isArray(lifeChangeResult.advice) && lifeChangeResult.advice.length > 0 && (
              <ul className="mt-2 space-y-1">
                {(lifeChangeResult.advice as string[]).map((tip, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-purple-400 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-white mb-4">Analyses & Alertes</h2>
        {isLoading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : insights.length === 0 ? (
          <div className="card text-center py-10">
            <Sparkles size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Aucune analyse disponible.</p>
            <p className="text-gray-600 text-sm mt-1">Lancez une analyse ci-dessus pour voir les résultats.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight: AIInsight) => (
              <div key={insight.id} className={`card border ${SEVERITY_STYLES[insight.severity]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-md ${SEVERITY_BADGE[insight.severity]}`}>
                      {TYPE_ICONS[insight.insight_type] || <Sparkles size={15} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-white">{insight.title}</p>
                        <span className={`badge ${SEVERITY_BADGE[insight.severity]}`}>{insight.severity}</span>
                        {!insight.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
                      </div>
                      <p className="text-xs text-gray-400">{insight.description}</p>
                      <p className="text-xs text-gray-600 mt-1">{new Date(insight.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissMutation.mutate(insight.id)}
                    className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ icon, label, color, loading, onClick }: {
  icon: React.ReactNode; label: string; color: string; loading: boolean; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    red: "hover:border-red-500/40 hover:bg-red-500/5",
    blue: "hover:border-blue-500/40 hover:bg-blue-500/5",
    green: "hover:border-green-500/40 hover:bg-green-500/5",
    purple: "hover:border-purple-500/40 hover:bg-purple-500/5",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`card flex flex-col items-center justify-center gap-2 py-5 border transition-all cursor-pointer ${colors[color]} disabled:opacity-50`}
    >
      <div className="text-gray-300">{loading ? <RefreshCw size={16} className="animate-spin" /> : icon}</div>
      <span className="text-xs text-gray-400 text-center">{label}</span>
    </button>
  );
}
