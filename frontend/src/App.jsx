import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import DeliveryPanel from "./pages/DeliveryPanel";
import AdminPanel from "./pages/AdminPanel";
import ClientePanel from "./pages/ClientePanel";
import { useAuth } from "./auth/AuthContext";

export default function App() {
  const { login } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage onLogin={login} />} />

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
            <ProtectedRoute role="DELIVERY">
              <DeliveryPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cliente"
          element={
            <ProtectedRoute role="CLIENT">
              <ClientePanel />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
