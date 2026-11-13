import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { NAV_ITEMS } from "./Sidebar";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(`${to}/`);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-7">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.to} className="relative">
              <Link
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 min-h-[58px] py-2 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottomnav-indicator"
                    transition={spring}
                    className="absolute top-0 h-[2px] w-8 bg-foreground rounded-full"
                  />
                )}
                <Icon className="w-[19px] h-[19px]" strokeWidth={1.75} />
                <span className="text-[9.5px] sm:text-[10.5px] tracking-tight sm:tracking-wide truncate max-w-full px-0.5">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
