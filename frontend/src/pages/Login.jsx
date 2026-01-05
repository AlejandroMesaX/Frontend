import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { loginRequest } from "../api/auth";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const { login } = useAuth();
    const nav = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setErr("");

        try {
            const data = await loginRequest(email, password);

            // ✅ guardar en contexto (y localStorage lo maneja AuthContext)
            login({
                token: data.token,
                user: {
                    id: data.usuario.id,
                    rol: data.usuario.rol,
                    nombre: data.usuario.nombre,
                    email: data.usuario.email,
                    activo: data.usuario.activo,
                },
            });

            // ✅ redirección por rol
            if (data.usuario.rol === "ADMIN") nav("/admin/pedidos");
            else if (data.usuario.rol === "CLIENTE") nav("/cliente");
            else if (data.usuario.rol === "DOMICILIARIO") nav("/domiciliario");
            else nav("/login");
        } catch (e) {
            setErr("Credenciales inválidas o backend no responde.");
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
            <h2>GoFast - Iniciar sesión</h2>
            <form onSubmit={handleSubmit}>
                <label>Email</label>
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", padding: 10 }}
                />

                <label style={{ marginTop: 12, display: "block" }}>Contraseña</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", padding: 10 }}
                />

                {err && <p style={{ color: "crimson" }}>{err}</p>}

                <button style={{ marginTop: 16, width: "100%", padding: 12 }}>
                    Entrar
                </button>
            </form>
        </div>
    );
}