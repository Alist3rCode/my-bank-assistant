import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  PiggyBank,
  Target,
  Sparkles,
  LogOut,
  Landmark,
} from "lucide-react";
import { useAuthStore } from "../../store/useStore";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { to: "/budgets", icon: PieChart, label: "Budgets" },
  { to: "/savings", icon: PiggyBank, label: "Épargne" },
  { to: "/projects", icon: Target, label: "Projets" },
  { to: "/ai", icon: Sparkles, label: "IA & Analyses" },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-60 flex flex-col bg-gray-900 border-r border-gray-800 shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Landmark size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Bank Assistant</p>
          <p className="text-xs text-gray-500">Crédit Agricole</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary-600/20 text-primary-400 font-medium"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center text-xs font-bold text-white">
            {user?.full_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors">
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
