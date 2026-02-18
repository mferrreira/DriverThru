import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../../lib/api";

type DashboardSummary = {
  customers_total: number;
  documents_generated_today: number;
  expiring_in_30_days: number;
  expiring_today: number;
};

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
  total: number;
  pending_count: number;
  notified_count: number;
};

const quickActions = [
  { label: "New customer", to: "/customers", style: "from-sky-600 to-blue-700" },
  { label: "Generate BA-208", to: "/documents", style: "from-emerald-500 to-teal-600" },
  { label: "Generate Affidavit", to: "/documents", style: "from-indigo-600 to-blue-700" },
  { label: "Export report", to: "/reports", style: "from-amber-500 to-orange-600" },
];

export default function Home() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pending, setPending] = useState<PendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [daysAhead, setDaysAhead] = useState(30);
  const [includeNotified, setIncludeNotified] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPending(filters?: { daysAhead?: number; includeNotified?: boolean }) {
    const nextDaysAhead = filters?.daysAhead ?? daysAhead;
    const nextIncludeNotified = filters?.includeNotified ?? includeNotified;
    const pendingResponse = await apiFetch(
      `/dashboard/pending?days_ahead=${nextDaysAhead}&include_notified=${nextIncludeNotified}`,
    );
    if (!pendingResponse.ok) {
      throw new Error(`Failed to load pending items: ${pendingResponse.status}`);
    }
    setPending((await pendingResponse.json()) as PendingResponse);
  }

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, pendingResponse] = await Promise.all([
          apiFetch("/dashboard/summary"),
          apiFetch("/dashboard/pending?days_ahead=30&include_notified=true"),
        ]);
        if (!summaryResponse.ok) {
          throw new Error(`Failed to load dashboard summary: ${summaryResponse.status}`);
        }
        if (!pendingResponse.ok) {
          throw new Error(`Failed to load pending items: ${pendingResponse.status}`);
        }
        setSummary((await summaryResponse.json()) as DashboardSummary);
        setPending((await pendingResponse.json()) as PendingResponse);
      } catch {
        setError("Could not load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  useEffect(() => {
    async function reloadPendingByFilter() {
      try {
        await loadPending();
      } catch {
        setError("Could not refresh pending items.");
      }
    }
    void reloadPendingByFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysAhead, includeNotified]);

  async function toggleNotification(item: PendingItem) {
    const key = `${item.document_type}:${item.source_document_id}`;
    setUpdatingKey(key);
    try {
      const response = await apiFetch("/dashboard/pending/notify", {
        method: "POST",
        body: JSON.stringify({
          customer_id: item.customer_id,
          document_type: item.document_type,
          source_document_id: item.source_document_id,
          expiration_date: item.expiration_date,
          notified: !item.notified,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update notification: ${response.status}`);
      }
      await loadPending();
    } catch {
      setError("Could not update notification status.");
    } finally {
      setUpdatingKey(null);
    }
  }

  function pendingDetail(item: PendingItem): string {
    const label =
      item.document_type === "passport"
        ? "Passport"
        : item.document_type === "nj_driver_license"
          ? "NJ DL"
          : "Brazil DL";
    if (item.days_until_expiration < 0) {
      return `${label} expired ${Math.abs(item.days_until_expiration)} days`;
    }
    if (item.days_until_expiration === 0) {
      return `${label} expires today`;
    }
    return `${label} expires in ${item.days_until_expiration} days`;
  }

  const metrics = [
    {
      label: "Registered customers",
      value: summary?.customers_total ?? 0,
      tone: "text-slate-900",
      chip: "bg-sky-50 text-sky-700 ring-sky-200",
    },
    {
      label: "Docs generated today",
      value: summary?.documents_generated_today ?? 0,
      tone: "text-slate-900",
      chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    },
    {
      label: "Expiring in 30 days",
      value: summary?.expiring_in_30_days ?? 0,
      tone: "text-amber-700",
      chip: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    {
      label: "Expiring today",
      value: summary?.expiring_today ?? 0,
      tone: "text-red-700",
      chip: "bg-red-50 text-red-700 ring-red-200",
    },
  ];

  function pendingTone(item: PendingItem): string {
    if (item.days_until_expiration < 0) {
      return "bg-red-50 text-red-700 ring-red-200";
    }
    if (item.days_until_expiration === 0) {
      return "bg-amber-50 text-amber-700 ring-amber-200";
    }
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-linear-to-r from-slate-900 via-blue-900 to-sky-900 p-6 text-white shadow-lg shadow-blue-950/20">
        <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-sky-300/20 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.2em] text-sky-100/80">Operations Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold md:text-3xl">NJMVC operations overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-sky-100/90">
          Monitor customers, expiration tasks, and document generation in one dashboard.
        </p>
      </section>

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-slate-200/70 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
            <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${metric.chip}`}>
              {metric.label}
            </span>
            <p className={`mt-3 text-3xl font-semibold ${metric.tone}`}>
              {loading ? "..." : metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-500">Shortcuts for the most common daily tasks.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={`rounded-lg bg-linear-to-r ${action.style} px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">Priority pending items</h2>
          <p className="mt-1 text-sm text-slate-500">
            Documents near expiration or already expired. Pending: {pending?.pending_count ?? 0} | Notified:{" "}
            {pending?.notified_count ?? 0}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-xs text-zinc-600">
              Window
              <select
                value={daysAhead}
                onChange={(event) => setDaysAhead(Number(event.target.value))}
                className="ml-2 rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={includeNotified}
                onChange={(event) => setIncludeNotified(event.target.checked)}
                className="mr-2"
              />
              Include notified
            </label>
          </div>

          <ul className="mt-4 space-y-3">
            {(pending?.items ?? []).map((item) => {
              const key = `${item.document_type}:${item.source_document_id}`;
              return (
                <li key={key} className="rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.customer_name}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${pendingTone(item)}`}>
                        {pendingDetail(item)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={updatingKey === key}
                      onClick={() => void toggleNotification(item)}
                      className={[
                        "rounded-md px-3 py-1.5 text-xs font-semibold",
                        item.notified
                          ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
                          : "bg-linear-to-r from-sky-700 to-blue-700 text-white hover:brightness-110",
                      ].join(" ")}
                    >
                      {updatingKey === key
                        ? "Updating..."
                        : item.notified
                          ? "Mark as pending"
                          : "Mark as notified"}
                    </button>
                  </div>
                </li>
              );
            })}
            {!loading && (pending?.items.length ?? 0) === 0 ? (
              <li className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-600">
                No pending items found for the next {daysAhead} days.
              </li>
            ) : null}
          </ul>
        </article>
      </section>
    </div>
  );
}
