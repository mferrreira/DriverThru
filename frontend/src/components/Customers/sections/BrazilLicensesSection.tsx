import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Trash2 } from "lucide-react";

import CollapsibleSection from "../CollapsibleSection";
import { brazilCategoryOptions } from "../constants";
import DocumentFileField from "./DocumentFileField";
import type { BrazilDriverLicense, BrazilForm, CustomerRead } from "../types";

type BrazilLicensesSectionProps = {
  selectedCustomer: CustomerRead | null;
  selectedCustomerId: number | null;
  brMode: "create" | "edit" | "renew";
  brForm: BrazilForm;
  setBrForm: Dispatch<SetStateAction<BrazilForm>>;
  savingBr: boolean;
  brError: string | null;
  onSubmit: (event: FormEvent) => void;
  onDeactivate: (licenseId: number) => void;
  onDelete: (licenseId: number) => void;
  onStartEdit: (item: BrazilDriverLicense) => void;
  onStartRenew: (item: BrazilDriverLicense) => void;
  onStartCreate: () => void;
  ocrInfo?: string | null;
  fileRecordId: number | null;
  fileObjectKey: string | null;
  fileUrl: string | null;
  uploadingFile: boolean;
  deletingFile: boolean;
  fileError: string | null;
  onUploadFile: (file: File) => void;
  onDeleteFile: () => void;
  usePrefillOnUpload: boolean;
  onToggleUsePrefillOnUpload: (checked: boolean) => void;
};

export default function BrazilLicensesSection({
  selectedCustomer,
  selectedCustomerId,
  brMode,
  brForm,
  setBrForm,
  savingBr,
  brError,
  onSubmit,
  onDeactivate,
  onDelete,
  onStartEdit,
  onStartRenew,
  onStartCreate,
  ocrInfo,
  fileRecordId,
  fileObjectKey,
  fileUrl,
  uploadingFile,
  deletingFile,
  fileError,
  onUploadFile,
  onDeleteFile,
  usePrefillOnUpload,
  onToggleUsePrefillOnUpload,
}: BrazilLicensesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-300/80 bg-slate-50/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-900">Brazil Driver Licenses</h3>
        {brMode !== "create" ? (
          <button
            type="button"
            onClick={onStartCreate}
            className="rounded-md bg-linear-to-r from-sky-700 to-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
          >
            Add new Brazil license
          </button>
        ) : null}
      </div>
      {selectedCustomer ? (
        <div className="mt-4 space-y-2">
          {selectedCustomer.brazil_driver_licenses.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold">
                    #{item.id} | {item.full_name} | Cat. {item.category || "-"}
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
                  <button
                    type="button"
                    title="Delete permanently"
                    aria-label="Delete permanently"
                    onClick={() => onDelete(item.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {selectedCustomer.brazil_driver_licenses.length === 0 ? (
            <p className="text-sm text-zinc-500">No Brazil licenses.</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Select a customer to manage Brazil licenses.</p>
      )}

      <CollapsibleSection title="Brazil license form" subtitle="Create, edit, and renew" defaultOpen>
        {ocrInfo ? <p className="mb-3 text-xs text-slate-500">{ocrInfo}</p> : null}
        <form onSubmit={onSubmit} className="customer-editor-form grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm sm:col-span-2">
            <span className="font-semibold text-blue-900">Apply prefill on upload</span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={usePrefillOnUpload}
                onChange={(event) => onToggleUsePrefillOnUpload(event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-slate-400 transition-colors peer-checked:bg-blue-700" />
              <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
          <DocumentFileField
            title="Brazil license file"
            recordLabel="Brazil license"
            recordId={fileRecordId}
            canUpload={selectedCustomerId !== null}
            noUploadHint="Create/select a customer first. File can be uploaded before saving the Brazil license."
            fileObjectKey={fileObjectKey}
            fileUrl={fileUrl}
            uploading={uploadingFile}
            deleting={deletingFile}
            error={fileError}
            onUpload={onUploadFile}
            onDelete={onDeleteFile}
          />
          <label className="text-sm">
            Full name *
            <input
              required
              value={brForm.full_name}
              onChange={(event) => setBrForm((prev) => ({ ...prev, full_name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Category
            <select
              value={brForm.category}
              onChange={(event) => setBrForm((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="">Select</option>
              {brazilCategoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            CPF
            <input
              value={brForm.cpf_encrypted}
              onChange={(event) => setBrForm((prev) => ({ ...prev, cpf_encrypted: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Identity number
            <input
              value={brForm.identity_number}
              onChange={(event) => setBrForm((prev) => ({ ...prev, identity_number: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Issuing agency
            <input
              value={brForm.issuing_agency}
              onChange={(event) => setBrForm((prev) => ({ ...prev, issuing_agency: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Issuing state
            <input
              value={brForm.issuing_state}
              onChange={(event) => setBrForm((prev) => ({ ...prev, issuing_state: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Registry number
            <input
              value={brForm.registry_number}
              onChange={(event) => setBrForm((prev) => ({ ...prev, registry_number: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            First license date
            <input
              type="date"
              value={brForm.first_license_date}
              onChange={(event) => setBrForm((prev) => ({ ...prev, first_license_date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Issue date
            <input
              type="date"
              value={brForm.issue_date}
              onChange={(event) => setBrForm((prev) => ({ ...prev, issue_date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Expiration date
            <input
              type="date"
              value={brForm.expiration_date}
              onChange={(event) => setBrForm((prev) => ({ ...prev, expiration_date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Father name
            <input
              value={brForm.father_name}
              onChange={(event) => setBrForm((prev) => ({ ...prev, father_name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Mother name
            <input
              value={brForm.mother_name}
              onChange={(event) => setBrForm((prev) => ({ ...prev, mother_name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Issue place
            <input
              value={brForm.issue_place}
              onChange={(event) => setBrForm((prev) => ({ ...prev, issue_place: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Paper number
            <input
              value={brForm.paper_number}
              onChange={(event) => setBrForm((prev) => ({ ...prev, paper_number: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Issue code
            <input
              value={brForm.issue_code}
              onChange={(event) => setBrForm((prev) => ({ ...prev, issue_code: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Observations
            <textarea
              value={brForm.observations}
              onChange={(event) => setBrForm((prev) => ({ ...prev, observations: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={brForm.is_current}
              onChange={(event) => setBrForm((prev) => ({ ...prev, is_current: event.target.checked }))}
              className="mr-2"
            />
            Mark as current license
          </label>
          {brError ? <p className="text-sm text-red-600 sm:col-span-2">{brError}</p> : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingBr || !selectedCustomerId}
              className="rounded-md bg-linear-to-r from-sky-700 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {savingBr ? "Saving..." : brMode === "create" ? "Add Brazil license" : brMode === "edit" ? "Save Brazil license" : "Renew Brazil license"}
            </button>
          </div>
        </form>
      </CollapsibleSection>
    </section>
  );
}
