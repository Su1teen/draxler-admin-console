import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  MousePointerClick,
  RefreshCw,
  Search,
  Smartphone,
  Monitor,
  Tablet,
  Users,
  Timer,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { SectionCard } from "@/components/primitives/SectionCard";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { useTicker } from "@/hooks/useTicker";
import { dur, easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  FUNNEL_STEPS,
  RANGE_DAYS,
  type LiveEvent,
  type RangeKey,
  buildBreakdowns,
  buildHeatmap,
  buildHourly,
  buildQueries,
  buildSeries,
  buildVitals,
  delta,
  onlineNow,
  randomLiveEvent,
  sum,
} from "@/lib/analytics/generate";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Аналитика — Draxler" }] }),
  component: AnalyticsPage,
});

type Tab = "overview" | "behaviour" | "seo" | "audience";

const nf = new Intl.NumberFormat("ru-RU");
const fmt = (n: number) => nf.format(Math.round(n));
const pct = (n: number, digits = 1) => `${n.toFixed(digits).replace(".", ",")}%`;
const mmss = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

const C = {
  ink: "oklch(0.18 0 0)",
  mid: "oklch(0.55 0 0)",
  soft: "oklch(0.8 0 0)",
  sand: "oklch(0.78 0.05 75)",
  grid: "oklch(0.94 0 0)",
};

const axisProps = {
  tick: { fontSize: 11, fill: "oklch(0.52 0 0)" },
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background shadow-lift rounded-[2px] px-3 py-2 text-[12px] border border-border">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2 tabular-nums">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-medium text-foreground">{fmt(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums",
        good ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {pct(Math.abs(value))}
    </span>
  );
}

function Kpi({
  label,
  value,
  change,
  icon: Icon,
  spark,
  invert,
}: {
  label: string;
  value: string;
  change: number;
  icon: typeof Eye;
  spark?: number[];
  invert?: boolean;
}) {
  return (
    <div className="bg-card rounded-[2px] p-5 md:p-6 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium tracking-[0.16em] uppercase text-muted-foreground truncate">
          {label}
        </div>
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
      </div>
      <div className="text-[28px] md:text-[32px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Delta value={change} invert={invert} />
          <span className="text-[11px] text-muted-foreground">к пред. периоду</span>
        </div>
        {spark && (
          <div className="w-[72px] h-[26px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark.map((v, i) => ({ i, v }))}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={C.ink}
                  strokeWidth={1.4}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function BarList({
  rows,
  total,
  valueLabel = (v: number) => fmt(v),
  extra,
}: {
  rows: { label: string; value: number; sub?: string }[];
  total: number;
  valueLabel?: (v: number) => string;
  extra?: (index: number) => React.ReactNode;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((row, i) => (
        <li key={row.label} className="relative">
          <div className="relative h-9 rounded-[2px] overflow-hidden bg-muted/40">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(row.value / max) * 100}%` }}
              transition={{ duration: 0.7, ease: easeOut, delay: i * 0.03 }}
              className="absolute inset-y-0 left-0 bg-muted"
            />
            <div className="relative h-full flex items-center justify-between gap-3 px-3 text-[13px]">
              <span className="truncate text-foreground">
                {row.label}
                {row.sub && (
                  <span className="ml-2 text-muted-foreground text-[12px]">{row.sub}</span>
                )}
              </span>
              <span className="flex items-center gap-3 shrink-0 tabular-nums">
                {extra?.(i)}
                <span className="font-medium text-foreground">{valueLabel(row.value)}</span>
                <span className="w-12 text-right text-muted-foreground text-[12px]">
                  {pct((row.value / Math.max(total, 1)) * 100)}
                </span>
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CardTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          {eyebrow}
        </div>
        <h3 className="mt-1.5 text-[17px] font-semibold text-foreground">{title}</h3>
      </div>
      {right}
    </div>
  );
}

function AnalyticsPage() {
  const [range, setRange] = React.useState<RangeKey>("7d");
  const [tab, setTab] = React.useState<Tab>("overview");
  const [salt, setSalt] = React.useState(1);
  const minuteTick = useTicker(60_000);
  const now = useTicker(2500);

  const days = RANGE_DAYS[range];

  const data = React.useMemo(() => {
    const ts = minuteTick;
    // "24 часа" is a rolling window, so it is never a half-filled day.
    const all = buildSeries(days * 2, ts, salt, range !== "1d");
    const cur = all.slice(days);
    // Compare like with like: the last day of the previous window is cut to the same share of the day as "today".
    const fullToday = buildSeries(1, ts, salt, false)[0].views;
    const frac = range === "1d" ? 1 : cur[cur.length - 1].views / Math.max(fullToday, 1);
    const prev = all.slice(0, days).map((d, i, arr) =>
      i === arr.length - 1
        ? {
            ...d,
            views: d.views * frac,
            visitors: d.visitors * frac,
            sessions: d.sessions * frac,
            leads: d.leads * frac,
            impressions: d.impressions * frac,
            clicks: d.clicks * frac,
          }
        : d,
    );
    const totals = {
      views: sum(cur, "views"),
      visitors: sum(cur, "visitors"),
      sessions: sum(cur, "sessions"),
      leads: sum(cur, "leads"),
      organic: sum(cur, "organic"),
      impressions: sum(cur, "impressions"),
      clicks: sum(cur, "clicks"),
    };
    const prevTotals = {
      views: sum(prev, "views"),
      visitors: sum(prev, "visitors"),
      sessions: sum(prev, "sessions"),
      leads: sum(prev, "leads"),
      impressions: sum(prev, "impressions"),
      clicks: sum(prev, "clicks"),
    };
    // For "1d" compare against the same part of yesterday.
    if (range === "1d") {
      prevTotals.views = Math.round(cur[0].views * 0.94);
      prevTotals.visitors = Math.round(prevTotals.views / 2.9);
      prevTotals.sessions = Math.round(prevTotals.views / 2.8);
      prevTotals.leads = Math.max(1, Math.round(prevTotals.sessions * 0.016));
      prevTotals.impressions = Math.round(totals.impressions * 0.94);
      prevTotals.clicks = Math.round(totals.clicks * 0.95);
    }
    const rnd = (salt * 37 + days) % 100;
    const bounce = 38 + (rnd % 9) + Math.sin(salt + days) * 2;
    const prevBounce = bounce + 1.8;
    const avgDuration = 148 + (rnd % 40);
    const prevAvgDuration = avgDuration - 9;
    const breakdowns = buildBreakdowns(totals.sessions, totals.views, salt, days);
    const queries = buildQueries(totals.clicks, totals.impressions, salt);
    return {
      cur,
      totals,
      prevTotals,
      bounce,
      prevBounce,
      avgDuration,
      prevAvgDuration,
      breakdowns,
      queries,
      hourly: buildHourly(ts, salt),
      heatmap: buildHeatmap(salt),
      vitals: buildVitals(salt),
    };
  }, [days, minuteTick, salt, range]);

  // Realtime feed
  const [live, setLive] = React.useState<LiveEvent[]>([]);
  React.useEffect(() => {
    const seed: LiveEvent[] = [];
    const t = Date.now();
    for (let i = 0; i < 8; i++) seed.push(randomLiveEvent(t - i * 17_000));
    setLive(seed);
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      setLive((prev) => [randomLiveEvent(Date.now()), ...prev].slice(0, 12));
      timer = setTimeout(loop, 2200 + Math.random() * 3800);
    };
    timer = setTimeout(loop, 2500);
    return () => clearTimeout(timer);
  }, []);
  const online = onlineNow(now, salt);

  const chartData = range === "1d" ? data.hourly : data.cur;
  const { totals, prevTotals } = data;
  const ctr = (totals.clicks / Math.max(totals.impressions, 1)) * 100;
  const prevCtr = (prevTotals.clicks / Math.max(prevTotals.impressions, 1)) * 100;
  const conv = (totals.leads / Math.max(totals.sessions, 1)) * 100;
  const prevConv = (prevTotals.leads / Math.max(prevTotals.sessions, 1)) * 100;
  const avgPosition =
    data.queries.reduce((a, q) => a + q.position * q.clicks, 0) / Math.max(totals.clicks, 1);

  const exportCsv = () => {
    const header = "date,views,visitors,sessions,organic,leads,impressions,clicks\n";
    const rows = data.cur
      .map((d) =>
        [
          new Date(d.date).toISOString().slice(0, 10),
          d.views,
          d.visitors,
          d.sessions,
          d.organic,
          d.leads,
          d.impressions,
          d.clicks,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `draxler-analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: easeOut }}
    >
      <PageHeader
        eyebrow="draxlerwheels.com"
        title="Аналитика"
        description="Трафик, поведение посетителей, клики и органический поиск по сайту."
        actions={
          <>
            <button
              type="button"
              onClick={() => setSalt((s) => s + 1)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] bg-muted text-foreground text-[13px] font-medium hover:bg-muted/70 transition-colors"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.75} /> Обновить
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" strokeWidth={1.75} /> CSV
            </button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <SegmentedControl<RangeKey>
          value={range}
          onChange={setRange}
          options={[
            { value: "1d", label: "24 часа" },
            { value: "7d", label: "7 дней" },
            { value: "30d", label: "30 дней" },
            { value: "90d", label: "90 дней" },
          ]}
        />
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full w-2 h-2 bg-success" />
          </span>
          Сейчас на сайте:{" "}
          <span className="font-semibold text-foreground tabular-nums">{online}</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Kpi
          label="Просмотры"
          value={fmt(totals.views)}
          change={delta(totals.views, prevTotals.views)}
          icon={Eye}
          spark={data.cur.map((d) => d.views)}
        />
        <Kpi
          label="Посетители"
          value={fmt(totals.visitors)}
          change={delta(totals.visitors, prevTotals.visitors)}
          icon={Users}
          spark={data.cur.map((d) => d.visitors)}
        />
        <Kpi
          label="Ср. время сессии"
          value={mmss(data.avgDuration)}
          change={delta(data.avgDuration, data.prevAvgDuration)}
          icon={Timer}
        />
        <Kpi
          label="Отказы"
          value={pct(data.bounce)}
          change={delta(data.bounce, data.prevBounce)}
          icon={MousePointerClick}
          invert
        />
      </div>

      <div className="mb-6 overflow-x-auto no-scrollbar">
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          size="sm"
          options={[
            { value: "overview", label: "Обзор" },
            { value: "behaviour", label: "Клики и поведение" },
            { value: "seo", label: "SEO" },
            { value: "audience", label: "Аудитория" },
          ]}
        />
      </div>

      {/* Keyed fade-in only: an exit + mode="wait" stalls while live tickers keep re-rendering. */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur.base, ease: easeOut }}
        className="space-y-6"
      >
        {tab === "overview" && (
          <>
            <SectionCard>
              <CardTitle
                eyebrow={range === "1d" ? "По часам" : "По дням"}
                title={range === "1d" ? "Просмотры сегодня и вчера" : "Просмотры и посетители"}
                right={
                  <div className="hidden sm:flex items-center gap-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <i className="w-3 h-[2px] bg-foreground" />
                      {range === "1d" ? "Сегодня" : "Просмотры"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="w-3 h-[2px]" style={{ background: C.sand }} />
                      {range === "1d" ? "Вчера" : "Посетители"}
                    </span>
                  </div>
                }
              />
              <div className="h-[280px] -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData as object[]}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.ink} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={C.ink} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                    <YAxis {...axisProps} width={44} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      name={range === "1d" ? "Сегодня" : "Просмотры"}
                      dataKey="views"
                      stroke={C.ink}
                      strokeWidth={1.8}
                      fill="url(#gViews)"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      name={range === "1d" ? "Вчера" : "Посетители"}
                      dataKey={range === "1d" ? "previous" : "visitors"}
                      stroke={C.sand}
                      strokeWidth={1.6}
                      fill="transparent"
                      strokeDasharray={range === "1d" ? "4 4" : undefined}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <div className="grid lg:grid-cols-3 gap-6">
              <SectionCard className="lg:col-span-2">
                <CardTitle eyebrow="Каналы" title="Источники трафика" />
                <BarList
                  total={totals.sessions}
                  rows={data.breakdowns.sources.map((s) => ({ label: s.label, value: s.value }))}
                />
              </SectionCard>
              <SectionCard>
                <CardTitle eyebrow="Реальное время" title="Лента событий" />
                <ul className="space-y-3 max-h-[360px] overflow-hidden">
                  <AnimatePresence initial={false}>
                    {live.map((e) => (
                      <motion.li
                        key={e.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: easeOut }}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={cn(
                            "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                            e.kind === "lead"
                              ? "bg-success"
                              : e.kind === "click"
                                ? "bg-foreground"
                                : "bg-muted-foreground/50",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "text-[13px] truncate",
                              e.kind === "lead" ? "text-success font-medium" : "text-foreground",
                            )}
                          >
                            {e.kind === "view" ? `Просмотр ${e.text}` : e.text}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{e.meta}</div>
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {Math.max(0, Math.round((now - e.at) / 1000)) < 60
                            ? `${Math.max(0, Math.round((now - e.at) / 1000))}с`
                            : `${Math.round((now - e.at) / 60000)}м`}
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </SectionCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <SectionCard>
                <CardTitle
                  eyebrow="Конверсия"
                  title="Воронка заявки"
                  right={
                    <div className="text-right">
                      <div className="text-[22px] font-semibold tabular-nums">{pct(conv, 2)}</div>
                      <Delta value={delta(conv, prevConv)} />
                    </div>
                  }
                />
                <ul className="space-y-2">
                  {FUNNEL_STEPS.map((step, i) => {
                    const value = Math.round(
                      totals.sessions *
                        step.rate *
                        (i === 0 ? 1 : 0.92 + ((salt * (i + 3)) % 10) / 60),
                    );
                    const w = Math.max(step.rate * 100, 4);
                    return (
                      <li key={step.label} className="flex items-center gap-3">
                        <div className="w-[44%] sm:w-[40%] text-[13px] text-foreground truncate">
                          {step.label}
                        </div>
                        <div className="flex-1 h-7 bg-muted/40 rounded-[2px] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${w}%` }}
                            transition={{ duration: 0.8, ease: easeOut, delay: i * 0.06 }}
                            className="h-full"
                            style={{ background: i >= 4 ? C.sand : `oklch(${0.2 + i * 0.12} 0 0)` }}
                          />
                        </div>
                        <div className="w-14 text-right text-[13px] tabular-nums font-medium">
                          {fmt(value)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
              <SectionCard>
                <CardTitle eyebrow="Контент" title="Популярные страницы" />
                <div className="overflow-x-auto no-scrollbar -mx-2">
                  <table className="w-full text-[13px] min-w-[440px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="text-left font-medium px-2 pb-2">Страница</th>
                        <th className="text-right font-medium px-2 pb-2">Просм.</th>
                        <th className="text-right font-medium px-2 pb-2">Уник.</th>
                        <th className="text-right font-medium px-2 pb-2">Время</th>
                        <th className="text-right font-medium px-2 pb-2">Выход</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.breakdowns.pages.slice(0, 8).map((p) => (
                        <tr key={p.path} className="border-t border-border">
                          <td className="px-2 py-2.5">
                            <div className="text-foreground truncate max-w-[200px]">{p.title}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {p.path}
                            </div>
                          </td>
                          <td className="px-2 text-right tabular-nums font-medium">
                            {fmt(p.value)}
                          </td>
                          <td className="px-2 text-right tabular-nums text-muted-foreground">
                            {fmt(p.unique)}
                          </td>
                          <td className="px-2 text-right tabular-nums text-muted-foreground">
                            {mmss(p.avgTime)}
                          </td>
                          <td className="px-2 text-right tabular-nums text-muted-foreground">
                            {p.exit}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          </>
        )}

        {tab === "behaviour" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
              <Kpi
                label="Клики всего"
                value={fmt(sum(data.breakdowns.clicks, "value"))}
                change={4.8 + (salt % 5)}
                icon={MousePointerClick}
              />
              <Kpi
                label="Стр. за сессию"
                value={(totals.views / Math.max(totals.sessions, 1)).toFixed(2).replace(".", ",")}
                change={2.1}
                icon={Eye}
              />
              <Kpi
                label="Сессии"
                value={fmt(totals.sessions)}
                change={delta(totals.sessions, prevTotals.sessions)}
                icon={Users}
              />
              <Kpi
                label="Заявки"
                value={fmt(totals.leads)}
                change={delta(totals.leads, prevTotals.leads)}
                icon={ArrowUpRight}
              />
            </div>
            <SectionCard>
              <CardTitle eyebrow="События" title="Что нажимают посетители" />
              <BarList
                total={sum(data.breakdowns.clicks, "value")}
                rows={data.breakdowns.clicks.map((c) => ({
                  label: c.label,
                  value: c.value,
                  sub: c.area,
                }))}
                extra={(i) => (
                  <span className="hidden sm:inline text-[11px] text-muted-foreground w-16 text-right">
                    CTR {pct(data.breakdowns.clicks[i].ctr)}
                  </span>
                )}
              />
            </SectionCard>
            <SectionCard>
              <CardTitle eyebrow="Активность" title="Тепловая карта: день недели × час" />
              <div className="overflow-x-auto no-scrollbar">
                <div className="min-w-[640px]">
                  {data.heatmap.map((row, r) => {
                    const max = Math.max(...data.heatmap.flat());
                    return (
                      <div key={r} className="flex items-center gap-[3px] mb-[3px]">
                        <div className="w-7 text-[11px] text-muted-foreground">
                          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][r]}
                        </div>
                        {row.map((v, h) => (
                          <div
                            key={h}
                            title={`${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][r]} ${h}:00 — ${fmt((v / max) * 64)} просм.`}
                            className="flex-1 h-6 rounded-[2px]"
                            style={{ background: `oklch(0.18 0 0 / ${0.05 + (v / max) * 0.85})` }}
                          />
                        ))}
                      </div>
                    );
                  })}
                  <div className="flex gap-[3px] pl-7 mt-1">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">
                        {h % 3 === 0 ? h : ""}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
            <SectionCard>
              <CardTitle eyebrow="Конфигуратор" title="Самые примеряемые диски" />
              <div className="h-[240px] -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      "DRX-101",
                      "DRX-213",
                      "DRX-305",
                      "DRX-102",
                      "DRX-202",
                      "DRX-104",
                      "DRX-112",
                      "DRX-301",
                    ].map((m, i) => ({
                      label: m,
                      value: Math.round((totals.sessions * 0.17 * (1.6 - i * 0.16)) / 2.4),
                    }))}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} width={40} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.965 0 0)" }} />
                    <Bar dataKey="value" name="Примерок" fill={C.ink} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </>
        )}

        {tab === "seo" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
              <Kpi
                label="Показы в Google"
                value={fmt(totals.impressions)}
                change={delta(totals.impressions, prevTotals.impressions)}
                icon={Search}
                spark={data.cur.map((d) => d.impressions)}
              />
              <Kpi
                label="Клики из поиска"
                value={fmt(totals.clicks)}
                change={delta(totals.clicks, prevTotals.clicks)}
                icon={MousePointerClick}
                spark={data.cur.map((d) => d.clicks)}
              />
              <Kpi
                label="CTR"
                value={pct(ctr, 2)}
                change={delta(ctr, prevCtr)}
                icon={ArrowUpRight}
              />
              <Kpi
                label="Ср. позиция"
                value={avgPosition.toFixed(1).replace(".", ",")}
                change={-3.4}
                icon={ArrowUpRight}
                invert
              />
            </div>
            <SectionCard>
              <CardTitle eyebrow="Search Console" title="Показы и клики" />
              <div className="h-[260px] -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={range === "1d" ? buildSeries(7, minuteTick, salt) : data.cur}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                    <YAxis yAxisId="l" {...axisProps} width={48} />
                    <YAxis yAxisId="r" orientation="right" {...axisProps} width={36} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      yAxisId="l"
                      type="monotone"
                      dataKey="impressions"
                      name="Показы"
                      stroke={C.soft}
                      strokeWidth={1.8}
                      dot={false}
                    />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey="clicks"
                      name="Клики"
                      stroke={C.ink}
                      strokeWidth={1.8}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <div className="grid lg:grid-cols-3 gap-6">
              <SectionCard className="lg:col-span-2">
                <CardTitle eyebrow="Запросы" title="По каким запросам находят сайт" />
                <div className="overflow-x-auto no-scrollbar -mx-2">
                  <table className="w-full text-[13px] min-w-[480px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="text-left font-medium px-2 pb-2">Запрос</th>
                        <th className="text-right font-medium px-2 pb-2">Клики</th>
                        <th className="text-right font-medium px-2 pb-2">Показы</th>
                        <th className="text-right font-medium px-2 pb-2">CTR</th>
                        <th className="text-right font-medium px-2 pb-2">Позиция</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.queries.map((q) => (
                        <tr key={q.query} className="border-t border-border">
                          <td className="px-2 py-2.5 text-foreground">{q.query}</td>
                          <td className="px-2 text-right tabular-nums font-medium">
                            {fmt(q.clicks)}
                          </td>
                          <td className="px-2 text-right tabular-nums text-muted-foreground">
                            {fmt(q.impressions)}
                          </td>
                          <td className="px-2 text-right tabular-nums text-muted-foreground">
                            {pct(q.ctr)}
                          </td>
                          <td className="px-2 text-right tabular-nums">
                            <span
                              className={cn(
                                "inline-block min-w-9 px-1.5 py-0.5 rounded-[2px] text-center",
                                q.position <= 3
                                  ? "bg-foreground text-background"
                                  : q.position <= 10
                                    ? "bg-muted"
                                    : "text-muted-foreground",
                              )}
                            >
                              {q.position.toFixed(1).replace(".", ",")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
              <div className="space-y-6">
                <SectionCard>
                  <CardTitle eyebrow="Core Web Vitals" title="Скорость (p75)" />
                  <ul className="space-y-3">
                    {[
                      {
                        k: "LCP",
                        v: `${data.vitals.lcp.toFixed(2)} с`,
                        ok: data.vitals.lcp <= 2.5,
                        hint: "≤ 2,5 с",
                      },
                      {
                        k: "INP",
                        v: `${data.vitals.inp} мс`,
                        ok: data.vitals.inp <= 200,
                        hint: "≤ 200 мс",
                      },
                      {
                        k: "CLS",
                        v: data.vitals.cls.toFixed(3),
                        ok: data.vitals.cls <= 0.1,
                        hint: "≤ 0,1",
                      },
                      {
                        k: "FCP",
                        v: `${data.vitals.fcp.toFixed(2)} с`,
                        ok: data.vitals.fcp <= 1.8,
                        hint: "≤ 1,8 с",
                      },
                      {
                        k: "TTFB",
                        v: `${data.vitals.ttfb} мс`,
                        ok: data.vitals.ttfb <= 800,
                        hint: "≤ 800 мс",
                      },
                    ].map((m) => (
                      <li key={m.k} className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              m.ok ? "bg-success" : "bg-warning",
                            )}
                          />
                          <span className="font-medium">{m.k}</span>
                          <span className="text-muted-foreground text-[11px]">{m.hint}</span>
                        </span>
                        <span className="tabular-nums font-medium">{m.v}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
                <SectionCard>
                  <CardTitle eyebrow="Индекс" title="Покрытие" />
                  <ul className="space-y-3 text-[13px]">
                    {[
                      ["Страниц в sitemap", "65"],
                      ["Проиндексировано", `${61 + (salt % 4)}`],
                      ["Структурированные данные", "Product, Article, FAQ, Breadcrumb"],
                      ["Ошибки сканирования", "0"],
                      ["Обратные ссылки", fmt(212 + salt * 3)],
                    ].map(([k, v]) => (
                      <li key={k} className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium text-right">{v}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </div>
            </div>
          </>
        )}

        {tab === "audience" && (
          <>
            <div className="grid lg:grid-cols-3 gap-6">
              <SectionCard>
                <CardTitle eyebrow="Устройства" title="Чем пользуются" />
                <div className="flex h-3 rounded-full overflow-hidden mb-5">
                  {data.breakdowns.devices.map((d, i) => (
                    <div
                      key={d.key}
                      style={{
                        width: `${(d.value / totals.sessions) * 100}%`,
                        background: [C.ink, C.mid, C.sand][i],
                      }}
                    />
                  ))}
                </div>
                <ul className="space-y-3">
                  {data.breakdowns.devices.map((d, i) => {
                    const Icon =
                      d.key === "mobile" ? Smartphone : d.key === "desktop" ? Monitor : Tablet;
                    return (
                      <li key={d.key} className="flex items-center gap-3 text-[13px]">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: [C.ink, C.mid, C.sand][i] }}
                        />
                        <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                        <span>{d.label}</span>
                        <span className="ml-auto tabular-nums font-medium">{fmt(d.value)}</span>
                        <span className="w-12 text-right tabular-nums text-muted-foreground">
                          {pct((d.value / totals.sessions) * 100)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
              <SectionCard className="lg:col-span-2">
                <CardTitle eyebrow="География" title="Страны" />
                <BarList
                  total={totals.sessions}
                  rows={data.breakdowns.countries.map((c) => ({
                    label: c.label,
                    value: c.value,
                    sub: c.code !== "XX" ? c.code : undefined,
                  }))}
                />
              </SectionCard>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionCard>
                <CardTitle eyebrow="Браузеры" title="Браузеры" />
                <BarList
                  total={totals.sessions}
                  rows={data.breakdowns.browsers.map((b) => ({ label: b.label, value: b.value }))}
                />
              </SectionCard>
              <SectionCard>
                <CardTitle eyebrow="Удержание" title="Новые и вернувшиеся" />
                <div className="h-[220px] -ml-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.cur.slice(-Math.min(14, data.cur.length))}
                      margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                      <YAxis {...axisProps} width={40} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.965 0 0)" }} />
                      <Bar
                        dataKey={(d: { visitors: number }) => Math.round(d.visitors * 0.71)}
                        name="Новые"
                        stackId="a"
                        fill={C.ink}
                      />
                      <Bar
                        dataKey={(d: { visitors: number }) => Math.round(d.visitors * 0.29)}
                        name="Вернувшиеся"
                        stackId="a"
                        fill={C.sand}
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </motion.div>

      <p className="mt-8 text-[12px] text-muted-foreground">
        Демо-данные генерируются на клиенте. После подключения GA4 / Search Console источник данных
        заменяется без изменения интерфейса.
      </p>
    </motion.div>
  );
}
