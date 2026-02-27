import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { loginRequest } from "../api/auth";
import s from "./Login.module.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [touched, setTouched] = useState({});
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const nav = useNavigate();

    // ── Validación en tiempo real ───────────────────────────────────────────

    const errors = useMemo(() => {
        const e = {};
        if (!email.trim()) {
            e.email = "El email es obligatorio.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            e.email = "El email no tiene un formato válido.";
        }
        if (!password) e.password = "La contraseña es obligatoria.";
        return e;
    }, [email, password]);

    const canSubmit = Object.keys(errors).length === 0;

    // ── Submit ──────────────────────────────────────────────────────────────

    async function handleSubmit(e) {
        e.preventDefault();
        setErr("");
        setTouched({ email: true, password: true });
        if (!canSubmit) return;

        setLoading(true);
        try {
            const data = await loginRequest(email.trim(), password);

            login({
                token: data.token,
                user: data.usuario,
                rol: data.usuario.rol,
                userId: data.usuario.id,
            });

            if (data.usuario.rol === "ADMIN") nav("/admin");
            else if (data.usuario.rol === "DELIVERY") nav("/domiciliario");
            else if (data.usuario.rol === "CLIENT") nav("/cliente");
            else nav("/login");

        } catch {
            setErr("Credenciales inválidas o el servidor no responde.");
        } finally {
            setLoading(false);
        }
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className={s.container}>
            <h2>GoFast — Iniciar sesión</h2>

            <form className={s.form} onSubmit={handleSubmit} noValidate>

                {/* Email */}
                <div className={s.field}>
                    <label className={s.label}>Email</label>
                    <input
                        className={`${s.input} ${touched.email && errors.email ? s.inputError : ""}`}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        autoComplete="email"
                        disabled={loading}
                    />
                    {touched.email && errors.email && (
                        <div className={s.helper}>⚠️ {errors.email}</div>
                    )}
                </div>

                {/* Contraseña */}
                <div className={s.field}>
                    <label className={s.label}>Contraseña</label>
                    <input
                        className={`${s.input} ${touched.password && errors.password ? s.inputError : ""}`}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        autoComplete="current-password"
                        disabled={loading}
                    />
                    {touched.password && errors.password && (
                        <div className={s.helper}>⚠️ {errors.password}</div>
                    )}
                </div>

                {/* Error general de credenciales */}
                {err && <div className={s.errorBox}>⛔ {err}</div>}

                <button className={s.btnSubmit} type="submit" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                </button>
            </form>
        </div>
    );
}
