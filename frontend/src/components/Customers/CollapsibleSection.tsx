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
    <details className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3" open={defaultOpen}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-800">{title}</p>
            {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          <span className="text-xs text-zinc-500">Abrir/fechar</span>
        </div>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
