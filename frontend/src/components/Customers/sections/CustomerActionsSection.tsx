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
    <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Actions</h3>
      <p className="mt-1 text-sm text-zinc-500">Generate documents and contact the customer quickly.</p>

      <div className="mt-4 rounded-xl border border-zinc-200 p-4">
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

      <div className="mt-4 rounded-xl border border-zinc-200 p-4">
        <h4 className="text-sm font-semibold text-zinc-800">Contact</h4>
        <p className="mt-1 text-xs text-zinc-500">Links are generated from phone, Instagram, and email fields.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={whatsappLink ?? "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!whatsappLink}
            className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            WhatsApp
          </a>
          <a
            href={instagramLink ?? "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!instagramLink}
            className="rounded-md border border-fuchsia-300 px-3 py-1.5 text-sm font-medium text-fuchsia-800 hover:bg-fuchsia-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Instagram
          </a>
          <a
            href={mailtoLink ?? "#"}
            aria-disabled={!mailtoLink}
            className="rounded-md border border-sky-300 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Email
          </a>
        </div>
      </div>
    </section>
  );
}
