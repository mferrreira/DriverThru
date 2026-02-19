import { Link } from "react-router-dom";
import { FileText, FileUp, IdCard, Users } from "lucide-react";

export default function Home() {
  const actions = [
    {
      label: "Customer Manager",
      to: "/customers",
      description: "Create and update customer records.",
      icon: Users,
    },
    {
      label: "Generate BA-208",
      to: "/documents?template=ba208",
      description: "Prepare permit/license form quickly.",
      icon: IdCard,
    },
    {
      label: "Generate Affidavit",
      to: "/documents?template=affidavit",
      description: "Fill affidavit template with saved data.",
      icon: FileText,
    },
    {
      label: "Export Reports",
      to: "/reports",
      description: "Download CSV exports for operations.",
      icon: FileUp,
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <section className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">What do you need today?</h1>
          <p className="mt-3 text-sm text-slate-500">
            Search customers, jump into document generation, and export reports quickly.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition group-hover:border-blue-200 group-hover:text-blue-700">
                <action.icon className="h-5 w-5" />
              </div>
              <p className="text-base font-semibold text-slate-900 group-hover:text-blue-800">{action.label}</p>
              <p className="text-xs leading-relaxed text-slate-500">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
