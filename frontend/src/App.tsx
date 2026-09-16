import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Enquiries from "./pages/Enquiries";
import Quotations from "./pages/Quotations";
import SalesOrders from "./pages/SalesOrders";
import Inventory from "./pages/Inventory";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={<Navigate to="/enquiries" replace />}
          />

          <Route
            path="/enquiries"
            element={<Enquiries />}
          />

          <Route
            path="/quotations"
            element={<Quotations />}
          />

          <Route
            path="/sales-orders"
            element={<SalesOrders />}
          />

          <Route
            path="/inventory"
            element={<Inventory />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/enquiries" replace />}
      />
    </Routes>
  );
}