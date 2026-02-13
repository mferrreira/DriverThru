import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { apiFetch } from "../../lib/api";
import CollapsibleSection from "./CollapsibleSection";
import CustomersSidebar from "./CustomersSidebar";
import { brazilCategoryOptions, eyeColorOptions, genderOptions, njClassOptions, njEndorsementOptions, njRestrictionOptions } from "./constants";
import { defaultBrazilForm, defaultCustomerForm, defaultNJForm, defaultPassportForm, mapAddressForm, normalizeDate, normalizeString } from "./formUtils";
import type {
  AddressForm,
  AddressType,
  BrazilDriverLicense,
  BrazilForm,
  CustomerForm,
  CustomerListItem,
  CustomerListResponse,
  CustomerRead,
  NJDriverLicense,
  NJEndorsement,
  NJForm,
  NJRestriction,
  Passport,
  PassportForm,
} from "./types";

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRead | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(defaultCustomerForm);
  const [customerMode, setCustomerMode] = useState<"create" | "edit">("create");
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

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

  const selectedCustomerName = useMemo(() => {
    if (!selectedCustomer) {
      return "";
    }
    return `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim();
  }, [selectedCustomer]);

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoadingList(true);
    setListError(null);
    try {
      const query = search.trim();
      const suffix = query ? `?search=${encodeURIComponent(query)}` : "";
      const response = await apiFetch(`/customers${suffix}`);
      if (!response.ok) {
        throw new Error(`Failed to list customers: ${response.status}`);
      }
      const data = (await response.json()) as CustomerListResponse;
      setCustomers(data.items);
      if (!selectedCustomerId && data.items.length > 0) {
        void handleSelectCustomer(data.items[0].id);
      }
      if (selectedCustomerId && !data.items.some((item) => item.id === selectedCustomerId)) {
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
        setCustomerMode("create");
        setCustomerForm(defaultCustomerForm());
      }
    } catch {
      setListError("Não foi possível carregar os clientes.");
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSelectCustomer(customerId: number) {
    setSelectedCustomerId(customerId);
    setCustomerError(null);
    try {
      const response = await apiFetch(`/customers/${customerId}`);
      if (!response.ok) {
        throw new Error(`Failed to load customer: ${response.status}`);
      }
      const data = (await response.json()) as CustomerRead;
      setSelectedCustomer(data);
      setCustomerMode("edit");
      setCustomerForm({
        customer_photo_object_key: data.customer_photo_object_key ?? "",
        first_name: data.first_name,
        middle_name: data.middle_name ?? "",
        last_name: data.last_name,
        suffix: data.suffix ?? "",
        phone_number: data.phone_number ?? "",
        email: data.email ?? "",
        date_of_birth: data.date_of_birth ?? "",
        has_no_ssn: data.has_no_ssn,
        ssn_encrypted: data.ssn_encrypted ?? "",
        gender: data.gender ?? "",
        eye_color: data.eye_color ?? "",
        weight_lbs: data.weight_lbs ?? "",
        height_feet: data.height_feet?.toString() ?? "",
        height_inches: data.height_inches?.toString() ?? "",
        residential: mapAddressForm(data.addresses, "residential"),
        mailing: mapAddressForm(data.addresses, "mailing"),
        out_of_state: mapAddressForm(data.addresses, "out_of_state"),
      });
      setNjMode("create");
      setNjForm(defaultNJForm());
      setEditingNjId(null);
      setBrMode("create");
      setBrForm(defaultBrazilForm());
      setEditingBrId(null);
      setPassportMode("create");
      setPassportForm(defaultPassportForm());
      setEditingPassportId(null);
    } catch {
      setCustomerError("Não foi possível carregar o detalhe do cliente.");
    }
  }

  function beginCreateCustomer() {
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setCustomerMode("create");
    setCustomerForm(defaultCustomerForm());
    setCustomerError(null);
  }

  function parseAddressesFromForm(form: CustomerForm): Array<Record<string, string>> {
    const output: Array<Record<string, string>> = [];
    const entries: Array<{ type: AddressType; value: AddressForm }> = [
      { type: "residential", value: form.residential },
      { type: "mailing", value: form.mailing },
      { type: "out_of_state", value: form.out_of_state },
    ];

    for (const entry of entries) {
      const hasAnyValue =
        entry.value.street.trim() ||
        entry.value.apt.trim() ||
        entry.value.city.trim() ||
        entry.value.state.trim() ||
        entry.value.zip_code.trim() ||
        entry.value.county.trim();

      if (!hasAnyValue) {
        continue;
      }

      if (!entry.value.street.trim() || !entry.value.city.trim() || !entry.value.state.trim() || !entry.value.zip_code.trim()) {
        throw new Error(`Endereço ${entry.type} incompleto. Informe street/city/state/zip.`);
      }
      const normalizedState = entry.value.state.trim().toUpperCase();
      if (normalizedState.length !== 2) {
        throw new Error(`Endereço ${entry.type}: state deve ter 2 caracteres (ex: NJ).`);
      }

      output.push({
        address_type: entry.type,
        street: entry.value.street.trim(),
        apt: entry.value.apt.trim(),
        city: entry.value.city.trim(),
        state: normalizedState,
        zip_code: entry.value.zip_code.trim(),
        county: entry.value.county.trim(),
      });
    }
    return output;
  }

  async function submitCustomer(event: FormEvent) {
    event.preventDefault();
    setSavingCustomer(true);
    setCustomerError(null);

    try {
      const addresses = parseAddressesFromForm(customerForm);
      const normalizedWeight = customerForm.weight_lbs.replace(",", ".");
      const heightFeet = customerForm.height_feet ? Number(customerForm.height_feet) : null;
      const heightInches = customerForm.height_inches ? Number(customerForm.height_inches) : null;
      if (heightFeet !== null && (heightFeet < 0 || heightFeet > 8)) {
        throw new Error("Height (feet) deve estar entre 0 e 8.");
      }
      if (heightInches !== null && (heightInches < 0 || heightInches > 11)) {
        throw new Error("Height (inches) deve estar entre 0 e 11.");
      }
      const payload = {
        customer_photo_object_key: normalizeString(customerForm.customer_photo_object_key),
        first_name: customerForm.first_name.trim(),
        middle_name: normalizeString(customerForm.middle_name),
        last_name: customerForm.last_name.trim(),
        suffix: normalizeString(customerForm.suffix),
        phone_number: normalizeString(customerForm.phone_number),
        email: normalizeString(customerForm.email),
        date_of_birth: customerForm.date_of_birth,
        has_no_ssn: customerForm.has_no_ssn,
        ssn_encrypted: customerForm.has_no_ssn ? null : normalizeString(customerForm.ssn_encrypted),
        gender: customerForm.gender || null,
        eye_color: normalizeString(customerForm.eye_color),
        weight_lbs: normalizeString(normalizedWeight),
        height_feet: heightFeet,
        height_inches: heightInches,
        addresses,
      };

      const path = customerMode === "create" ? "/customers" : `/customers/${selectedCustomerId}`;
      const method = customerMode === "create" ? "POST" : "PATCH";
      const response = await apiFetch(path, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let backendMessage = `Failed to save customer: ${response.status}`;
        try {
          const data = (await response.json()) as { detail?: unknown };
          if (typeof data.detail === "string") {
            backendMessage = data.detail;
          } else if (Array.isArray(data.detail) && data.detail.length > 0) {
            const first = data.detail[0] as { loc?: unknown[]; msg?: string };
            const loc = Array.isArray(first.loc) ? first.loc.join(".") : "payload";
            backendMessage = `${loc}: ${first.msg ?? "validation error"}`;
          }
        } catch {
          // Keep default message.
        }
        throw new Error(backendMessage);
      }

      const saved = (await response.json()) as CustomerRead;
      await loadCustomers();
      await handleSelectCustomer(saved.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar cliente.";
      setCustomerError(message);
    } finally {
      setSavingCustomer(false);
    }
  }

  async function deactivateCustomer(customerId: number) {
    const ok = window.confirm("Desativar este cliente?");
    if (!ok) {
      return;
    }

    const response = await apiFetch(`/customers/${customerId}`, { method: "DELETE" });
    if (!response.ok) {
      setCustomerError("Não foi possível desativar o cliente.");
      return;
    }
    setSelectedCustomer(null);
    setSelectedCustomerId(null);
    setCustomerMode("create");
    setCustomerForm(defaultCustomerForm());
    await loadCustomers();
  }

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
      setNjError("Selecione um cliente antes.");
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
      setNjError("Não foi possível salvar a NJ license.");
    } finally {
      setSavingNj(false);
    }
  }

  async function deactivateNj(licenseId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Desativar esta NJ license?");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/nj-driver-licenses/${licenseId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setNjError("Falha ao desativar NJ license.");
      return;
    }
    await handleSelectCustomer(selectedCustomerId);
  }

  async function submitBrazil(event: FormEvent) {
    event.preventDefault();
    if (!selectedCustomerId) {
      setBrError("Selecione um cliente antes.");
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
      setBrError("Não foi possível salvar a CNH Brasil.");
    } finally {
      setSavingBr(false);
    }
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

  async function deactivateBrazil(licenseId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Desativar esta CNH Brasil?");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/brazil-driver-licenses/${licenseId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setBrError("Falha ao desativar CNH Brasil.");
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
      setPassportError("Selecione um cliente antes.");
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
      setPassportError("Não foi possível salvar o passaporte.");
    } finally {
      setSavingPassport(false);
    }
  }

  async function deactivatePassport(passportId: number) {
    if (!selectedCustomerId) {
      return;
    }
    const ok = window.confirm("Desativar este passaporte?");
    if (!ok) {
      return;
    }
    const response = await apiFetch(`/customers/${selectedCustomerId}/passports/${passportId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setPassportError("Falha ao desativar passaporte.");
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
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              {customerMode === "create" ? "Novo customer" : `Editar customer: ${selectedCustomerName}`}
            </h2>
            {selectedCustomerId ? (
              <button
                type="button"
                onClick={() => void deactivateCustomer(selectedCustomerId)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Desativar
              </button>
            ) : null}
          </div>
          <CollapsibleSection
            title="Dados do customer"
            subtitle="Abra para preencher/editar os dados principais e endereços"
            defaultOpen
          >
            <form onSubmit={(event) => void submitCustomer(event)} className="space-y-4">
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
                  type="date"
                  value={customerForm.date_of_birth}
                  onChange={(event) => setCustomerForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Gender
                <select
                  value={customerForm.gender}
                  onChange={(event) => setCustomerForm((prev) => ({ ...prev, gender: event.target.value as CustomerForm["gender"] }))}
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
                Eye color
                <select
                  value={customerForm.eye_color}
                  onChange={(event) => setCustomerForm((prev) => ({ ...prev, eye_color: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                >
                  <option value="">Select</option>
                  {eyeColorOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
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
                Customer sem SSN
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
                out_of_state: "Out of state address",
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
            <button
              type="submit"
              disabled={savingCustomer}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {savingCustomer ? "Salvando..." : customerMode === "create" ? "Criar customer" : "Salvar alterações"}
            </button>
            </form>
          </CollapsibleSection>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">NJ Driver Licenses</h3>
          <p className="mt-1 text-sm text-zinc-500">Classe, endorsements e restrictions com histórico de renovação.</p>
          {selectedCustomer ? (
            <div className="mt-4 space-y-2">
              {selectedCustomer.nj_driver_licenses.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-zinc-700">
                      <p className="font-semibold">
                        #{item.id} | {item.license_number_encrypted || "Sem número"} | Class {item.license_class || "-"}
                      </p>
                      <p>Current: {item.is_current ? "yes" : "no"} | Active: {item.active ? "yes" : "no"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNjMode("edit");
                          setEditingNjId(item.id);
                          hydrateNjForm(item);
                        }}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNjMode("renew");
                          setEditingNjId(item.id);
                          hydrateNjForm(item);
                          setNjForm((prev) => ({ ...prev, is_current: true }));
                        }}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Renovar
                      </button>
                      <button
                        type="button"
                        onClick={() => void deactivateNj(item.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {selectedCustomer.nj_driver_licenses.length === 0 ? <p className="text-sm text-zinc-500">Sem NJ license.</p> : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Selecione um customer para gerenciar licenses.</p>
          )}

          <CollapsibleSection
            title="Formulário NJ license"
            subtitle="Criação, edição e renovação"
            defaultOpen={njMode !== "create"}
          >
            <form onSubmit={(event) => void submitNj(event)} className="grid gap-3 sm:grid-cols-2">
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
                      onChange={() => toggleNjEndorsement(item)}
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
                      onChange={() => toggleNjRestriction(item)}
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
              Marcar como licença atual
            </label>

            {njError ? <p className="text-sm text-red-600 sm:col-span-2">{njError}</p> : null}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={savingNj || !selectedCustomerId}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {savingNj ? "Salvando..." : njMode === "create" ? "Adicionar NJ license" : njMode === "edit" ? "Salvar NJ license" : "Renovar NJ license"}
              </button>
            </div>
            </form>
          </CollapsibleSection>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Brazil Driver Licenses</h3>
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
                        onClick={() => {
                          setBrMode("edit");
                          setEditingBrId(item.id);
                          hydrateBrazilForm(item);
                        }}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBrMode("renew");
                          setEditingBrId(item.id);
                          hydrateBrazilForm(item);
                          setBrForm((prev) => ({ ...prev, is_current: true }));
                        }}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Renovar
                      </button>
                      <button
                        type="button"
                        onClick={() => void deactivateBrazil(item.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {selectedCustomer.brazil_driver_licenses.length === 0 ? (
                <p className="text-sm text-zinc-500">Sem CNH Brasil.</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Selecione um customer para gerenciar CNH Brasil.</p>
          )}

          <CollapsibleSection
            title="Formulário CNH Brasil"
            subtitle="Criação, edição e renovação"
            defaultOpen={brMode !== "create"}
          >
            <form onSubmit={(event) => void submitBrazil(event)} className="grid gap-3 sm:grid-cols-2">
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
              Marcar como licença atual
            </label>
            {brError ? <p className="text-sm text-red-600 sm:col-span-2">{brError}</p> : null}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={savingBr || !selectedCustomerId}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {savingBr ? "Salvando..." : brMode === "create" ? "Adicionar CNH Brasil" : brMode === "edit" ? "Salvar CNH Brasil" : "Renovar CNH Brasil"}
              </button>
            </div>
            </form>
          </CollapsibleSection>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
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
                        onClick={() => {
                          setPassportMode("edit");
                          setEditingPassportId(item.id);
                          hydratePassportForm(item);
                        }}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPassportMode("renew");
                          setEditingPassportId(item.id);
                          hydratePassportForm(item);
                          setPassportForm((prev) => ({ ...prev, is_current: true }));
                        }}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        Renovar
                      </button>
                      <button
                        type="button"
                        onClick={() => void deactivatePassport(item.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {selectedCustomer.passports.length === 0 ? <p className="text-sm text-zinc-500">Sem passaporte.</p> : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Selecione um customer para gerenciar passaportes.</p>
          )}

          <CollapsibleSection
            title="Formulário passaporte"
            subtitle="Criação, edição e renovação"
            defaultOpen={passportMode !== "create"}
          >
            <form onSubmit={(event) => void submitPassport(event)} className="grid gap-3 sm:grid-cols-2">
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
              Marcar como passaporte atual
            </label>
            {passportError ? <p className="text-sm text-red-600 sm:col-span-2">{passportError}</p> : null}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={savingPassport || !selectedCustomerId}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {savingPassport
                  ? "Salvando..."
                  : passportMode === "create"
                    ? "Adicionar passaporte"
                    : passportMode === "edit"
                      ? "Salvar passaporte"
                      : "Renovar passaporte"}
              </button>
            </div>
            </form>
          </CollapsibleSection>
        </section>
      </main>
    </div>
  );
}
