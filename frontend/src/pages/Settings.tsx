import { Sun, Moon, Monitor, LogOut, Shield, User as UserIcon, Plus, AlertTriangle, HelpCircle } from "lucide-react";
import { useAuthStore } from "../store/useStore";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemePreference } from "../contexts/ThemeContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../services/api";
import BridgeConfigHelp from "../components/BridgeConfigHelp";

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

  const { data: bridgeStatus } = useQuery({
    queryKey: ["bridge-status"],
    queryFn: () => accountsApi.connectStatus().then((r) => r.data),
    staleTime: 60_000,
  });

  const bridgeConfigured = bridgeStatus?.configured ?? true;
  const missingFields = bridgeStatus?.missing_fields ?? [];

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
