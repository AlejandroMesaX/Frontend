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


            login({
                token: data.token,
                user: data.usuario,
                rol: data.usuario.rol,
                userId: data.usuario.id,
            });

            if (data.usuario.rol === "ADMIN") nav("/admin");
            else if (data.usuario.rol === "DELIVERY") nav("/domiciliario");
            else if (data.usuario.rol === "CLIENTE") nav("/cliente");
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