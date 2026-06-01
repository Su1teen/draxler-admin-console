import { supabase } from "@/lib/supabase";
import { CATEGORY_BASE_NUMBERS } from "@/lib/defaults";
import type { Category } from "@/store/queue.store";

/**
 * Generate the next auto-incremented title (e.g. "DRX-117") for the given
 * category by calling the get_next_drx_title RPC in Supabase.
 */
export async function generateNextTitle(category: Category): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_drx_title", {
    cat_name: category,
    base_num: CATEGORY_BASE_NUMBERS[category],
  });

  if (error) {
    throw error; // Or handle the error as appropriate for your application
  }

  return data as string;
}
