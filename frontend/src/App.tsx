import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider";
import Login from "./components/Auth/Login";
import Customers from "./components/Customers/Customers";
import Documents from "./components/Documents/Documents";
import Home from "./components/Home/Home";
import Layout from "./components/Layout/Layout";
import Reports from "./components/Reports/Reports";

function ProtectedLayout() {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}
