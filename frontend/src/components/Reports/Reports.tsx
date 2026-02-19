import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../lib/api";
import { formatDateTimeUS } from "../../lib/utils";

type ReportType = "all_customers" | "expiring_3_months";
type PendingItem = {
  customer_id: number;
  customer_name: string;
  document_type: "nj_driver_license" | "brazil_driver_license" | "passport";
  source_document_id: number;
  expiration_date: string;
  days_until_expiration: number;
  notified: boolean;
  notified_at: string | null;
};
type PendingResponse = {
  items: PendingItem[];
};

function extractFileName(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }
  const match = contentDisposition.match(/filename="([^"]+)"/i);
  return match?.[1] ?? fallback;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [loading, setLoading] = useState<ReportType | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRows, setPendingRows] = useState<PendingItem[]>([]);

  useEffect(() => {
    async function loadExpiringRows() {
      setLoadingTable(true);
      try {
        const response = await apiFetch("/dashboard/pending?days_ahead=90&include_notified=true");
        if (!response.ok) {
          throw new Error(`Failed to load pending rows: ${response.status}`);
        }
        const data = (await response.json()) as PendingResponse;
        setPendingRows(
          data.items.filter(
            (item) => item.document_type === "nj_driver_license" || item.document_type === "brazil_driver_license",
          ),
        );
      } catch {
        setPendingRows([]);
      } finally {
        setLoadingTable(false);
      }
    }
    void loadExpiringRows();
  }, []);

  async function downloadCsv(reportType: ReportType) {
    setLoading(reportType);
    setError(null);
    try {
      const path = reportType === "all_customers" ? "/reports/customers.csv" : "/reports/licenses-expiring.csv?months_ahead=3";
      const response = await apiFetch(path, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Failed to export report: ${response.status}`);
      }
      const blob = await response.blob();
      const fallback = reportType === "all_customers" ? "customers_full_export.csv" : "licenses_expiring_3m.csv";
      const fileName = extractFileName(response.headers.get("Content-Disposition"), fallback);
      triggerDownload(blob, fileName);
    } catch {
      setError("Could not generate the report. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const groupedLicenseTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of pendingRows) {
      const key = item.document_type === "nj_driver_license" ? "NJ Driver License" : "Brazil Driver License";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [pendingRows]);

  const expiringThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return pendingRows.filter((item) => {
      const d = new Date(item.expiration_date);
      return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [pendingRows]);

  function rowTypeLabel(item: PendingItem): string {
    return item.document_type === "nj_driver_license" ? "NJ License" : "Brazil License";
  }

  function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return formatDateTimeUS(date).split(",")[0];
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Generate and export comprehensive reports.</p>
      </header>

      {error ? <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</section> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="text-2xl font-semibold text-slate-900">Export Options</h2>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => void downloadCsv("all_customers")}
              disabled={loading !== null}
              className="inline-flex w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-3 text-left text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {loading === "all_customers" ? "Generating..." : "Full Report (CSV)"}
              </span>
              <span className="text-emerald-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M6 2h9l5 5v15H6zM15 2v5h5M8 11h8M8 15h8M8 19h8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            <button
              type="button"
              onClick={() => void downloadCsv("expiring_3_months")}
              disabled={loading !== null}
              className="inline-flex w-full items-center justify-between rounded-xl border border-slate-300 px-3 py-3 text-left text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M12 8v5l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {loading === "expiring_3_months" ? "Generating..." : "Expiring Soon (CSV)"}
              </span>
              <span className="text-orange-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M9 11h6m-6 4h4M7 3h10l4 4v14H7zM17 3v4h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-2xl font-semibold text-slate-900">Quick Stats</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">License Types</p>
              <div className="mt-2 space-y-1 text-sm">
                {groupedLicenseTypes.length === 0 ? <p className="text-slate-500">No expiring licenses.</p> : null}
                {groupedLicenseTypes.map(([label, total]) => (
                  <div key={label} className="flex items-center justify-between text-slate-700">
                    <span>{label}</span>
                    <span className="font-semibold text-slate-900">{total}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">This Month</p>
              <p className="mt-2 text-4xl font-semibold leading-none text-slate-900">{expiringThisMonth}</p>
              <p className="mt-2 text-sm text-slate-500">licenses expiring this month</p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Expiring Licenses (Next 3 Months)</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">License #</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Expiry date</th>
                <th className="px-3 py-2.5 font-medium">Days left</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    Loading expiring licenses...
                  </td>
                </tr>
              ) : null}
              {!loadingTable && pendingRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    No expiring licenses in the next 3 months.
                  </td>
                </tr>
              ) : null}
              {!loadingTable
                ? pendingRows.map((item) => (
                    <tr key={`${item.document_type}:${item.source_document_id}`} className="border-b border-slate-100">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-900">{item.customer_name}</p>
                        <p className="text-xs text-slate-500">Customer #{item.customer_id}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">#{item.source_document_id}</td>
                      <td className="px-3 py-2.5 text-slate-700">{rowTypeLabel(item)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatDate(item.expiration_date)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            item.days_until_expiration <= 7
                              ? "bg-red-100 text-red-700"
                              : item.days_until_expiration <= 21
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700",
                          ].join(" ")}
                        >
                          {item.days_until_expiration} days
                        </span>
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
