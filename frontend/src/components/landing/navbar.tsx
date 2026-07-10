import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/auth";

const LINKS = [
  { href: "#model", label: "The Model" },
  { href: "#pillars", label: "Principles" },
  { href: "#champions", label: "Champions" },
];

export function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-border" : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          <span className="mono text-xs uppercase tracking-[0.3em] text-foreground">The Unlisted</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="mono text-[11px] uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link
              to="/app"
              className="btn-modern-dark rounded-full px-5 py-2 text-xs font-medium uppercase tracking-widest"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="mono text-[11px] uppercase tracking-widest text-foreground/60 hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-modern-dark rounded-full px-5 py-2 text-xs font-medium uppercase tracking-widest"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-4">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block mono text-xs uppercase tracking-widest text-foreground/70"
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            {user ? (
              <Link to="/app" className="btn-modern-dark rounded-full px-5 py-2.5 text-center text-xs uppercase tracking-widest">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-full border border-border px-5 py-2.5 text-center text-xs uppercase tracking-widest">
                  Sign in
                </Link>
                <Link to="/register" className="btn-modern-dark rounded-full px-5 py-2.5 text-center text-xs uppercase tracking-widest">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
