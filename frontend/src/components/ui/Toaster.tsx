import { AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";

export function Toaster() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.slice(-3).map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="flex cursor-pointer items-start gap-2 rounded border border-terracotta/40 bg-forest px-3 py-2.5 shadow-lift animate-slide-in-right"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-terracotta" />
          <p className="font-mono text-xs text-terracotta">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
