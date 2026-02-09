import { Routes, Route } from "react-router-dom";
import Customers from "./components/Customers/Customers";
import Home from "./components/Home/Home";
import Reports from "./components/Reports/Reports";

export default function App() {

  return (
    <>
      <Routes>
        <Route element={<Home />} path="/" />
        <Route element={<Customers />} path="/customers"/>
        <Route element={<Reports />} path="/reports" />
      </Routes>
    </>
  )
}


