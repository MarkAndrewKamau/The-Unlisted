import { useEffect, useRef } from "react";
import { marked } from "marked";
import { Copy } from "lucide-react";
import { createRoot } from "react-dom/client";

export function MarkdownView({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = marked.parse(content, { async: false }) as string;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const blocks = container.querySelectorAll("pre");
    blocks.forEach((pre) => {
      if (pre.querySelector(".copy-btn-mount")) return;
      pre.classList.add("relative", "group");
      const mount = document.createElement("div");
      mount.className = "copy-btn-mount absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity";
      pre.appendChild(mount);
      const root = createRoot(mount);
      const text = pre.querySelector("code")?.textContent ?? "";
      root.render(
        <button
          onClick={() => navigator.clipboard.writeText(text)}
          className="flex items-center gap-1 rounded border border-surface/20 bg-forest px-2 py-1 font-mono text-[10px] text-surface hover:border-amber hover:text-amber"
        >
          <Copy size={10} /> Copy
        </button>
      );
    });
  }, [html]);

  return (
    <div
      ref={ref}
      className="docs-prose font-body text-[15px] leading-relaxed text-text-primary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
