import { Instagram, Mail } from "lucide-react";

import type { CustomerForm } from "../types";

function toWhatsappLink(phoneRaw: string): string | null {
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) return null;
  const withCountryCode = digits.length === 10 ? `1${digits}` : digits;
  if (!/^\d{11,15}$/.test(withCountryCode)) return null;
  return `https://wa.me/${withCountryCode}`;
}

function toInstagramLink(handleRaw: string): string | null {
  const clean = handleRaw.trim().replace(/^@+/, "");
  if (!clean) return null;
  return `https://instagram.com/${encodeURIComponent(clean)}`;
}

function toMailtoLink(emailRaw: string): string | null {
  const clean = emailRaw.trim();
  if (!clean) return null;
  return `mailto:${clean}`;
}

type CustomerActionsSectionProps = {
  selectedCustomerId: number | null;
  customerForm: CustomerForm;
  onOpenAffidavit: () => void;
  onOpenBa208: () => void;
};

export default function CustomerActionsSection({
  selectedCustomerId,
  customerForm,
  onOpenAffidavit,
  onOpenBa208,
}: CustomerActionsSectionProps) {
  const whatsappLink = toWhatsappLink(customerForm.phone_number);
  const instagramLink = toInstagramLink(customerForm.instagram_handle);
  const mailtoLink = toMailtoLink(customerForm.email);
  const hasCustomer = selectedCustomerId !== null;

  return (
    <section className="rounded-2xl border border-slate-300/80 bg-slate-50/70 p-5 shadow-sm backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Actions</h3>
      <p className="mt-1 text-sm text-zinc-500">Generate documents and contact the customer quickly.</p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-slate-100/90 p-4">
        <h4 className="text-sm font-semibold text-zinc-800">Document Generator</h4>
        <p className="mt-1 text-xs text-zinc-500">Opens the documents screen already scoped to this customer.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenAffidavit}
            disabled={!hasCustomer}
            className="rounded-md border border-blue-300 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50"
          >
            Emitir Affidavit
          </button>
          <button
            type="button"
            onClick={onOpenBa208}
            disabled={!hasCustomer}
            className="rounded-md border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
          >
            Emitir BA-208
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-slate-100/90 p-4">
        <h4 className="text-sm font-semibold text-zinc-800">Contact</h4>
        <p className="mt-1 text-xs text-zinc-500">Links are generated from phone, Instagram, and email fields.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={whatsappLink ?? "#"}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
            aria-label="WhatsApp"
            aria-disabled={!whatsappLink}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-emerald-300 text-emerald-800 hover:bg-emerald-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M19.05 4.94A9.87 9.87 0 0 0 12.03 2a9.97 9.97 0 0 0-8.63 14.96L2 22l5.2-1.36A9.96 9.96 0 0 0 12.03 22C17.54 22 22 17.53 22 12.03a9.87 9.87 0 0 0-2.95-7.09Zm-7.02 15.37a8.26 8.26 0 0 1-4.2-1.14l-.3-.18-3.09.81.82-3.01-.2-.31a8.3 8.3 0 1 1 6.97 3.83Zm4.55-6.18c-.25-.13-1.48-.73-1.71-.82-.23-.08-.39-.13-.56.13-.16.25-.64.82-.78.99-.14.16-.29.18-.53.06-.25-.13-1.04-.38-1.97-1.2-.73-.66-1.22-1.48-1.36-1.73-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.44-.07-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.72 2.63 4.17 3.69.58.25 1.04.4 1.39.51.58.18 1.1.15 1.51.09.46-.07 1.48-.61 1.69-1.2.21-.6.21-1.1.15-1.2-.06-.1-.22-.16-.47-.29Z" />
            </svg>
          </a>
          <a
            href={instagramLink ?? "#"}
            target="_blank"
            rel="noreferrer"
            title="Instagram"
            aria-label="Instagram"
            aria-disabled={!instagramLink}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-fuchsia-300 text-fuchsia-800 hover:bg-fuchsia-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href={mailtoLink ?? "#"}
            title="Email"
            aria-label="Email"
            aria-disabled={!mailtoLink}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-sky-300 text-sky-800 hover:bg-sky-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
