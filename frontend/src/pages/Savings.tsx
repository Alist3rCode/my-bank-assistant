import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { savingsApi } from "../services/api";
import type { Saving } from "../types";

const SAVING_TYPE_LABELS: Record<string, string> = {
  livret_a: "Livret A",
  livret_jeune: "Livret Jeune",
  pel: "PEL",
  cel: "CEL",
  assurance_vie: "Assurance Vie",
  pea: "PEA",
  cash: "Espèces",
  other: "Autre",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default function Savings() {
  const qc = useQueryClient();
  const { data: savings = [], isLoading } = useQuery({
    queryKey: ["savings"],
    queryFn: () => savingsApi.list().then((r) => r.data),
  });
  const { data: totalData } = useQuery({
    queryKey: ["savings-total"],
    queryFn: () => savingsApi.total().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => savingsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savings", "savings-total"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Épargne</h1>
        <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-lg">
          <TrendingUp size={16} />
          <span className="text-sm font-semibold">{fmt(totalData?.total_savings ?? 0)}</span>
          <span className="text-xs text-green-600">total</span>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savings.map((saving: Saving) => (
            <div key={saving.id} className="card relative group">
              <button
                onClick={() => deleteMutation.mutate(saving.id)}
                className="absolute top-4 right-4 p-1 text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>

              <div className="mb-3">
                <p className="font-medium text-white">{saving.name}</p>
                <span className="badge bg-gray-700 text-gray-400 mt-1">{SAVING_TYPE_LABELS[saving.saving_type]}</span>
              </div>

              <p className="text-2xl font-bold text-white">{fmt(saving.current_amount)}</p>

              {saving.target_amount && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Objectif : {fmt(saving.target_amount)}</span>
                    <span>{((saving.current_amount / saving.target_amount) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (saving.current_amount / saving.target_amount) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {saving.interest_rate > 0 && (
                <p className="text-xs text-gray-500 mt-2">Taux : {saving.interest_rate}% / an</p>
              )}
              {saving.deadline && (
                <p className="text-xs text-gray-500">Échéance : {saving.deadline}</p>
              )}
            </div>
          ))}

          <AddSavingCard onSuccess={() => qc.invalidateQueries({ queryKey: ["savings", "savings-total"] })} />
        </div>
      )}
    </div>
  );
}

function AddSavingCard({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", saving_type: "cash", current_amount: "", target_amount: "", interest_rate: "" });
  const mutation = useMutation({
    mutationFn: () =>
      savingsApi.create({
        name: form.name,
        saving_type: form.saving_type as Saving["saving_type"],
        current_amount: parseFloat(form.current_amount) || 0,
        target_amount: form.target_amount ? parseFloat(form.target_amount) : undefined,
        interest_rate: parseFloat(form.interest_rate) || 0,
      }),
    onSuccess: () => { onSuccess(); setOpen(false); setForm({ name: "", saving_type: "cash", current_amount: "", target_amount: "", interest_rate: "" }); },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="card border-dashed flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors min-h-[120px]">
        <Plus size={18} />
        <span className="text-sm">Ajouter un compte</span>
      </button>
    );
  }

  return (
    <div className="card">
      <h3 className="font-medium text-white mb-4">Nouveau compte</h3>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
        <input className="input w-full" placeholder="Nom (ex: Livret A)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="input w-full" value={form.saving_type} onChange={(e) => setForm({ ...form, saving_type: e.target.value })}>
          {Object.entries(SAVING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input w-full" type="number" placeholder="Solde actuel (€)" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
        <input className="input w-full" type="number" placeholder="Objectif (€, optionnel)" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
        <input className="input w-full" type="number" step="0.01" placeholder="Taux d'intérêt %" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>Créer</button>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Annuler</button>
        </div>
      </form>
    </div>
  );
}
