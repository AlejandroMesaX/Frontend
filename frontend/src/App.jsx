import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminPedidos from "./pages/AdminPedidos";
import ProtectedRoute from "./auth/ProtectedRoute";
import DeliveryPanel from "./pages/DeliveryPanel";

function Placeholder({ title }) {
  return <h2 style={{ fontFamily: "sans-serif", margin: 20 }}>{title}</h2>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/delivery" element={<DeliveryPanel />} />

        <Route
          path="/admin/pedidos"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminPedidos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cliente"
          element={
            <ProtectedRoute role="CLIENTE">
              <Placeholder title="Cliente - próximamente" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/domiciliario"
          element={
            <ProtectedRoute role="DOMICILIARIO">
              <Placeholder title="Domiciliario - próximamente" />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
