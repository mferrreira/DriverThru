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
    <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Customers</h1>
        <button
          type="button"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          onClick={onCreateClick}
        >
          New
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name/email/phone"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onSearchSubmit}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Search
        </button>
      </div>

      {listError ? <p className="mt-3 text-sm text-red-600">{listError}</p> : null}

      <div className="mt-4 max-h-[70vh] space-y-2 overflow-auto pr-1">
        {loadingList ? <p className="text-sm text-zinc-500">Loading...</p> : null}
        {!loadingList && customers.length === 0 ? <p className="text-sm text-zinc-500">No customers found.</p> : null}
        {customers.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectCustomer(item.id)}
            className={[
              "w-full rounded-lg border p-3 text-left transition",
              selectedCustomerId === item.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">{fullName(item)}</p>
            <p className={selectedCustomerId === item.id ? "text-xs text-zinc-200" : "text-xs text-zinc-500"}>
              {item.email || item.phone_number || "No contact info"}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}
