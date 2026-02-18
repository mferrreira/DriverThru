import { useState } from "react";

import { apiFetch } from "../../lib/api";
import { Button } from "../ui/button";

type ReportType = "all_customers" | "expiring_3_months";

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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Export operational data in CSV format.</p>
      </header>

      {error ? <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</section> : null}

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">All Customers</h2>
          <p className="mt-1 text-sm text-slate-600">Exports all active customers, including addresses, licenses, and passport data.</p>
          <Button className="mt-4 w-full" onClick={() => downloadCsv("all_customers")} disabled={loading !== null}>
            {loading === "all_customers" ? "Generating..." : "Download full customers CSV"}
          </Button>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Expiring Licenses (3 months)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Exports customers whose current NJ or Brazil driver license expires within the next 3 months.
          </p>
          <Button className="mt-4 w-full" onClick={() => downloadCsv("expiring_3_months")} disabled={loading !== null}>
            {loading === "expiring_3_months" ? "Generating..." : "Download expiring licenses CSV"}
          </Button>
        </article>
      </section>
    </div>
  );
}
