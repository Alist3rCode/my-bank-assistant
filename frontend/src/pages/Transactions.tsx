import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, Tag, AlertTriangle } from "lucide-react";
import { transactionsApi } from "../services/api";
import type { Transaction } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
  alimentation: "Alimentation",
  transport: "Transport",
  logement: "Logement",
  sante: "Santé",
  loisirs: "Loisirs",
  shopping: "Shopping",
  abonnements: "Abonnements",
  revenus: "Revenus",
  epargne: "Épargne",
  impots: "Impôts",
  restaurants: "Restaurants",
  voyages: "Voyages",
  education: "Éducation",
  autre: "Autre",
};

function fmt(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export default function Transactions() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", search],
    queryFn: () => transactionsApi.list({ search: search || undefined, limit: 100 }).then((r) => r.data),
  });

  const categorizeMutation = useMutation({
    mutationFn: (id: number) => transactionsApi.categorize(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <button
          onClick={() => transactionsApi.list({ limit: 50 })}
          className="btn-ghost flex items-center gap-2"
        >
          <RefreshCw size={15} />
          Synchroniser
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input w-full pl-9"
          placeholder="Rechercher une transaction..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune transaction trouvée</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">Catégorie</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wide">Montant</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: Transaction) => (
                <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{tx.transaction_date}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {tx.is_anomaly && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
                      {tx.is_recurring && (
                        <span className="badge bg-blue-500/10 text-blue-400">récurrent</span>
                      )}
                      <span className="text-white">{tx.clean_description || tx.description}</span>
                    </div>
                    {tx.merchant_name && (
                      <p className="text-xs text-gray-500 mt-0.5">{tx.merchant_name}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge bg-gray-700 text-gray-300">
                      {CATEGORY_LABELS[tx.ai_category || tx.category] || tx.category}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right font-semibold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmt(tx.amount)}
                  </td>
                  <td className="px-5 py-3">
                    {!tx.ai_category && (
                      <button
                        onClick={() => categorizeMutation.mutate(tx.id)}
                        disabled={categorizeMutation.isPending}
                        className="btn-ghost py-1 px-2 flex items-center gap-1 text-xs"
                      >
                        <Tag size={12} />
                        IA
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
