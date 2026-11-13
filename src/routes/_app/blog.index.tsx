import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  ExternalLink,
  FilePlus2,
  Pencil,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/primitives/PageHeader";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { EmptyState } from "@/components/primitives/EmptyState";
import { useBlog, BLOG_CATEGORIES } from "@/store/blog.store";
import {
  formatPostDate,
  readTime,
  resolveImage,
  SITE_URL,
  type AdminPost,
  type PostStatus,
} from "@/lib/blog/types";
import { formatRelative } from "@/lib/format";
import { dur, easeOut, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/blog/")({
  head: () => ({ meta: [{ title: "Блог — Draxler" }] }),
  component: BlogListPage,
});

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  scheduled: "Запланировано",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-medium",
        status === "published" && "bg-foreground text-background",
        status === "draft" && "bg-muted text-muted-foreground",
        status === "scheduled" && "bg-accent text-accent-foreground",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "published"
            ? "bg-success"
            : status === "scheduled"
              ? "bg-warning"
              : "bg-muted-foreground/60",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

function PostCard({ post, index }: { post: AdminPost; index: number }) {
  const navigate = useNavigate();
  const remove = useBlog((s) => s.remove);
  const duplicate = useBlog((s) => s.duplicate);
  const [confirm, setConfirm] = React.useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: dur.slow, ease: easeOut, delay: Math.min(index, 8) * 0.03 }}
      className="group bg-card rounded-[2px] overflow-hidden flex flex-col hover:shadow-lift transition-shadow"
    >
      <Link
        to="/blog/$postId"
        params={{ postId: post.id }}
        className="relative block aspect-[16/10] bg-muted overflow-hidden"
      >
        {post.cover ? (
          <img
            src={resolveImage(post.cover)}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            style={{ objectPosition: post.coverPosition }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            Без обложки
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <StatusBadge status={post.status} />
          {post.featured && (
            <span className="inline-flex items-center h-6 px-2 rounded-full bg-background/90 text-foreground">
              <Star className="w-3 h-3 fill-current" />
            </span>
          )}
        </div>
      </Link>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground">
          {post.category} / {formatPostDate(post.date)} / {readTime(post)}
        </div>
        <Link
          to="/blog/$postId"
          params={{ postId: post.id }}
          className="text-[16px] font-semibold leading-snug text-foreground hover:underline underline-offset-4"
        >
          {post.title || "Без названия"}
        </Link>
        <p className="text-[13px] text-muted-foreground line-clamp-2">{post.excerpt || "—"}</p>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {post.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full border border-border text-[11px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Изменено {formatRelative(post.updatedAt)}
          </span>
          <div className="flex items-center gap-1">
            <IconBtn
              label="Редактировать"
              onClick={() => navigate({ to: "/blog/$postId", params: { postId: post.id } })}
            >
              <Pencil className="w-4 h-4" />
            </IconBtn>
            <IconBtn
              label="Дублировать"
              onClick={() => {
                const copy = duplicate(post.id);
                if (copy) toast.success("Создана копия черновика");
              }}
            >
              <Copy className="w-4 h-4" />
            </IconBtn>
            {post.status === "published" && post.slug && (
              <a
                href={`${SITE_URL}/blog/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Открыть на сайте"
                className="w-9 h-9 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <AnimatePresence mode="wait" initial={false}>
              {confirm ? (
                <motion.div
                  key="c"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      remove(post.id);
                      toast.success("Статья удалена");
                    }}
                    className="h-8 px-3 rounded-full bg-destructive text-destructive-foreground text-[12px] font-medium"
                  >
                    Удалить
                  </button>
                  <IconBtn label="Отмена" onClick={() => setConfirm(false)}>
                    <X className="w-4 h-4" />
                  </IconBtn>
                </motion.div>
              ) : (
                <motion.div
                  key="d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <IconBtn label="Удалить" onClick={() => setConfirm(true)}>
                    <Trash2 className="w-4 h-4" />
                  </IconBtn>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function IconBtn({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "w-9 h-9 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}

function BlogListPage() {
  const posts = useBlog((s) => s.posts);
  const hydrated = useBlog((s) => s.hydrated);
  const resetToSite = useBlog((s) => s.resetToSite);
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<"all" | PostStatus>("all");
  const [category, setCategory] = React.useState("all");
  const [q, setQ] = React.useState("");

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
  };

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => category === "all" || p.category === category)
      .filter(
        (p) =>
          !needle ||
          p.title.toLowerCase().includes(needle) ||
          p.excerpt.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)),
      )
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.updatedAt - a.updatedAt);
  }, [posts, status, category, q]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: easeOut }}
    >
      <PageHeader
        eyebrow="Контент"
        title="Блог"
        description="Статьи для draxlerwheels.com/blog: проекты, новинки и техника дисков."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Вернуть список статей к версии с сайта? Ваши черновики будут удалены.",
                  )
                ) {
                  resetToSite();
                  toast.success("Статьи синхронизированы с сайтом");
                }
              }}
              className="hidden sm:inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[2px] bg-muted text-foreground text-[13px] font-medium hover:bg-muted/70 transition-colors"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.75} /> Сброс
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/blog/$postId", params: { postId: "new" } })}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[2px] bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors"
            >
              <FilePlus2 className="w-4 h-4" strokeWidth={1.75} /> Новая статья
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          ["Всего", counts.all],
          ["Опубликовано", counts.published],
          ["Черновики", counts.draft],
          ["Запланировано", counts.scheduled],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-[2px] p-5">
            <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 text-[28px] font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <SegmentedControl<"all" | PostStatus>
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Все" },
            { value: "published", label: "Опубликовано" },
            { value: "draft", label: "Черновики" },
            { value: "scheduled", label: "Запланировано" },
          ]}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 px-4 rounded-full bg-muted text-[13px] font-medium outline-none"
        >
          <option value="all">Все категории</option>
          {Array.from(new Set([...BLOG_CATEGORIES, ...posts.map((p) => p.category)])).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="relative flex-1 lg:max-w-xs lg:ml-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию и тегам"
            className="w-full h-11 pl-10 pr-4 rounded-full bg-muted text-[14px] outline-none placeholder:text-muted-foreground/70"
          />
        </label>
      </div>

      {!hydrated ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-card rounded-[2px] aspect-[4/5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Статей не найдено"
          description="Измените фильтр или создайте новую статью."
        />
      ) : (
        <motion.div layout transition={spring} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
