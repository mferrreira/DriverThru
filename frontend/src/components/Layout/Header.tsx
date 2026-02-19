import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import logo from "../../assets/LOGO.png";
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
    active ? "bg-linear-to-r from-sky-700 to-blue-700 text-white shadow-sm" : "text-slate-700 hover:bg-sky-50",
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
    <header className="sticky top-0 z-30 border-b border-sky-100/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="DriverThru logo" className="h-10 w-10 object-contain" />
          <div>
            <p className="text-sm font-semibold leading-4 text-slate-900">DriverThru</p>
            <p className="text-xs text-slate-500">NJMVC Operations</p>
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
            <p className="text-sm font-medium text-slate-800">{user?.username}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{user?.role}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Sign out
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
