import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, role }) {
    const { token, user } = useAuth();

    const storedRol = localStorage.getItem("rol");
    const rolActual = user?.rol || storedRol;

    if (!token) return <Navigate to="/login" replace />;

    if (role && rolActual !== role) return <Navigate to="/login" replace />;

    return children;
}
