import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Heading2,
  ImagePlus,
  List,
  Pilcrow,
  Plus,
  Quote,
  Table2,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/blog/idb-storage";
import { resolveImage, type BlockType, type BlogBlock, type EditorBlock } from "@/lib/blog/types";
import { wrapBlock } from "@/store/blog.store";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const BLOCK_META: Record<BlockType, { label: string; icon: typeof Pilcrow }> = {
  p: { label: "Абзац", icon: Pilcrow },
  h: { label: "Заголовок", icon: Heading2 },
  quote: { label: "Цитата", icon: Quote },
  list: { label: "Список", icon: List },
  specs: { label: "Таблица", icon: Table2 },
  image: { label: "Фото", icon: ImagePlus },
};

export function newBlock(type: BlockType): BlogBlock {
  switch (type) {
    case "p":
      return { type, text: "" };
    case "h":
      return { type, text: "" };
    case "quote":
      return { type, text: "", cite: "" };
    case "list":
      return { type, items: [""] };
    case "specs":
      return { type, title: "Specifications", rows: [["", ""]] };
    case "image":
      return { type, src: "", caption: "", alt: "" };
  }
}

/** Auto-growing textarea. */
export function AutoTextarea({
  className,
  value,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn(
        "w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/60 overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export function useImageUpload() {
  const [busy, setBusy] = React.useState(false);
  const pick = React.useCallback((onDone: (src: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Файл больше 25 МБ");
        return;
      }
      setBusy(true);
      try {
        onDone(await compressImage(file));
        toast.success("Фото загружено");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }, []);
  return { busy, pick };
}

function ImageBlockEditor({
  block,
  onChange,
}: {
  block: Extract<BlogBlock, { type: "image" }>;
  onChange: (b: BlogBlock) => void;
}) {
  const { busy, pick } = useImageUpload();
  const [over, setOver] = React.useState(false);
  const onDrop = async (file: File) => {
    try {
      onChange({ ...block, src: await compressImage(file) });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="space-y-3">
      {block.src ? (
        <div className="relative group/img rounded-[2px] overflow-hidden bg-muted">
          <img
            src={resolveImage(block.src)}
            alt={block.alt ?? ""}
            className="w-full max-h-[420px] object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100">
            <button
              type="button"
              onClick={() => pick((src) => onChange({ ...block, src }))}
              className="h-9 px-4 rounded-full bg-background text-[13px] font-medium"
            >
              Заменить
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...block, src: "" })}
              className="h-9 px-4 rounded-full bg-background text-[13px] font-medium"
            >
              Убрать
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => pick((src) => onChange({ ...block, src }))}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void onDrop(f);
          }}
          className={cn(
            "w-full py-10 rounded-[2px] border border-dashed flex flex-col items-center gap-2 text-[13px] transition-colors",
            over
              ? "border-foreground/40 bg-accent/40"
              : "border-border bg-background hover:bg-muted/50",
          )}
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="font-medium">Перетащите фото или нажмите</span>
          <span className="text-muted-foreground text-[12px]">Сжимается до 1920 px, WebP</span>
        </button>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={block.caption ?? ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Подпись"
          className="h-10 px-3 rounded-[2px] bg-background border border-border text-[13px] outline-none focus:border-foreground"
        />
        <input
          value={block.alt ?? ""}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Alt-текст (для SEO)"
          className="h-10 px-3 rounded-[2px] bg-background border border-border text-[13px] outline-none focus:border-foreground"
        />
      </div>
      <input
        value={block.src.startsWith("data:") ? "" : block.src}
        onChange={(e) => onChange({ ...block, src: e.target.value })}
        placeholder="…или ссылка на изображение (https:// или /путь на сайте)"
        className="w-full h-10 px-3 rounded-[2px] bg-background border border-border text-[13px] outline-none focus:border-foreground"
      />
    </div>
  );
}

function BlockBody({ block, onChange }: { block: BlogBlock; onChange: (b: BlogBlock) => void }) {
  switch (block.type) {
    case "p":
      return (
        <AutoTextarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Текст абзаца…"
          className="text-[15px] leading-[1.75] text-foreground/85"
        />
      );
    case "h":
      return (
        <AutoTextarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Подзаголовок (H2)"
          className="text-[22px] font-bold tracking-[-0.03em] leading-tight"
        />
      );
    case "quote":
      return (
        <div className="border-l-2 border-foreground pl-5 space-y-2">
          <AutoTextarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Текст цитаты"
            className="text-[20px] font-light leading-snug"
          />
          <input
            value={block.cite ?? ""}
            onChange={(e) => onChange({ ...block, cite: e.target.value })}
            placeholder="Автор цитаты"
            className="w-full bg-transparent outline-none text-[11px] font-bold tracking-[0.14em] uppercase text-muted-foreground placeholder:text-muted-foreground/50"
          />
        </div>
      );
    case "list":
      return (
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 group/li">
              <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <AutoTextarea
                value={item}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = e.target.value;
                  onChange({ ...block, items });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const items = [...block.items];
                    items.splice(i + 1, 0, "");
                    onChange({ ...block, items });
                    requestAnimationFrame(() => {
                      const next = e.currentTarget.closest("ul")?.querySelectorAll("textarea")[
                        i + 1
                      ] as HTMLTextAreaElement | undefined;
                      next?.focus();
                    });
                  } else if (e.key === "Backspace" && item === "" && block.items.length > 1) {
                    e.preventDefault();
                    onChange({ ...block, items: block.items.filter((_, j) => j !== i) });
                  }
                }}
                placeholder="Пункт списка"
                className="text-[15px] leading-[1.7] py-0.5"
              />
              {block.items.length > 1 && (
                <button
                  type="button"
                  aria-label="Удалить пункт"
                  onClick={() =>
                    onChange({ ...block, items: block.items.filter((_, j) => j !== i) })
                  }
                  className="mt-1 opacity-0 group-hover/li:opacity-100 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => onChange({ ...block, items: [...block.items, ""] })}
              className="text-[12px] text-muted-foreground hover:text-foreground pl-3.5"
            >
              + пункт
            </button>
          </li>
        </ul>
      );
    case "specs":
      return (
        <div className="rounded-[10px] border border-border overflow-hidden bg-background">
          <input
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Название таблицы"
            className="w-full px-4 py-3 bg-muted/70 outline-none text-[10.5px] font-bold tracking-[0.14em] uppercase"
          />
          {block.rows.map(([k, v], i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1.2fr_auto] border-t border-border group/row"
            >
              <input
                value={k}
                onChange={(e) => {
                  const rows = block.rows.map((r) => [...r] as [string, string]);
                  rows[i][0] = e.target.value;
                  onChange({ ...block, rows });
                }}
                placeholder="Параметр"
                className="px-4 py-2.5 bg-transparent outline-none text-[13px] text-muted-foreground"
              />
              <input
                value={v}
                onChange={(e) => {
                  const rows = block.rows.map((r) => [...r] as [string, string]);
                  rows[i][1] = e.target.value;
                  onChange({ ...block, rows });
                }}
                placeholder="Значение"
                className="px-4 py-2.5 bg-transparent outline-none text-[13px] font-semibold"
              />
              <button
                type="button"
                aria-label="Удалить строку"
                onClick={() => onChange({ ...block, rows: block.rows.filter((_, j) => j !== i) })}
                className="px-3 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...block, rows: [...block.rows, ["", ""]] })}
            className="w-full px-4 py-2.5 border-t border-border text-left text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40"
          >
            + строка
          </button>
        </div>
      );
    case "image":
      return <ImageBlockEditor block={block} onChange={onChange} />;
  }
}

function SortableBlock({
  item,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onInsert,
  onSaveTemplate,
}: {
  item: EditorBlock;
  index: number;
  total: number;
  onChange: (b: BlogBlock) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onInsert: (type: BlockType) => void;
  onSaveTemplate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const meta = BLOCK_META[item.block.type];
  const Icon = meta.icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-20")}
    >
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25, ease: easeOut }}
        className={cn(
          "group/block relative rounded-[2px] bg-card px-4 sm:px-5 pt-3 pb-4 transition-shadow",
          isDragging ? "shadow-lift ring-1 ring-foreground/10" : "hover:shadow-elevated",
        )}
      >
        <div className="flex items-center gap-1 mb-2 -ml-1">
          <button
            type="button"
            aria-label="Перетащить"
            className="w-7 h-7 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground">
            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {meta.label}
          </span>
          <div className="ml-auto flex items-center gap-0.5 sm:opacity-0 sm:group-hover/block:opacity-100 focus-within:opacity-100 transition-opacity">
            <SmallBtn label="Выше" disabled={index === 0} onClick={() => onMove(-1)}>
              <ChevronUp className="w-4 h-4" />
            </SmallBtn>
            <SmallBtn label="Ниже" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ChevronDown className="w-4 h-4" />
            </SmallBtn>
            <SmallBtn label="Сохранить как шаблон" onClick={onSaveTemplate}>
              <BookmarkPlus className="w-4 h-4" />
            </SmallBtn>
            <SmallBtn label="Удалить блок" onClick={onRemove}>
              <Trash2 className="w-4 h-4" />
            </SmallBtn>
          </div>
        </div>
        <BlockBody block={item.block} onChange={onChange} />
      </motion.div>
      <InsertBar onInsert={onInsert} />
    </div>
  );
}

function SmallBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

export function InsertBar({
  onInsert,
  always = false,
}: {
  onInsert: (type: BlockType) => void;
  always?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className={cn(
        "relative h-7 flex items-center justify-center group/ins",
        always && "h-auto py-2",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-1/2 h-px bg-border transition-opacity",
          always || open ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100",
        )}
      />
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="relative z-10 flex flex-wrap justify-center gap-1 p-1 rounded-full bg-background shadow-lift border border-border"
          >
            {(Object.keys(BLOCK_META) as BlockType[]).map((t) => {
              const M = BLOCK_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onInsert(t);
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] hover:bg-muted"
                >
                  <M.icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {M.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="plus"
            type="button"
            aria-label="Добавить блок"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "relative z-10 inline-flex items-center gap-1.5 h-7 rounded-full bg-background border border-border text-[12px] text-muted-foreground hover:text-foreground transition-all",
              always ? "px-4" : "w-7 justify-center sm:opacity-0 group-hover/ins:opacity-100",
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            {always && "Добавить блок"}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BlockEditor({
  blocks,
  onChange,
  onSaveTemplate,
}: {
  blocks: EditorBlock[];
  onChange: (next: EditorBlock[]) => void;
  onSaveTemplate: (block: BlogBlock) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    onChange(arrayMove(blocks, from, to));
  };

  const insertAt = (index: number, type: BlockType) => {
    const next = [...blocks];
    next.splice(index, 0, wrapBlock(newBlock(type)));
    onChange(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div>
          {blocks.length === 0 && <InsertBar always onInsert={(t) => insertAt(0, t)} />}
          <AnimatePresence initial={false}>
            {blocks.map((item, i) => (
              <SortableBlock
                key={item.id}
                item={item}
                index={i}
                total={blocks.length}
                onChange={(b) =>
                  onChange(blocks.map((x) => (x.id === item.id ? { ...x, block: b } : x)))
                }
                onRemove={() => onChange(blocks.filter((x) => x.id !== item.id))}
                onMove={(dir) => onChange(arrayMove(blocks, i, i + dir))}
                onInsert={(t) => insertAt(i + 1, t)}
                onSaveTemplate={() => onSaveTemplate(item.block)}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
}
