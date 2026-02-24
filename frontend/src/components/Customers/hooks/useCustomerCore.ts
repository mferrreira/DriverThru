import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Dispatch, SetStateAction } from "react";

import { apiFetch } from "../../../lib/api";
import {
  defaultCustomerForm,
  formatDateForForm,
  mapAddressForm,
  normalizeDate,
  normalizeEyeColor,
  normalizeString,
} from "../formUtils";
import type { AddressForm, AddressType, CustomerForm, CustomerListItem, CustomerListResponse, CustomerRead } from "../types";

type UseCustomerCoreResult = {
  customers: CustomerListItem[];
  search: string;
  setSearch: (value: string) => void;
  loadingList: boolean;
  listError: string | null;
  selectedCustomerId: number | null;
  selectedCustomer: CustomerRead | null;
  selectedCustomerName: string;
  customerForm: CustomerForm;
  setCustomerForm: Dispatch<SetStateAction<CustomerForm>>;
  customerMode: "create" | "edit";
  customerError: string | null;
  customerSuccess: string | null;
  savingCustomer: boolean;
  customerPhotoUrl: string | null;
  uploadingPhoto: boolean;
  deletingPhoto: boolean;
  photoError: string | null;
  loadCustomers: (queryOverride?: string, options?: { skipAutoSelect?: boolean }) => Promise<void>;
  handleSelectCustomer: (customerId: number) => Promise<void>;
  beginCreateCustomer: () => void;
  submitCustomer: (event: FormEvent) => Promise<void>;
  deactivateCustomer: (customerId: number) => Promise<void>;
  uploadCustomerPhoto: (file: File) => Promise<void>;
  deleteCustomerPhoto: () => Promise<void>;
};

export function useCustomerCore(): UseCustomerCoreResult {
  return useCustomerCoreWithOptions();
}

type UseCustomerCoreOptions = {
  skipInitialAutoSelect?: boolean;
};

export function useCustomerCoreWithOptions(options: UseCustomerCoreOptions = {}): UseCustomerCoreResult {
  const skipInitialAutoSelect = options.skipInitialAutoSelect ?? false;
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRead | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(defaultCustomerForm);
  const [customerMode, setCustomerMode] = useState<"create" | "edit">("create");
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerSuccess, setCustomerSuccess] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);

  const selectedCustomerName = useMemo(() => {
    if (!selectedCustomer) {
      return "";
    }
    return `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim();
  }, [selectedCustomer]);

  const customerPhotoUrl = useMemo(() => {
    if (!selectedCustomerId || !customerForm.customer_photo_object_key) {
      return null;
    }
    return `/api/customers/${selectedCustomerId}/photo?v=${photoVersion}`;
  }, [selectedCustomerId, customerForm.customer_photo_object_key, photoVersion]);

  useEffect(() => {
    void loadCustomers(undefined, { skipAutoSelect: skipInitialAutoSelect });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCustomers(queryOverride?: string, options?: { skipAutoSelect?: boolean }) {
    const skipAutoSelect = options?.skipAutoSelect ?? false;
    setLoadingList(true);
    setListError(null);
    try {
      const query = (queryOverride ?? search).trim();
      const suffix = query ? `?search=${encodeURIComponent(query)}` : "";
      const response = await apiFetch(`/customers${suffix}`);
      if (!response.ok) {
        throw new Error(`Failed to list customers: ${response.status}`);
      }
      const data = (await response.json()) as CustomerListResponse;
      setCustomers(data.items);
      if (!skipAutoSelect && !selectedCustomerId && data.items.length > 0) {
        await handleSelectCustomer(data.items[0].id);
      }
      if (selectedCustomerId && !data.items.some((item) => item.id === selectedCustomerId)) {
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
        setCustomerMode("create");
        setCustomerForm(defaultCustomerForm());
      }
    } catch {
      setListError("Could not load customers.");
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSelectCustomer(customerId: number) {
    setSelectedCustomerId(customerId);
    setCustomerError(null);
    setPhotoError(null);
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
        date_of_birth: formatDateForForm(data.date_of_birth),
        has_left_country: data.has_left_country,
        has_no_ssn: data.has_no_ssn,
        ssn_encrypted: data.ssn_encrypted ?? "",
        gender: data.gender ?? "",
        eye_color: normalizeEyeColor(data.eye_color) as CustomerForm["eye_color"],
        weight_lbs: data.weight_lbs ?? "",
        height_feet: data.height_feet?.toString() ?? "",
        height_inches: data.height_inches?.toString() ?? "",
        residential: mapAddressForm(data.addresses, "residential"),
        mailing: mapAddressForm(data.addresses, "mailing"),
        out_of_state: mapAddressForm(data.addresses, "out_of_state"),
      });
    } catch {
      setCustomerError("Could not load customer details.");
    }
  }

  function beginCreateCustomer() {
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setCustomerMode("create");
    setCustomerForm(defaultCustomerForm());
    setCustomerError(null);
    setCustomerSuccess(null);
    setPhotoError(null);
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
        throw new Error(`Address ${entry.type} is incomplete. Provide street/city/state/zip.`);
      }
      const normalizedState = entry.value.state.trim().toUpperCase();
      if (normalizedState.length !== 2) {
        throw new Error(`Address ${entry.type}: state must be 2 characters (e.g. NJ).`);
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
    setCustomerSuccess(null);

    try {
      const addresses = parseAddressesFromForm(customerForm);
      const normalizedWeight = customerForm.weight_lbs.replace(",", ".");
      const heightFeet = customerForm.height_feet ? Number(customerForm.height_feet) : null;
      const heightInches = customerForm.height_inches ? Number(customerForm.height_inches) : null;
      if (heightFeet !== null && (heightFeet < 0 || heightFeet > 8)) {
        throw new Error("Height (feet) must be between 0 and 8.");
      }
      if (heightInches !== null && (heightInches < 0 || heightInches > 11)) {
        throw new Error("Height (inches) must be between 0 and 11.");
      }
      const payload = {
        customer_photo_object_key: normalizeString(customerForm.customer_photo_object_key),
        first_name: customerForm.first_name.trim(),
        middle_name: normalizeString(customerForm.middle_name),
        last_name: customerForm.last_name.trim(),
        suffix: normalizeString(customerForm.suffix),
        phone_number: normalizeString(customerForm.phone_number),
        email: normalizeString(customerForm.email),
        date_of_birth: normalizeDate(customerForm.date_of_birth),
        has_left_country: customerForm.has_left_country,
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
      setCustomerSuccess(customerMode === "create" ? "Customer created successfully." : "Customer updated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save customer.";
      setCustomerError(message);
    } finally {
      setSavingCustomer(false);
    }
  }

  async function deactivateCustomer(customerId: number) {
    const ok = window.confirm("Deactivate this customer?");
    if (!ok) {
      return;
    }

    const response = await apiFetch(`/customers/${customerId}`, { method: "DELETE" });
    if (!response.ok) {
      setCustomerError("Could not deactivate customer.");
      return;
    }
    setSelectedCustomer(null);
    setSelectedCustomerId(null);
    setCustomerMode("create");
    setCustomerForm(defaultCustomerForm());
    setCustomerSuccess("Customer deactivated.");
    await loadCustomers();
  }

  async function uploadCustomerPhoto(file: File) {
    if (!selectedCustomerId) {
      setPhotoError("Create/select a customer before uploading a photo.");
      return;
    }
    setUploadingPhoto(true);
    setPhotoError(null);
    setCustomerSuccess(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch(`/customers/${selectedCustomerId}/photo`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        let backendMessage = `Failed to upload photo: ${response.status}`;
        try {
          const data = (await response.json()) as { detail?: unknown };
          if (typeof data.detail === "string") {
            backendMessage = data.detail;
          }
        } catch {
          // Keep default message.
        }
        throw new Error(backendMessage);
      }
      const updated = (await response.json()) as CustomerRead;
      setSelectedCustomer(updated);
      setCustomerForm((prev) => ({
        ...prev,
        customer_photo_object_key: updated.customer_photo_object_key ?? "",
      }));
      setPhotoVersion((prev) => prev + 1);
      setCustomerSuccess("Customer photo uploaded successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload customer photo.";
      setPhotoError(message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deleteCustomerPhoto() {
    if (!selectedCustomerId) {
      setPhotoError("Select a customer before deleting the photo.");
      return;
    }
    const ok = window.confirm("Delete this customer photo?");
    if (!ok) {
      return;
    }
    setDeletingPhoto(true);
    setPhotoError(null);
    setCustomerSuccess(null);
    try {
      const response = await apiFetch(`/customers/${selectedCustomerId}/photo`, {
        method: "DELETE",
      });
      if (!response.ok) {
        let backendMessage = `Failed to delete photo: ${response.status}`;
        try {
          const data = (await response.json()) as { detail?: unknown };
          if (typeof data.detail === "string") {
            backendMessage = data.detail;
          }
        } catch {
          // Keep default message.
        }
        throw new Error(backendMessage);
      }
      const updated = (await response.json()) as CustomerRead;
      setSelectedCustomer(updated);
      setCustomerForm((prev) => ({
        ...prev,
        customer_photo_object_key: updated.customer_photo_object_key ?? "",
      }));
      setPhotoVersion((prev) => prev + 1);
      setCustomerSuccess("Customer photo deleted successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete customer photo.";
      setPhotoError(message);
    } finally {
      setDeletingPhoto(false);
    }
  }

  return {
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
  };
}
