import { supabase, type ProductInsert, type ProductImage } from "./supabase";

export interface PublishProductInput extends ProductInsert {
  files?: File[];
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  // Берём upload preset и название облака из .env, или используем те, что вы указали
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "Draxler");
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dooefod1w";

  // Загрузка файла напрямую в Cloudinary (unsigned)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Ошибка загрузки фото в Cloudinary: ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

export async function publishProduct(
  input: PublishProductInput,
  files: File[],
  onProgress?: (msg: string) => void,
) {
  onProgress?.("Создание записи в БД...");
  
  const { files: _, ...dbPayload } = input;

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert(dbPayload)
    .select()
    .single();

  if (insertError) throw new Error(`Ошибка создания продукта: ${insertError.message}`);
  if (!product) throw new Error("Продукт не создан");

  const productId = product.id;

  if (files.length > 0) {
    onProgress?.("Загрузка изображений...");
    
    for (let i = 0; i < files.length; i++) {
      const secureUrl = await uploadImageToCloudinary(files[i]);

      // Сохраняем полученную ссылку secure_url в Supabase таблицу product_images
      const imageRecord: Omit<ProductImage, "id" | "created_at"> = {
        product_id: productId,
        image_url: secureUrl,
      };

      const { error: dbError } = await supabase.from("product_images").insert(imageRecord);
      if (dbError) throw new Error(`Ошибка сохранения ссылки изображения: ${dbError.message}`);
    }
  }

  onProgress?.("Готово!");
  return product;
}

export function toProductInsert(item: any): ProductInsert {
  return {
    title: item.title,
    type: item.category,
    parameters: JSON.stringify({ tags: item.tags }),
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
    tag_text: item.tag_text,
  };
}
