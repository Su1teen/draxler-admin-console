import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { recalcSchedule } from "@/lib/schedule";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Module-level channel reference to prevent duplicate subscriptions across
// React Strict Mode double-invocations and hot reloads.
let _queueChannel: RealtimeChannel | null = null;

export type Category = "off-road" | "luxury" | "sport";
export type PublishStatus = "pending" | "processing" | "success" | "error";

export interface QueueItem {
  id: string;
  title: string;
  images: string[];
  sizes: string[];
  section_1_title: string;
  section_1_text: string;
  section_2_title: string;
  section_2_text: string;
  section_3_title: string;
  section_3_text: string;
  section_4_title: string;
  section_4_text: string;
  section_5_title: string;
  section_5_text: string;
  category: Category;
  tags: string[];
  tag_text?: string;
  paused: boolean;
  scheduledAt: number;
  status: PublishStatus;
  progress?: string;
  error?: string;
  error_msg?: string;
}

export type QueueDraft = Omit<QueueItem, "id" | "scheduledAt" | "paused" | "status"> & { paused?: boolean };

interface QueueState {
  items: QueueItem[];
  intervalMin: number;
  startAt: number;
  isProcessing: boolean;
  fetchQueue: () => Promise<void>;
  addBatch: (drafts: QueueDraft[]) => Promise<void>;
  reorder: (fromIndex: number, toIndex: number) => Promise<void>;
  togglePause: (id: string) => Promise<void>;
  setInterval: (m: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  subscribeToChanges: () => void;
  processQueue: (actor?: string) => Promise<void>;
  publishNow: (id: string, actor?: string) => Promise<void>;
  update: (id: string, patch: Partial<QueueItem>) => Promise<void>;
}

export const useQueue = create<QueueState>()(
  persist(
    (set, get) => ({
      items: [],
      intervalMin: 25,
      startAt: Date.now() + 12 * 60_000,
      isProcessing: false,
      
      fetchQueue: async () => {
        const { data, error } = await supabase
          .from("publication_queue")
          .select("*")
          .neq("status", "success")
          .order("scheduled_at", { ascending: true });
          
        if (error) {
          console.error("Queue fetch error:", error);
          return;
        }

        const items: QueueItem[] = data.map((d: any) => ({
          ...d,
          scheduledAt: new Date(d.scheduled_at).getTime(),
          paused: d.status === "paused"
        }));

        set({ items });
      },

      addBatch: async (drafts) => {
        const { items, startAt, intervalMin } = get();
        const upcomingStarts = recalcSchedule(
          [...items, ...drafts.map(d => ({ ...d, id: "temp", scheduledAt: 0, status: "pending" as PublishStatus, paused: false }))],
          startAt,
          intervalMin
        );

        const newItemsToInsert = upcomingStarts.slice(items.length).map(item => ({
          title: item.title,
          images: item.images,
          sizes: item.sizes,
          section_1_title: item.section_1_title,
          section_1_text: item.section_1_text,
          section_2_title: item.section_2_title,
          section_2_text: item.section_2_text,
          section_3_title: item.section_3_title,
          section_3_text: item.section_3_text,
          section_4_title: item.section_4_title,
          section_4_text: item.section_4_text,
          section_5_title: item.section_5_title,
          section_5_text: item.section_5_text,
          category: item.category,
          tags: item.tags,
          tag_text: item.tag_text,
          status: "pending",
          scheduled_at: new Date(item.scheduledAt).toISOString()
        }));

        const { error } = await supabase.from("publication_queue").insert(newItemsToInsert);
        if (error) throw error;
        
        await get().fetchQueue();
      },

      reorder: async (fromIndex, toIndex) => {
        const { items, startAt, intervalMin } = get();
        const next = items.slice();
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        
        const rescheduled = recalcSchedule(next, startAt, intervalMin);
        set({ items: rescheduled });

        for (const item of rescheduled) {
          await supabase.from("publication_queue")
            .update({ scheduled_at: new Date(item.scheduledAt).toISOString() })
            .eq("id", item.id);
        }
      },
      
      update: async (id, patch) => {
        const dbPatch: any = { ...patch };
        // handle mappings for db
        if (dbPatch.images) {
          // If we want to replace images in the queue, we can just update the array in JSON
          // But wait, the JSON has `images` mapped to `images` since Supabase supports arrays?
        }
        
        await supabase.from("publication_queue").update(dbPatch).eq("id", id);
        
        // update local state optimistic
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...patch } : i) }));
      },

      togglePause: async (id) => {
        try {
          const item = get().items.find(i => i.id === id);
          if (!item) return;
          const newStatus = item.paused ? "pending" : "paused";
          await supabase.from("publication_queue")
            .update({ status: newStatus })
            .eq("id", id);
          const next = get().items.map((i) => (i.id === id ? { ...i, paused: !i.paused, status: newStatus as PublishStatus } : i));
          set({ items: next });
        } catch (e) {
          console.error("togglePause error", e);
        }
      },

      setInterval: async (m) => {
        const intervalMin = Math.max(1, Math.min(720, m));
        const rescheduled = recalcSchedule(get().items, get().startAt, intervalMin);
        set({ intervalMin, items: rescheduled });

        for (const item of rescheduled) {
          await supabase.from("publication_queue")
            .update({ scheduled_at: new Date(item.scheduledAt).toISOString() })
            .eq("id", item.id);
        }
      },

      remove: async (id) => {
        await supabase.from("publication_queue").delete().eq("id", id);
        await get().fetchQueue();
      },
      
      processQueue: async () => {
        set({ isProcessing: true });
        try {
          // manually wake up the edge function to process everything immediately
          await supabase.functions.invoke("process-queue");
          await get().fetchQueue();
        } finally {
          set({ isProcessing: false });
        }
      },
      
      publishNow: async (id) => {
        // Change scheduled_at to now, then invoke process-queue
        await supabase.from("publication_queue").update({ scheduled_at: new Date().toISOString() }).eq("id", id);
        await get().processQueue();
      },

      subscribeToChanges: () => {
        // Only create one channel – avoids "cannot add callbacks after subscribe()" error.
        if (_queueChannel) return;

        _queueChannel = supabase
          .channel("public:publication_queue")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "publication_queue" },
            (_payload) => {
              get().fetchQueue();
            }
          )
          .subscribe();
      }
    }),
    {
      name: "draxler-queue",
      partialize: (state) => ({
        intervalMin: state.intervalMin,
        startAt: state.startAt,
      }),
    }
  )
);
