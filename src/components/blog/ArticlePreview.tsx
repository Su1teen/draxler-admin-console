import type { AdminPost, BlogBlock } from "@/lib/blog/types";
import { formatPostDate, readTime, resolveImage } from "@/lib/blog/types";

/** Renders a post the same way draxlerwheels.com/blog/[slug] does (styles: .drx-article in styles.css). */
function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h":
      return <h2>{block.text}</h2>;
    case "quote":
      return (
        <blockquote>
          <p>{block.text}</p>
          {block.cite && <cite>— {block.cite}</cite>}
        </blockquote>
      );
    case "specs":
      return (
        <figure className="drx-specs">
          <figcaption>{block.title}</figcaption>
          <dl>
            {block.rows.map(([label, value], i) => (
              <div key={i}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </figure>
      );
    case "list":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "image":
      return block.src ? (
        <figure className="drx-figure">
          <img src={resolveImage(block.src)} alt={block.alt || block.caption || ""} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      ) : null;
    default:
      return <p>{block.text}</p>;
  }
}

export function ArticlePreview({ post, compact = false }: { post: AdminPost; compact?: boolean }) {
  return (
    <div className={compact ? "drx-article drx-article--compact" : "drx-article"}>
      <section className="drx-hero">
        {post.cover && (
          <img
            className="drx-hero-img"
            src={resolveImage(post.cover)}
            alt={post.title}
            style={{ objectPosition: post.coverPosition }}
          />
        )}
        <div className="drx-hero-shade" />
        <div className="drx-hero-copy">
          <nav className="drx-crumbs">
            <span>Home</span>
            <span>/</span>
            <span>Blog</span>
            <span>/</span>
            <span>{post.category}</span>
          </nav>
          <h1>{post.title || "Заголовок статьи"}</h1>
          <div className="drx-meta">
            <span>By {post.author}</span>
            <span>{formatPostDate(post.date)}</span>
            <span>{readTime(post)}</span>
          </div>
        </div>
      </section>
      <article className="drx-body-grid">
        <aside className="drx-aside">
          <span className="drx-back">← All stories</span>
          <span className="drx-label">Category</span>
          <strong>{post.category}</strong>
          <span className="drx-label">Tags</span>
          <ul className="drx-tags">
            {post.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </aside>
        <div className="drx-body">
          {post.excerpt && <p className="drx-lead">{post.excerpt}</p>}
          {post.body.map((b) => (
            <Block key={b.id} block={b.block} />
          ))}
          {post.credit && <p className="drx-credit">{post.credit}</p>}
          <div className="drx-cta">
            <span>Build your own</span>
            <strong>Forged wheels engineered for your car.</strong>
            <div>
              <span>Explore the catalog ↗</span>
              <span>Our projects ↗</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
