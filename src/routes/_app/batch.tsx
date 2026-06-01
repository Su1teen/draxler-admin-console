import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Trash2, Send, Plus, X, Pencil } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/primitives/PageHeader";
import { SectionCard } from "@/components/primitives/SectionCard";
import { Dropzone } from "@/components/primitives/Dropzone";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { IntervalConfigurator } from "@/components/batch/IntervalConfigurator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SingleUploadForm } from "@/components/upload/SingleUploadForm";
import { CATEGORIES } from "@/lib/mock/seed";
import { DEFAULT_SIZES, DEFAULT_SECTIONS } from "@/lib/defaults";
import type { Category } from "@/store/queue.store";
import { useQueue } from "@/store/queue.store";
import { useActivity } from "@/store/activity.store";
import { useAuth } from "@/store/auth.store";
import { dur, easeOut } from "@/lib/motion";
import { EmptyState } from "@/components/primitives/EmptyState";
import { uploadImageToCloudinary } from "@/lib/upload.service";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSeoTemplates } from "@/store/seo-templates.store";

export const Route = createFileRoute("/_app/batch")({
  head: () => ({ meta: [{ title: "Пакетная загрузка — Draxler" }] }),
  component: BatchPage,
});

interface DraftSection {
  title: string;
  text: string;
}

interface Draft {
  id: string;
  category: Category;
  thumbs: string[];
  files: File[];
  /* Extended fields — customizable per-draft via edit sheet */
  tags: string[];
  tag_text: string;
  sizes: string[];
  sections: DraftSection[];
}

function BatchPage() {
  const navigate = useNavigate();
  const intervalMin = useQueue((s) => s.intervalMin);
  const setInterval = useQueue((s) => s.setInterval);
  const addBatch = useQueue((s) => s.addBatch);
  const log = useActivity((s) => s.log);
  const actor = useAuth((s) => s.user?.name ?? "Система");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [defaultCat, setDefaultCat] = React.useState<Category>("luxury");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingDraft, setEditingDraft] = React.useState<Draft | null>(null);
  
  const { templates, fetchTemplates } = useSeoTemplates();
  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleInitialFiles = (files: File[]) => {
    const next: Draft[] = files.map((f) => ({
      id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      thumbs: [URL.createObjectURL(f)],
      files: [f],
      category: defaultCat,
      tags: [],
      tag_text: templates.length > 0 ? templates[0].content : "",
      sizes: [...DEFAULT_SIZES],
      sections: DEFAULT_SECTIONS.map((s) => ({ title: s.title, text: s.text })),
    }));
    setDrafts((prev) => [...prev, ...next]);
    toast.success(`Добавлено ${files.length} изображений`);
  };

  const removeDraft = (id: string) => setDrafts((prev) => prev.filter((d) => d.id !== id));

  const setDraftCat = (id: string, cat: Category) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, category: cat } : d)));

  const addFilesToDraft = (id: string, newFiles: File[]) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const thumbs = [...d.thumbs, ...newFiles.map((f) => URL.createObjectURL(f))];
        return { ...d, thumbs, files: [...d.files, ...newFiles] };
      }),
    );
  };

  const removeThumbFromDraft = (id: string, thumbIndex: number) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const newThumbs = d.thumbs.filter((_, idx) => idx !== thumbIndex);
        const newFiles = d.files.filter((_, idx) => idx !== thumbIndex);
        if (newThumbs.length === 0) return d;
        return { ...d, thumbs: newThumbs, files: newFiles };
      }),
    );
  };

  const updateDraftFromEdit = (
    id: string,
    patch: {
      category: Category;
      tags: string[];
      tag_text: string;
      sizes: string[];
      sections: { title: string; text: string }[];
    },
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, category: patch.category, tags: patch.tags, tag_text: patch.tag_text, sizes: patch.sizes, sections: patch.sections }
          : d,
      ),
    );
  };

  const sendToQueue = async () => {
    if (drafts.length === 0) return;
    setIsSubmitting(true);

    toast.info("Загрузка файлов в облако...");

    try {
      const finalPayloads = [];

      for (const d of drafts) {
        const uploadedUrls = await Promise.all(d.files.map((f) => uploadImageToCloudinary(f)));

        finalPayloads.push({
          id: d.id,
          title: "", // Auto-generated on publish
          images: uploadedUrls,
          sizes: d.sizes,
          section_1_title: d.sections[0]?.title ?? DEFAULT_SECTIONS[0].title,
          section_1_text: d.sections[0]?.text ?? DEFAULT_SECTIONS[0].text,
          section_2_title: d.sections[1]?.title ?? DEFAULT_SECTIONS[1].title,
          section_2_text: d.sections[1]?.text ?? DEFAULT_SECTIONS[1].text,
          section_3_title: d.sections[2]?.title ?? DEFAULT_SECTIONS[2].title,
          section_3_text: d.sections[2]?.text ?? DEFAULT_SECTIONS[2].text,
          section_4_title: d.sections[3]?.title ?? DEFAULT_SECTIONS[3].title,
          section_4_text: d.sections[3]?.text ?? DEFAULT_SECTIONS[3].text,
          section_5_title: d.sections[4]?.title ?? DEFAULT_SECTIONS[4].title,
          section_5_text: d.sections[4]?.text ?? DEFAULT_SECTIONS[4].text,
          category: d.category,
          tags: d.tags,
          tag_text: d.tag_text,
        });
      }

      await addBatch(finalPayloads);

      log({ actor, action: `загрузил батч (${drafts.length} шт.)` });
      toast.success(`Добавлено ${drafts.length} в очередь`);
      setDrafts([]);
      navigate({ to: "/queue" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка при загрузке");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: drafts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 8,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: easeOut }}
      className="pb-10"
    >
      <PageHeader
        eyebrow="Контент"
        title="Пакетная загрузка"
        description="Загрузите до 500 изображений. Добавляйте несколько фотографий к одной карточке."
        actions={
          drafts.length > 0 && (
            <button
              type="button"
              onClick={sendToQueue}
              disabled={isSubmitting}
              className="h-11 px-5 rounded-[2px] bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              <Send className="w-4 h-4" strokeWidth={1.8} />
              {isSubmitting ? "Загрузка..." : `Отправить в очередь (${drafts.length})`}
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-6">
        <SectionCard>
          <Dropzone variant="batch" onFiles={handleInitialFiles} />
          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-[11px] tracking-wider uppercase text-muted-foreground">
              Категория по умолчанию
            </div>
            <SegmentedControl
              options={CATEGORIES}
              value={defaultCat}
              onChange={setDefaultCat}
              size="sm"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-[11px] tracking-wider uppercase text-muted-foreground">
              Массово применить SEO-шаблон
            </div>
            {templates.length > 0 ? (
              <select
                className="bg-muted text-[13px] text-foreground border-none rounded-[4px] px-3 py-1.5 outline-none cursor-pointer"
                onChange={(e) => {
                  const tpl = templates.find((t) => t.id === e.target.value);
                  if (tpl) {
                    setDrafts((prev) => prev.map((d) => ({ ...d, tag_text: tpl.content })));
                    toast.success("Шаблон применен ко всем черновикам");
                  }
                  e.target.value = ""; // Reset after selection
                }}
                defaultValue=""
              >
                <option value="" disabled>Выберите шаблон...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            ) : (
              <div className="text-[12px] text-muted-foreground italic">Нет доступных шаблонов</div>
            )}
          </div>
        </SectionCard>
        <IntervalConfigurator value={intervalMin} onChange={setInterval} />
      </div>

      <SectionCard>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
              Загружено
            </div>
            <div className="mt-1 text-[18px] font-semibold text-foreground">
              {drafts.length} карточек
            </div>
          </div>
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={() => setDrafts([])}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Очистить всё
            </button>
          )}
        </div>

        {drafts.length === 0 ? (
          <EmptyState
            title="Пока ничего не загружено"
            description="Перетащите изображения в зону загрузки выше, чтобы создать карточки."
          />
        ) : (
          <div ref={parentRef} className="h-[60vh] md:h-[600px] overflow-auto">
            <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
              <AnimatePresence initial={false}>
                {rowVirtualizer.getVirtualItems().map((row) => {
                  const d = drafts[row.index];
                  if (!d) return null;
                  return (
                    <div
                      key={d.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${row.start}px)`,
                        height: row.size,
                      }}
                    >
                      <div className="flex flex-col gap-2 pr-2 border-b border-border py-3 h-full">
                        <div className="flex flex-col md:flex-row md:items-start gap-3 flex-1">
                          {/* Image Gallery */}
                          <div className="flex flex-wrap items-center gap-2 max-w-[320px] shrink-0">
                            {d.thumbs.map((thumb, idx) => (
                              <div
                                key={idx}
                                className="w-14 h-14 rounded-[2px] overflow-hidden bg-muted shrink-0 relative group"
                              >
                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                                {d.thumbs.length > 1 && (
                                  <button
                                    onClick={() => removeThumbFromDraft(d.id, idx)}
                                    className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <label className="w-14 h-14 rounded-[2px] border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                              <Plus className="w-5 h-5" />
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files)
                                    addFilesToDraft(d.id, Array.from(e.target.files));
                                }}
                              />
                            </label>
                          </div>

                          {/* Title (read-only) + info */}
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-foreground truncate">
                              Карточка #{row.index + 1}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate opacity-70 mt-0.5">
                              {d.files.length} фото
                              {d.tags.length > 0 && ` · ${d.tags.slice(0, 2).join(", ")}`}
                            </div>
                          </div>

                          {/* Actions row — wraps on mobile */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <SegmentedControl
                              options={CATEGORIES}
                              value={d.category}
                              onChange={(v) => setDraftCat(d.id, v)}
                              size="sm"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingDraft(d)}
                                aria-label="Редактировать"
                                className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center transition-colors"
                              >
                                <Pencil className="w-4 h-4" strokeWidth={1.7} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDraft(d.id)}
                                aria-label="Удалить"
                                className="w-9 h-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted inline-flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={1.7} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Edit Sheet for individual draft */}
      <Sheet open={!!editingDraft} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={
            isDesktop
              ? "w-full sm:max-w-[560px] overflow-y-auto bg-background border-l border-border"
              : "h-[92vh] rounded-t-[12px] overflow-y-auto bg-background border-t border-border"
          }
        >
          <SheetHeader className="text-left">
            <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
              Редактирование
            </div>
            <SheetTitle className="text-foreground text-[20px] font-semibold tracking-tight">
              Карточка из пакета
            </SheetTitle>
          </SheetHeader>
          {editingDraft && (
            <div className="mt-6">
              <SingleUploadForm
                mode="edit"
                hideTitle
                initial={{
                  id: editingDraft.id,
                  images: editingDraft.thumbs,
                  category: editingDraft.category,
                  tags: editingDraft.tags,
                  tag_text: editingDraft.tag_text,
                  sizes: editingDraft.sizes,
                  section_1_title: editingDraft.sections[0]?.title,
                  section_1_text: editingDraft.sections[0]?.text,
                  section_2_title: editingDraft.sections[1]?.title,
                  section_2_text: editingDraft.sections[1]?.text,
                  section_3_title: editingDraft.sections[2]?.title,
                  section_3_text: editingDraft.sections[2]?.text,
                  section_4_title: editingDraft.sections[3]?.title,
                  section_4_text: editingDraft.sections[3]?.text,
                  section_5_title: editingDraft.sections[4]?.title,
                  section_5_text: editingDraft.sections[4]?.text,
                }}
                onBatchSave={(patch) => {
                  updateDraftFromEdit(editingDraft.id, patch);
                  setEditingDraft(null);
                  toast.success("Карточка обновлена");
                }}
                onSaved={() => setEditingDraft(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
