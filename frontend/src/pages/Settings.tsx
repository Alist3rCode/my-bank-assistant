import { Sun, Moon, Monitor, LogOut, Shield, User as UserIcon } from "lucide-react";
import { useAuthStore } from "../store/useStore";
import { useTheme } from "../contexts/ThemeContext";
import type { ThemePreference } from "../contexts/ThemeContext";

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: "system", icon: Monitor, label: "Système" },
  { value: "light",  icon: Sun,     label: "Clair"   },
  { value: "dark",   icon: Moon,    label: "Sombre"  },
];

export default function Settings() {
  const { user, logout } = useAuthStore();
  const { preference, setPreference } = useTheme();

  return (
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
  );
}
