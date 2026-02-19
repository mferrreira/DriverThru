import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ArrowRight, Lock, User } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import logo from "../../assets/LOGO.png";

export default function Login() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ username, password });
    } catch {
      setError("Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-linear-to-b from-[#2f66ea] to-[#2450c4] px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-115 space-y-6 rounded-3xl bg-[#f3f4f6] px-7 py-8 shadow-[0_24px_60px_rgba(8,23,84,0.25)] sm:px-8"
      >
        <div className="space-y-3 text-center">
          <img src={logo} alt="DriverThru logo" className="mx-auto h-20 w-20 object-contain" />
          <h1 className="text-[40px] leading-none font-extrabold tracking-tight text-[#111827]">DriverThru</h1>
          <p className="text-[26px] font-semibold text-[#84888e]">NJMVC</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#374151]">Username</label>
            <div className="flex items-center gap-2 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2.5 text-[#9ca3af]">
              <User className="h-4 w-4 shrink-0" />
              <input
                className="w-full bg-transparent text-base text-[#111827] outline-none placeholder:text-[#9ca3af]"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#374151]">Password</label>
            <div className="flex items-center gap-2 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2.5 text-[#9ca3af]">
              <Lock className="h-4 w-4 shrink-0" />
              <input
                className="w-full bg-transparent text-base text-[#111827] outline-none placeholder:text-[#9ca3af]"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f66ea] px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Sign In"}
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </form>
    </div>
  );
}
