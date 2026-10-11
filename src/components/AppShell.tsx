import { Link } from "@tanstack/react-router";
import { LayoutGrid, UtensilsCrossed, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

const nav = [
  { to: "/", label: "Tables", icon: LayoutGrid },
  { to: "/products", label: "Menu", icon: UtensilsCrossed },
  { to: "/summary", label: "Summary", icon: BarChart3 },
] as const;

export function AppShell({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const ready = useStore((s) => s.ready);
  const error = useStore((s) => s.error);
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pl-24">
      <aside className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card md:inset-y-0 md:left-0 md:right-auto md:w-24 md:flex-col md:border-r md:border-t-0 md:pt-6">
        <div className="hidden md:mb-6 md:flex md:flex-col md:items-center md:gap-1.5">
          <img src="/assets/logo-192.png" alt="Tablo logo" className="h-11 w-11 rounded-2xl shadow-sm" />
          <span className="font-display text-lg leading-tight text-primary">Tablo</span>
        </div>
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground md:flex-none md:py-4"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-6 w-6" />
            {label}
          </Link>
        ))}
      </aside>
      <header className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-secondary-foreground md:hidden">
            <img src="/assets/logo-192.png" alt="" className="h-4 w-4 rounded" />
            Tablo
          </p>
          <h1 className="truncate font-display text-2xl text-foreground md:text-3xl">{title}</h1>
        </div>
        {action}
      </header>
      <main className="px-4 py-4 md:px-8 md:py-6">
        {error ? (
          <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            Couldn't open device storage: {error}
          </p>
        ) : null}
        {ready ? (
          children
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
        )}
      </main>
    </div>
  );
}
