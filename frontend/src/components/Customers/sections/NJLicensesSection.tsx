import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Trash2 } from "lucide-react";

import CollapsibleSection from "../CollapsibleSection";
import DocumentFileField from "./DocumentFileField";
import { njClassOptions, njEndorsementOptions, njRestrictionOptions } from "../constants";
import type { CustomerRead, NJDriverLicense, NJEndorsement, NJForm, NJRestriction } from "../types";

type NJLicensesSectionProps = {
  selectedCustomer: CustomerRead | null;
  selectedCustomerId: number | null;
  njMode: "create" | "edit" | "renew";
  njForm: NJForm;
  setNjForm: Dispatch<SetStateAction<NJForm>>;
  savingNj: boolean;
  njError: string | null;
  onSubmit: (event: FormEvent) => void;
  onDeactivate: (licenseId: number) => void;
  onDelete: (licenseId: number) => void;
  onStartEdit: (item: NJDriverLicense) => void;
  onStartRenew: (item: NJDriverLicense) => void;
  onStartCreate: () => void;
  onToggleEndorsement: (code: NJEndorsement) => void;
  onToggleRestriction: (code: NJRestriction) => void;
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

export default function NJLicensesSection({
  selectedCustomer,
  selectedCustomerId,
  njMode,
  njForm,
  setNjForm,
  savingNj,
  njError,
  onSubmit,
  onDeactivate,
  onDelete,
  onStartEdit,
  onStartRenew,
  onStartCreate,
  onToggleEndorsement,
  onToggleRestriction,
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
}: NJLicensesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-300/80 bg-slate-50/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-900">NJ Driver Licenses</h3>
        {njMode !== "create" ? (
          <button
            type="button"
            onClick={onStartCreate}
            className="rounded-md bg-linear-to-r from-sky-700 to-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
          >
            Add new NJ license
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-zinc-500">Class, endorsements, and restrictions with renewal history.</p>
      {selectedCustomer ? (
        <div className="mt-4 space-y-2">
          {selectedCustomer.nj_driver_licenses.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-zinc-700">
                  <p className="font-semibold">
                    #{item.id} | {item.license_number_encrypted || "No number"} | Class {item.license_class || "-"}
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
          {selectedCustomer.nj_driver_licenses.length === 0 ? <p className="text-sm text-zinc-500">No NJ licenses.</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Select a customer to manage licenses.</p>
      )}

      <CollapsibleSection title="NJ license form" subtitle="Create, edit, and renew" defaultOpen>
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
            title="NJ license file"
            recordLabel="NJ license"
            recordId={fileRecordId}
            canUpload={selectedCustomerId !== null}
            noUploadHint="Create/select a customer first. File can be uploaded before saving the NJ license."
            fileObjectKey={fileObjectKey}
            fileUrl={fileUrl}
            uploading={uploadingFile}
            deleting={deletingFile}
            error={fileError}
            onUpload={onUploadFile}
            onDelete={onDeleteFile}
          />
          <label className="text-sm">
            License number
            <input
              value={njForm.license_number_encrypted}
              onChange={(event) => setNjForm((prev) => ({ ...prev, license_number_encrypted: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            License class
            <select
              value={njForm.license_class}
              onChange={(event) => setNjForm((prev) => ({ ...prev, license_class: event.target.value as NJForm["license_class"] }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="">Select</option>
              {njClassOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Issue date
            <input
              type="date"
              value={njForm.issue_date}
              onChange={(event) => setNjForm((prev) => ({ ...prev, issue_date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Expiration date
            <input
              type="date"
              value={njForm.expiration_date}
              onChange={(event) => setNjForm((prev) => ({ ...prev, expiration_date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">Endorsements</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {njEndorsementOptions.map((item) => (
                <label key={item} className="text-sm">
                  <input
                    type="checkbox"
                    checked={njForm.endorsements.includes(item)}
                    onChange={() => onToggleEndorsement(item)}
                    className="mr-1"
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">Restrictions</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {njRestrictionOptions.map((item) => (
                <label key={item} className="text-sm">
                  <input
                    type="checkbox"
                    checked={njForm.restrictions.includes(item)}
                    onChange={() => onToggleRestriction(item)}
                    className="mr-1"
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={njForm.is_current}
              onChange={(event) => setNjForm((prev) => ({ ...prev, is_current: event.target.checked }))}
              className="mr-2"
            />
            Mark as current license
          </label>

          {njError ? <p className="text-sm text-red-600 sm:col-span-2">{njError}</p> : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingNj || !selectedCustomerId}
              className="rounded-md bg-linear-to-r from-sky-700 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {savingNj ? "Saving..." : njMode === "create" ? "Add NJ license" : njMode === "edit" ? "Save NJ license" : "Renew NJ license"}
            </button>
          </div>
        </form>
      </CollapsibleSection>
    </section>
  );
}
