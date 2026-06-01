import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Fetch pending items
    const { data: queueItems, error: fetchError } = await supabaseAdmin
      .from("publication_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (fetchError) throw fetchError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process" }), { status: 200 });
    }

    // 2. Process each item
    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from("publication_queue")
          .update({ status: "processing" })
          .eq("id", item.id);

        let finalTitle = item.title;
        if (!finalTitle || finalTitle.trim() === "") {
          const categoryBaseNumbers: Record<string, number> = {
            luxury: 116,
            "off-road": 314,
            sport: 213,
          };

          const baseNum = categoryBaseNumbers[item.category] ?? 100;

          const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("get_next_drx_title", {
            cat_name: item.category,
            base_num: baseNum,
          });

          if (rpcError) {
            throw rpcError;
          }
          finalTitle = rpcData as string;
        }

        // Insert Product
        const { data: product, error: insertError } = await supabaseAdmin
          .from("products")
          .insert({
            title: finalTitle,
            type: item.category,
            parameters: JSON.stringify({ tags: item.tags }),
            tag_text: item.tag_text,
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
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert product images
        if (item.images && item.images.length > 0) {
          const imageRecords = item.images.map((url: string) => ({
            product_id: product.id,
            image_url: url,
          }));

          const { error: imagesError } = await supabaseAdmin
            .from("product_images")
            .insert(imageRecords);

          if (imagesError) throw imagesError;
        }

        // Mark queue item as success
        await supabaseAdmin
          .from("publication_queue")
          .update({ status: "success" })
          .eq("id", item.id);
          
      } catch (err) {
        let msg = "Unknown error";
        if (err instanceof Error) msg = err.message;
        await supabaseAdmin
          .from("publication_queue")
          .update({ status: "error", error_msg: msg })
          .eq("id", item.id);
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${queueItems.length} items.` }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
