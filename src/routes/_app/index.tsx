import { createFileRoute } from "@tanstack/react-router";
import { Activity, Wrench, Sparkles, Mountain } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/primitives/PageHeader";
import { SectionCard } from "@/components/primitives/SectionCard";
import { StatCard } from "@/components/primitives/StatCard";
import { useQueue } from "@/store/queue.store";
import { useArchive } from "@/store/archive.store";
import { useActivity } from "@/store/activity.store";
import { useTicker } from "@/hooks/useTicker";
import { formatCountdown, formatRelative, formatTime } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/mock/seed";
import { dur, easeOut } from "@/lib/motion";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Главный экран — Draxler" }] }),
  component: Dashboard,
});

const CAT_ICON = {
  "off-road": Mountain,
  luxury: Sparkles,
  sport: Wrench,
} as const;

function Dashboard() {
  const items = useQueue((s) => s.items);
  const intervalMin = useQueue((s) => s.intervalMin);
  const archive = useArchive((s) => s.items);
  const activity = useActivity((s) => s.entries);
  const now = useTicker(1000);

  const activeQueue = items.filter((i) => !i.paused);
  const totalSlots = 100;
  const publishedToday = archive.filter((a) => now - a.publishedAt < 24 * 3600_000).length;
  const next = activeQueue[0];
  const nextLabel = next
    ? `Следующий диск: ${formatTime(next.scheduledAt)} · ${formatCountdown(next.scheduledAt, now)}`
    : "Очередь пуста";

  const counts = {
    "off-road": archive.filter((a) => a.category === "off-road").length,
    luxury: archive.filter((a) => a.category === "luxury").length,
    sport: archive.filter((a) => a.category === "sport").length,
  };
  const total = counts["off-road"] + counts.luxury + counts.sport || 1;

  const progressPct = Math.min(100, (publishedToday / totalSlots) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: easeOut }}
    >
      <PageHeader
        eyebrow="Обзор"
        title="Главный экран"
        description="Состояние активного батча, распределение каталога и последние события."
      />

      {/* Queue status */}
      <SectionCard className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
              Активный батч
            </div>
            <div className="mt-2 text-[20px] font-semibold text-foreground">
              Опубликовано {publishedToday}/{totalSlots}
            </div>
          </div>
          <div className="text-[13px] text-muted-foreground tabular-nums">{nextLabel}</div>
        </div>
        <div className="relative h-[3px] w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="absolute inset-y-0 left-0 bg-foreground"
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Интервал публикации: {intervalMin} мин</span>
          <span>В очереди: {items.length}</span>
        </div>
      </SectionCard>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(["off-road", "luxury", "sport"] as const).map((cat) => {
          const Icon = CAT_ICON[cat];
          const pct = Math.round((counts[cat] / total) * 100);
          return (
            <StatCard
              key={cat}
              label={CATEGORY_LABEL[cat]}
              value={counts[cat]}
              hint={`${pct}% каталога`}
            >
              <div className="relative w-14 h-14">
                <DonutRing pct={pct} />
                <Icon
                  className="absolute inset-0 m-auto w-4 h-4 text-muted-foreground"
                  strokeWidth={1.6}
                />
              </div>
            </StatCard>
          );
        })}
      </div>

      {/* Activity */}
      <SectionCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
              Активность
            </div>
            <div className="mt-1 text-[18px] font-semibold text-foreground">Последние события</div>
          </div>
          <Activity className="w-4 h-4 text-muted-foreground" strokeWidth={1.6} />
        </div>
        <ol className="relative">
          <span className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
          {activity.slice(0, 8).map((e) => (
            <li key={e.id} className="relative pl-7 py-3 first:pt-0 last:pb-0">
              <span className="absolute left-0 top-[18px] w-[11px] h-[11px] rounded-full bg-background border border-foreground" />
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                <div className="text-[14px] text-foreground">
                  <span className="font-medium">{e.actor}</span>{" "}
                  <span className="text-muted-foreground">{e.action}</span>
                </div>
                <div className="text-[12px] text-muted-foreground tabular-nums shrink-0">
                  {formatRelative(new Date(e.created_at).getTime(), now)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>
    </motion.div>
  );
}

function DonutRing({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--muted)" strokeWidth="2" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
      />
    </svg>
  );
}
