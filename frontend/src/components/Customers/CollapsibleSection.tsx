import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  return (
    <details className="rounded-lg border border-slate-200 bg-linear-to-r from-slate-50 to-sky-50/60 p-3" open={defaultOpen}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">
            Expand
          </span>
        </div>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
