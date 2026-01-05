import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
    const [username, setUsername] = useState(""); // email o username
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const { login } = useAuth();
    const nav = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setErr("");

        // AJUSTA la ruta y payload al endpoint real de tu backend:
        const res = await authFetch("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
            setErr("Login falló. Revisa credenciales.");
            return;
        }

        const data = await res.json();

        // Esperamos algo así:
        // { token: "...", user: { id: 1, rol: "ADMIN" } }
        login({ token: data.token, user: data.user });

        if (data.user?.rol === "ADMIN") nav("/admin/pedidos");
        else nav("/"); // luego definimos cliente/domiciliario
    }

    return (
        <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
            <h2>GoFast - Iniciar sesión</h2>
            <form onSubmit={handleSubmit}>
                <label>Usuario / Email</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", padding: 10 }} />

                <label style={{ marginTop: 12, display: "block" }}>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 10 }} />

                {err && <p style={{ color: "crimson" }}>{err}</p>}

                <button style={{ marginTop: 16, width: "100%", padding: 12 }}>
                    Entrar
                </button>
            </form>
        </div>
    );
}