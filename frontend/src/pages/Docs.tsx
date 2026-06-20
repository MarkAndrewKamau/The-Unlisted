import { Link, useParams } from "react-router-dom";
import clsx from "clsx";
import { DOCS, getDoc } from "../content/docsIndex";
import { MarkdownView } from "../components/docs/MarkdownView";

export function Docs() {
  const { slug } = useParams<{ slug: string }>();
  const doc = getDoc(slug ?? DOCS[0].slug);

  return (
    <div className="flex flex-col md:flex-row">
      <aside className="shrink-0 border-b border-border bg-surface p-4 md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:w-60 md:border-b-0 md:border-r">
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {DOCS.map((d) => (
            <Link
              key={d.slug}
              to={`/docs/${d.slug}`}
              className={clsx(
                "whitespace-nowrap rounded border-l-2 px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors",
                d.slug === doc.slug
                  ? "border-amber bg-background text-forest"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              {d.number} {d.title}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 p-4 md:p-10">
        <div className="mx-auto max-w-[720px]">
          <MarkdownView content={doc.content} />
        </div>
      </div>
    </div>
  );
}
