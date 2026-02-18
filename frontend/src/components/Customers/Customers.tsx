import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { apiFetch } from "../../lib/api";
import {
  defaultBrazilForm,
  defaultNJForm,
  defaultPassportForm,
  normalizeDate,
  normalizeString,
} from "./formUtils";
import { useCustomerCore } from "./hooks/useCustomerCore";
import CustomersSidebar from "./CustomersSidebar";
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
    photoError,
    loadCustomers,
    handleSelectCustomer,
    beginCreateCustomer,
    submitCustomer,
    deactivateCustomer,
    uploadCustomerPhoto,
  } = useCustomerCore();

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
        throw new Error(`Failed to save NJ license: ${response.status}`);
      }
      setNjMode("create");
      setEditingNjId(null);
      setNjForm(defaultNJForm());
      await handleSelectCustomer(selectedCustomerId);
    } catch {
      setNjError("Could not save NJ license.");
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

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <CustomersSidebar
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        loadingList={loadingList}
        listError={listError}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => void loadCustomers()}
        onCreateClick={beginCreateCustomer}
        onSelectCustomer={(customerId) => void handleSelectCustomer(customerId)}
      />

      <main className="space-y-6 lg:col-span-8">
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
          photoError={photoError}
          onSubmit={(event) => void submitCustomer(event)}
          onDeactivate={(customerId) => void deactivateCustomer(customerId)}
          onUploadPhoto={(file) => void uploadCustomerPhoto(file)}
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
      </main>
    </div>
  );
}
