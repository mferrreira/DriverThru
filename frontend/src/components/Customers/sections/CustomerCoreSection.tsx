import type { Dispatch, FormEvent, SetStateAction } from "react";

import CollapsibleSection from "../CollapsibleSection";
import { eyeColorOptions, genderOptions } from "../constants";
import type { AddressType, CustomerForm } from "../types";
import CustomerPhotoField from "./CustomerPhotoField";

type CustomerCoreSectionProps = {
  customerMode: "create" | "edit";
  selectedCustomerName: string;
  selectedCustomerId: number | null;
  customerForm: CustomerForm;
  setCustomerForm: Dispatch<SetStateAction<CustomerForm>>;
  customerError: string | null;
  customerSuccess: string | null;
  savingCustomer: boolean;
  customerPhotoUrl: string | null;
  uploadingPhoto: boolean;
  photoError: string | null;
  onSubmit: (event: FormEvent) => void;
  onDeactivate: (customerId: number) => void;
  onUploadPhoto: (file: File) => void;
};

export default function CustomerCoreSection({
  customerMode,
  selectedCustomerName,
  selectedCustomerId,
  customerForm,
  setCustomerForm,
  customerError,
  customerSuccess,
  savingCustomer,
  customerPhotoUrl,
  uploadingPhoto,
  photoError,
  onSubmit,
  onDeactivate,
  onUploadPhoto,
}: CustomerCoreSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          {customerMode === "create" ? "New customer" : `Edit customer: ${selectedCustomerName}`}
        </h2>
        {selectedCustomerId ? (
          <button
            type="button"
            onClick={() => onDeactivate(selectedCustomerId)}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Deactivate
          </button>
        ) : null}
      </div>
      <CollapsibleSection
        title="Customer data"
        subtitle="Expand to create/edit core customer data and addresses"

      >
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <CustomerPhotoField
            selectedCustomerId={selectedCustomerId}
            hasPhoto={Boolean(customerForm.customer_photo_object_key)}
            photoUrl={customerPhotoUrl}
            uploadingPhoto={uploadingPhoto}
            photoError={photoError}
            onUpload={onUploadPhoto}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              First name *
              <input
                required
                value={customerForm.first_name}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, first_name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Last name *
              <input
                required
                value={customerForm.last_name}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, last_name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Middle name
              <input
                value={customerForm.middle_name}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, middle_name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Suffix
              <input
                value={customerForm.suffix}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, suffix: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Date of birth *
              <input
                required
                type="text"
                placeholder="MM/DD/YYYY"
                value={customerForm.date_of_birth}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Gender
              <select
                value={customerForm.gender}
                onChange={(event) =>
                  setCustomerForm((prev) => ({ ...prev, gender: event.target.value as CustomerForm["gender"] }))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="">Select</option>
                {genderOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Eye color (COLOR/CLR)
              <select
                value={customerForm.eye_color}
                onChange={(event) =>
                  setCustomerForm((prev) => ({ ...prev, eye_color: event.target.value as CustomerForm["eye_color"] }))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="">Select</option>
                {eyeColorOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Weight (lbs)
              <input
                type="number"
                min={0}
                step="0.1"
                value={customerForm.weight_lbs}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, weight_lbs: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Height (feet)
              <input
                type="number"
                min={0}
                max={8}
                value={customerForm.height_feet}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, height_feet: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Height (inches)
              <input
                type="number"
                min={0}
                max={11}
                value={customerForm.height_inches}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, height_inches: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Phone
              <input
                value={customerForm.phone_number}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Email
              <input
                type="email"
                value={customerForm.email}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={customerForm.has_no_ssn}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, has_no_ssn: event.target.checked }))}
                className="mr-2"
              />
              Customer has no SSN
            </label>
            <label className="text-sm">
              SSN
              <input
                disabled={customerForm.has_no_ssn}
                value={customerForm.ssn_encrypted}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, ssn_encrypted: event.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 disabled:bg-zinc-100"
              />
            </label>
          </div>

          {(["residential", "mailing", "out_of_state"] as AddressType[]).map((addressType) => {
            const labelMap: Record<AddressType, string> = {
              residential: "Residential address",
              mailing: "Mailing address",
              out_of_state: "Out-of-state address",
            };
            const address = customerForm[addressType];
            return (
              <fieldset key={addressType} className="rounded-lg border border-zinc-200 p-3">
                <legend className="px-1 text-sm font-semibold text-zinc-700">{labelMap[addressType]}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Street
                    <input
                      value={address.street}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          [addressType]: { ...prev[addressType], street: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    Apt
                    <input
                      value={address.apt}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          [addressType]: { ...prev[addressType], apt: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    City
                    <input
                      value={address.city}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          [addressType]: { ...prev[addressType], city: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    State
                    <input
                      value={address.state}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          [addressType]: { ...prev[addressType], state: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    Zip
                    <input
                      value={address.zip_code}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          [addressType]: { ...prev[addressType], zip_code: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    County
                    <input
                      value={address.county}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          [addressType]: { ...prev[addressType], county: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}

          {customerError ? <p className="text-sm text-red-600">{customerError}</p> : null}
          {customerSuccess ? <p className="text-sm text-emerald-700">{customerSuccess}</p> : null}
          <button
            type="submit"
            disabled={savingCustomer}
            className="rounded-md bg-linear-to-r from-sky-700 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
          >
            {savingCustomer ? "Saving..." : customerMode === "create" ? "Create customer" : "Save changes"}
          </button>
        </form>
      </CollapsibleSection>
    </section>
  );
}
