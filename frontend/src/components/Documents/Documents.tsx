import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { apiFetch } from "../../lib/api";

type CustomerListItem = {
  id: number;
  first_name: string;
  last_name: string;
};

type CustomerListResponse = {
  items: CustomerListItem[];
};

type TemplateInfo = {
  key: "affidavit" | "ba208";
  file_name: string;
};

type TemplateFieldsResponse = {
  fields: string[];
};

type LicenseItem = {
  id: number;
  license_number_encrypted?: string | null;
  registry_number?: string | null;
  expiration_date: string | null;
  is_current: boolean;
  active: boolean;
};

type PassportItem = {
  id: number;
  passport_number_encrypted: string;
  expiration_date: string | null;
  is_current: boolean;
  active: boolean;
};

type CustomerDocumentContext = {
  id: number;
  nj_driver_licenses: LicenseItem[];
  brazil_driver_licenses: LicenseItem[];
  passports: PassportItem[];
};

type PrefillDocumentResponse = {
  template_key: "affidavit" | "ba208";
  prefilled_fields: Record<string, string>;
};

type GenerateDocumentResponse = {
  template_key: "affidavit" | "ba208";
  bucket: string;
  object_key: string;
  generated_at: string;
  matched_fields: number;
  total_template_fields: number;
};

type GeneratedDocumentItem = {
  bucket: string;
  object_key: string;
  file_name: string;
  customer_id: number | null;
  template_key: "affidavit" | "ba208" | null;
  generated_at: string | null;
  last_modified: string | null;
  size_bytes: number | null;
};

type GeneratedDocumentListResponse = {
  items: GeneratedDocumentItem[];
  total: number;
};

const ba208SelectAllOptions = [
  { key: "Check Box2.0", label: "Standard License or Non-Driver ID" },
  { key: "Check Box2.1", label: "Real ID License or Non-Driver ID" },
  { key: "Check Box2.2", label: "Motorcycle" },
  { key: "Check Box2.3", label: "Boat" },
  { key: "Check Box2.4", label: "Moped" },
  { key: "Check Box2.5", label: "Agricultural" },
] as const;

function customerLabel(customer: CustomerListItem): string {
  return `${customer.id} - ${customer.first_name} ${customer.last_name}`.trim();
}

export default function Documents() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templateFields, setTemplateFields] = useState<string[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [templateKey, setTemplateKey] = useState<"" | "affidavit" | "ba208">("");
  const [customerContext, setCustomerContext] = useState<CustomerDocumentContext | null>(null);
  const [licenseType, setLicenseType] = useState<"none" | "nj" | "br">("none");
  const [selectedLicenseId, setSelectedLicenseId] = useState("");
  const [selectedPassportId, setSelectedPassportId] = useState("");
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [loadingCustomerContext, setLoadingCustomerContext] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loadingGenerated, setLoadingGenerated] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedDocumentItem[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateDocumentResponse | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const [customersResponse, templatesResponse] = await Promise.all([
          apiFetch("/customers?size=100"),
          apiFetch("/documents/templates"),
        ]);

        if (!customersResponse.ok) {
          throw new Error(`Failed to load customers: ${customersResponse.status}`);
        }
        if (!templatesResponse.ok) {
          throw new Error(`Failed to load templates: ${templatesResponse.status}`);
        }

        const customersData = (await customersResponse.json()) as CustomerListResponse;
        const templatesData = (await templatesResponse.json()) as TemplateInfo[];
        setCustomers(customersData.items);
        setTemplates(templatesData);

        if (customersData.items.length > 0) {
          setCustomerId(String(customersData.items[0].id));
        }
        if (templatesData.length > 0) {
          setTemplateKey(templatesData[0].key);
        }
      } catch {
        setError("Não foi possível carregar clientes/templates.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  useEffect(() => {
    async function loadCustomerContext() {
      if (!customerId) {
        setCustomerContext(null);
        setLicenseType("none");
        setSelectedLicenseId("");
        setSelectedPassportId("");
        return;
      }
      setLoadingCustomerContext(true);
      setError(null);
      try {
        const response = await apiFetch(`/customers/${customerId}`);
        if (!response.ok) {
          throw new Error(`Failed to load customer context: ${response.status}`);
        }
        const data = (await response.json()) as CustomerDocumentContext;
        setCustomerContext(data);

        const preferredNj = data.nj_driver_licenses.find((item) => item.active && item.is_current) ?? data.nj_driver_licenses.find((item) => item.active);
        const preferredBr = data.brazil_driver_licenses.find((item) => item.active && item.is_current) ?? data.brazil_driver_licenses.find((item) => item.active);
        const preferredPassport = data.passports.find((item) => item.active && item.is_current) ?? data.passports.find((item) => item.active);

        if (preferredNj) {
          setLicenseType("nj");
          setSelectedLicenseId(String(preferredNj.id));
        } else if (preferredBr) {
          setLicenseType("br");
          setSelectedLicenseId(String(preferredBr.id));
        } else {
          setLicenseType("none");
          setSelectedLicenseId("");
        }

        setSelectedPassportId(preferredPassport ? String(preferredPassport.id) : "");
      } catch {
        setError("Não foi possível carregar licenses/passaporte do customer.");
      } finally {
        setLoadingCustomerContext(false);
      }
    }

    void loadCustomerContext();
  }, [customerId]);

  useEffect(() => {
    async function loadFields() {
      if (!templateKey) {
        setTemplateFields([]);
        setFieldOverrides({});
        return;
      }
      setLoadingFields(true);
      setError(null);
      try {
        const response = await apiFetch(`/documents/templates/${templateKey}/fields`);
        if (!response.ok) {
          throw new Error(`Failed to load fields: ${response.status}`);
        }
        const data = (await response.json()) as TemplateFieldsResponse;
        setTemplateFields(data.fields);
        setFieldOverrides((prev) => {
          const next: Record<string, string> = {};
          for (const key of data.fields) {
            if (prev[key]) {
              next[key] = prev[key];
            }
          }
          return next;
        });
      } catch {
        setError("Não foi possível carregar os campos do template.");
      } finally {
        setLoadingFields(false);
      }
    }

    void loadFields();
  }, [templateKey]);

  async function loadGeneratedDocuments() {
    setLoadingGenerated(true);
    try {
      const params = new URLSearchParams();
      if (customerId) {
        params.set("customer_id", customerId);
      }
      if (templateKey) {
        params.set("template_key", templateKey);
      }
      params.set("limit", "200");
      const response = await apiFetch(`/documents/generated?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load generated docs: ${response.status}`);
      }
      const data = (await response.json()) as GeneratedDocumentListResponse;
      setGeneratedItems(data.items);
    } catch {
      setGeneratedItems([]);
    } finally {
      setLoadingGenerated(false);
    }
  }

  useEffect(() => {
    void loadGeneratedDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, templateKey]);

  async function applyPrefill() {
    if (!customerId || !templateKey) {
      return;
    }
    setPrefilling(true);
    setError(null);
    try {
      const payload = {
        customer_id: Number(customerId),
        template_key: templateKey,
        nj_driver_license_id: licenseType === "nj" && selectedLicenseId ? Number(selectedLicenseId) : null,
        brazil_driver_license_id: licenseType === "br" && selectedLicenseId ? Number(selectedLicenseId) : null,
        passport_id: selectedPassportId ? Number(selectedPassportId) : null,
      };

      const response = await apiFetch("/documents/prefill", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to prefill: ${response.status}`);
      }
      const data = (await response.json()) as PrefillDocumentResponse;
      setFieldOverrides(data.prefilled_fields);
    } catch {
      setError("Não foi possível pré-preencher os campos.");
    } finally {
      setPrefilling(false);
    }
  }

  useEffect(() => {
    if (!templateKey || !customerId) {
      return;
    }
    if (loadingCustomerContext || loadingFields) {
      return;
    }
    void applyPrefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, templateKey, licenseType, selectedLicenseId, selectedPassportId, loadingCustomerContext, loadingFields]);

  const matchedInfo = useMemo(() => {
    if (!result) {
      return null;
    }
    return `${result.matched_fields}/${result.total_template_fields}`;
  }, [result]);

  function setOverrideValue(fieldName: string, value: string) {
    setFieldOverrides((prev) => {
      const next = { ...prev };
      if (value.trim() === "") {
        delete next[fieldName];
      } else {
        next[fieldName] = value;
      }
      return next;
    });
  }

  function getOverride(fieldName: string): string {
    return fieldOverrides[fieldName] ?? "";
  }

  function setBa208Checkbox(fieldName: string, checked: boolean) {
    setOverrideValue(fieldName, checked ? "Yes" : "Off");
  }

  function setBa208DocumentType(value: "Permit" | "Non-Driver ID" | "Driver License") {
    setOverrideValue("Check Box1", value);
  }

  function setBa208Question(fieldName: "Check Box3" | "Check Box4", value: "Yes" | "No") {
    setOverrideValue(fieldName, value);
  }

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    if (!customerId || !templateKey) {
      setError("Selecione cliente e template.");
      return;
    }
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const response = await apiFetch("/documents/generate", {
        method: "POST",
        body: JSON.stringify({
          customer_id: Number(customerId),
          template_key: templateKey,
          nj_driver_license_id: licenseType === "nj" && selectedLicenseId ? Number(selectedLicenseId) : null,
          brazil_driver_license_id: licenseType === "br" && selectedLicenseId ? Number(selectedLicenseId) : null,
          passport_id: selectedPassportId ? Number(selectedPassportId) : null,
          field_overrides: fieldOverrides,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to generate document: ${response.status}`);
      }
      const data = (await response.json()) as GenerateDocumentResponse;
      setResult(data);
      await loadGeneratedDocuments();
    } catch {
      setError("Falha ao gerar documento.");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadByObjectKey(objectKey: string, fallbackFilename: string) {
    setDownloading(true);
    setError(null);
    try {
      const query = encodeURIComponent(objectKey);
      const response = await apiFetch(`/documents/download?object_key=${query}`);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] ?? fallbackFilename;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Falha ao baixar o documento.");
    } finally {
      setDownloading(false);
    }
  }

  async function onDownload() {
    if (!result?.object_key) {
      return;
    }
    const fallbackFilename = `${result.template_key}.pdf`;
    await downloadByObjectKey(result.object_key, fallbackFilename);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Documents</h1>
        <p className="text-sm text-zinc-500">Geração de BA-208 e Affidavit com dados do customer + overrides.</p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <form onSubmit={(event) => void onGenerate(event)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Customer
              <select
                disabled={loading}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="">Select</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {customerLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Template
              <select
                disabled={loading}
                value={templateKey}
                onChange={(event) => setTemplateKey(event.target.value as "affidavit" | "ba208")}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="">Select</option>
                {templates.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.key} ({item.file_name})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Tipo de license
              <select
                disabled={loadingCustomerContext || !customerContext}
                value={licenseType}
                onChange={(event) => {
                  const nextType = event.target.value as "none" | "nj" | "br";
                  setLicenseType(nextType);
                  setSelectedLicenseId("");
                }}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="none">Sem seleção</option>
                <option value="nj">NJ Driver License</option>
                <option value="br">Brazil Driver License</option>
              </select>
            </label>

            <label className="text-sm">
              License selecionada
              <select
                disabled={loadingCustomerContext || licenseType === "none"}
                value={selectedLicenseId}
                onChange={(event) => setSelectedLicenseId(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="">Selecionar</option>
                {licenseType === "nj"
                  ? (customerContext?.nj_driver_licenses ?? [])
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.id} | {item.license_number_encrypted || "Sem número"} {item.is_current ? "(current)" : ""}
                        </option>
                      ))
                  : null}
                {licenseType === "br"
                  ? (customerContext?.brazil_driver_licenses ?? [])
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.id} | {item.registry_number || "Sem registro"} {item.is_current ? "(current)" : ""}
                        </option>
                      ))
                  : null}
              </select>
            </label>

            <label className="text-sm sm:col-span-2">
              Passaporte (opcional)
              <select
                disabled={loadingCustomerContext}
                value={selectedPassportId}
                onChange={(event) => setSelectedPassportId(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="">Sem seleção</option>
                {(customerContext?.passports ?? [])
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.id} | {item.passport_number_encrypted} {item.is_current ? "(current)" : ""}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {templateKey === "ba208" ? (
            <details className="rounded-lg border border-zinc-200 p-3" open>
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800">BA-208 overrides guiados</summary>
              <div className="mt-3 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    NJ Driver License or NonDriver ID Number
                    <input
                      value={getOverride("NJ Driver License or NonDriver ID Number")}
                      onChange={(event) => setOverrideValue("NJ Driver License or NonDriver ID Number", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Social Security Number or ITIN
                    <input
                      value={getOverride("Social Security Number or ITIN")}
                      onChange={(event) => setOverrideValue("Social Security Number or ITIN", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    First Name
                    <input
                      value={getOverride("First Name")}
                      onChange={(event) => setOverrideValue("First Name", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Middle Name
                    <input
                      value={getOverride("Middle Name")}
                      onChange={(event) => setOverrideValue("Middle Name", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Last Name
                    <input
                      value={getOverride("Last Name")}
                      onChange={(event) => setOverrideValue("Last Name", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Suffix
                    <input
                      value={getOverride("Suffix")}
                      onChange={(event) => setOverrideValue("Suffix", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    Mailing City
                    <input
                      value={getOverride("City")}
                      onChange={(event) => setOverrideValue("City", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Mailing State
                    <input
                      value={getOverride("State")}
                      onChange={(event) => setOverrideValue("State", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Mailing Zip
                    <input
                      value={getOverride("Zip")}
                      onChange={(event) => setOverrideValue("Zip", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Mailing County
                    <input
                      value={getOverride("County")}
                      onChange={(event) => setOverrideValue("County", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Residential City
                    <input
                      value={getOverride("City_2")}
                      onChange={(event) => setOverrideValue("City_2", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Residential State
                    <input
                      value={getOverride("State_2")}
                      onChange={(event) => setOverrideValue("State_2", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Residential Zip
                    <input
                      value={getOverride("Zip_2")}
                      onChange={(event) => setOverrideValue("Zip_2", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Residential County
                    <input
                      value={getOverride("County_2")}
                      onChange={(event) => setOverrideValue("County_2", event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>

                <fieldset className="rounded-md border border-zinc-200 p-3">
                  <legend className="px-1 text-xs font-semibold text-zinc-700">Document Type (selecionar 1)</legend>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    {(["Permit", "Non-Driver ID", "Driver License"] as const).map((option) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name="ba208-document-type"
                          checked={getOverride("Check Box1") === option}
                          onChange={() => setBa208DocumentType(option)}
                          className="mr-2"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="rounded-md border border-zinc-200 p-3">
                  <legend className="px-1 text-xs font-semibold text-zinc-700">Select All That Apply (múltiplos)</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
                    {ba208SelectAllOptions.map((option) => (
                      <label key={option.key}>
                        <input
                          type="checkbox"
                          checked={getOverride(option.key) === "Yes"}
                          onChange={(event) => setBa208Checkbox(option.key, event.target.checked)}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="rounded-md border border-zinc-200 p-3">
                  <legend className="px-1 text-xs font-semibold text-zinc-700">Question 1 (selecionar 1)</legend>
                  <div className="mt-2 flex gap-4 text-sm">
                    {(["Yes", "No"] as const).map((option) => (
                      <label key={`q1-${option}`}>
                        <input
                          type="radio"
                          name="ba208-question-1"
                          checked={getOverride("Check Box3") === option}
                          onChange={() => setBa208Question("Check Box3", option)}
                          className="mr-2"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="rounded-md border border-zinc-200 p-3">
                  <legend className="px-1 text-xs font-semibold text-zinc-700">Question 2 (selecionar 1)</legend>
                  <div className="mt-2 flex gap-4 text-sm">
                    {(["Yes", "No"] as const).map((option) => (
                      <label key={`q2-${option}`}>
                        <input
                          type="radio"
                          name="ba208-question-2"
                          checked={getOverride("Check Box4") === option}
                          onChange={() => setBa208Question("Check Box4", option)}
                          className="mr-2"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <details className="rounded-md border border-zinc-200 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
                    Ajustes avançados (campos raw do PDF)
                  </summary>
                  <div className="mt-3 grid max-h-80 gap-3 overflow-auto pr-1 sm:grid-cols-2">
                    {loadingFields ? <p className="text-sm text-zinc-500">Carregando campos...</p> : null}
                    {!loadingFields && templateFields.length === 0 ? (
                      <p className="text-sm text-zinc-500">Template sem campos detectados.</p>
                    ) : null}
                    {templateFields.map((fieldName) => (
                      <label key={fieldName} className="text-xs">
                        {fieldName}
                        <input
                          value={fieldOverrides[fieldName] ?? ""}
                          onChange={(event) => setOverrideValue(fieldName, event.target.value)}
                          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </details>
          ) : (
            <details className="rounded-lg border border-zinc-200 p-3" open>
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                Field overrides ({templateFields.length} campos)
              </summary>
              <div className="mt-3 grid max-h-80 gap-3 overflow-auto pr-1 sm:grid-cols-2">
                {loadingFields ? <p className="text-sm text-zinc-500">Carregando campos...</p> : null}
                {!loadingFields && templateFields.length === 0 ? (
                  <p className="text-sm text-zinc-500">Template sem campos detectados.</p>
                ) : null}
                {templateFields.map((fieldName) => (
                  <label key={fieldName} className="text-xs">
                    {fieldName}
                    <input
                      value={fieldOverrides[fieldName] ?? ""}
                      onChange={(event) => setOverrideValue(fieldName, event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
            </details>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={prefilling || !customerId || !templateKey}
              onClick={() => void applyPrefill()}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {prefilling ? "Pré-preenchendo..." : "Reaplicar pré-preenchimento"}
            </button>
            <button
              type="submit"
              disabled={generating || !customerId || !templateKey}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {generating ? "Gerando..." : "Gerar documento"}
            </button>

            <button
              type="button"
              disabled={!result || downloading}
              onClick={() => void onDownload()}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {downloading ? "Baixando..." : "Baixar PDF"}
            </button>
          </div>
        </form>
      </section>

      {result ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Resultado</h2>
          <div className="mt-2 space-y-1 text-sm text-zinc-700">
            <p>
              <span className="font-medium">Template:</span> {result.template_key}
            </p>
            <p>
              <span className="font-medium">Objeto:</span> {result.object_key}
            </p>
            <p>
              <span className="font-medium">Campos preenchidos:</span> {matchedInfo}
            </p>
            <p>
              <span className="font-medium">Gerado em:</span> {new Date(result.generated_at).toLocaleString()}
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">PDFs já gerados</h2>
          <button
            type="button"
            onClick={() => void loadGeneratedDocuments()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Atualizar
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Lista filtrada por customer/template selecionados. Baixe sem precisar gerar de novo.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2 font-medium">Arquivo</th>
                <th className="px-2 py-2 font-medium">Customer</th>
                <th className="px-2 py-2 font-medium">Template</th>
                <th className="px-2 py-2 font-medium">Gerado em</th>
                <th className="px-2 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingGenerated ? (
                <tr>
                  <td className="px-2 py-3 text-zinc-500" colSpan={5}>
                    Carregando documentos...
                  </td>
                </tr>
              ) : null}
              {!loadingGenerated && generatedItems.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-zinc-500" colSpan={5}>
                    Nenhum PDF encontrado para o filtro atual.
                  </td>
                </tr>
              ) : null}
              {!loadingGenerated
                ? generatedItems.map((item) => (
                    <tr key={item.object_key} className="border-b border-zinc-100">
                      <td className="px-2 py-2 text-zinc-800">{item.file_name}</td>
                      <td className="px-2 py-2 text-zinc-700">{item.customer_id ?? "-"}</td>
                      <td className="px-2 py-2 text-zinc-700">{item.template_key ?? "-"}</td>
                      <td className="px-2 py-2 text-zinc-700">
                        {item.generated_at ? new Date(item.generated_at).toLocaleString() : item.last_modified ? new Date(item.last_modified).toLocaleString() : "-"}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          disabled={downloading}
                          onClick={() => void downloadByObjectKey(item.object_key, item.file_name)}
                          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                        >
                          Baixar
                        </button>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
