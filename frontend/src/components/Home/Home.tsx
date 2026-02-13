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
  { label: "Novo cliente", to: "/customers" },
  { label: "Gerar BA-208", to: "/documents" },
  { label: "Gerar Affidavit", to: "/documents" },
  { label: "Exportar relatório", to: "/reports" },
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
        setError("Não foi possível carregar os indicadores da dashboard.");
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
        setError("Não foi possível atualizar pendências.");
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
      setError("Não foi possível atualizar status de notificação.");
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
      return `${label} vencido há ${Math.abs(item.days_until_expiration)} dias`;
    }
    if (item.days_until_expiration === 0) {
      return `${label} vence hoje`;
    }
    return `${label} vence em ${item.days_until_expiration} dias`;
  }

  const metrics = [
    { label: "Clientes cadastrados", value: summary?.customers_total ?? 0, tone: "text-zinc-900" },
    { label: "Docs gerados hoje", value: summary?.documents_generated_today ?? 0, tone: "text-zinc-900" },
    { label: "Vencendo em 30 dias", value: summary?.expiring_in_30_days ?? 0, tone: "text-amber-700" },
    { label: "Vencendo hoje", value: summary?.expiring_today ?? 0, tone: "text-red-700" },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-linear-to-r from-zinc-900 to-zinc-700 p-6 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">Operations Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Visão geral da operação NJMVC</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-200">
          Monitore clientes, pendências de vencimento e geração de documentos em um único painel.
        </p>
      </section>

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{metric.label}</p>
            <p className={`mt-3 text-3xl font-semibold ${metric.tone}`}>
              {loading ? "..." : metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900">Ações rápidas</h2>
          <p className="mt-1 text-sm text-zinc-500">Atalhos para as tarefas mais usadas no dia a dia.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-zinc-900">Pendências prioritárias</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Documentos próximos do vencimento ou já vencidos. Pendentes: {pending?.pending_count ?? 0} | Notificados:{" "}
            {pending?.notified_count ?? 0}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-xs text-zinc-600">
              Janela
              <select
                value={daysAhead}
                onChange={(event) => setDaysAhead(Number(event.target.value))}
                className="ml-2 rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={includeNotified}
                onChange={(event) => setIncludeNotified(event.target.checked)}
                className="mr-2"
              />
              Incluir notificados
            </label>
          </div>

          <ul className="mt-4 space-y-3">
            {(pending?.items ?? []).map((item) => {
              const key = `${item.document_type}:${item.source_document_id}`;
              return (
                <li key={key} className="rounded-lg border border-zinc-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{item.customer_name}</p>
                      <p className="text-sm text-zinc-600">{pendingDetail(item)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={updatingKey === key}
                      onClick={() => void toggleNotification(item)}
                      className={[
                        "rounded-md px-3 py-1.5 text-xs font-semibold",
                        item.notified
                          ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                          : "bg-zinc-900 text-white hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      {updatingKey === key
                        ? "Atualizando..."
                        : item.notified
                          ? "Marcar pendente"
                          : "Marcar notificado"}
                    </button>
                  </div>
                </li>
              );
            })}
            {!loading && (pending?.items.length ?? 0) === 0 ? (
              <li className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-600">
                Nenhuma pendência encontrada para os próximos {daysAhead} dias.
              </li>
            ) : null}
          </ul>
        </article>
      </section>
    </div>
  );
}
