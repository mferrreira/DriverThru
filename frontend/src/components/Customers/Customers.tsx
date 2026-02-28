import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FileText, IdCard, UserRound, Wrench, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiFetch } from "../../lib/api";
import {
  defaultBrazilForm,
  defaultNJForm,
  defaultPassportForm,
  formatDateForForm,
  normalizeDate,
  normalizeString,
} from "./formUtils";
import { useCustomerCoreWithOptions } from "./hooks/useCustomerCore";
import BrazilLicensesSection from "./sections/BrazilLicensesSection";
import CustomerCoreSection from "./sections/CustomerCoreSection";
import NJLicensesSection from "./sections/NJLicensesSection";
import PassportsSection from "./sections/PassportsSection";
import CustomerActionsSection from "./sections/CustomerActionsSection";
import type {
  BrazilDriverLicense,
  BrazilForm,
  CustomerForm,
  NJDriverLicense,
  NJEndorsement,
  NJForm,
  NJRestriction,
  Passport,
  PassportForm,
} from "./types";

type OCRCustomerFormPayload = Partial<{
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  phone_number: string | null;
  email: string | null;
  date_of_birth: string | null;
  has_left_country: boolean | null;
  has_no_ssn: boolean | null;
  ssn_encrypted: string | null;
  gender: CustomerForm["gender"] | null;
  eye_color: CustomerForm["eye_color"] | null;
  weight_lbs: string | null;
  height_feet: string | null;
  height_inches: string | null;
}>;

type OCRPassportFormPayload = Partial<PassportForm>;
type OCRBrazilFormPayload = Partial<BrazilForm>;
type OCRNjFormPayload = Partial<NJForm>;

type OCRPassportPrefillApiResponse = {
  apply_customer_fields: boolean;
  customer_form: OCRCustomerFormPayload;
  passport_form: OCRPassportFormPayload;
  warnings?: string[];
  ocr_meta?: OCROperationMetaPayload | null;
};

type OCRBrazilPrefillApiResponse = {
  apply_customer_fields: boolean;
  customer_form: OCRCustomerFormPayload;
  brazil_form: OCRBrazilFormPayload;
  warnings?: string[];
  ocr_meta?: OCROperationMetaPayload | null;
};

type OCRNjPrefillApiResponse = {
  apply_customer_fields: boolean;
  customer_form: OCRCustomerFormPayload;
  nj_form: OCRNjFormPayload;
  warnings?: string[];
  ocr_meta?: OCROperationMetaPayload | null;
};

type OCROperationMetaPayload = Partial<{
  provider: string;
  model: string | null;
  duration_ms: number | null;
  estimated_cost_usd: number | null;
  usage: Partial<{
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
  }> | null;
}>;

type StagedDocumentFileApiResponse = {
  object_key: string;
  file_name: string;
  content_type: string;
};

type EditorTab = "customer" | "passport" | "nj" | "br" | "actions";

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
  const [editorTab, setEditorTab] = useState<EditorTab>("customer");
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Record<string, true>>({});
  const [ocrInfo, setOcrInfo] = useState<Record<"customer" | "nj" | "br" | "passport", string | null>>({
    customer: null,
    nj: null,
    br: null,
    passport: null,
  });
  const [uploadingNjFile, setUploadingNjFile] = useState(false);
  const [deletingNjFile, setDeletingNjFile] = useState(false);
  const [njFileError, setNjFileError] = useState<string | null>(null);
  const [njStagedFileObjectKey, setNjStagedFileObjectKey] = useState<string | null>(null);
  const [useNjPrefillOnUpload, setUseNjPrefillOnUpload] = useState(false);
  const [uploadingBrFile, setUploadingBrFile] = useState(false);
  const [deletingBrFile, setDeletingBrFile] = useState(false);
  const [brFileError, setBrFileError] = useState<string | null>(null);
  const [brStagedFileObjectKey, setBrStagedFileObjectKey] = useState<string | null>(null);
  const [useBrPrefillOnUpload, setUseBrPrefillOnUpload] = useState(false);
  const [uploadingPassportFile, setUploadingPassportFile] = useState(false);
  const [deletingPassportFile, setDeletingPassportFile] = useState(false);
  const [passportFileError, setPassportFileError] = useState<string | null>(null);
  const [passportStagedFileObjectKey, setPassportStagedFileObjectKey] = useState<string | null>(null);
  const [usePassportPrefillOnUpload, setUsePassportPrefillOnUpload] = useState(false);

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

  function buildDocumentFileUrl(path: string, objectKey: string | null): string | null {
    if (!objectKey) return null;
    return `/api${path}?k=${encodeURIComponent(objectKey)}`;
  }

  function buildStagedDocumentFileUrl(path: string, objectKey: string | null): string | null {
    if (!objectKey) return null;
    return `/api${path}?object_key=${encodeURIComponent(objectKey)}`;
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
    setNjFileError(null);
    setNjStagedFileObjectKey(null);
    setUseNjPrefillOnUpload(false);

    setBrMode("create");
    setBrForm(defaultBrazilForm());
    setEditingBrId(null);
    setBrError(null);
    setBrFileError(null);
    setBrStagedFileObjectKey(null);
    setUseBrPrefillOnUpload(false);

    setPassportMode("create");
    setPassportForm(defaultPassportForm());
    setEditingPassportId(null);
    setPassportError(null);
    setPassportFileError(null);
    setPassportStagedFileObjectKey(null);
    setUsePassportPrefillOnUpload(false);
    setEditorTab("customer");
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

  function startEditNj(item: NJDriverLicense) {
    setNjMode("edit");
    setEditingNjId(item.id);
    setNjStagedFileObjectKey(null);
    hydrateNjForm(item);
  }

  function startRenewNj(item: NJDriverLicense) {
    setNjMode("renew");
    setEditingNjId(item.id);
    setNjStagedFileObjectKey(null);
    hydrateNjForm(item);
    setNjForm((prev) => ({ ...prev, is_current: true }));
  }

  function startCreateNj() {
    setNjMode("create");
    setEditingNjId(null);
    setNjError(null);
    setNjFileError(null);
    setNjStagedFileObjectKey(null);
    setNjForm(defaultNJForm());
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
        ...(njMode !== "edit" && njStagedFileObjectKey ? { staged_document_file_object_key: njStagedFileObjectKey } : {}),
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
      setNjStagedFileObjectKey(null);
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

  function startEditBrazil(item: BrazilDriverLicense) {
    setBrMode("edit");
    setEditingBrId(item.id);
    setBrStagedFileObjectKey(null);
    hydrateBrazilForm(item);
  }

  function startRenewBrazil(item: BrazilDriverLicense) {
    setBrMode("renew");
    setEditingBrId(item.id);
    setBrStagedFileObjectKey(null);
    hydrateBrazilForm(item);
    setBrForm((prev) => ({ ...prev, is_current: true }));
  }

  function startCreateBrazil() {
    setBrMode("create");
    setEditingBrId(null);
    setBrError(null);
    setBrFileError(null);
    setBrStagedFileObjectKey(null);
    setBrForm(defaultBrazilForm());
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
        ...(brMode !== "edit" && brStagedFileObjectKey ? { staged_document_file_object_key: brStagedFileObjectKey } : {}),
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
      setBrStagedFileObjectKey(null);
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

  function startEditPassport(item: Passport) {
    setPassportMode("edit");
    setEditingPassportId(item.id);
    setPassportStagedFileObjectKey(null);
    hydratePassportForm(item);
  }

  function startRenewPassport(item: Passport) {
    setPassportMode("renew");
    setEditingPassportId(item.id);
    setPassportStagedFileObjectKey(null);
    hydratePassportForm(item);
    setPassportForm((prev) => ({ ...prev, is_current: true }));
  }

  function startCreatePassport() {
    setPassportMode("create");
    setEditingPassportId(null);
    setPassportError(null);
    setPassportFileError(null);
    setPassportStagedFileObjectKey(null);
    setPassportForm(defaultPassportForm());
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
        ...(passportMode !== "edit" && passportStagedFileObjectKey
          ? { staged_document_file_object_key: passportStagedFileObjectKey }
          : {}),
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
      setPassportStagedFileObjectKey(null);
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
    setEditorTab("customer");
    setEditorOpen(true);
  }

  async function openEditDialog(customerId: number) {
    await handleSelectCustomer(customerId);
    setEditorTab("customer");
    setEditorOpen(true);
  }

  function openDocumentGeneratorWithTemplate(customerId: number, template: "affidavit" | "ba208") {
    navigate(`/documents?customerId=${customerId}&template=${template}`);
  }

  const currentNjRecord =
    editingNjId && selectedCustomer ? selectedCustomer.nj_driver_licenses.find((item) => item.id === editingNjId) ?? null : null;
  const currentBrRecord =
    editingBrId && selectedCustomer ? selectedCustomer.brazil_driver_licenses.find((item) => item.id === editingBrId) ?? null : null;
  const currentPassportRecord =
    editingPassportId && selectedCustomer ? selectedCustomer.passports.find((item) => item.id === editingPassportId) ?? null : null;

  const currentNjFileUrl =
    selectedCustomerId && editingNjId
      ? buildDocumentFileUrl(
          `/customers/${selectedCustomerId}/nj-driver-licenses/${editingNjId}/file`,
          currentNjRecord?.document_file_object_key ?? null,
        )
      : null;
  const currentBrFileUrl =
    selectedCustomerId && editingBrId
      ? buildDocumentFileUrl(
          `/customers/${selectedCustomerId}/brazil-driver-licenses/${editingBrId}/file`,
          currentBrRecord?.document_file_object_key ?? null,
        )
      : null;
  const currentPassportFileUrl =
    selectedCustomerId && editingPassportId
      ? buildDocumentFileUrl(
          `/customers/${selectedCustomerId}/passports/${editingPassportId}/file`,
          currentPassportRecord?.document_file_object_key ?? null,
        )
      : null;

  async function postOcrPrefill<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiFetch(path, { method: "POST", body: formData });
    if (!response.ok) {
      let message = `OCR request failed: ${response.status}`;
      try {
        const payload = (await response.json()) as { detail?: unknown };
        if (typeof payload.detail === "string" && payload.detail.trim()) {
          message = payload.detail;
        }
      } catch {
        // Keep fallback message.
      }
      throw new Error(message);
    }
    return (await response.json()) as T;
  }

  function formatOcrMeta(meta?: OCROperationMetaPayload | null): string | null {
    if (!meta) return null;
    const parts: string[] = [];
    if (typeof meta.duration_ms === "number") {
      parts.push(`Time: ${(meta.duration_ms / 1000).toFixed(meta.duration_ms >= 1000 ? 2 : 3)}s`);
    }
    if (typeof meta.estimated_cost_usd === "number") {
      parts.push(`Cost: $${meta.estimated_cost_usd.toFixed(4)}`);
    }
    const totalTokens = meta.usage?.total_tokens;
    if (typeof totalTokens === "number") {
      parts.push(`Tokens: ${totalTokens}`);
    } else {
      const inTok = meta.usage?.input_tokens;
      const outTok = meta.usage?.output_tokens;
      if (typeof inTok === "number" || typeof outTok === "number") {
        parts.push(`Tokens: ${inTok ?? 0}/${outTok ?? 0}`);
      }
    }
    if (meta.model) {
      parts.push(`Model: ${meta.model}`);
    }
    if (parts.length === 0 && meta.provider) {
      parts.push(`Provider: ${meta.provider}`);
    }
    return parts.length ? `Last OCR: ${parts.join(" • ")}` : null;
  }

  function alertError(message: string) {
    window.alert(message);
  }

  function applyCustomerFormPatch(patch: OCRCustomerFormPayload) {
    setCustomerForm((prev) => ({
      ...prev,
      first_name: patch.first_name && patch.first_name.trim() ? patch.first_name : prev.first_name,
      middle_name: patch.middle_name && patch.middle_name.trim() ? patch.middle_name : prev.middle_name,
      last_name: patch.last_name && patch.last_name.trim() ? patch.last_name : prev.last_name,
      suffix: patch.suffix && patch.suffix.trim() ? patch.suffix : prev.suffix,
      phone_number: patch.phone_number && patch.phone_number.trim() ? patch.phone_number : prev.phone_number,
      email: patch.email && patch.email.trim() ? patch.email : prev.email,
      date_of_birth: patch.date_of_birth && patch.date_of_birth.trim() ? formatDateForForm(patch.date_of_birth) : prev.date_of_birth,
      has_left_country: typeof patch.has_left_country === "boolean" ? patch.has_left_country : prev.has_left_country,
      has_no_ssn: typeof patch.has_no_ssn === "boolean" ? patch.has_no_ssn : prev.has_no_ssn,
      ssn_encrypted: patch.ssn_encrypted && patch.ssn_encrypted.trim() ? patch.ssn_encrypted : prev.ssn_encrypted,
      gender: patch.gender ?? prev.gender,
      eye_color: patch.eye_color ?? prev.eye_color,
      weight_lbs: patch.weight_lbs && patch.weight_lbs.trim() ? patch.weight_lbs : prev.weight_lbs,
      height_feet: patch.height_feet && patch.height_feet.trim() ? patch.height_feet : prev.height_feet,
      height_inches: patch.height_inches && patch.height_inches.trim() ? patch.height_inches : prev.height_inches,
    }));
  }

  function applyPassportFormPatch(patch: OCRPassportFormPayload) {
    setPassportForm((prev) => ({
      ...prev,
      document_type: patch.document_type && patch.document_type.trim() ? patch.document_type : prev.document_type,
      issuing_country: patch.issuing_country && patch.issuing_country.trim() ? patch.issuing_country : prev.issuing_country,
      passport_number_encrypted:
        patch.passport_number_encrypted && patch.passport_number_encrypted.trim()
          ? patch.passport_number_encrypted
          : prev.passport_number_encrypted,
      surname: patch.surname && patch.surname.trim() ? patch.surname : prev.surname,
      given_name: patch.given_name && patch.given_name.trim() ? patch.given_name : prev.given_name,
      middle_name: patch.middle_name && patch.middle_name.trim() ? patch.middle_name : prev.middle_name,
      father_name: patch.father_name && patch.father_name.trim() ? patch.father_name : prev.father_name,
      mother_name: patch.mother_name && patch.mother_name.trim() ? patch.mother_name : prev.mother_name,
      nationality: patch.nationality && patch.nationality.trim() ? patch.nationality : prev.nationality,
      birth_place: patch.birth_place && patch.birth_place.trim() ? patch.birth_place : prev.birth_place,
      issue_date: patch.issue_date && patch.issue_date.trim() ? patch.issue_date : prev.issue_date,
      expiration_date: patch.expiration_date && patch.expiration_date.trim() ? patch.expiration_date : prev.expiration_date,
      issuing_authority:
        patch.issuing_authority && patch.issuing_authority.trim() ? patch.issuing_authority : prev.issuing_authority,
      is_current: typeof patch.is_current === "boolean" ? patch.is_current : prev.is_current,
    }));
  }

  function applyBrazilFormPatch(patch: OCRBrazilFormPayload) {
    setBrForm((prev) => ({
      ...prev,
      full_name: patch.full_name && patch.full_name.trim() ? patch.full_name : prev.full_name,
      identity_number: patch.identity_number && patch.identity_number.trim() ? patch.identity_number : prev.identity_number,
      issuing_agency: patch.issuing_agency && patch.issuing_agency.trim() ? patch.issuing_agency : prev.issuing_agency,
      issuing_state: patch.issuing_state && patch.issuing_state.trim() ? patch.issuing_state : prev.issuing_state,
      cpf_encrypted: patch.cpf_encrypted && patch.cpf_encrypted.trim() ? patch.cpf_encrypted : prev.cpf_encrypted,
      father_name: patch.father_name && patch.father_name.trim() ? patch.father_name : prev.father_name,
      mother_name: patch.mother_name && patch.mother_name.trim() ? patch.mother_name : prev.mother_name,
      category: patch.category && patch.category.trim() ? patch.category : prev.category,
      registry_number: patch.registry_number && patch.registry_number.trim() ? patch.registry_number : prev.registry_number,
      expiration_date: patch.expiration_date && patch.expiration_date.trim() ? patch.expiration_date : prev.expiration_date,
      first_license_date:
        patch.first_license_date && patch.first_license_date.trim() ? patch.first_license_date : prev.first_license_date,
      observations: patch.observations && patch.observations.trim() ? patch.observations : prev.observations,
      issue_place: patch.issue_place && patch.issue_place.trim() ? patch.issue_place : prev.issue_place,
      issue_date: patch.issue_date && patch.issue_date.trim() ? patch.issue_date : prev.issue_date,
      paper_number: patch.paper_number && patch.paper_number.trim() ? patch.paper_number : prev.paper_number,
      issue_code: patch.issue_code && patch.issue_code.trim() ? patch.issue_code : prev.issue_code,
      is_current: typeof patch.is_current === "boolean" ? patch.is_current : prev.is_current,
    }));
  }

  function applyNjFormPatch(patch: OCRNjFormPayload) {
    setNjForm((prev) => ({
      ...prev,
      license_number_encrypted:
        patch.license_number_encrypted && patch.license_number_encrypted.trim()
          ? patch.license_number_encrypted
          : prev.license_number_encrypted,
      issue_date: patch.issue_date && patch.issue_date.trim() ? patch.issue_date : prev.issue_date,
      expiration_date: patch.expiration_date && patch.expiration_date.trim() ? patch.expiration_date : prev.expiration_date,
      license_class: patch.license_class && patch.license_class.trim()
        ? (patch.license_class as NJForm["license_class"])
        : prev.license_class,
      endorsements: Array.isArray(patch.endorsements) && patch.endorsements.length > 0
        ? (patch.endorsements as NJForm["endorsements"])
        : prev.endorsements,
      restrictions: Array.isArray(patch.restrictions) && patch.restrictions.length > 0
        ? (patch.restrictions as NJForm["restrictions"])
        : prev.restrictions,
      is_current: typeof patch.is_current === "boolean" ? patch.is_current : prev.is_current,
    }));
  }

  async function applyNjOcrFromFile(file: File) {
    try {
      setNjError(null);
      const data = await postOcrPrefill<OCRNjPrefillApiResponse>("/ocr/prefill/nj-license-form", file);
      setOcrInfo((prev) => ({ ...prev, nj: formatOcrMeta(data.ocr_meta) }));
      const payload = (data as OCRNjPrefillApiResponse & Record<string, unknown>).nj_form
        ?? ((data as Record<string, unknown>).nj_license_fields as OCRNjFormPayload | undefined)
        ?? ((data as Record<string, unknown>).document_fields as OCRNjFormPayload | undefined)
        ?? {};
      applyNjFormPatch(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not apply NJ OCR prefill.";
      setNjError(null);
      alertError(message);
    }
  }

  async function applyBrazilOcrFromFile(file: File) {
    try {
      setBrError(null);
      const data = await postOcrPrefill<OCRBrazilPrefillApiResponse>("/ocr/prefill/brazil-license-form", file);
      setOcrInfo((prev) => ({ ...prev, br: formatOcrMeta(data.ocr_meta) }));
      const payload = (data as OCRBrazilPrefillApiResponse & Record<string, unknown>).brazil_form
        ?? ((data as Record<string, unknown>).brazil_license_fields as OCRBrazilFormPayload | undefined)
        ?? ((data as Record<string, unknown>).document_fields as OCRBrazilFormPayload | undefined)
        ?? {};
      applyBrazilFormPatch(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not apply Brazil license OCR prefill.";
      setBrError(null);
      alertError(message);
    }
  }

  async function applyPassportOcrFromFile(file: File) {
    try {
      setPassportError(null);
      const data = await postOcrPrefill<OCRPassportPrefillApiResponse>("/ocr/prefill/passport-form", file);
      setOcrInfo((prev) => ({ ...prev, passport: formatOcrMeta(data.ocr_meta) }));
      if (data.apply_customer_fields) {
        const customerPayload = (data as OCRPassportPrefillApiResponse & Record<string, unknown>).customer_form
          ?? ((data as Record<string, unknown>).customer_fields as OCRCustomerFormPayload | undefined)
          ?? {};
        applyCustomerFormPatch(customerPayload);
      }
      const passportPayload = (data as OCRPassportPrefillApiResponse & Record<string, unknown>).passport_form
        ?? ((data as Record<string, unknown>).passport_fields as OCRPassportFormPayload | undefined)
        ?? ((data as Record<string, unknown>).document_fields as OCRPassportFormPayload | undefined)
        ?? {};
      applyPassportFormPatch(passportPayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not apply passport OCR prefill.";
      setPassportError(null);
      alertError(message);
    }
  }

  async function uploadRecordFile(path: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiFetch(path, { method: "POST", body: formData });
    if (!response.ok) {
      let message = `Failed to upload file: ${response.status}`;
      try {
        const data = (await response.json()) as { detail?: string };
        if (data.detail) message = data.detail;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
  }

  async function uploadStagedFile(path: string, file: File): Promise<StagedDocumentFileApiResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiFetch(path, { method: "POST", body: formData });
    if (!response.ok) {
      let message = `Failed to upload staged file: ${response.status}`;
      try {
        const data = (await response.json()) as { detail?: string };
        if (data.detail) message = data.detail;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    return (await response.json()) as StagedDocumentFileApiResponse;
  }

  async function deleteRecordFile(path: string): Promise<void> {
    const response = await apiFetch(path, { method: "DELETE" });
    if (!response.ok) {
      let message = `Failed to delete file: ${response.status}`;
      try {
        const data = (await response.json()) as { detail?: string };
        if (data.detail) message = data.detail;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
  }

  async function deleteStagedFile(path: string, objectKey: string): Promise<void> {
    const response = await apiFetch(`${path}?object_key=${encodeURIComponent(objectKey)}`, { method: "DELETE" });
    if (!response.ok) {
      let message = `Failed to delete staged file: ${response.status}`;
      try {
        const data = (await response.json()) as { detail?: string };
        if (data.detail) message = data.detail;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
  }

  async function handleUploadNjFile(file: File) {
    if (!selectedCustomerId) {
      setNjFileError(null);
      alertError("Create/select a customer first.");
      return;
    }
    setUploadingNjFile(true);
    setNjFileError(null);
    try {
      if (njMode === "edit" && editingNjId) {
        await uploadRecordFile(`/customers/${selectedCustomerId}/nj-driver-licenses/${editingNjId}/file`, file);
        await handleSelectCustomer(selectedCustomerId);
        if (useNjPrefillOnUpload) {
          await applyNjOcrFromFile(file);
        }
      } else {
        const staged = await uploadStagedFile(`/customers/${selectedCustomerId}/nj-driver-licenses/staged-file`, file);
        setNjStagedFileObjectKey(staged.object_key);
        if (useNjPrefillOnUpload) {
          await applyNjOcrFromFile(file);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload NJ license file.";
      setNjFileError(null);
      alertError(message);
    } finally {
      setUploadingNjFile(false);
    }
  }

  async function handleDeleteNjFile() {
    if (!selectedCustomerId) {
      setNjFileError(null);
      alertError("Select a customer first.");
      return;
    }
    if (!window.confirm("Delete this NJ license file?")) return;
    setDeletingNjFile(true);
    setNjFileError(null);
    try {
      if (njMode === "edit" && editingNjId) {
        await deleteRecordFile(`/customers/${selectedCustomerId}/nj-driver-licenses/${editingNjId}/file`);
        await handleSelectCustomer(selectedCustomerId);
      } else if (njStagedFileObjectKey) {
        await deleteStagedFile(`/customers/${selectedCustomerId}/nj-driver-licenses/staged-file`, njStagedFileObjectKey);
        setNjStagedFileObjectKey(null);
      } else {
        setNjFileError(null);
        alertError("No staged NJ license file to delete.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete NJ license file.";
      setNjFileError(null);
      alertError(message);
    } finally {
      setDeletingNjFile(false);
    }
  }

  async function handleUploadBrFile(file: File) {
    if (!selectedCustomerId) {
      setBrFileError(null);
      alertError("Create/select a customer first.");
      return;
    }
    setUploadingBrFile(true);
    setBrFileError(null);
    try {
      if (brMode === "edit" && editingBrId) {
        await uploadRecordFile(`/customers/${selectedCustomerId}/brazil-driver-licenses/${editingBrId}/file`, file);
        await handleSelectCustomer(selectedCustomerId);
        if (useBrPrefillOnUpload) {
          await applyBrazilOcrFromFile(file);
        }
      } else {
        const staged = await uploadStagedFile(`/customers/${selectedCustomerId}/brazil-driver-licenses/staged-file`, file);
        setBrStagedFileObjectKey(staged.object_key);
        if (useBrPrefillOnUpload) {
          await applyBrazilOcrFromFile(file);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload Brazil license file.";
      setBrFileError(null);
      alertError(message);
    } finally {
      setUploadingBrFile(false);
    }
  }

  async function handleDeleteBrFile() {
    if (!selectedCustomerId) {
      setBrFileError(null);
      alertError("Select a customer first.");
      return;
    }
    if (!window.confirm("Delete this Brazil license file?")) return;
    setDeletingBrFile(true);
    setBrFileError(null);
    try {
      if (brMode === "edit" && editingBrId) {
        await deleteRecordFile(`/customers/${selectedCustomerId}/brazil-driver-licenses/${editingBrId}/file`);
        await handleSelectCustomer(selectedCustomerId);
      } else if (brStagedFileObjectKey) {
        await deleteStagedFile(`/customers/${selectedCustomerId}/brazil-driver-licenses/staged-file`, brStagedFileObjectKey);
        setBrStagedFileObjectKey(null);
      } else {
        setBrFileError(null);
        alertError("No staged Brazil license file to delete.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete Brazil license file.";
      setBrFileError(null);
      alertError(message);
    } finally {
      setDeletingBrFile(false);
    }
  }

  async function handleUploadPassportFile(file: File) {
    if (!selectedCustomerId) {
      setPassportFileError(null);
      alertError("Create/select a customer first.");
      return;
    }
    setUploadingPassportFile(true);
    setPassportFileError(null);
    try {
      if (passportMode === "edit" && editingPassportId) {
        await uploadRecordFile(`/customers/${selectedCustomerId}/passports/${editingPassportId}/file`, file);
        await handleSelectCustomer(selectedCustomerId);
        if (usePassportPrefillOnUpload) {
          await applyPassportOcrFromFile(file);
        }
      } else {
        const staged = await uploadStagedFile(`/customers/${selectedCustomerId}/passports/staged-file`, file);
        setPassportStagedFileObjectKey(staged.object_key);
        if (usePassportPrefillOnUpload) {
          await applyPassportOcrFromFile(file);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload passport file.";
      setPassportFileError(null);
      alertError(message);
    } finally {
      setUploadingPassportFile(false);
    }
  }

  async function handleDeletePassportFile() {
    if (!selectedCustomerId) {
      setPassportFileError(null);
      alertError("Select a customer first.");
      return;
    }
    if (!window.confirm("Delete this passport file?")) return;
    setDeletingPassportFile(true);
    setPassportFileError(null);
    try {
      if (passportMode === "edit" && editingPassportId) {
        await deleteRecordFile(`/customers/${selectedCustomerId}/passports/${editingPassportId}/file`);
        await handleSelectCustomer(selectedCustomerId);
      } else if (passportStagedFileObjectKey) {
        await deleteStagedFile(`/customers/${selectedCustomerId}/passports/staged-file`, passportStagedFileObjectKey);
        setPassportStagedFileObjectKey(null);
      } else {
        setPassportFileError(null);
        alertError("No staged passport file to delete.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete passport file.";
      setPassportFileError(null);
      alertError(message);
    } finally {
      setDeletingPassportFile(false);
    }
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
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-slate-500">
                    Loading customers...
                  </td>
                </tr>
              ) : null}
              {!loadingList && customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : null}
              {!loadingList
                ? customers.map((customer) => {
                    const photoUrl = buildCustomerPhotoUrl(customer.id, customer.customer_photo_object_key);
                    const showPhoto = Boolean(photoUrl && !failedPhotoUrls[photoUrl]);
                    return (
                      <tr
                        key={customer.id}
                        className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                        onClick={() => void openEditDialog(customer.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void openEditDialog(customer.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${customer.first_name} ${customer.last_name}`}
                      >
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
          <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
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

            <div className="min-h-0 flex-1">
              <div className="grid h-full gap-4 md:grid-cols-[230px_1fr]">
                <aside className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sections</p>
                  <nav className="space-y-1">
                    {[
                      { key: "customer" as const, label: "Customer", icon: UserRound },
                      { key: "passport" as const, label: "Passports", icon: FileText },
                      { key: "nj" as const, label: "NJ License", icon: IdCard },
                      { key: "br" as const, label: "BR License", icon: IdCard },
                      { key: "actions" as const, label: "Actions", icon: Wrench },
                    ].map((item) => {
                      const active = editorTab === item.key;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setEditorTab(item.key)}
                          className={[
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                            active
                              ? "border border-blue-200 bg-blue-50 text-blue-800"
                              : "border border-transparent text-slate-700 hover:bg-white",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>
                </aside>

                <div className="min-h-0 overflow-y-auto pr-1">
                  {editorTab === "customer" ? (
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
                      ocrInfo={ocrInfo.customer}
                    />
                  ) : null}

                  {editorTab === "nj" ? (
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
                      onStartEdit={startEditNj}
                      onStartRenew={startRenewNj}
                      onStartCreate={startCreateNj}
                      onToggleEndorsement={toggleNjEndorsement}
                      onToggleRestriction={toggleNjRestriction}
                      ocrInfo={ocrInfo.nj}
                      fileRecordId={njMode === "edit" ? editingNjId : null}
                      fileObjectKey={njMode === "edit" ? currentNjRecord?.document_file_object_key ?? null : njStagedFileObjectKey}
                      fileUrl={
                        njMode === "edit"
                          ? currentNjFileUrl
                          : selectedCustomerId
                            ? buildStagedDocumentFileUrl(
                                `/customers/${selectedCustomerId}/nj-driver-licenses/staged-file`,
                                njStagedFileObjectKey,
                              )
                            : null
                      }
                      uploadingFile={uploadingNjFile}
                      deletingFile={deletingNjFile}
                      fileError={njFileError}
                      onUploadFile={(file) => void handleUploadNjFile(file)}
                      onDeleteFile={() => void handleDeleteNjFile()}
                      usePrefillOnUpload={useNjPrefillOnUpload}
                      onToggleUsePrefillOnUpload={setUseNjPrefillOnUpload}
                    />
                  ) : null}

                  {editorTab === "br" ? (
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
                      onStartEdit={startEditBrazil}
                      onStartRenew={startRenewBrazil}
                      onStartCreate={startCreateBrazil}
                      ocrInfo={ocrInfo.br}
                      fileRecordId={brMode === "edit" ? editingBrId : null}
                      fileObjectKey={brMode === "edit" ? currentBrRecord?.document_file_object_key ?? null : brStagedFileObjectKey}
                      fileUrl={
                        brMode === "edit"
                          ? currentBrFileUrl
                          : selectedCustomerId
                            ? buildStagedDocumentFileUrl(
                                `/customers/${selectedCustomerId}/brazil-driver-licenses/staged-file`,
                                brStagedFileObjectKey,
                              )
                            : null
                      }
                      uploadingFile={uploadingBrFile}
                      deletingFile={deletingBrFile}
                      fileError={brFileError}
                      onUploadFile={(file) => void handleUploadBrFile(file)}
                      onDeleteFile={() => void handleDeleteBrFile()}
                      usePrefillOnUpload={useBrPrefillOnUpload}
                      onToggleUsePrefillOnUpload={setUseBrPrefillOnUpload}
                    />
                  ) : null}

                  {editorTab === "passport" ? (
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
                      onStartEdit={startEditPassport}
                      onStartRenew={startRenewPassport}
                      onStartCreate={startCreatePassport}
                      ocrInfo={ocrInfo.passport}
                      fileRecordId={passportMode === "edit" ? editingPassportId : null}
                      fileObjectKey={
                        passportMode === "edit" ? currentPassportRecord?.document_file_object_key ?? null : passportStagedFileObjectKey
                      }
                      fileUrl={
                        passportMode === "edit"
                          ? currentPassportFileUrl
                          : selectedCustomerId
                            ? buildStagedDocumentFileUrl(
                                `/customers/${selectedCustomerId}/passports/staged-file`,
                                passportStagedFileObjectKey,
                              )
                            : null
                      }
                      uploadingFile={uploadingPassportFile}
                      deletingFile={deletingPassportFile}
                      fileError={passportFileError}
                      onUploadFile={(file) => void handleUploadPassportFile(file)}
                      onDeleteFile={() => void handleDeletePassportFile()}
                      usePrefillOnUpload={usePassportPrefillOnUpload}
                      onToggleUsePrefillOnUpload={setUsePassportPrefillOnUpload}
                    />
                  ) : null}

                  {editorTab === "actions" ? (
                    <CustomerActionsSection
                      selectedCustomerId={selectedCustomerId}
                      customerForm={customerForm}
                      onOpenAffidavit={() => {
                        if (!selectedCustomerId) return;
                        openDocumentGeneratorWithTemplate(selectedCustomerId, "affidavit");
                      }}
                      onOpenBa208={() => {
                        if (!selectedCustomerId) return;
                        openDocumentGeneratorWithTemplate(selectedCustomerId, "ba208");
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
