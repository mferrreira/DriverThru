import type { Dispatch, FormEvent, SetStateAction } from "react";

import CollapsibleSection from "../CollapsibleSection";
import type { CustomerRead, Passport, PassportForm } from "../types";

type PassportsSectionProps = {
  selectedCustomer: CustomerRead | null;
  selectedCustomerId: number | null;
  passportMode: "create" | "edit" | "renew";
  passportForm: PassportForm;
  setPassportForm: Dispatch<SetStateAction<PassportForm>>;
  savingPassport: boolean;
  passportError: string | null;
  onSubmit: (event: FormEvent) => void;
  onDeactivate: (passportId: number) => void;
  onStartEdit: (item: Passport) => void;
  onStartRenew: (item: Passport) => void;
};

export default function PassportsSection({
  selectedCustomer,
  selectedCustomerId,
  passportMode,
  passportForm,
  setPassportForm,
  savingPassport,
  passportError,
  onSubmit,
  onDeactivate,
  onStartEdit,
  onStartRenew,
}: PassportsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Passports</h3>
      {selectedCustomer ? (
        <div className="mt-4 space-y-2">
          {selectedCustomer.passports.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold">
                    #{item.id} | {item.passport_number_encrypted} | {item.surname}, {item.given_name}
                  </p>
                  <p>Current: {item.is_current ? "yes" : "no"} | Active: {item.active ? "yes" : "no"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onStartEdit(item)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartRenew(item)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                  >
                    Renew
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeactivate(item.id)}
                    className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          ))}
          {selectedCustomer.passports.length === 0 ? <p className="text-sm text-zinc-500">No passports.</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Select a customer to manage passports.</p>
      )}

      <CollapsibleSection title="Passport form" subtitle="Create, edit, and renew" defaultOpen={passportMode !== "create"}>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Passport number *
            <input
              required
              value={passportForm.passport_number_encrypted}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, passport_number_encrypted: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Document type
            <input
              value={passportForm.document_type}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, document_type: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Issuing country
            <input
              value={passportForm.issuing_country}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, issuing_country: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Nationality
            <input
              value={passportForm.nationality}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, nationality: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Surname *
            <input
              required
              value={passportForm.surname}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, surname: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Given name *
            <input
              required
              value={passportForm.given_name}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, given_name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Middle name
            <input
              value={passportForm.middle_name}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, middle_name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Birth place
            <input
              value={passportForm.birth_place}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, birth_place: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Father name
            <input
              value={passportForm.father_name}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, father_name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Mother name
            <input
              value={passportForm.mother_name}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, mother_name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Issue date
            <input
              type="date"
              value={passportForm.issue_date}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, issue_date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Expiration date
            <input
              type="date"
              value={passportForm.expiration_date}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, expiration_date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Issuing authority
            <input
              value={passportForm.issuing_authority}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, issuing_authority: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={passportForm.is_current}
              onChange={(event) => setPassportForm((prev) => ({ ...prev, is_current: event.target.checked }))}
              className="mr-2"
            />
            Mark as current passport
          </label>
          {passportError ? <p className="text-sm text-red-600 sm:col-span-2">{passportError}</p> : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingPassport || !selectedCustomerId}
              className="rounded-md bg-linear-to-r from-sky-700 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {savingPassport
                ? "Saving..."
                : passportMode === "create"
                  ? "Add passport"
                  : passportMode === "edit"
                    ? "Save passport"
                    : "Renew passport"}
            </button>
          </div>
        </form>
      </CollapsibleSection>
    </section>
  );
}
