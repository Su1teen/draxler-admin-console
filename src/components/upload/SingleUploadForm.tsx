import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dropzone } from "@/components/primitives/Dropzone";
import { ImageThumbStrip } from "@/components/primitives/ImageThumbStrip";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "./TagInput";
import { CATEGORIES, placeholderImage } from "@/lib/mock/seed";
import { DEFAULT_SIZES, DEFAULT_SECTIONS } from "@/lib/defaults";
import { generateNextTitle } from "@/lib/title-generator";
import type { Category, QueueItem } from "@/store/queue.store";
import { useQueue } from "@/store/queue.store";
import { useArchive } from "@/store/archive.store";
import { useActivity } from "@/store/activity.store";
import { useAuth } from "@/store/auth.store";
import { publishProduct, uploadImageToCloudinary } from "@/lib/upload.service";
import { useSeoTemplates } from "@/store/seo-templates.store";
import { SeoTemplateManager } from "./SeoTemplateManager";

interface SectionState {
  title: string;
  text: string;
}

interface SingleUploadFormProps {
  initial?: Partial<QueueItem>;
  mode?: "create" | "edit";
  onSaved?: () => void;
  archiveId?: string;
  /** For batch-edit: return form data without Supabase/Cloudinary ops */
  onBatchSave?: (patch: {
    category: Category;
    tags: string[];
    tag_text: string;
    sizes: string[];
    sections: { title: string; text: string }[];
  }) => void;
  /** Hide title input entirely (used in create/batch modes) */
  hideTitle?: boolean;
}

export function SingleUploadForm({
  initial,
  mode = "create",
  onSaved,
  archiveId,
  onBatchSave,
  hideTitle,
}: SingleUploadFormProps) {
  const navigate = useNavigate();
  const updateArchive = useArchive((s) => s.update);
  const updateInSupabase = useArchive((s) => s.updateInSupabase);
  const updateQueue = useQueue((s) => s.update);
  const log = useActivity((s) => s.log);
  const actor = useAuth((s) => s.user?.name ?? "Система");

  const { templates, fetchTemplates } = useSeoTemplates();
  const [tagText, setTagText] = React.useState<string>(initial?.tag_text ?? "");
  const [hasAutoFilledTemplate, setHasAutoFilledTemplate] = React.useState(false);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  React.useEffect(() => {
    if (mode === "create" && !tagText && templates.length > 0 && !hasAutoFilledTemplate) {
      setTagText(templates[0].content);
      setHasAutoFilledTemplate(true);
    }
  }, [mode, templates, tagText, hasAutoFilledTemplate]);

  // For edits, images contains string URLs. For new uploads, mix of string URLs and object URLs
  const [images, setImages] = React.useState<string[]>(initial?.images ?? []);
  const [files, setFiles] = React.useState<File[]>([]); // New files specifically

  const [title, setTitle] = React.useState<string>(initial?.title ?? "");
  const [category, setCategory] = React.useState<Category>(initial?.category ?? "luxury");
  const [tags, setTags] = React.useState<string[]>(initial?.tags ?? []);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [progress, setProgress] = React.useState("");

  const [sizes, setSizes] = React.useState<string[]>(() => {
    if (initial?.sizes && initial.sizes.length > 0) return initial.sizes;
    return [...DEFAULT_SIZES];
  });

  const [sections, setSections] = React.useState<SectionState[]>(() => {
    if (initial?.section_1_title !== undefined) {
      return [
        { title: initial.section_1_title ?? "", text: initial.section_1_text ?? "" },
        { title: initial.section_2_title ?? "", text: initial.section_2_text ?? "" },
        { title: initial.section_3_title ?? "", text: initial.section_3_text ?? "" },
        { title: initial.section_4_title ?? "", text: initial.section_4_text ?? "" },
        { title: initial.section_5_title ?? "", text: initial.section_5_text ?? "" },
      ];
    }
    return DEFAULT_SECTIONS.map((s) => ({ title: s.title, text: s.text }));
  });

  const toggleSize = (size: string) => {
    setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  };

  const updateSection = (index: number, field: "title" | "text", value: string) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleFiles = (incomingFiles: File[]) => {
    const urls = incomingFiles.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls]);
    setFiles((prev) => [...prev, ...incomingFiles]);
  };

  const removeImage = (index: number) => {
    const targetUrl = images[index];
    if (targetUrl.startsWith("blob:")) URL.revokeObjectURL(targetUrl);

    setImages(images.filter((_, idx) => idx !== index));

    // Also remove from files array if it was a file
    // Matching is tricky, but we can assume files are appended in order at the end.
    // In a real app we might map them more cleanly, but since we are just doing simple edit...
    setFiles((prev) => prev.filter((f) => URL.createObjectURL(f) !== targetUrl));
  };

  const resetCreateForm = () => {
    images.forEach((i) => {
      if (i.startsWith("blob:")) URL.revokeObjectURL(i);
    });
    setImages([]);
    setFiles([]);
    setTitle("");
    setCategory("luxury");
    setTags([]);
    setTagText(templates.length > 0 ? templates[0].content : "");
    setSizes([...DEFAULT_SIZES]);
    setSections(DEFAULT_SECTIONS.map((s) => ({ title: s.title, text: s.text })));
    setProgress("");
  };

  const sectionFields = () => ({
    section_1_title: sections[0].title,
    section_1_text: sections[0].text,
    section_2_title: sections[1].title,
    section_2_text: sections[1].text,
    section_3_title: sections[2].title,
    section_3_text: sections[2].text,
    section_4_title: sections[3].title,
    section_4_text: sections[3].text,
    section_5_title: sections[4].title,
    section_5_text: sections[4].text,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Batch-edit: just return the form data, no upload/supabase
    if (onBatchSave) {
      onBatchSave({
        category,
        tags,
        tag_text: tagText,
        sizes,
        sections: sections.map((s) => ({ title: s.title, text: s.text })),
      });
      onSaved?.();
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "edit" && initial?.id) {
        setProgress("Загрузка новых фото...");

        let autoTitle = title;
        if (!autoTitle || autoTitle.trim() === "") {
          try {
            autoTitle = await generateNextTitle(category);
          } catch {
            autoTitle = `DRX-${Date.now().toString().slice(-4)}`;
          }
        }

        // 1. We need to upload ANY new files to Cloudinary, and keep the existing Cloudinary URLs.
        const finalImages: string[] = [];
        let fileIndex = 0;

        for (const imgUrl of images) {
          if (imgUrl.startsWith("blob:")) {
            // it's a new file
            const f = files[fileIndex];
            fileIndex++;
            if (f) {
              const uploaded = await uploadImageToCloudinary(f);
              finalImages.push(uploaded);
            }
          } else {
            // keep old Cloudinary URL
            finalImages.push(imgUrl);
          }
        }

        const patch = {
          title: autoTitle,
          images: finalImages,
          category,
          tags,
          tag_text: tagText,
          sizes,
          ...sectionFields(),
        };

        setProgress("Сохранение...");
        if (archiveId) {
          try {
            await updateInSupabase(initial.id, patch);
          } catch (err) {
            console.error(err);
            updateArchive(initial.id, patch);
          }
        } else {
          updateQueue(initial.id, patch);
        }

        log({ actor, action: `обновил карточку ${autoTitle} (${category})` });
        toast.success("Сохранено");
        onSaved?.();
        return;
      }

      if (files.length === 0) {
        toast.error("Добавьте хотя бы одно изображение");
        setIsSubmitting(false);
        return;
      }

      setProgress("Загружаем изображения...");
      let autoTitle = title;
      if (!autoTitle) {
        try {
          autoTitle = await generateNextTitle(category);
        } catch {
          autoTitle = `DRX-${Date.now().toString().slice(-4)}`;
        }
      }

      await publishProduct(
        {
          title: autoTitle,
          type: category,
          parameters: JSON.stringify({ tags }),
          tag_text: tagText,
          sizes,
          ...sectionFields(),
        },
        files,
        setProgress,
      );

      log({ actor, action: `опубликовал одиночную карточку (${category}) — ${autoTitle}` });
      toast.success(`Карточка ${autoTitle} опубликована`);
      resetCreateForm();
      navigate({ to: "/upload" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось опубликовать";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setProgress("");
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-[800px] w-full mx-auto pb-10 mt-6 relative">
      {isSubmitting && progress && (
        <div className="absolute top-0 left-0 w-full p-4 mb-4 text-sm bg-accent text-accent-foreground rounded-[2px] z-10 font-medium">
          {progress}
        </div>
      )}

      <div className="flex flex-col gap-8 md:gap-10">
        <section className="space-y-4 md:space-y-5">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-4">
              Изображения диска
            </div>
            <Dropzone variant="single" onFiles={handleFiles} />
            <div className="mt-4 md:mt-5 bg-card border border-border rounded-[2px] p-2">
              <ImageThumbStrip images={images} onRemove={removeImage} />
            </div>
          </div>
        </section>

        <section className="space-y-4 md:space-y-5">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            Основные данные
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] md:gap-x-8 gap-y-4 md:gap-y-0 p-4 md:p-6 bg-card border border-border rounded-[2px]">
            <div className="text-[14px] font-medium text-foreground py-2 hidden md:block">
              Категория
            </div>
            <SegmentedControl options={CATEGORIES} value={category} onChange={setCategory} />

            {(hideTitle || mode === "create") ? (
              /* Auto-title label — no editable input in create mode */
              <>
                <div className="text-[14px] font-medium text-foreground py-4 hidden md:block border-t border-border mt-4">
                  Название
                </div>
                <div className="md:border-t md:border-border md:pt-4 md:mt-4">
                  <div className="text-[14px] text-muted-foreground/70 italic pb-2 border-b border-border/30">
                    Генерируется автоматически (DRX-XXXX)
                  </div>
                </div>
              </>
            ) : (
              /* Editable title input — only in edit mode */
              <>
                <div className="text-[14px] font-medium text-foreground py-4 hidden md:block border-t border-border mt-4">
                  Название
                </div>
                <div className="md:border-t md:border-border md:pt-4 md:mt-4">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Кованый диск Sport Design R20"
                    className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground/60 outline-none pb-2 border-b border-border/50 focus:border-border transition-colors rounded-none"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="space-y-4 md:space-y-5">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            Характеристики
          </div>
          <div className="bg-card border border-border rounded-[2px] p-4 md:p-6 space-y-6 md:space-y-8">
            <TagInput value={tags} onChange={setTags} />
            
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] text-muted-foreground font-medium">
                  Текст тегов (SEO абзац)
                </div>
                <SeoTemplateManager 
                  currentText={tagText} 
                  onSelectTemplate={setTagText} 
                  onSaveAsNew={() => {}}
                />
              </div>
              <textarea
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="Вставьте объемный SEO-текст с брендами..."
                rows={6}
                className="w-full bg-background border border-border rounded-[4px] px-4 py-3 text-[14px] text-foreground outline-none focus:border-primary transition-colors resize-y leading-relaxed"
              />
            </div>

            <div>
              <div className="text-[13px] text-muted-foreground mb-3 font-medium">
                Доступные размеры
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {DEFAULT_SIZES.map((size) => (
                  <label key={size} className="flex items-center gap-2.5 group cursor-pointer">
                    <Checkbox
                      checked={sizes.includes(size)}
                      onCheckedChange={() => toggleSize(size)}
                      className="border-muted-foreground/30 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground transition-all duration-200"
                    />
                    <span className="text-[14px] text-foreground group-hover:text-foreground/80 transition-colors uppercase tracking-wide">
                      {size}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 md:space-y-5">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            Разделы (5 блоков)
          </div>
          <Accordion type="multiple" className="w-full bg-card border border-border rounded-[2px]">
            {sections.map((sec, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                className="border-b last:border-b-0 border-border"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors text-[14px] font-medium tracking-wide">
                  Блок {idx + 1}: {sec.title || "Без заголовка"}
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-2">
                  <div className="space-y-4">
                    <input
                      value={sec.title}
                      onChange={(e) => updateSection(idx, "title", e.target.value)}
                      placeholder="Заголовок блока"
                      className="w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/60 outline-none pb-2 border-b border-border/50 focus:border-border transition-colors rounded-none"
                    />
                    <textarea
                      value={sec.text}
                      onChange={(e) => updateSection(idx, "text", e.target.value)}
                      placeholder="Текст блока"
                      rows={3}
                      className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none resize-none"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <div className="sticky bottom-0 z-10 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:ml-auto h-12 md:h-14 px-8 rounded-[2px] bg-primary text-primary-foreground text-[14px] font-medium tracking-wide flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lift disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Публикуется..."
              : onBatchSave
                ? "Сохранить"
                : mode === "create"
                  ? "Опубликовать карточку"
                  : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </form>
  );
}
