import type { StateStorage } from "zustand/middleware";

/**
 * Minimal IndexedDB key/value storage for zustand persist.
 * Blog posts carry uploaded photos as data URLs, which quickly exceed
 * the ~5 MB localStorage quota — IndexedDB has no such practical limit.
 */
const DB_NAME = "draxler-admin";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

const hasIdb = () => typeof indexedDB !== "undefined";

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    if (!hasIdb()) return null;
    try {
      const value = await run<string | undefined>(
        "readonly",
        (s) => s.get(name) as IDBRequest<string | undefined>,
      );
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    if (!hasIdb()) return;
    await run("readwrite", (s) => s.put(value, name));
  },
  removeItem: async (name) => {
    if (!hasIdb()) return;
    await run("readwrite", (s) => s.delete(name));
  },
};

/** Downscales an uploaded photo to a web-sized JPEG/WebP data URL. */
export function compressImage(file: File, maxSide = 1920, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL("image/webp", quality);
        resolve(
          webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality),
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
