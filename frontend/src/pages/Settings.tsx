import { Sun, Moon, Monitor, LogOut, Shield, User as UserIcon, Plus, AlertTriangle, HelpCircle, ChevronDown, Eye, EyeOff, Save, RotateCcw } from "lucide-react";
import { useAuthStore } from "../store/useStore";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemePreference } from "../contexts/ThemeContext";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi, configApi } from "../services/api";
import BridgeConfigHelp from "../components/BridgeConfigHelp";

interface EnvVarMeta {
  key: string;
  label: string;
  hint?: string;
  sensitive?: boolean;
  type?: "boolean" | "integer" | "string";
}

interface EnvGroup {
  label: string;
  vars: EnvVarMeta[];
}

const ENV_GROUPS: EnvGroup[] = [
  {
    label: "Application",
    vars: [
      { key: "APP_NAME", label: "Nom de l'application" },
      { key: "DEBUG", label: "Mode debug", type: "boolean" },
      { key: "VERSION", label: "Version" },
    ],
  },
  {
    label: "Base de données",
    vars: [
      { key: "DATABASE_URL", label: "URL PostgreSQL", sensitive: true, hint: "postgresql://user:pass@host:5432/db" },
    ],
  },
  {
    label: "Sécurité / JWT",
    vars: [
      { key: "SECRET_KEY", label: "Clé secrète JWT", sensitive: true, hint: "openssl rand -hex 32" },
      { key: "ALGORITHM", label: "Algorithme JWT" },
      { key: "ACCESS_TOKEN_EXPIRE_MINUTES", label: "Expiration du token (min)", type: "integer" },
    ],
  },
  {
    label: "Intelligence artificielle (Groq)",
    vars: [
      { key: "GROQ_API_KEY", label: "Clé API Groq", sensitive: true, hint: "gsk_…" },
      { key: "GROQ_MODEL_FAST", label: "Modèle rapide" },
      { key: "GROQ_MODEL_SMART", label: "Modèle performant" },
    ],
  },
  {
    label: "Open Banking (Bridge API)",
    vars: [
      { key: "BRIDGE_CLIENT_ID", label: "Client ID", sensitive: true },
      { key: "BRIDGE_CLIENT_SECRET", label: "Client Secret", sensitive: true },
      { key: "BRIDGE_API_URL", label: "URL de l'API Bridge" },
    ],
  },
  {
    label: "Redis",
    vars: [
      { key: "REDIS_URL", label: "URL Redis" },
    ],
  },
  {
    label: "Premier utilisateur",
    vars: [
      { key: "FIRST_USER_EMAIL", label: "Email" },
      { key: "FIRST_USER_PASSWORD", label: "Mot de passe", sensitive: true },
      { key: "FIRST_USER_NAME", label: "Nom" },
    ],
  },
  {
    label: "CORS",
    vars: [
      { key: "CORS_ORIGINS", label: "Origines autorisées", hint: "http://localhost:3000,https://monapp.com" },
    ],
  },
];

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: "system", icon: Monitor, label: "Système" },
  { value: "light",  icon: Sun,     label: "Clair"   },
  { value: "dark",   icon: Moon,    label: "Sombre"  },
];

export default function Settings() {
  const { user, logout } = useAuthStore();
  const { preference, setPreference } = useTheme();
  const [connecting, setConnecting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // ── Env config section ──────────────────────────────────────────────────────
  const [envOpen, setEnvOpen] = useState(false);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const { data: bridgeStatus } = useQuery({
    queryKey: ["bridge-status"],
    queryFn: () => accountsApi.connectStatus().then((r) => r.data),
    staleTime: 60_000,
  });

  const bridgeConfigured = bridgeStatus?.configured ?? true;
  const missingFields = bridgeStatus?.missing_fields ?? [];

  const { data: configData } = useQuery({
    queryKey: ["env-config"],
    queryFn: () => configApi.read().then((r) => r.data),
    enabled: envOpen,
  });

  useEffect(() => {
    if (configData) {
      setEnvValues(
        Object.fromEntries(Object.entries(configData).map(([k, v]) => [k, String(v)]))
      );
    }
  }, [configData]);

  const toggleReveal = (key: string) =>
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleSaveEnv = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      await configApi.update(envValues);
      setSaveResult({ ok: true, msg: "Sauvegardé dans le fichier .env — redémarrez le serveur pour appliquer." });
    } catch {
      setSaveResult({ ok: false, msg: "Erreur lors de la sauvegarde du fichier .env." });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectBank = async () => {
    setConnectError(null);
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
      setConnectError("Impossible de lancer la connexion bancaire. Vérifiez la configuration Bridge API.");
    }
  };

  return (
    <>
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Paramètres</h1>

      {/* Profil */}
      <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Profil</h2>
        </div>
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-700 flex items-center justify-center text-lg font-bold text-white shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? <UserIcon size={20} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-medium truncate">{user?.full_name}</p>
              {user?.is_superuser && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 text-xs font-medium">
                  <Shield size={11} />
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* Thème */}
      <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Apparence</h2>
        </div>
        <div className="px-4 py-3 flex gap-2">
          {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setPreference(value)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg text-sm transition-colors border ${
                preference === value
                  ? "border-primary-500 bg-primary-600/20 text-primary-400"
                  : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200"
              }`}
            >
              <Icon size={18} />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Comptes bancaires */}
      <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Comptes bancaires</h2>
          <div className="flex items-center gap-2 shrink-0">
            {!bridgeConfigured && (
              <button
                onClick={() => setShowHelp(true)}
                title="Configuration Bridge API manquante"
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
              {connecting ? "Connexion…" : "Connecter un compte"}
            </button>
          </div>
        </div>
        {!bridgeConfigured && (
          <div className="mx-4 mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 flex items-start gap-2">
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
        {connectError && (
          <div className="mx-4 mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{connectError}</p>
          </div>
        )}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500">Connectez vos comptes bancaires via Bridge API pour synchroniser automatiquement vos transactions.</p>
        </div>
      </section>

      {/* Variables d'environnement */}
      <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <button
          onClick={() => setEnvOpen((v) => !v)}
          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors ${envOpen ? "border-b border-gray-800" : ""}`}
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Configuration avancée (.env)</h2>
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform duration-200 ${envOpen ? "rotate-180" : ""}`}
          />
        </button>

        {envOpen && (
          <div className="px-4 py-4 space-y-5">
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Les modifications sont écrites dans le fichier <code className="font-mono bg-amber-500/20 px-1 rounded">.env</code>.
                Un <strong>redémarrage du serveur</strong> est nécessaire pour qu'elles prennent effet.
              </p>
            </div>

            {ENV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.label}</p>
                <div className="space-y-2">
                  {group.vars.map((meta) => {
                    const value = envValues[meta.key] ?? "";
                    const revealed = revealedKeys.has(meta.key);
                    return (
                      <div key={meta.key}>
                        <label className="block text-xs text-gray-400 mb-1">
                          {meta.label}
                          <span className="ml-1.5 font-mono text-gray-600 text-[10px]">{meta.key}</span>
                        </label>
                        {meta.type === "boolean" ? (
                          <button
                            type="button"
                            onClick={() => setEnvValues((prev) => ({ ...prev, [meta.key]: value === "true" ? "false" : "true" }))}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              value === "true" ? "bg-primary-600" : "bg-gray-700"
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                              value === "true" ? "translate-x-5" : "translate-x-0.5"
                            }`} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type={meta.sensitive && !revealed ? "password" : "text"}
                              inputMode={meta.type === "integer" ? "numeric" : undefined}
                              value={value}
                              onChange={(e) => setEnvValues((prev) => ({ ...prev, [meta.key]: e.target.value }))}
                              placeholder={meta.hint}
                              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors font-mono"
                            />
                            {meta.sensitive && (
                              <button
                                type="button"
                                onClick={() => toggleReveal(meta.key)}
                                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                              >
                                {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {saveResult && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 border text-xs leading-relaxed ${
                saveResult.ok
                  ? "bg-green-500/10 border-green-500/20 text-green-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}>
                {saveResult.msg}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSaveEnv}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                <Save size={13} />
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
              <button
                onClick={() => {
                  setSaveResult(null);
                  if (configData) {
                    setEnvValues(Object.fromEntries(Object.entries(configData).map(([k, v]) => [k, String(v)])));
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-colors"
              >
                <RotateCcw size={13} />
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Déconnexion */}
      <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-4 text-sm text-red-400 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={18} />
          <span>Se déconnecter</span>
        </button>
      </section>
    </div>

    {showHelp && <BridgeConfigHelp missingFields={missingFields} onClose={() => setShowHelp(false)} />}
    </>
  );
}
