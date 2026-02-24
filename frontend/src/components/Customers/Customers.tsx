import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Pencil, Trash2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiFetch } from "../../lib/api";
import {
  defaultBrazilForm,
  defaultNJForm,
  defaultPassportForm,
  normalizeDate,
  normalizeString,
} from "./formUtils";
import { useCustomerCoreWithOptions } from "./hooks/useCustomerCore";
import BrazilLicensesSection from "./sections/BrazilLicensesSection";
import CustomerCoreSection from "./sections/CustomerCoreSection";
import NJLicensesSection from "./sections/NJLicensesSection";
import PassportsSection from "./sections/PassportsSection";
import type {
  BrazilDriverLicense,
  BrazilForm,
  NJDriverLicense,
  NJEndorsement,
  NJForm,
  NJRestriction,
  Passport,
  PassportForm,
} from "./types";

export default function Customers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    customers,
    search,
    setSearch,
    loadingList,
    listError,
    selectedCustomerId,
    selectedCustomer,
    selectedCustomerName,
    customerForm,
    setCustomerForm,
    customerMode,
    customerError,
    customerSuccess,
    savingCustomer,
    customerPhotoUrl,
    uploadingPhoto,
    deletingPhoto,
    photoError,
    loadCustomers,
    handleSelectCustomer,
    beginCreateCustomer,
    submitCustomer,
    deactivateCustomer,
    uploadCustomerPhoto,
    deleteCustomerPhoto,
  } = useCustomerCoreWithOptions({
    skipInitialAutoSelect: Boolean(searchParams.get("customerId")),
  });

  const [njForm, setNjForm] = useState<NJForm>(defaultNJForm);
  const [njMode, setNjMode] = useState<"create" | "edit" | "renew">("create");
  const [editingNjId, setEditingNjId] = useState<number | null>(null);
  const [savingNj, setSavingNj] = useState(false);
  const [njError, setNjError] = useState<string | null>(null);

  const [brForm, setBrForm] = useState<BrazilForm>(defaultBrazilForm);
  const [brMode, setBrMode] = useState<"create" | "edit" | "renew">("create");
  const [editingBrId, setEditingBrId] = useState<number | null>(null);
  const [savingBr, setSavingBr] = useState(false);
  const [brError, setBrError] = useState<string | null>(null);

  const [passportForm, setPassportForm] = useState<PassportForm>(defaultPassportForm);
  const [passportMode, setPassportMode] = useState<"create" | "edit" | "renew">("create");
  const [editingPassportId, setEditingPassportId] = useState<number | null>(null);
  const [savingPassport, setSavingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Record<string, true>>({});

  function customerInitials(firstName: string, lastName: string): string {
    const first = firstName.trim().charAt(0);
    const last = lastName.trim().charAt(0);
    return `${first}${last}`.toUpperCase();
  }

  function buildCustomerPhotoUrl(customerId: number, objectKey: string | null): string | null {
    if (!objectKey) {
      return null;
    }
    return `/api/customers/${customerId}/photo?k=${encodeURIComponent(objectKey)}`;
  }

  useEffect(() => {
    const query = searchParams.get("search")?.trim() ?? "";
    const customerIdParam = searchParams.get("customerId");
    const targetCustomerId = customerIdParam ? Number(customerIdParam) : NaN;
    const hasTargetCustomer = Number.isInteger(targetCustomerId) && targetCustomerId > 0;

    void (async () => {
      if (query) {
        setSearch(query);
      }
      if (!query && !hasTargetCustomer) {
        return;
      }
      await loadCustomers(query || undefined, { skipAutoSelect: hasTargetCustomer });
      if (hasTargetCustomer) {
        await handleSelectCustomer(targetCustomerId);
        setEditorOpen(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearch]);

  useEffect(() => {
    setNjMode("create");
    setNjForm(defaultNJForm());
    setEditingNjId(null);
    setNjError(null);

    setBrMode("create");
    setBrForm(defaultBrazilForm());
    setEditingBrId(null);
    setBrError(null);

    setPassportMode("create");
    setPassportForm(defaultPassportForm());
    setEditingPassportId(null);
    setPassportError(null);
  }, [selectedCustomerId]);

  function hydrateNjForm(item: NJDriverLicense) {
    setNjForm({
      license_number_encrypted: item.license_number_encrypted ?? "",
      issue_date: item.issue_date ?? "",
      expiration_date: item.expiration_date ?? "",
      license_class: item.license_class ?? "",
      endorsements: item.endorsements.map((x) => x.code),
      restrictions: item.restrictions.map((x) => x.code),
      is_current: item.is_current,
    });
  }

  async function submitNj(event: FormEvent) {
    event.preventDefault();
    if (!selectedCustomerId) {
      setNjError("Select a customer first.");
      return;
    }
    setSavingNj(true);
    setNjError(null);
    try {
      const payload = {
        license_number_encrypted: normalizeString(njForm.license_number_encrypted),
        issue_date: normalizeDate(njForm.issue_date),
        expiration_date: normalizeDate(njForm.expiration_date),
        license_class: njForm.license_class || null,
        endorsements: njForm.endorsements,
        restrictions: njForm.restrictions,
        is_current: njForm.is_current,
      };

      let path = `/customers/${selectedCustomerId}/nj-driver-licenses`;
      if (njMode === "edit" && editingNjId) {
        path = `/customers/${selectedCustomerId}/nj-driver-licenses/${editingNjId}`;
      }
      if (njMode === "renew" && editingNjId) {
        path = `/customers/${selectedCustomerId}/nj-driver-licenses/${editingNjId}/renew`;
      }
      const method = njMode === "create" || njMode === "renew" ? "POST" : "PATCH";
      const response = await apiFetch(path, { method, body: JSON.stringify(payload) });
      if (!response.ok) {
        let detail = `Failed to save NJ license: ${response.status}`;
        try {
          const body = (await response.json()) as { detail?: string };
          if (typeof body.detail === "string" && body.detail.trim()) {
            detail = body.detail;
          }
        } catch {
          // Ignore parse errors and keep fallback message.
        }
        throw new Error(detail);
      }
      setNjMode("create");
      setEditingNjId(null);
      setNjForm(defaultNJForm());
      await handleSelectCustomer(selectedCustomerId);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Could not save NJ license.";
      setNjError(message);
    } finally {
      setSavingNj(false);
    }
  }

  async function deactivateNj(licenseId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Deactivate this NJ license?");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/nj-driver-licenses/${licenseId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setNjError("Failed to deactivate NJ license.");
      return;
    }
    await handleSelectCustomer(selectedCustomerId);
  }

  async function deleteNj(licenseId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Delete this NJ license permanently? This cannot be undone.");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/nj-driver-licenses/${licenseId}/permanent`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setNjError("Failed to delete NJ license.");
      return;
    }
    await handleSelectCustomer(selectedCustomerId);
  }

  function hydrateBrazilForm(item: BrazilDriverLicense) {
    setBrForm({
      full_name: item.full_name,
      identity_number: item.identity_number ?? "",
      issuing_agency: item.issuing_agency ?? "",
      issuing_state: item.issuing_state ?? "",
      cpf_encrypted: item.cpf_encrypted ?? "",
      father_name: item.father_name ?? "",
      mother_name: item.mother_name ?? "",
      category: item.category ?? "",
      registry_number: item.registry_number ?? "",
      expiration_date: item.expiration_date ?? "",
      first_license_date: item.first_license_date ?? "",
      observations: item.observations ?? "",
      issue_place: item.issue_place ?? "",
      issue_date: item.issue_date ?? "",
      paper_number: item.paper_number ?? "",
      issue_code: item.issue_code ?? "",
      is_current: item.is_current,
    });
  }

  async function submitBrazil(event: FormEvent) {
    event.preventDefault();
    if (!selectedCustomerId) {
      setBrError("Select a customer first.");
      return;
    }
    setSavingBr(true);
    setBrError(null);
    try {
      const payload = {
        full_name: brForm.full_name.trim(),
        identity_number: normalizeString(brForm.identity_number),
        issuing_agency: normalizeString(brForm.issuing_agency),
        issuing_state: normalizeString(brForm.issuing_state)?.toUpperCase() ?? null,
        cpf_encrypted: normalizeString(brForm.cpf_encrypted),
        father_name: normalizeString(brForm.father_name),
        mother_name: normalizeString(brForm.mother_name),
        category: normalizeString(brForm.category),
        registry_number: normalizeString(brForm.registry_number),
        expiration_date: normalizeDate(brForm.expiration_date),
        first_license_date: normalizeDate(brForm.first_license_date),
        observations: normalizeString(brForm.observations),
        issue_place: normalizeString(brForm.issue_place),
        issue_date: normalizeDate(brForm.issue_date),
        paper_number: normalizeString(brForm.paper_number),
        issue_code: normalizeString(brForm.issue_code),
        is_current: brForm.is_current,
      };
      let path = `/customers/${selectedCustomerId}/brazil-driver-licenses`;
      if (brMode === "edit" && editingBrId) {
        path = `/customers/${selectedCustomerId}/brazil-driver-licenses/${editingBrId}`;
      }
      if (brMode === "renew" && editingBrId) {
        path = `/customers/${selectedCustomerId}/brazil-driver-licenses/${editingBrId}/renew`;
      }
      const method = brMode === "create" || brMode === "renew" ? "POST" : "PATCH";
      const response = await apiFetch(path, { method, body: JSON.stringify(payload) });
      if (!response.ok) {
        throw new Error(`Failed to save Brazil license: ${response.status}`);
      }
      setBrMode("create");
      setEditingBrId(null);
      setBrForm(defaultBrazilForm());
      await handleSelectCustomer(selectedCustomerId);
    } catch {
      setBrError("Could not save Brazil license.");
    } finally {
      setSavingBr(false);
    }
  }

  async function deactivateBrazil(licenseId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Deactivate this Brazil license?");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/brazil-driver-licenses/${licenseId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setBrError("Failed to deactivate Brazil license.");
      return;
    }
    await handleSelectCustomer(selectedCustomerId);
  }

  async function deleteBrazil(licenseId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Delete this Brazil license permanently? This cannot be undone.");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/brazil-driver-licenses/${licenseId}/permanent`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setBrError("Failed to delete Brazil license.");
      return;
    }
    await handleSelectCustomer(selectedCustomerId);
  }

  function hydratePassportForm(item: Passport) {
    setPassportForm({
      document_type: item.document_type ?? "",
      issuing_country: item.issuing_country ?? "",
      passport_number_encrypted: item.passport_number_encrypted,
      surname: item.surname,
      given_name: item.given_name,
      middle_name: item.middle_name ?? "",
      father_name: item.father_name ?? "",
      mother_name: item.mother_name ?? "",
      nationality: item.nationality ?? "",
      birth_place: item.birth_place ?? "",
      issue_date: item.issue_date ?? "",
      expiration_date: item.expiration_date ?? "",
      issuing_authority: item.issuing_authority ?? "",
      is_current: item.is_current,
    });
  }

  async function submitPassport(event: FormEvent) {
    event.preventDefault();
    if (!selectedCustomerId) {
      setPassportError("Select a customer first.");
      return;
    }
    setSavingPassport(true);
    setPassportError(null);
    try {
      const payload = {
        document_type: normalizeString(passportForm.document_type),
        issuing_country: normalizeString(passportForm.issuing_country),
        passport_number_encrypted: passportForm.passport_number_encrypted.trim(),
        surname: passportForm.surname.trim(),
        given_name: passportForm.given_name.trim(),
        middle_name: normalizeString(passportForm.middle_name),
        father_name: normalizeString(passportForm.father_name),
        mother_name: normalizeString(passportForm.mother_name),
        nationality: normalizeString(passportForm.nationality),
        birth_place: normalizeString(passportForm.birth_place),
        issue_date: normalizeDate(passportForm.issue_date),
        expiration_date: normalizeDate(passportForm.expiration_date),
        issuing_authority: normalizeString(passportForm.issuing_authority),
        is_current: passportForm.is_current,
      };
      let path = `/customers/${selectedCustomerId}/passports`;
      if (passportMode === "edit" && editingPassportId) {
        path = `/customers/${selectedCustomerId}/passports/${editingPassportId}`;
      }
      if (passportMode === "renew" && editingPassportId) {
        path = `/customers/${selectedCustomerId}/passports/${editingPassportId}/renew`;
      }
      const method = passportMode === "create" || passportMode === "renew" ? "POST" : "PATCH";
      const response = await apiFetch(path, { method, body: JSON.stringify(payload) });
      if (!response.ok) {
        throw new Error(`Failed to save passport: ${response.status}`);
      }
      setPassportMode("create");
      setEditingPassportId(null);
      setPassportForm(defaultPassportForm());
      await handleSelectCustomer(selectedCustomerId);
    } catch {
      setPassportError("Could not save passport.");
    } finally {
      setSavingPassport(false);
    }
  }

  async function deactivatePassport(passportId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Deactivate this passport?");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/passports/${passportId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setPassportError("Failed to deactivate passport.");
      return;
    }
    await handleSelectCustomer(selectedCustomerId);
  }

  async function deletePassport(passportId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Delete this passport permanently? This cannot be undone.");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/passports/${passportId}/permanent`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setPassportError("Failed to delete passport.");
      return;
    }
    await handleSelectCustomer(selectedCustomerId);
  }

  function toggleNjEndorsement(code: NJEndorsement) {
    setNjForm((prev) => ({
      ...prev,
      endorsements: prev.endorsements.includes(code)
        ? prev.endorsements.filter((item) => item !== code)
        : [...prev.endorsements, code],
    }));
  }

  function toggleNjRestriction(code: NJRestriction) {
    setNjForm((prev) => ({
      ...prev,
      restrictions: prev.restrictions.includes(code)
        ? prev.restrictions.filter((item) => item !== code)
        : [...prev.restrictions, code],
    }));
  }

  async function openCreateDialog() {
    beginCreateCustomer();
    setEditorOpen(true);
  }

  async function openEditDialog(customerId: number) {
    await handleSelectCustomer(customerId);
    setEditorOpen(true);
  }

  function openDocumentGenerator(customerId: number) {
    navigate(`/documents?customerId=${customerId}`);
  }

  return (
    <div className="space-y-5">
      <header className="animate-in fade-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Customers</h1>
            <p className="mt-1 text-sm text-slate-500">Manage customer records and licenses</p>
          </div>
          <button
            type="button"
            onClick={() => void openCreateDialog()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Add Customer
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <label className="relative w-full max-w-xl">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <path
                d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void loadCustomers();
                }
              }}
              placeholder="Search customers..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadCustomers()}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Search
          </button>
        </div>

        {listError ? <p className="mb-3 text-sm text-red-600">{listError}</p> : null}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">Contact</th>
                <th className="px-3 py-2.5 font-medium">Date of birth</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-slate-500">
                    Loading customers...
                  </td>
                </tr>
              ) : null}
              {!loadingList && customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : null}
              {!loadingList
                ? customers.map((customer) => {
                    const photoUrl = buildCustomerPhotoUrl(customer.id, customer.customer_photo_object_key);
                    const showPhoto = Boolean(photoUrl && !failedPhotoUrls[photoUrl]);
                    return (
                      <tr key={customer.id} className="border-b border-slate-100">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            {showPhoto && photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={`${customer.first_name} ${customer.last_name}`}
                                className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                                onError={() => setFailedPhotoUrls((prev) => ({ ...prev, [photoUrl]: true }))}
                              />
                            ) : (
                              <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-xs font-semibold uppercase text-blue-700">
                                {customerInitials(customer.first_name, customer.last_name)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">
                                {customer.first_name} {customer.last_name}
                              </p>
                              <p className="text-xs text-slate-500">ID: {customer.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{customer.email || customer.phone_number || "-"}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {customer.date_of_birth.includes("-")
                            ? (() => {
                                const [year, month, day] = customer.date_of_birth.split("-");
                                return `${month}/${day}/${year}`;
                              })()
                            : customer.date_of_birth}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-xs font-semibold",
                              customer.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600",
                            ].join(" ")}
                          >
                            {customer.active ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void openEditDialog(customer.id)}
                              title="Edit customer"
                              aria-label="Edit customer"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deactivateCustomer(customer.id)}
                              title="Remove customer"
                              aria-label="Remove customer"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDocumentGenerator(customer.id)}
                              title="Generate document"
                              aria-label="Generate document"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-4 pt-10">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {customerMode === "create" ? "Add New Customer" : `Edit Customer: ${selectedCustomerName}`}
                </h2>
                <p className="text-sm text-slate-500">Core data, licenses, passports, and document context.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                title="Close"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <CustomerCoreSection
                customerMode={customerMode}
                selectedCustomerName={selectedCustomerName}
                selectedCustomerId={selectedCustomerId}
                customerForm={customerForm}
                setCustomerForm={setCustomerForm}
                customerError={customerError}
                customerSuccess={customerSuccess}
                savingCustomer={savingCustomer}
                customerPhotoUrl={customerPhotoUrl}
                uploadingPhoto={uploadingPhoto}
                deletingPhoto={deletingPhoto}
                photoError={photoError}
                onSubmit={(event) => void submitCustomer(event)}
                onDeactivate={(customerId) => void deactivateCustomer(customerId)}
                onUploadPhoto={(file) => void uploadCustomerPhoto(file)}
                onDeletePhoto={() => void deleteCustomerPhoto()}
              />

              <NJLicensesSection
                selectedCustomer={selectedCustomer}
                selectedCustomerId={selectedCustomerId}
                njMode={njMode}
                njForm={njForm}
                setNjForm={setNjForm}
                savingNj={savingNj}
                njError={njError}
                onSubmit={(event) => void submitNj(event)}
                onDeactivate={(licenseId) => void deactivateNj(licenseId)}
                onDelete={(licenseId) => void deleteNj(licenseId)}
                onStartEdit={(item) => {
                  setNjMode("edit");
                  setEditingNjId(item.id);
                  hydrateNjForm(item);
                }}
                onStartRenew={(item) => {
                  setNjMode("renew");
                  setEditingNjId(item.id);
                  hydrateNjForm(item);
                  setNjForm((prev) => ({ ...prev, is_current: true }));
                }}
                onToggleEndorsement={toggleNjEndorsement}
                onToggleRestriction={toggleNjRestriction}
              />

              <BrazilLicensesSection
                selectedCustomer={selectedCustomer}
                selectedCustomerId={selectedCustomerId}
                brMode={brMode}
                brForm={brForm}
                setBrForm={setBrForm}
                savingBr={savingBr}
                brError={brError}
                onSubmit={(event) => void submitBrazil(event)}
                onDeactivate={(licenseId) => void deactivateBrazil(licenseId)}
                onDelete={(licenseId) => void deleteBrazil(licenseId)}
                onStartEdit={(item) => {
                  setBrMode("edit");
                  setEditingBrId(item.id);
                  hydrateBrazilForm(item);
                }}
                onStartRenew={(item) => {
                  setBrMode("renew");
                  setEditingBrId(item.id);
                  hydrateBrazilForm(item);
                  setBrForm((prev) => ({ ...prev, is_current: true }));
                }}
              />

              <PassportsSection
                selectedCustomer={selectedCustomer}
                selectedCustomerId={selectedCustomerId}
                passportMode={passportMode}
                passportForm={passportForm}
                setPassportForm={setPassportForm}
                savingPassport={savingPassport}
                passportError={passportError}
                onSubmit={(event) => void submitPassport(event)}
                onDeactivate={(passportId) => void deactivatePassport(passportId)}
                onDelete={(passportId) => void deletePassport(passportId)}
                onStartEdit={(item) => {
                  setPassportMode("edit");
                  setEditingPassportId(item.id);
                  hydratePassportForm(item);
                }}
                onStartRenew={(item) => {
                  setPassportMode("renew");
                  setEditingPassportId(item.id);
                  hydratePassportForm(item);
                  setPassportForm((prev) => ({ ...prev, is_current: true }));
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
