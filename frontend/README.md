# Frontend (React + Vite)

## Scope

Frontend handles operator workflows for customers, document generation, OCR-assisted prefill, dashboard, and reports.

## Main Structure

- `src/components/*`: feature UI
- `src/lib/api.ts`: API fetch wrapper
- `src/components/Customers/*`: customer modal, sections, forms, OCR/upload flows

## Dev Commands

```bash
cd frontend
bun install
bun run dev
bun run build
```

## Customers Module Notes

Primary file:

- `src/components/Customers/Customers.tsx`

Key behaviors:

- Row click opens customer modal
- Modal has left navigation across sections
- Modal uses fixed height; content area scrolls independently
- Supports create/edit/renew flows for NJ/BR/passports
- Supports staged file upload before record save
- Supports optional auto-prefill on upload per document section

Sections:

- `CustomerCoreSection`
- `NJLicensesSection`
- `BrazilLicensesSection`
- `PassportsSection`
- `CustomerActionsSection`

## OCR Frontend Contract

The UI expects backend OCR responses and applies patching defensively.

Supported payload variants include:

- `customer_form` / `customer_fields`
- `passport_form` / `passport_fields`
- `nj_form` / `nj_license_fields`
- `brazil_form` / `brazil_license_fields`
- fallback `document_fields`

This is intentional to reduce breakage while backend OCR prompts/parsers evolve.

## UX / Styling Decisions

- Section cards are layered with subtle contrast to reduce visual overload
- Inputs use light neutral backgrounds (not pure white)
- OCR prefill toggle is a dedicated switch style
- Generic checkboxes have a different custom style
- Contact actions use icons (WhatsApp, Instagram, Email)

## Safe Change Guidelines

- If changing form schema keys, update both:
  - form state shape/types
  - OCR mapping in `Customers.tsx`
- If changing upload routes, update both staged and record-file paths
- Keep section-specific logic inside section components when possible
- Validate with `bun run build` before PR

## Common Pitfalls

- Breaking route/key contracts between OCR backend and form patchers
- Re-introducing full-modal scroll instead of content-only scroll
- Forgetting to reset form mode/state when switching customers
