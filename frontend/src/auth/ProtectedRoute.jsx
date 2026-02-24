import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, role }) {
    const { token, user } = useAuth();

    const storedRol = localStorage.getItem("rol"); // fallback
    const rolActual = user?.rol || storedRol;

    if (!token) return <Navigate to="/login" replace />;

    // Si el token existe pero el rol no coincide, lo mando a /login (o a una ruta 403 si quieres)
    if (role && rolActual !== role) return <Navigate to="/login" replace />;

    return children;
}
