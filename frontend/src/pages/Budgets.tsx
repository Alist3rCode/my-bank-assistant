import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { budgetsApi } from "../services/api";
import type { Budget } from "../types";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default function Budgets() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const qc = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", month, year],
    queryFn: () => budgetsApi.list(month, year).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => budgetsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });

  const totalLimit = budgets.reduce((s: number, b: Budget) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s: number, b: Budget) => s + b.spent_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Budgets</h1>
        <div className="flex items-center gap-2">
          <select
            className="input"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString("fr", { month: "long" })}
              </option>
            ))}
          </select>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Budget total</p>
            <p className="text-xl font-bold text-white mt-1">{fmt(totalLimit)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Dépenses</p>
            <p className="text-xl font-bold text-red-400 mt-1">{fmt(totalSpent)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Restant</p>
            <p className={`text-xl font-bold mt-1 ${totalLimit - totalSpent >= 0 ? "text-green-400" : "text-red-400"}`}>
              {fmt(totalLimit - totalSpent)}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Aucun budget pour ce mois.</p>
          <p className="text-gray-600 text-sm mt-1">Créez votre premier budget pour suivre vos dépenses.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget: Budget) => (
            <div key={budget.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-white capitalize">{budget.category}</p>
                  <p className="text-xs text-gray-500">
                    {fmt(budget.spent_amount)} dépensé sur {fmt(budget.monthly_limit)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${budget.percent_used >= 100 ? "text-red-400" : budget.percent_used >= 80 ? "text-yellow-400" : "text-green-400"}`}>
                    {budget.percent_used.toFixed(0)}%
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(budget.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    budget.percent_used >= 100 ? "bg-red-500" :
                    budget.percent_used >= 80 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, budget.percent_used)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Restant : {fmt(budget.remaining)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Plus size={16} />Ajouter un budget</h2>
        <AddBudgetForm month={month} year={year} onSuccess={() => qc.invalidateQueries({ queryKey: ["budgets"] })} />
      </div>
    </div>
  );
}

function AddBudgetForm({ month, year, onSuccess }: { month: number; year: number; onSuccess: () => void }) {
  const [category, setCategory] = useState("alimentation");
  const [limit, setLimit] = useState("");
  const createMutation = useMutation({
    mutationFn: () => budgetsApi.create({ category: category as Budget["category"], monthly_limit: parseFloat(limit), month, year }),
    onSuccess,
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
      className="flex flex-col sm:flex-row sm:items-end gap-3"
    >
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
        <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
          {["alimentation","transport","logement","sante","loisirs","shopping","abonnements","restaurants","voyages","education","autre"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="w-full sm:w-36">
        <label className="block text-xs text-gray-500 mb-1">Limite mensuelle (€)</label>
        <input className="input w-full" type="number" min="1" placeholder="500" value={limit} onChange={(e) => setLimit(e.target.value)} required />
      </div>
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={createMutation.isPending}>
        Ajouter
      </button>
    </form>
  );
}
