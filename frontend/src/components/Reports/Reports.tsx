export default function Reports() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500">Consolidated customer exports in CSV/TXT format.</p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-700">Reserved area for period/expiration filters and export actions.</p>
      </section>
    </div>
  );
}
