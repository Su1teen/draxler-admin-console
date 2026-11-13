/**
 * Front-end only analytics generator.
 * History is deterministic per calendar day (stable between reloads),
 * "today" grows with the time of day and realtime numbers fluctuate live.
 * A salt lets the user re-roll the whole dataset from the UI.
 */

export type RangeKey = "1d" | "7d" | "30d" | "90d";

export const RANGE_DAYS: Record<RangeKey, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const dayIndex = (ts: number) => Math.floor(ts / DAY);

export interface DayPoint {
  date: number;
  label: string;
  views: number;
  visitors: number;
  sessions: number;
  organic: number;
  leads: number;
  impressions: number;
  clicks: number;
}

function dayValue(idx: number, salt: number) {
  const rnd = mulberry32(idx * 7919 + salt * 104729);
  const d = new Date(idx * DAY);
  const dow = d.getUTCDay();
  // Luxury automotive audience browses more on Fri–Sun evenings.
  const weekly = [1.12, 0.94, 0.92, 0.95, 0.98, 1.08, 1.16][dow];
  const trend = 1 + ((idx % 365) / 365) * 0.35;
  const noise = 0.88 + rnd() * 0.26;
  const spike = rnd() > 0.95 ? 1.35 + rnd() * 0.4 : 1; // occasional Instagram / blog spikes
  const views = Math.max(540, Math.round(640 * weekly * trend * noise * spike));
  const pagesPerSession = 2.6 + rnd() * 0.9;
  const sessions = Math.round(views / pagesPerSession);
  const visitors = Math.round(sessions * (0.78 + rnd() * 0.08));
  const organic = Math.round(sessions * (0.38 + rnd() * 0.08));
  const leads = Math.max(1, Math.round(sessions * (0.011 + rnd() * 0.012)));
  const impressions = Math.round(organic * (17 + rnd() * 9));
  const clicks = Math.round(organic * (0.92 + rnd() * 0.06));
  return { views, visitors, sessions, organic, leads, impressions, clicks, rnd };
}

/** Share of the day elapsed — "today" is only partly filled. */
function todayFraction(now: number) {
  const d = new Date(now);
  const minutes = d.getHours() * 60 + d.getMinutes();
  // traffic curve: quiet nights, peaks at 13:00 and 21:00
  let acc = 0;
  let total = 0;
  for (let h = 0; h < 24; h++) {
    const w = HOURLY_WEIGHT[h];
    total += w;
    if (h * 60 + 60 <= minutes) acc += w;
    else if (h * 60 < minutes) acc += (w * (minutes - h * 60)) / 60;
  }
  return Math.max(0.04, acc / total);
}

export const HOURLY_WEIGHT = [
  0.25, 0.16, 0.11, 0.09, 0.1, 0.16, 0.3, 0.52, 0.74, 0.88, 0.96, 1.02, 1.08, 1.12, 1.04, 0.98,
  0.96, 1.0, 1.08, 1.18, 1.26, 1.3, 1.06, 0.62,
];

export function buildSeries(
  days: number,
  now: number,
  salt: number,
  partialToday = true,
): DayPoint[] {
  const today = dayIndex(now);
  const frac = partialToday ? todayFraction(now) : 1;
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const idx = today - i;
    const v = dayValue(idx, salt);
    const f = i === 0 ? frac : 1;
    const date = idx * DAY;
    out.push({
      date,
      label: new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      views: Math.round(v.views * f),
      visitors: Math.round(v.visitors * f),
      sessions: Math.round(v.sessions * f),
      organic: Math.round(v.organic * f),
      leads: Math.round(v.leads * f),
      impressions: Math.round(v.impressions * f),
      clicks: Math.round(v.clicks * f),
    });
  }
  return out;
}

/** For "1d" we show the 24 hours of today vs yesterday. */
export function buildHourly(now: number, salt: number) {
  const today = dayIndex(now);
  const vToday = dayValue(today, salt);
  const vYest = dayValue(today - 1, salt);
  const currentHour = new Date(now).getHours();
  const total = HOURLY_WEIGHT.reduce((a, b) => a + b, 0);
  const rnd = mulberry32(today * 31 + salt);
  return HOURLY_WEIGHT.map((w, h) => {
    const jitter = 0.85 + rnd() * 0.3;
    return {
      label: `${String(h).padStart(2, "0")}:00`,
      views: h <= currentHour ? Math.round((vToday.views * w * jitter) / total) : null,
      previous: Math.round((vYest.views * w * (0.85 + rnd() * 0.3)) / total),
    };
  });
}

export function sum<T>(arr: T[], key: keyof T) {
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

export function delta(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

/* ───────── Distributions ───────── */

function distribute<T extends { weight: number }>(items: T[], total: number, rnd: () => number) {
  const jittered = items.map((it) => ({ ...it, w: it.weight * (0.85 + rnd() * 0.3) }));
  const wsum = jittered.reduce((a, b) => a + b.w, 0);
  return jittered
    .map((it) => ({ ...it, value: Math.round((it.w / wsum) * total) }))
    .sort((a, b) => b.value - a.value);
}

export const SOURCES = [
  { key: "organic", label: "Google / органика", weight: 41 },
  { key: "direct", label: "Прямые заходы", weight: 22 },
  { key: "instagram", label: "Instagram", weight: 18 },
  { key: "whatsapp", label: "WhatsApp / мессенджеры", weight: 7 },
  { key: "referral", label: "Рефералы / форумы", weight: 6 },
  { key: "yandex", label: "Яндекс", weight: 4 },
  { key: "paid", label: "Реклама", weight: 2 },
];

export const PAGES = [
  { path: "/", title: "Главная", weight: 30, time: 94 },
  { path: "/catalog", title: "Каталог", weight: 17, time: 71 },
  { path: "/projects/g-wagon", title: "G‑Wagon проект", weight: 11, time: 158 },
  { path: "/catalog/vip/drx-101", title: "DRX-101", weight: 6, time: 64 },
  { path: "/projects", title: "Наши проекты", weight: 6, time: 52 },
  { path: "/catalog/offroad", title: "Off-Road серия", weight: 5, time: 48 },
  { path: "/blog", title: "Блог", weight: 4.5, time: 41 },
  {
    path: "/blog/inside-the-draxler-g-wagon-study",
    title: "Inside the G‑Wagon Study",
    weight: 3.6,
    time: 212,
  },
  { path: "/catalog/sport/drx-213", title: "DRX-213", weight: 3.4, time: 58 },
  { path: "/blog/forged-flow-formed-or-cast", title: "Forged vs Cast", weight: 3, time: 236 },
  { path: "/catalog/vip", title: "Luxury серия", weight: 2.8, time: 45 },
  { path: "/catalog/sport", title: "Sport серия", weight: 2.6, time: 44 },
];

export const CLICK_EVENTS = [
  { key: "configurator_open", label: "Открыл конфигуратор", area: "Главная", weight: 22 },
  { key: "whatsapp", label: "Кнопка WhatsApp", area: "Везде", weight: 17 },
  { key: "catalog_card", label: "Карточка диска в каталоге", area: "Каталог", weight: 26 },
  { key: "wheel_swap", label: "Смена диска в конфигураторе", area: "Конфигуратор", weight: 31 },
  { key: "color_change", label: "Смена цвета авто", area: "Конфигуратор", weight: 14 },
  { key: "gwagon_configure", label: "Configure G‑Wagon", area: "G‑Wagon", weight: 8 },
  { key: "finalize", label: "Finalize / заявка", area: "Конфигуратор", weight: 4.2 },
  { key: "instagram", label: "Instagram в футере", area: "Футер", weight: 3.1 },
  { key: "phone", label: "Клик по телефону", area: "Футер", weight: 2.4 },
  { key: "email", label: "Клик по e-mail", area: "Футер", weight: 1.8 },
  { key: "blog_next", label: "Следующая статья", area: "Блог", weight: 3.4 },
  { key: "faq_open", label: "Открыл вопрос FAQ", area: "G‑Wagon", weight: 5.2 },
];

export const COUNTRIES = [
  { code: "KZ", label: "Казахстан", weight: 34 },
  { code: "AE", label: "ОАЭ", weight: 14 },
  { code: "RU", label: "Россия", weight: 13 },
  { code: "US", label: "США", weight: 9 },
  { code: "DE", label: "Германия", weight: 6 },
  { code: "UZ", label: "Узбекистан", weight: 5 },
  { code: "GB", label: "Великобритания", weight: 4 },
  { code: "SA", label: "Саудовская Аравия", weight: 4 },
  { code: "TR", label: "Турция", weight: 3 },
  { code: "XX", label: "Другие", weight: 8 },
];

export const DEVICES = [
  { key: "mobile", label: "Смартфон", weight: 64 },
  { key: "desktop", label: "Компьютер", weight: 31 },
  { key: "tablet", label: "Планшет", weight: 5 },
];

export const BROWSERS = [
  { key: "safari", label: "Safari", weight: 41 },
  { key: "chrome", label: "Chrome", weight: 44 },
  { key: "yandex", label: "Яндекс Браузер", weight: 6 },
  { key: "edge", label: "Edge", weight: 4 },
  { key: "other", label: "Другие", weight: 5 },
];

export const QUERIES = [
  { q: "кованые диски", weight: 18, pos: 7.2 },
  { q: "draxler wheels", weight: 14, pos: 1.1 },
  { q: "forged wheels g wagon", weight: 11, pos: 5.4 },
  { q: "диски на гелендваген", weight: 10, pos: 6.1 },
  { q: "кованые диски алматы", weight: 8, pos: 3.8 },
  { q: "custom forged wheels", weight: 7, pos: 12.6 },
  { q: "диски r23 g63", weight: 6, pos: 8.9 },
  { q: "drx-101", weight: 5, pos: 1.4 },
  { q: "forged vs cast wheels", weight: 5, pos: 14.2 },
  { q: "g wagon fitment 5x130", weight: 4, pos: 9.7 },
  { q: "кованые диски на заказ", weight: 4, pos: 10.3 },
  { q: "beadlock wheels", weight: 3, pos: 18.5 },
];

export function buildBreakdowns(
  totalSessions: number,
  totalViews: number,
  salt: number,
  rangeDays: number,
) {
  const rnd = mulberry32(salt * 13 + rangeDays * 101 + dayIndex(Date.now()));
  const sources = distribute(SOURCES, totalSessions, rnd);
  const pages = distribute(PAGES, totalViews, rnd).map((p) => ({
    ...p,
    unique: Math.round(p.value * (0.68 + rnd() * 0.12)),
    avgTime: Math.round(p.time * (0.85 + rnd() * 0.3)),
    exit: Math.round(18 + rnd() * 40),
  }));
  const clickTotal = Math.round(totalSessions * 1.9);
  const clicks = distribute(CLICK_EVENTS, clickTotal, rnd).map((c) => ({
    ...c,
    ctr: (c.value / totalSessions) * 100,
  }));
  const countries = distribute(COUNTRIES, totalSessions, rnd);
  const devices = distribute(DEVICES, totalSessions, rnd);
  const browsers = distribute(BROWSERS, totalSessions, rnd);
  return { sources, pages, clicks, countries, devices, browsers };
}

export function buildQueries(totalClicks: number, totalImpressions: number, salt: number) {
  const rnd = mulberry32(salt * 17 + 5);
  const clicks = distribute(QUERIES, totalClicks, rnd);
  return clicks.map((row) => {
    const impressions = Math.round(
      (row.value / totalClicks) * totalImpressions * (0.7 + rnd() * 0.6),
    );
    const ctr = impressions ? (row.value / impressions) * 100 : 0;
    return {
      query: row.q,
      clicks: row.value,
      impressions,
      ctr,
      position: +(row.pos * (0.9 + rnd() * 0.2)).toFixed(1),
    };
  });
}

/** Weekday × hour activity heatmap (7 × 24). */
export function buildHeatmap(salt: number) {
  const rnd = mulberry32(salt * 23 + 9);
  const weekly = [1.12, 0.94, 0.92, 0.95, 0.98, 1.08, 1.16];
  // Rows Monday..Sunday
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((dow) => HOURLY_WEIGHT.map((w) => w * weekly[dow] * (0.8 + rnd() * 0.4)));
}

export const FUNNEL_STEPS = [
  { label: "Визит на сайт", rate: 1 },
  { label: "Просмотр каталога / проекта", rate: 0.58 },
  { label: "Карточка диска", rate: 0.31 },
  { label: "Конфигуратор", rate: 0.17 },
  { label: "Finalize", rate: 0.034 },
  { label: "Заявка отправлена", rate: 0.019 },
];

export function buildVitals(salt: number) {
  const rnd = mulberry32(salt * 29 + 3);
  return {
    lcp: +(1.9 + rnd() * 0.7).toFixed(2),
    inp: Math.round(120 + rnd() * 70),
    cls: +(0.02 + rnd() * 0.05).toFixed(3),
    ttfb: Math.round(190 + rnd() * 120),
    fcp: +(1.1 + rnd() * 0.5).toFixed(2),
  };
}

const LIVE_PAGES = PAGES.map((p) => p.path);
const LIVE_EVENTS = CLICK_EVENTS.map((c) => c.label);
const LIVE_CITIES = [
  "Алматы",
  "Астана",
  "Дубай",
  "Москва",
  "Ташкент",
  "Шымкент",
  "Лос-Анджелес",
  "Мюнхен",
  "Лондон",
  "Эр-Рияд",
];

export interface LiveEvent {
  id: string;
  at: number;
  kind: "view" | "click" | "lead";
  text: string;
  meta: string;
}

let liveCounter = 0;
export function randomLiveEvent(now: number): LiveEvent {
  const r = Math.random();
  const city = LIVE_CITIES[Math.floor(Math.random() * LIVE_CITIES.length)];
  const device = Math.random() < 0.64 ? "смартфон" : "ПК";
  liveCounter += 1;
  if (r < 0.03) {
    return {
      id: `l${liveCounter}`,
      at: now,
      kind: "lead",
      text: "Новая заявка из конфигуратора",
      meta: `${city} · ${device}`,
    };
  }
  if (r < 0.45) {
    return {
      id: `l${liveCounter}`,
      at: now,
      kind: "click",
      text: LIVE_EVENTS[Math.floor(Math.random() * LIVE_EVENTS.length)],
      meta: `${city} · ${device}`,
    };
  }
  return {
    id: `l${liveCounter}`,
    at: now,
    kind: "view",
    text: LIVE_PAGES[Math.floor(Math.random() * LIVE_PAGES.length)],
    meta: `${city} · ${device}`,
  };
}

export function onlineNow(now: number, salt: number) {
  const hour = new Date(now).getHours();
  const base = 6 + HOURLY_WEIGHT[hour] * 16;
  const wobble = Math.sin(now / 9000) * 2.2 + Math.sin(now / 3100 + salt) * 1.3;
  return Math.max(2, Math.round(base + wobble));
}
