/** Same block model as the public site (aero/src/lib/blog-data.ts) plus an image block. */
export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "specs"; title: string; rows: [string, string][] }
  | { type: "list"; items: string[] }
  | { type: "image"; src: string; caption?: string; alt?: string };

export type BlockType = BlogBlock["type"];

export interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  author: string;
  readTime: string;
  cover: string;
  coverPosition?: string;
  credit?: string;
  body: Exclude<BlogBlock, { type: "image" }>[];
}

export type PostStatus = "draft" | "published" | "scheduled";

export interface EditorBlock {
  id: string;
  block: BlogBlock;
}

export interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  /** YYYY-MM-DD */
  date: string;
  author: string;
  cover: string;
  coverPosition: string;
  credit: string;
  body: EditorBlock[];
  status: PostStatus;
  /** epoch ms, for scheduled posts */
  publishAt?: number;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  /** Hand-set read time from the live site; cleared once the text is edited. */
  readTimeOverride?: string;
  createdAt: number;
  updatedAt: number;
}

export const SITE_URL = "https://draxlerwheels.com";

export function resolveImage(src: string) {
  if (!src) return "";
  if (src.startsWith("/")) return SITE_URL + src;
  return src;
}

export function slugify(input: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    ә: "a",
    ғ: "g",
    қ: "k",
    ң: "n",
    ө: "o",
    ұ: "u",
    ү: "u",
    һ: "h",
    і: "i",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function blockText(block: BlogBlock): string {
  switch (block.type) {
    case "p":
    case "h":
      return block.text;
    case "quote":
      return `${block.text} ${block.cite ?? ""}`;
    case "specs":
      return `${block.title} ${block.rows.map((r) => r.join(" ")).join(" ")}`;
    case "list":
      return block.items.join(" ");
    case "image":
      return block.caption ?? "";
  }
}

export function wordCount(post: Pick<AdminPost, "excerpt" | "body">) {
  const text = [post.excerpt, ...post.body.map((b) => blockText(b.block))].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function readTime(post: Pick<AdminPost, "excerpt" | "body" | "readTimeOverride">) {
  if (post.readTimeOverride) return post.readTimeOverride;
  // ~180 wpm for technical copy, plus a few seconds per table / photo.
  const extras =
    post.body.filter((b) => b.block.type === "specs" || b.block.type === "image").length * 0.3;
  return `${Math.max(1, Math.round(wordCount(post) / 180 + extras))} min read`;
}

export function formatPostDate(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00Z`)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

/** Converts a post to the exact object shape used in the site's blog-data.ts. */
export function toSiteObject(post: AdminPost) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    date: post.date,
    author: post.author,
    readTime: readTime(post),
    cover: post.cover,
    ...(post.coverPosition && post.coverPosition !== "center"
      ? { coverPosition: post.coverPosition }
      : {}),
    ...(post.credit ? { credit: post.credit } : {}),
    body: post.body.map((b) => b.block),
  };
}
