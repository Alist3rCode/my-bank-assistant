import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark } from "lucide-react";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/useStore";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await authApi.login(form.email, form.password)
          : await authApi.register(form.email, form.password, form.full_name);
      setAuth(res.data.user, res.data.access_token);
      navigate("/");
    } catch {
      setError(mode === "login" ? "Identifiants incorrects" : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <Landmark size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bank Assistant</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez votre budget intelligemment</p>
        </div>

        <div className="card">
          <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m ? "bg-gray-700 text-white" : "text-gray-400"
                }`}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom complet</label>
                <input
                  className="input w-full"
                  placeholder="Jean Dupont"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                className="input w-full"
                placeholder="jean@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Mot de passe</label>
              <input
                type="password"
                className="input w-full"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "Créer un compte"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
