import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Product {
  id: string | number;
  title: string;
  type: string;
  parameters: string;
  created_at: string;
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
  tag_text: string | null;
}

export interface ProductImage {
  id: string | number;
  product_id: Product["id"];
  image_url: string;
  created_at: string;
}

export type ProductInsert = Pick<
  Product,
  | "title"
  | "type"
  | "parameters"
  | "sizes"
  | "section_1_title"
  | "section_1_text"
  | "section_2_title"
  | "section_2_text"
  | "section_3_title"
  | "section_3_text"
  | "section_4_title"
  | "section_4_text"
  | "section_5_title"
  | "section_5_text"
> & { tag_text?: string };
