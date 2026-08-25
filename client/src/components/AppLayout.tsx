import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Wallet,
  LayoutDashboard,
  Receipt,
  Target,
  Landmark,
  Repeat,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/useAuth";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: Receipt, end: false },
  { to: "/budgets", label: "Budgets", icon: Target, end: false },
  { to: "/accounts", label: "Accounts", icon: Landmark, end: false },
  { to: "/recurring", label: "Recurring", icon: Repeat, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand/15 text-brand-soft"
                : "text-ink-dim hover:bg-card-hi hover:text-ink"
            }`
          }
        >
          <Icon size={16} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-info shadow-lg shadow-brand/25">
        <Wallet size={17} className="text-white" strokeWidth={2.2} />
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Money Tracker</span>
    </div>
  );

  const footer = (
    <div className="border-t border-line pt-4">
      <p className="truncate px-1 text-xs text-ink-faint">{user?.email}</p>
      <button
        onClick={logout}
        className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-card-hi hover:text-ink"
      >
        <LogOut size={16} strokeWidth={2} />
        Log out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-card px-4 py-6 md:flex">
        {brand}
        <div className="mt-8 flex flex-1 flex-col">{nav}</div>
        {footer}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-line bg-card px-4 py-6">
            <div className="flex items-center justify-between">
              {brand}
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-ink-dim hover:bg-card-hi hover:text-ink"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="mt-8 flex flex-1 flex-col">{nav}</div>
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 md:hidden">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-ink-dim hover:bg-card-hi hover:text-ink"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-brand-soft" strokeWidth={2.2} />
            <span className="font-semibold text-ink">Money Tracker</span>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
