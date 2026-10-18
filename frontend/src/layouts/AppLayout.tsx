import { FileText, LayoutDashboard, Lightbulb, Menu, Moon, Search, Settings, Sparkles, Sun, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Badge } from "../components/ui";
import { useData } from "../hooks/DataContext";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze Reviews", icon: Upload },
  { to: "/explorer", label: "Review Explorer", icon: Search },
  { to: "/insights", label: "AI Insights", icon: Lightbulb },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const { summary, health, healthError } = useData();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("revio-theme") !== "light");
  const loc = useLocation();
  const current = NAV.find((n) => n.to === loc.pathname) ?? NAV[0];

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("revio-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen md:flex">
      <aside className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-30 w-64 border-r border-line bg-surface p-4 md:static md:block`}>
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white"><Sparkles className="h-4 w-4" aria-hidden /></span>Revio AI</Link>
          <button className="md:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav aria-label="Main" className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface2 hover:text-fg"}`}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </NavLink>
          ))}
        </nav>
        <p className="absolute bottom-4 left-4 right-4 text-xs text-muted">Independent prototype. Not an official Cynbit feature.</p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:px-8">
          <button className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="mr-auto">
            <p className="text-xs text-muted">Revio AI / {current.label}</p>
            <h1 className="text-lg font-semibold">{current.label}</h1>
          </div>
          {summary?.is_demo && <Badge tone="violet">Synthetic demo data</Badge>}
          <span data-testid="backend-status" className="flex items-center gap-2 text-xs text-muted" title={healthError ?? "Backend connected"}>
            <span className={`h-2 w-2 rounded-full ${health ? "bg-emerald-500" : "bg-red-500"}`} />
            {health ? `Backend online (${health.sentiment.mode})` : "Backend offline"}
          </span>
          <button aria-label="Toggle theme" onClick={() => setDark((d) => !d)} className="rounded-lg border border-line p-2 hover:border-accent/50">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        </header>
        <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
