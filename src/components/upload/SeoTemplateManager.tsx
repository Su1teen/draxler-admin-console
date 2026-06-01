import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSeoTemplates } from "@/store/seo-templates.store";
import { Settings, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface SeoTemplateManagerProps {
  currentText: string;
  onSelectTemplate: (text: string) => void;
  onSaveAsNew: (text: string) => void;
}

export function SeoTemplateManager({ currentText, onSelectTemplate, onSaveAsNew }: SeoTemplateManagerProps) {
  const { templates, createTemplate, deleteTemplate } = useSeoTemplates();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSaveNew = async () => {
    if (!newTitle.trim() || !currentText.trim()) {
      toast.error("Введите название и текст шаблона");
      return;
    }
    try {
      await createTemplate(newTitle, currentText);
      toast.success("Шаблон сохранен");
      setIsCreating(false);
      setNewTitle("");
    } catch (err: any) {
      toast.error(err.message || "Ошибка при сохранении шаблона");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Управление шаблонами
        </button>
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={
          isDesktop
            ? "w-full sm:max-w-[400px] overflow-y-auto bg-background/80 backdrop-blur-xl border-l border-border"
            : "h-[85vh] rounded-t-[12px] overflow-y-auto bg-background/80 backdrop-blur-xl border-t border-border"
        }
      >
        <SheetHeader className="text-left mb-6">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            SEO Абзацы
          </div>
          <SheetTitle className="text-foreground text-[20px] font-semibold tracking-tight">
            Шаблоны тегов
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Create new from current */}
          <div className="bg-card border border-border rounded-[8px] p-4">
            <div className="text-[13px] font-medium mb-2">Текущий текст:</div>
            <div className="text-[12px] text-muted-foreground line-clamp-3 mb-4">
              {currentText || "Нет текста для сохранения"}
            </div>
            
            {isCreating ? (
              <div className="space-y-3">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Название шаблона (напр. 'Базовый 28 брендов')"
                  className="w-full bg-background border border-border rounded-[4px] px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNew}
                    className="flex-1 bg-primary text-primary-foreground h-8 rounded-[4px] text-[12px] font-medium hover:bg-primary/90 transition-colors"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 bg-muted text-foreground h-8 rounded-[4px] text-[12px] font-medium hover:bg-muted/80 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                disabled={!currentText.trim()}
                onClick={() => setIsCreating(true)}
                className="w-full h-8 border border-dashed border-border rounded-[4px] text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Сохранить текущий как шаблон
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-[11px] tracking-wider uppercase text-muted-foreground">
              Доступные шаблоны ({templates.length})
            </div>
            {templates.length === 0 ? (
              <div className="text-[13px] text-muted-foreground italic">
                Нет сохраненных шаблонов
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="group flex flex-col gap-2 p-3 border border-border rounded-[8px] hover:border-foreground/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium">{tpl.title}</span>
                      <button
                        onClick={async () => {
                          if (confirm("Удалить этот шаблон?")) {
                            try {
                              await deleteTemplate(tpl.id);
                              toast.success("Шаблон удален");
                            } catch {
                              toast.error("Ошибка при удалении");
                            }
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[12px] text-muted-foreground line-clamp-2">
                      {tpl.content}
                    </div>
                    <button
                      onClick={() => {
                        onSelectTemplate(tpl.content);
                        setIsOpen(false);
                        toast.success("Шаблон применен");
                      }}
                      className="mt-1 w-full h-7 bg-muted/50 hover:bg-muted text-[12px] font-medium rounded-[4px] transition-colors"
                    >
                      Применить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
