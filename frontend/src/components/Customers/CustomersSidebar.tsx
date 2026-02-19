import type { CustomerListItem } from "./types";
import { fullName } from "./formUtils";

type CustomersSidebarProps = {
  customers: CustomerListItem[];
  selectedCustomerId: number | null;
  loadingList: boolean;
  listError: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onCreateClick: () => void;
  onSelectCustomer: (customerId: number) => void;
};

export default function CustomersSidebar({
  customers,
  selectedCustomerId,
  loadingList,
  listError,
  search,
  onSearchChange,
  onSearchSubmit,
  onCreateClick,
  onSelectCustomer,
}: CustomersSidebarProps) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Manage customer records and licenses</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          onClick={onCreateClick}
        >
          + Add Customer
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        <label className="relative w-full">
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
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <button
          type="button"
          onClick={onSearchSubmit}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Search
        </button>
      </div>

      {listError ? <p className="mt-3 text-sm text-red-600">{listError}</p> : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[1.4fr_1fr_88px] border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          <span>Customer</span>
          <span>Contact</span>
          <span className="text-right">Status</span>
        </div>
      </div>

      <div className="max-h-[70vh] divide-y divide-slate-100 overflow-auto rounded-b-xl border-x border-b border-slate-200 pr-1">
        {loadingList ? <p className="px-4 py-3 text-sm text-zinc-500">Loading...</p> : null}
        {!loadingList && customers.length === 0 ? <p className="px-4 py-3 text-sm text-zinc-500">No customers found.</p> : null}
        {customers.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectCustomer(item.id)}
            className={[
              "grid w-full grid-cols-[1.4fr_1fr_88px] items-center px-4 py-3 text-left transition",
              selectedCustomerId === item.id
                ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                : "hover:bg-slate-50",
            ].join(" ")}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{fullName(item)}</p>
              <p className="text-xs text-slate-500">ID: {item.id}</p>
            </div>
            <p className="truncate pr-2 text-sm text-slate-600">{item.email || item.phone_number || "-"}</p>
            <span
              className={[
                "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600",
              ].join(" ")}
            >
              {item.active ? "active" : "inactive"}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
