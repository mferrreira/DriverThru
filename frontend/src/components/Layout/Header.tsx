import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import { Button } from "../ui/button";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Customers", to: "/customers" },
  { label: "Documents", to: "/documents" },
  { label: "Reports", to: "/reports" },
];

function linkClassName(active: boolean) {
  return [
    "px-3 py-2 text-sm rounded-md transition-colors",
    active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-200/70",
  ].join(" ");
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-zinc-900 text-xs font-bold text-white">
            DT
          </div>
          <div>
            <p className="text-sm font-semibold leading-4 text-zinc-900">DriverThru</p>
            <p className="text-xs text-zinc-500">NJMVC Operations</p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClassName(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-zinc-800">{user?.username}</p>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{user?.role}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Sair
          </Button>
        </div>
      </div>

      <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClassName(isActive)}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
