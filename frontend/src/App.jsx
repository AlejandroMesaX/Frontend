import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminPedidos from "./pages/AdminPedidos";
import ProtectedRoute from "./auth/ProtectedRoute";
import DeliveryPanel from "./pages/DeliveryPanel";
import AdminPanel from "./pages/AdminPanel";


function Placeholder({ title }) {
  return <h2 style={{ fontFamily: "sans-serif", margin: 20 }}>{title}</h2>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/domiciliario"
          element={
            <ProtectedRoute role="DELIVERY">  {/* ✅ DELIVERY no DOMICILIARIO */}
              <DeliveryPanel />
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

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
