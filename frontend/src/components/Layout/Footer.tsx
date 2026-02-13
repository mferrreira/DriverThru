import { useAuth } from "../../auth/AuthProvider";

export default function Footer() {
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const env = import.meta.env.MODE;

  return (
    <footer className="mt-10 border-t border-zinc-200 bg-white/90">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
        <p>DriverThru · Internal Platform</p>
        <p>
          Environment: <span className="font-medium text-zinc-800">{env}</span>
        </p>
        <p>
          User: <span className="font-medium text-zinc-800">{user?.username ?? "-"}</span>
        </p>
      </div>
      <div className="border-t border-zinc-200/80 py-2 text-center text-xs text-zinc-500">
        © {year} DriverThru. All rights reserved.
      </div>
    </footer>
  );
}
