import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  UploadCloud,
  Layers,
  ListOrdered,
  Archive,
  LogOut,
  BarChart3,
  Newspaper,
} from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { cn } from "@/lib/utils";

type NavItem = {
  to: "/" | "/analytics" | "/upload" | "/batch" | "/queue" | "/archive" | "/blog";
  label: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Главная", icon: LayoutGrid, exact: true },
  { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  { to: "/upload", label: "Загрузка", icon: UploadCloud },
  { to: "/batch", label: "Пакет", icon: Layers },
  { to: "/queue", label: "Очередь", icon: ListOrdered },
  { to: "/archive", label: "Архив", icon: Archive },
  { to: "/blog", label: "Блог", icon: Newspaper },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(`${to}/`);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] flex-col bg-sidebar border-r border-border z-40">
      <div className="px-7 pt-9 pb-10">
        <Link to="/" className="block">
          <div className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
            Draxler
          </div>
          <div className="mt-1 text-[10px] tracking-[0.24em] uppercase text-muted-foreground">
            Admin
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 px-3 h-11 rounded-[2px] text-[14px] transition-colors",
                active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="w-[17px] h-[17px]" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-[2px]">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-foreground truncate">
              {user?.name ?? "Гость"}
            </div>
            <div className="text-[11px] text-muted-foreground">Администратор</div>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Выйти"
            className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}
