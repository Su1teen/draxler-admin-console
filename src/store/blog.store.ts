import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { idbStorage } from "@/lib/blog/idb-storage";
import { SEED_POSTS } from "@/lib/blog/seed";
import type { BlockTemplate } from "@/lib/blog/templates";
import type { AdminPost, BlogBlock, EditorBlock } from "@/lib/blog/types";

export const BLOG_CATEGORIES = ["DRAXLER Projects", "New Cars", "Wheel Tech"];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const wrapBlock = (block: BlogBlock): EditorBlock => ({
  id: uid(),
  block: structuredClone(block),
});

function seed(): AdminPost[] {
  return SEED_POSTS.map((p, i) => {
    const ts = new Date(`${p.date}T09:00:00Z`).getTime();
    return {
      id: `seed-${i}`,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      tags: p.tags,
      date: p.date,
      author: p.author,
      cover: p.cover,
      coverPosition: p.coverPosition ?? "center",
      credit: p.credit ?? "",
      body: p.body.map(wrapBlock),
      status: "published",
      seoTitle: "",
      seoDescription: "",
      featured: i === 0,
      readTimeOverride: p.readTime,
      createdAt: ts,
      updatedAt: ts,
    };
  });
}

export function emptyPost(): AdminPost {
  const now = Date.now();
  return {
    id: uid(),
    slug: "",
    title: "",
    excerpt: "",
    category: BLOG_CATEGORIES[0],
    tags: [],
    date: new Date().toISOString().slice(0, 10),
    author: "DRAXLER Studio",
    cover: "",
    coverPosition: "center",
    credit: "",
    body: [wrapBlock({ type: "p", text: "" })],
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    featured: false,
    createdAt: now,
    updatedAt: now,
  };
}

interface BlogState {
  posts: AdminPost[];
  customTemplates: BlockTemplate[];
  hydrated: boolean;
  upsert: (post: AdminPost) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => AdminPost | undefined;
  addTemplate: (t: Omit<BlockTemplate, "id" | "custom">) => void;
  removeTemplate: (id: string) => void;
  resetToSite: () => void;
}

export const useBlog = create<BlogState>()(
  persist(
    (set, get) => ({
      posts: seed(),
      customTemplates: [],
      hydrated: false,
      upsert: (post) =>
        set((s) => {
          const next = { ...post, updatedAt: Date.now() };
          const exists = s.posts.some((p) => p.id === post.id);
          return {
            posts: exists ? s.posts.map((p) => (p.id === post.id ? next : p)) : [next, ...s.posts],
          };
        }),
      remove: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      duplicate: (id) => {
        const src = get().posts.find((p) => p.id === id);
        if (!src) return undefined;
        const copy: AdminPost = {
          ...structuredClone(src),
          id: uid(),
          slug: `${src.slug}-copy`,
          title: `${src.title} (копия)`,
          status: "draft",
          featured: false,
          body: src.body.map((b) => wrapBlock(b.block)),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ posts: [copy, ...s.posts] }));
        return copy;
      },
      addTemplate: (t) =>
        set((s) => ({
          customTemplates: [{ ...t, id: uid(), custom: true }, ...s.customTemplates],
        })),
      removeTemplate: (id) =>
        set((s) => ({ customTemplates: s.customTemplates.filter((t) => t.id !== id) })),
      resetToSite: () => set({ posts: seed() }),
    }),
    {
      name: "draxler-blog",
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { posts: AdminPost[]; customTemplates: BlockTemplate[] };
        if (version < 2) {
          state.posts = state.posts.map((p) => {
            const src = SEED_POSTS.find((s) => s.slug === p.slug);
            return src && p.id.startsWith("seed-") ? { ...p, readTimeOverride: src.readTime } : p;
          });
        }
        return state;
      },
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ posts: s.posts, customTemplates: s.customTemplates }),
      onRehydrateStorage: () => () => {
        useBlog.setState({ hydrated: true });
      },
    },
  ),
);
