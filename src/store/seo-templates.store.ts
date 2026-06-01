import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface SeoTemplate {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface SeoTemplatesState {
  templates: SeoTemplate[];
  isLoading: boolean;
  hasFetched: boolean;
  fetchTemplates: () => Promise<void>;
  createTemplate: (title: string, content: string) => Promise<SeoTemplate>;
  updateTemplate: (id: string, title: string, content: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useSeoTemplates = create<SeoTemplatesState>((set, get) => ({
  templates: [],
  isLoading: false,
  hasFetched: false,

  fetchTemplates: async () => {
    if (get().hasFetched) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("seo_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase Error [fetchTemplates]:", error);
        set({ isLoading: false });
        return;
      }

      if (data) {
        set({ templates: data, isLoading: false, hasFetched: true });
      }
    } catch (err) {
      console.error("Unexpected error fetching SEO templates:", err);
      set({ isLoading: false });
    }
  },

  createTemplate: async (title, content) => {
    const { data, error } = await supabase
      .from("seo_templates")
      .insert({ title, content })
      .select()
      .single();

    if (error) {
      console.error("Supabase Error [createTemplate]:", error);
      throw new Error(error.message);
    }
    if (!data) throw new Error("Шаблон не создан");

    set((state) => ({ templates: [data, ...state.templates] }));
    return data;
  },

  updateTemplate: async (id, title, content) => {
    const { error } = await supabase
      .from("seo_templates")
      .update({ title, content })
      .eq("id", id);

    if (error) {
      console.error("Supabase Error [updateTemplate]:", error);
      throw new Error(error.message);
    }

    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, title, content } : t
      ),
    }));
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase
      .from("seo_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase Error [deleteTemplate]:", error);
      throw new Error(error.message);
    }

    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));
  },
}));
