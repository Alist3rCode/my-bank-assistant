import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { projectsApi } from "../services/api";
import type { Project } from "../types";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-400",
  medium: "bg-yellow-500/10 text-yellow-400",
  low: "bg-gray-700 text-gray-400",
};

export default function Projects() {
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-all"],
    queryFn: () => projectsApi.list().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects-all", "projects"] }),
  });

  const simulateMutation = useMutation({
    mutationFn: (id: number) => projectsApi.simulate(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects-all"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Projets</h1>

      {isLoading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project: Project) => (
            <div key={project.id} className="card group relative">
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => simulateMutation.mutate(project.id)}
                  disabled={simulateMutation.isPending}
                  className="text-gray-500 hover:text-purple-400 transition-colors"
                  title="Simuler avec l'IA"
                >
                  <Sparkles size={14} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(project.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">{project.emoji || "🎯"}</span>
                <div>
                  <p className="font-semibold text-white">{project.name}</p>
                  {project.description && <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>}
                  <span className={`badge mt-1 ${PRIORITY_COLORS[project.priority]}`}>{project.priority}</span>
                </div>
              </div>

              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-bold text-white">{fmt(project.saved_amount)}</p>
                  <p className="text-xs text-gray-500">sur {fmt(project.target_amount)}</p>
                </div>
                <p className="text-lg font-semibold text-primary-400">{project.progress_percent.toFixed(0)}%</p>
              </div>

              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className="bg-primary-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${project.progress_percent}%` }}
                />
              </div>

              {project.deadline && (
                <p className="text-xs text-gray-500 mt-2">Échéance : {project.deadline}</p>
              )}
              {project.monthly_contribution && (
                <p className="text-xs text-gray-500">Contribution : {fmt(project.monthly_contribution)} / mois</p>
              )}

              {project.ai_simulation && (
                <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs font-medium text-purple-400 mb-1">Simulation IA</p>
                  <p className="text-xs text-gray-300">
                    {(project.ai_simulation as { months_to_goal?: number; reach_date?: string }).months_to_goal
                      ? `Objectif atteint en ${(project.ai_simulation as { months_to_goal: number }).months_to_goal} mois`
                      : "Simulation disponible"}
                    {(project.ai_simulation as { reach_date?: string }).reach_date &&
                      ` (${(project.ai_simulation as { reach_date: string }).reach_date})`}
                  </p>
                </div>
              )}
            </div>
          ))}

          <AddProjectCard onSuccess={() => qc.invalidateQueries({ queryKey: ["projects-all", "projects"] })} />
        </div>
      )}
    </div>
  );
}

function AddProjectCard({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", emoji: "", target_amount: "", monthly_contribution: "", deadline: "", priority: "medium" });

  const mutation = useMutation({
    mutationFn: () =>
      projectsApi.create({
        name: form.name,
        description: form.description || undefined,
        emoji: form.emoji || undefined,
        target_amount: parseFloat(form.target_amount),
        monthly_contribution: form.monthly_contribution ? parseFloat(form.monthly_contribution) : undefined,
        deadline: form.deadline || undefined,
        priority: form.priority as Project["priority"],
      }),
    onSuccess: () => { onSuccess(); setOpen(false); },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="card border-dashed flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors min-h-[200px]">
        <Plus size={18} />
        <span className="text-sm">Nouveau projet</span>
      </button>
    );
  }

  return (
    <div className="card">
      <h3 className="font-medium text-white mb-4">Nouveau projet</h3>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
        <div className="flex gap-2">
          <input className="input w-16" placeholder="🎯" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={2} />
          <input className="input flex-1" placeholder="Nom du projet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <input className="input w-full" placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="input w-full" type="number" placeholder="Objectif (€)" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} required />
        <input className="input w-full" type="number" placeholder="Épargne mensuelle (€)" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} />
        <input className="input w-full" type="date" placeholder="Échéance" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        <select className="input w-full" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option value="high">Priorité haute</option>
          <option value="medium">Priorité moyenne</option>
          <option value="low">Priorité basse</option>
        </select>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>Créer</button>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Annuler</button>
        </div>
      </form>
    </div>
  );
}
