import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Eye,
  ImagePlus,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  X,
  CircleAlert,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { Chip } from "@/components/primitives/Chip";
import { BlockEditor, AutoTextarea, useImageUpload } from "@/components/blog/BlockEditor";
import { ArticlePreview } from "@/components/blog/ArticlePreview";
import { StatusBadge } from "./blog.index";
import { BLOG_CATEGORIES, emptyPost, useBlog, wrapBlock } from "@/store/blog.store";
import { BUILTIN_TEMPLATES, type BlockTemplate } from "@/lib/blog/templates";
import { compressImage } from "@/lib/blog/idb-storage";
import { BLOCK_META } from "@/components/blog/BlockEditor";
import {
  SITE_URL,
  readTime,
  resolveImage,
  slugify,
  toSiteObject,
  wordCount,
  type AdminPost,
  type BlogBlock,
  type PostStatus,
} from "@/lib/blog/types";
import { formatRelative } from "@/lib/format";
import { dur, easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/blog/$postId")({
  head: () => ({ meta: [{ title: "Редактор статьи — Draxler" }] }),
  component: EditorPage,
});

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-card rounded-[2px] p-5", className)}>
      <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground mb-4">
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {hint}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-[2px] bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors";

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const ok = value >= min && value <= max;
  return (
    <span
      className={cn(
        "text-[11px] tabular-nums",
        ok ? "text-success" : value === 0 ? "text-muted-foreground" : "text-warning",
      )}
    >
      {value} / {min}–{max}
    </span>
  );
}

function TagsField({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
}) {
  const [text, setText] = React.useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !value.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (parts.length) onChange([...value, ...parts]);
  };
  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s) && (!text || s.toLowerCase().includes(text.toLowerCase())))
    .slice(0, 8);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center min-h-10 px-2 py-1.5 rounded-[2px] bg-background border border-border focus-within:border-foreground transition-colors">
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
            >
              <Chip
                className="h-7 text-[12px]"
                onRemove={() => onChange(value.filter((t) => t !== tag))}
              >
                {tag}
              </Chip>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) {
              add(v);
              setText("");
            } else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
              setText("");
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => {
            if (text.trim()) {
              add(text);
              setText("");
            }
          }}
          placeholder={value.length ? "" : "Mercedes-Benz, Forged…"}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-[13px] px-1"
        />
      </div>
      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange([...value, s])}
              className="h-6 px-2.5 rounded-full border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function seoChecks(post: AdminPost, slugTaken: boolean) {
  const title = post.seoTitle || post.title;
  const desc = post.seoDescription || post.excerpt;
  const words = wordCount(post);
  const images = post.body.filter((b) => b.block.type === "image");
  const headings = post.body.filter((b) => b.block.type === "h").length;
  return [
    { ok: title.length >= 30 && title.length <= 65, text: "Заголовок 30–65 символов" },
    { ok: desc.length >= 110 && desc.length <= 165, text: "Описание 110–165 символов" },
    {
      ok: !!post.slug && !slugTaken,
      text: slugTaken ? "URL уже занят другой статьёй" : "Уникальный URL",
    },
    { ok: !!post.cover, text: "Есть обложка (og:image)" },
    { ok: words >= 300, text: `Объём текста ≥ 300 слов (сейчас ${words})` },
    { ok: headings >= 2, text: "Минимум 2 подзаголовка" },
    { ok: post.tags.length >= 2, text: "2+ тега" },
    {
      ok: images.every((b) => b.block.type === "image" && !!(b.block.alt || b.block.caption)),
      text: "У всех фото есть alt",
    },
  ];
}

function EditorPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const posts = useBlog((s) => s.posts);
  const hydrated = useBlog((s) => s.hydrated);
  const upsert = useBlog((s) => s.upsert);
  const remove = useBlog((s) => s.remove);
  const customTemplates = useBlog((s) => s.customTemplates);
  const addTemplate = useBlog((s) => s.addTemplate);
  const removeTemplate = useBlog((s) => s.removeTemplate);

  const [draft, setDraft] = React.useState<AdminPost | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState<"desktop" | "mobile">("desktop");
  const [mobileTab, setMobileTab] = React.useState<"content" | "settings">("content");
  const [tplGroup, setTplGroup] = React.useState<BlockTemplate["group"] | "Мои">("Ответы");
  const isNew = postId === "new";
  const { busy: coverBusy, pick: pickCover } = useImageUpload();
  const [coverOver, setCoverOver] = React.useState(false);

  // Load once the store is hydrated from IndexedDB.
  React.useEffect(() => {
    if (!hydrated || draft) return;
    if (isNew) {
      setDraft(emptyPost());
      return;
    }
    const found = posts.find((p) => p.id === postId);
    if (found) {
      setDraft(structuredClone(found));
      setSlugEdited(true);
      setSavedAt(found.updatedAt);
    }
  }, [hydrated, isNew, postId, posts, draft]);

  const update = React.useCallback((patch: Partial<AdminPost>) => {
    const textChanged = "body" in patch || "excerpt" in patch;
    setDraft((d) =>
      d ? { ...d, ...patch, ...(textChanged ? { readTimeOverride: undefined } : {}) } : d,
    );
  }, []);

  // Auto-slug from title until the slug is edited by hand.
  React.useEffect(() => {
    if (draft && !slugEdited) {
      const s = slugify(draft.title);
      if (s !== draft.slug) update({ slug: s });
    }
  }, [draft?.title, slugEdited]); // eslint-disable-line react-hooks/exhaustive-deps

  const slugTaken = !!draft && posts.some((p) => p.id !== draft.id && p.slug === draft.slug);

  const persist = React.useCallback(
    (next: AdminPost, quiet = true) => {
      upsert(next);
      setSavedAt(Date.now());
      if (isNew) navigate({ to: "/blog/$postId", params: { postId: next.id }, replace: true });
      if (!quiet) toast.success("Сохранено");
    },
    [upsert, isNew, navigate],
  );

  // Debounced autosave (once a post has a title).
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (!draft) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!draft.title.trim()) return;
    setSaving(true);
    const t = setTimeout(() => {
      persist(draft);
      setSaving(false);
    }, 900);
    return () => clearTimeout(t);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || (!draft && !isNew && posts.some((p) => p.id === postId))) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (!draft) {
    return (
      <div className="py-24 text-center">
        <h1>Статья не найдена</h1>
        <Link
          to="/blog"
          className="mt-6 inline-flex h-11 px-6 items-center rounded-[2px] bg-primary text-primary-foreground text-[14px]"
        >
          К списку статей
        </Link>
      </div>
    );
  }

  const checks = seoChecks(draft, slugTaken);
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)));
  const categories = Array.from(new Set([...BLOG_CATEGORIES, ...posts.map((p) => p.category)]));

  const insertTemplate = (tpl: BlockTemplate) => {
    update({
      body: [
        ...draft.body.filter(
          (b) => !(b.block.type === "p" && !b.block.text && draft.body.length === 1),
        ),
        ...tpl.blocks.map(wrapBlock),
      ],
    });
    toast.success(`Вставлен шаблон «${tpl.title}»`);
  };

  const saveAsTemplate = (block: BlogBlock) => {
    const title = window.prompt("Название шаблона", BLOCK_META[block.type].label);
    if (!title) return;
    addTemplate({ title, group: "Ответы", blocks: [block] });
    setTplGroup("Мои");
    toast.success("Шаблон сохранён");
  };

  const publish = (status: PostStatus) => {
    if (status !== "draft") {
      const problems = [
        !draft.title.trim() && "заголовок",
        !draft.slug && "URL",
        slugTaken && "уникальный URL",
        !draft.excerpt.trim() && "краткое описание",
        !draft.cover && "обложку",
      ].filter(Boolean);
      if (problems.length) {
        toast.error(`Добавьте: ${problems.join(", ")}`);
        return;
      }
      if (status === "scheduled" && (!draft.publishAt || draft.publishAt < Date.now())) {
        toast.error("Укажите время публикации в будущем");
        return;
      }
    } else if (!draft.title.trim()) {
      toast.error("Добавьте заголовок");
      return;
    }
    const next = { ...draft, status };
    setDraft(next);
    persist(next, true);
    toast.success(
      status === "published"
        ? "Статья опубликована"
        : status === "scheduled"
          ? "Публикация запланирована"
          : "Черновик сохранён",
    );
  };

  const copyExport = async () => {
    const code = JSON.stringify(toSiteObject(draft), null, 4);
    try {
      await navigator.clipboard.writeText(code + ",");
      toast.success("Объект статьи скопирован — вставьте в BLOG_POSTS (src/lib/blog-data.ts)");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const groups: (BlockTemplate["group"] | "Мои")[] = [
    "Ответы",
    "Фитмент",
    "CTA",
    "Структура",
    "Мои",
  ];
  const visibleTemplates =
    tplGroup === "Мои" ? customTemplates : BUILTIN_TEMPLATES.filter((t) => t.group === tplGroup);
  const snippetTitle = (draft.seoTitle || draft.title || "Заголовок статьи") + " — DRAXLER Blog";
  const snippetDesc = draft.seoDescription || draft.excerpt || "Описание статьи появится здесь.";

  const settings = (
    <div className="space-y-4">
      <Panel title="Публикация">
        <div className="flex items-center justify-between mb-4">
          <StatusBadge status={draft.status} />
          <span className="text-[11px] text-muted-foreground">
            {readTime(draft)} · {wordCount(draft)} слов
          </span>
        </div>
        <div className="space-y-3">
          <Field label="Дата статьи">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => update({ date: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Запланировать на">
            <input
              type="datetime-local"
              value={
                draft.publishAt
                  ? new Date(draft.publishAt - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                update({
                  publishAt: e.target.value ? new Date(e.target.value).getTime() : undefined,
                })
              }
              className={inputCls}
            />
          </Field>
          <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
            <span className="text-[13px] flex items-center gap-2">
              <Star
                className={cn("w-4 h-4", draft.featured && "fill-current")}
                strokeWidth={1.75}
              />{" "}
              Главная статья блога
            </span>
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => update({ featured: e.target.checked })}
              className="w-4 h-4 accent-foreground"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={() => publish("draft")}
            className="h-10 rounded-[2px] bg-muted text-[13px] font-medium hover:bg-muted/70"
          >
            Черновик
          </button>
          <button
            type="button"
            onClick={() => publish("scheduled")}
            className="h-10 rounded-[2px] bg-accent text-accent-foreground text-[13px] font-medium hover:bg-accent/80"
          >
            Запланировать
          </button>
          <button
            type="button"
            onClick={() => publish("published")}
            className="col-span-2 h-11 rounded-[2px] bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90"
          >
            {draft.status === "published" ? "Обновить публикацию" : "Опубликовать"}
          </button>
        </div>
      </Panel>

      <Panel title="Рубрика и теги">
        <div className="space-y-3">
          <Field label="Категория">
            <input
              list="blog-cats"
              value={draft.category}
              onChange={(e) => update({ category: e.target.value })}
              className={inputCls}
            />
            <datalist id="blog-cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ category: c })}
                className={cn(
                  "h-7 px-3 rounded-full text-[11.5px] transition-colors",
                  draft.category === c
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Field label="Теги">
            <TagsField
              value={draft.tags}
              onChange={(tags) => update({ tags })}
              suggestions={allTags}
            />
          </Field>
          <Field label="Автор">
            <input
              list="blog-authors"
              value={draft.author}
              onChange={(e) => update({ author: e.target.value })}
              className={inputCls}
            />
            <datalist id="blog-authors">
              {["DRAXLER Studio", "DRAXLER Engineering", "DRAXLER Editorial"].map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>
        </div>
      </Panel>

      <Panel title="SEO">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3" />
              <motion.circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={score >= 75 ? "var(--success)" : "var(--warning)"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={97.4}
                animate={{ strokeDashoffset: 97.4 * (1 - score / 100) }}
                transition={{ duration: 0.6, ease: easeOut }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold tabular-nums">
              {score}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground leading-snug">
            Оценка готовности статьи к поиску
          </div>
        </div>
        <div className="space-y-3">
          <Field
            label="URL"
            hint={
              slugTaken ? <span className="text-[11px] text-destructive">занят</span> : undefined
            }
          >
            <div className="flex items-center rounded-[2px] bg-background border border-border focus-within:border-foreground">
              <span className="pl-3 text-[12px] text-muted-foreground whitespace-nowrap">
                /blog/
              </span>
              <input
                value={draft.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  update({ slug: slugify(e.target.value) || e.target.value.toLowerCase() });
                }}
                className="flex-1 min-w-0 h-10 pr-3 bg-transparent outline-none text-[13px]"
              />
            </div>
          </Field>
          <Field
            label="Meta title"
            hint={<Counter value={(draft.seoTitle || draft.title).length} min={30} max={65} />}
          >
            <input
              value={draft.seoTitle}
              onChange={(e) => update({ seoTitle: e.target.value })}
              placeholder={draft.title}
              className={inputCls}
            />
          </Field>
          <Field
            label="Meta description"
            hint={
              <Counter value={(draft.seoDescription || draft.excerpt).length} min={110} max={165} />
            }
          >
            <AutoTextarea
              value={draft.seoDescription}
              onChange={(e) => update({ seoDescription: e.target.value })}
              placeholder={draft.excerpt || "По умолчанию — краткое описание"}
              className="px-3 py-2 rounded-[2px] bg-background border border-border text-[13px] focus:border-foreground min-h-[64px]"
            />
          </Field>
          <div className="rounded-[2px] bg-background border border-border p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Google</div>
            <div className="text-[12px] text-[#202124] truncate">
              draxlerwheels.com › blog › {draft.slug || "…"}
            </div>
            <div className="text-[16px] leading-tight text-[#1a0dab] line-clamp-1">
              {snippetTitle}
            </div>
            <div className="text-[12.5px] text-[#4d5156] line-clamp-2 mt-0.5">{snippetDesc}</div>
          </div>
          <ul className="space-y-1.5 pt-1">
            {checks.map((c) => (
              <li key={c.text} className="flex items-start gap-2 text-[12px]">
                {c.ok ? (
                  <CircleCheck className="w-3.5 h-3.5 mt-0.5 text-success shrink-0" />
                ) : (
                  <CircleAlert className="w-3.5 h-3.5 mt-0.5 text-warning shrink-0" />
                )}
                <span className={c.ok ? "text-muted-foreground" : "text-foreground"}>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Шаблонные блоки">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setTplGroup(g)}
              className={cn(
                "h-7 px-3 rounded-full text-[11.5px] transition-colors",
                tplGroup === g
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {g}
              {g === "Мои" && customTemplates.length > 0 && ` · ${customTemplates.length}`}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.ul
            key={tplGroup}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5"
          >
            {visibleTemplates.length === 0 && (
              <li className="text-[12px] text-muted-foreground py-2">
                Сохраните любой блок через иконку закладки — он появится здесь.
              </li>
            )}
            {visibleTemplates.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => insertTemplate(t)}
                  className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-[2px] bg-background border border-border text-left text-[13px] hover:border-foreground/40 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                    {t.blocks.length} бл.
                  </span>
                </button>
                {t.custom && (
                  <button
                    type="button"
                    aria-label="Удалить шаблон"
                    onClick={() => removeTemplate(t.id)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </Panel>

      {!isNew && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Удалить статью безвозвратно?")) {
              remove(draft.id);
              toast.success("Статья удалена");
              navigate({ to: "/blog" });
            }
          }}
          className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-[2px] text-[13px] text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="w-4 h-4" /> Удалить статью
        </button>
      )}
    </div>
  );

  const content = (
    <div className="space-y-6 min-w-0">
      {/* Cover */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setCoverOver(true);
        }}
        onDragLeave={() => setCoverOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setCoverOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) update({ cover: await compressImage(f) });
        }}
        className={cn(
          "relative aspect-[16/8] rounded-[2px] overflow-hidden bg-muted group",
          coverOver && "ring-2 ring-foreground/30",
        )}
      >
        {draft.cover ? (
          <>
            <motion.img
              key={draft.cover.slice(0, 64)}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: easeOut }}
              src={resolveImage(draft.cover)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: draft.coverPosition }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute left-4 right-4 bottom-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pickCover((cover) => update({ cover }))}
                className="h-9 px-4 rounded-full bg-background/95 text-[12.5px] font-medium"
              >
                {coverBusy ? "Загрузка…" : "Заменить обложку"}
              </button>
              <select
                value={draft.coverPosition}
                onChange={(e) => update({ coverPosition: e.target.value })}
                className="h-9 px-3 rounded-full bg-background/95 text-[12.5px] outline-none"
                aria-label="Кадрирование"
              >
                <option value="center">По центру</option>
                <option value="top">Сверху</option>
                <option value="bottom">Снизу</option>
                <option value="left">Слева</option>
                <option value="right">Справа</option>
              </select>
              <button
                type="button"
                onClick={() => update({ cover: "" })}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-background/95"
                aria-label="Убрать обложку"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => pickCover((cover) => update({ cover }))}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-muted/70 transition-colors"
          >
            {coverBusy ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            )}
            <span className="text-[14px] font-medium">Обложка статьи</span>
            <span className="text-[12px] text-muted-foreground">
              Перетащите фото или нажмите · рекомендуем 2400×1350
            </span>
          </button>
        )}
      </div>
      <input
        value={draft.cover.startsWith("data:") ? "" : draft.cover}
        onChange={(e) => update({ cover: e.target.value })}
        placeholder="…или путь к обложке на сайте, например /blog/ferrari-f80.jpg"
        className="w-full h-9 px-0 bg-transparent border-b border-border text-[12.5px] outline-none focus:border-foreground -mt-3"
      />

      <div>
        <div className="text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          {draft.category}
        </div>
        <AutoTextarea
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Заголовок статьи"
          className="text-[30px] md:text-[40px] font-light uppercase leading-[1.02] tracking-[-0.02em]"
        />
        <AutoTextarea
          value={draft.excerpt}
          onChange={(e) => update({ excerpt: e.target.value })}
          placeholder="Лид — 1–2 предложения, которые увидят в списке статей и в Google"
          className="mt-4 text-[18px] leading-[1.55] text-foreground"
        />
      </div>

      <BlockEditor
        blocks={draft.body}
        onChange={(body) => update({ body })}
        onSaveTemplate={saveAsTemplate}
      />

      <input
        value={draft.credit}
        onChange={(e) => update({ credit: e.target.value })}
        placeholder="Источник / права на фото (необязательно)"
        className="w-full h-10 bg-transparent border-b border-border text-[12.5px] outline-none focus:border-foreground"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: easeOut }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-30 -mx-5 md:-mx-8 lg:-mx-12 px-5 md:px-8 lg:px-12 py-3 mb-6 bg-background/90 backdrop-blur border-b border-border flex items-center gap-2">
        <Link
          to="/blog"
          className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-muted"
          aria-label="Назад"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <div className="text-[14px] font-medium truncate max-w-[40vw]">
            {draft.title || "Новая статья"}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AnimatePresence mode="wait" initial={false}>
              {saving ? (
                <motion.span
                  key="s"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1"
                >
                  <Loader2 className="w-3 h-3 animate-spin" /> Сохранение…
                </motion.span>
              ) : savedAt ? (
                <motion.span
                  key="d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Сохранено {formatRelative(savedAt)}
                </motion.span>
              ) : (
                <motion.span key="n">Не сохранено</motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={copyExport}
            title="Скопировать объект для blog-data.ts"
            className="hidden sm:inline-flex items-center gap-2 h-10 px-3 rounded-[2px] text-[13px] hover:bg-muted"
          >
            <ClipboardCopy className="w-4 h-4" strokeWidth={1.75} /> Экспорт
          </button>
          {draft.status === "published" && draft.slug && (
            <a
              href={`${SITE_URL}/blog/${draft.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center h-10 px-3 rounded-[2px] text-[13px] hover:bg-muted"
            >
              На сайте ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => setPreview(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[2px] bg-muted text-[13px] font-medium hover:bg-muted/70"
          >
            <Eye className="w-4 h-4" strokeWidth={1.75} />{" "}
            <span className="hidden sm:inline">Предпросмотр</span>
          </button>
          <button
            type="button"
            onClick={() => publish(draft.status === "draft" ? "published" : draft.status)}
            className="inline-flex items-center h-10 px-4 rounded-[2px] bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90"
          >
            {draft.status === "draft" ? "Опубликовать" : "Сохранить"}
          </button>
        </div>
      </div>

      {/* Mobile: content / settings switch */}
      <div className="xl:hidden mb-5">
        <SegmentedControl
          value={mobileTab}
          onChange={setMobileTab}
          options={[
            { value: "content", label: "Текст" },
            { value: "settings", label: "Настройки и SEO" },
          ]}
        />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className={cn(mobileTab !== "content" && "hidden xl:block")}>{content}</div>
        <div
          className={cn("xl:sticky xl:top-[84px]", mobileTab !== "settings" && "hidden xl:block")}
        >
          {settings}
        </div>
      </div>

      <Sheet open={preview} onOpenChange={setPreview}>
        <SheetContent
          side="bottom"
          className="h-[94vh] p-0 bg-muted rounded-t-[10px] overflow-hidden flex flex-col"
        >
          <SheetHeader className="px-5 py-3 bg-background border-b border-border flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-[14px] font-medium">Предпросмотр — как на сайте</SheetTitle>
            <div className="flex items-center gap-2 mr-8">
              <SegmentedControl
                size="sm"
                value={previewMode}
                onChange={setPreviewMode}
                options={[
                  { value: "desktop", label: "ПК" },
                  { value: "mobile", label: "Смартфон" },
                ]}
              />
              {previewMode === "desktop" ? (
                <Monitor className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Smartphone className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-auto p-3 md:p-6">
            <motion.div
              layout
              transition={{ duration: 0.4, ease: easeOut }}
              className={cn(
                "mx-auto bg-white shadow-lift overflow-hidden",
                previewMode === "mobile" ? "max-w-[390px] rounded-[22px]" : "max-w-[1280px]",
              )}
            >
              <ArticlePreview post={draft} />
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
