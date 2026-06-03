import { NavLink, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import {
  LayoutDashboard, ArrowLeftRight, PieChart,
  PiggyBank, Target, Sparkles,
} from "lucide-react";

const mobileNav = [
  { to: "/", icon: LayoutDashboard, label: "Accueil" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Comptes" },
  { to: "/budgets", icon: PieChart, label: "Budgets" },
  { to: "/savings", icon: PiggyBank, label: "Épargne" },
  { to: "/projects", icon: Target, label: "Projets" },
  { to: "/ai", icon: Sparkles, label: "IA" },
];

export default function Layout() {
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-16 md:pb-6 bg-gray-950">
        <Outlet />
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors min-w-0 ${
                isActive ? "text-primary-400" : "text-gray-500"
              }`
            }
          >
            <Icon size={20} />
            <span className="truncate w-full text-center px-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
