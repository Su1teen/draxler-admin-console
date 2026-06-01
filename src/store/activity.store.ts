import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  created_at: string;
}

interface ActivityState {
  entries: ActivityEntry[];
  log: (e: { actor: string; action: string }) => Promise<void>;
  fetchLogs: () => Promise<void>;
  clear: () => void;
}

export const useActivity = create<ActivityState>((set) => ({
  entries: [],
  
  log: async (e) => {
    try {
      const { error } = await supabase.from("activity_log").insert({
        actor: e.actor,
        action: e.action,
      });
      
      if (error) {
        console.error("Error inserting into activity_log:", error);
      }
    } catch (err) {
      console.error("Unexpected error during activity log insert:", err);
    }
  },
  
  fetchLogs: async () => {
    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (error) {
        console.error("Error fetching activity logs:", error);
        return;
      }
      
      if (data) {
        set({ entries: data as ActivityEntry[] });
      }
    } catch (err) {
      console.error("Unexpected error during fetchLogs:", err);
    }
  },
  
  clear: () => set({ entries: [] }),
}));
