import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, type Product } from "@/lib/supabase";
import type { Category, QueueItem } from "./queue.store";

export interface ArchiveItem extends QueueItem {
  publishedAt: number;
  /** Supabase product ID — used for DB updates */
  productId?: string | number;
}

interface ArchiveFilters {
  category?: Category;
  query: string;
  tag?: string;
}

interface ArchiveState {
  items: ArchiveItem[];
  filters: ArchiveFilters;
  isLoading: boolean;
  hasFetched: boolean;
  add: (item: ArchiveItem) => void;
  update: (id: string, patch: Partial<ArchiveItem>) => void;
  remove: (id: string) => void;
  setFilter: (patch: Partial<ArchiveFilters>) => void;
  clearFilters: () => void;
  fetchFromSupabase: () => Promise<void>;
  updateInSupabase: (id: string, patch: Partial<ArchiveItem>) => Promise<void>;
  deleteFromSupabase: (id: string) => Promise<void>;
}

/**
 * Map a Supabase Product row + image URLs into an ArchiveItem.
 */
function mapProductToArchiveItem(
  product: Product,
  imageUrls: string[],
): ArchiveItem {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(product.parameters || "{}");
    tags = parsed.tags ?? [];
  } catch {
    // ignore parse errors
  }

  return {
    id: `archive-${product.id}`,
    productId: product.id,
    title: product.title,
    images: imageUrls.length > 0 ? imageUrls : [],
    sizes: product.sizes ?? [],
    section_1_title: product.section_1_title ?? "",
    section_1_text: product.section_1_text ?? "",
    section_2_title: product.section_2_title ?? "",
    section_2_text: product.section_2_text ?? "",
    section_3_title: product.section_3_title ?? "",
    section_3_text: product.section_3_text ?? "",
    section_4_title: product.section_4_title ?? "",
    section_4_text: product.section_4_text ?? "",
    section_5_title: product.section_5_title ?? "",
    section_5_text: product.section_5_text ?? "",
    category: (product.type as Category) ?? "luxury",
    tags,
    tag_text: product.tag_text ?? "",
    paused: false,
    scheduledAt: 0,
    status: "success",
    progress: "Опубликовано",
    publishedAt: new Date(product.created_at).getTime(),
  };
}

export const useArchive = create<ArchiveState>()(
  persist(
    (set, get) => ({
      items: [],
      filters: { query: "" },
      isLoading: false,
      hasFetched: false,

      add: (item) => set((s) => ({ items: [item, ...s.items] })),

      update: (id, patch) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),

      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

      clearFilters: () => set({ filters: { query: "" } }),

      fetchFromSupabase: async () => {
        set({ isLoading: true });
        try {
          // Fetch all products
          const { data: products, error: productsError } = await supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

          if (productsError) {
            console.error("Failed to fetch products:", productsError.message);
            set({ isLoading: false, hasFetched: true });
            return;
          }

          if (!products || products.length === 0) {
            set({ items: [], isLoading: false, hasFetched: true });
            return;
          }

          // Fetch all product images
          const productIds = products.map((p: Product) => p.id);
          const { data: images } = await supabase
            .from("product_images")
            .select("product_id, image_url")
            .in("product_id", productIds);

          // Group images by product_id
          const imageMap = new Map<string | number, string[]>();
          if (images) {
            for (const img of images) {
              const existing = imageMap.get(img.product_id) ?? [];
              existing.push(img.image_url);
              imageMap.set(img.product_id, existing);
            }
          }

          const archiveItems: ArchiveItem[] = products.map((p: Product) =>
            mapProductToArchiveItem(p, imageMap.get(p.id) ?? []),
          );

          set({ items: archiveItems, isLoading: false, hasFetched: true });
        } catch (error) {
          console.error("Archive fetch error:", error);
          set({ isLoading: false, hasFetched: true });
        }
      },

      updateInSupabase: async (id, patch) => {
        const item = get().items.find((i) => i.id === id);
        if (!item?.productId) {
          get().update(id, patch);
          return;
        }

        const dbPatch: Record<string, unknown> = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.category !== undefined) dbPatch.type = patch.category;
        if (patch.sizes !== undefined) dbPatch.sizes = patch.sizes;
        if (patch.tags !== undefined) dbPatch.parameters = JSON.stringify({ tags: patch.tags });
        if (patch.section_1_title !== undefined) dbPatch.section_1_title = patch.section_1_title;
        if (patch.section_1_text !== undefined) dbPatch.section_1_text = patch.section_1_text;
        if (patch.section_2_title !== undefined) dbPatch.section_2_title = patch.section_2_title;
        if (patch.section_2_text !== undefined) dbPatch.section_2_text = patch.section_2_text;
        if (patch.section_3_title !== undefined) dbPatch.section_3_title = patch.section_3_title;
        if (patch.section_3_text !== undefined) dbPatch.section_3_text = patch.section_3_text;
        if (patch.section_4_title !== undefined) dbPatch.section_4_title = patch.section_4_title;
        if (patch.section_4_text !== undefined) dbPatch.section_4_text = patch.section_4_text;
        if (patch.section_5_title !== undefined) dbPatch.section_5_title = patch.section_5_title;
        if (patch.section_5_text !== undefined) dbPatch.section_5_text = patch.section_5_text;
        if (patch.tag_text !== undefined) dbPatch.tag_text = patch.tag_text;

        if (Object.keys(dbPatch).length > 0) {
          const { error } = await supabase
            .from("products")
            .update(dbPatch)
            .eq("id", item.productId);

          if (error) throw new Error(error.message);
        }

        // if images are being updated, replace them entirely in product_images
        if (patch.images !== undefined) {
          // delete old
          await supabase.from("product_images").delete().eq("product_id", item.productId);
          
          // insert new
          if (patch.images.length > 0) {
            const imageRecords = patch.images.map(url => ({
              product_id: item.productId,
              image_url: url
            }));
            await supabase.from("product_images").insert(imageRecords);
          }
        }

        get().update(id, patch);
      },
      
      deleteFromSupabase: async (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item?.productId) {
          get().remove(id);
          return;
        }

        // since cascade might not be configured, delete images first just in case
        await supabase.from("product_images").delete().eq("product_id", item.productId);
        
        const { error } = await supabase.from("products").delete().eq("id", item.productId);
        if (error) throw new Error(error.message);
        
        get().remove(id);
      }
    }),
    { name: "draxler-archive" },
  ),
);
