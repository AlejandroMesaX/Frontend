import { useState } from "react";
import { useNavigate } from "react-router-dom";
import s from "./AuthPage.module.css";
import { authFetch } from "../api/http";

const LOGO_SRC = "data:image/jpeg;base64,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";

// ── Validaciones ──────────────────────────────────────────────────────────────

function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validatePassword(v) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{6,}$/.test(v);
}

// ── Indicador fortaleza contraseña ────────────────────────────────────────────

function PasswordStrength({ password }) {
    const checks = [
        { label: "6+ caracteres", ok: password.length >= 6 },
        { label: "Mayúscula", ok: /[A-Z]/.test(password) },
        { label: "Minúscula", ok: /[a-z]/.test(password) },
        { label: "Número", ok: /\d/.test(password) },
        { label: "Especial", ok: /[^a-zA-Z\d]/.test(password) },
    ];
    const passed = checks.filter((c) => c.ok).length;
    const barColor = passed <= 2 ? "#ef4444" : passed <= 3 ? "#f59e0b" : "#22c55e";
    return (
        <div className={s.strengthWrap}>
            <div className={s.strengthBars}>
                {checks.map((_, i) => (
                    <div key={i} className={s.strengthBar}
                        style={{ background: i < passed ? barColor : "#3f3f44" }} />
                ))}
            </div>
            <div className={s.strengthChecks}>
                {checks.map((c) => (
                    <span key={c.label} className={c.ok ? s.checkOk : s.checkNo}>
                        {c.ok ? "✓" : "○"} {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── Vista: Login ──────────────────────────────────────────────────────────────

function LoginView({ onSwitch, onLogin }) {
    const [form, setForm] = useState({ email: "", password: "", remember: false });
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPwd, setShowPwd] = useState(false);

    const errors = {};
    if (!form.email.trim()) errors.email = "El correo es obligatorio.";
    else if (!validateEmail(form.email)) errors.email = "Formato de correo inválido.";
    if (!form.password.trim()) errors.password = "La contraseña es obligatoria.";

    async function handleSubmit(e) {
        e.preventDefault();
        setTouched({ email: true, password: true });
        if (Object.keys(errors).length > 0) return;
        setLoading(true); setError(null);
        try {
            await onLogin({ email: form.email.trim(), password: form.password, remember: form.remember });
        } catch (err) {
            setError(err?.message || "Credenciales incorrectas.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={s.card}>
            <div className={s.logoWrap}>
                <img src={LOGO_SRC} alt="GoFast" className={s.logo} />
            </div>
            <h1 className={s.brand}>GoFast</h1>
            <p className={s.subtitle}>Inicia sesión en tu cuenta</p>

            <form className={s.form} onSubmit={handleSubmit} noValidate>
                <div className={s.field}>
                    <label className={s.label}>Correo electrónico</label>
                    <input
                        className={`${s.input} ${touched.email && errors.email ? s.inputError : ""}`}
                        type="email" value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        placeholder="tu@correo.com" autoComplete="email"
                    />
                    {touched.email && errors.email && <div className={s.fieldError}>{errors.email}</div>}
                </div>

                <div className={s.field}>
                    <label className={s.label}>Contraseña</label>
                    <div className={s.inputWrap}>
                        <input
                            className={`${s.input} ${touched.password && errors.password ? s.inputError : ""}`}
                            type={showPwd ? "text" : "password"} value={form.password}
                            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                            placeholder="Tu contraseña" autoComplete="current-password"
                        />
                        <button type="button" className={s.eyeBtn} onClick={() => setShowPwd((p) => !p)} tabIndex={-1}>
                            {showPwd ? "🙈" : "👁️"}
                        </button>
                    </div>
                    {touched.password && errors.password && <div className={s.fieldError}>{errors.password}</div>}
                </div>

                <div className={s.rememberRow}>
                    <label className={s.checkLabel}>
                        <input type="checkbox" className={s.checkbox} checked={form.remember}
                            onChange={(e) => setForm((p) => ({ ...p, remember: e.target.checked }))} />
                        <span>Recordarme</span>
                    </label>
                </div>

                {error && <div className={s.alertError}>⛔ {error}</div>}

                <button type="submit" className={s.btnPrimary} disabled={loading}>
                    {loading ? <span className={s.spinner} /> : "Iniciar sesión"}
                </button>
            </form>

            <div className={s.switchRow}>
                ¿No tienes cuenta?{" "}
                <button className={s.linkBtn} onClick={() => onSwitch("register")}>Regístrate</button>
            </div>
        </div>
    );
}

// ── Vista: Register ───────────────────────────────────────────────────────────

function RegisterView({ onSwitch, onRegister }) {
    const [form, setForm] = useState({ nombre: "", email: "", password: "", confirmPassword: "", rol: "" });
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const errors = {};
    if (!form.nombre.trim()) errors.nombre = "El nombre es obligatorio.";
    if (!form.email.trim()) errors.email = "El correo es obligatorio.";
    else if (!validateEmail(form.email)) errors.email = "Formato de correo inválido.";
    if (!form.password) errors.password = "La contraseña es obligatoria.";
    else if (!validatePassword(form.password)) errors.password = "Mínimo 6 caracteres con mayúscula, minúscula, número y carácter especial.";
    if (!form.confirmPassword) errors.confirmPassword = "Confirma tu contraseña.";
    else if (form.password !== form.confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden.";
    if (!form.rol) errors.rol = "Selecciona un rol.";

    async function handleSubmit(e) {
        e.preventDefault();
        setTouched({ nombre: true, email: true, password: true, confirmPassword: true, rol: true });
        if (Object.keys(errors).length > 0) return;
        setLoading(true); setError(null);
        try {
            await onRegister({ nombre: form.nombre.trim(), email: form.email.trim(), password: form.password, rol: form.rol });
        } catch (err) {
            setError(err?.message || "No se pudo completar el registro.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={s.card}>
            <div className={s.logoWrap}>
                <img src={LOGO_SRC} alt="GoFast" className={s.logo} />
            </div>
            <h1 className={s.brand}>GoFast</h1>
            <p className={s.subtitle}>Crea tu cuenta</p>

            <form className={s.form} onSubmit={handleSubmit} noValidate>
                <div className={s.field}>
                    <label className={s.label}>Nombre completo</label>
                    <input
                        className={`${s.input} ${touched.nombre && errors.nombre ? s.inputError : ""}`}
                        value={form.nombre}
                        onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                        onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
                        placeholder="Juan Pérez" autoComplete="name"
                    />
                    {touched.nombre && errors.nombre && <div className={s.fieldError}>{errors.nombre}</div>}
                </div>

                <div className={s.field}>
                    <label className={s.label}>Correo electrónico</label>
                    <input
                        className={`${s.input} ${touched.email && errors.email ? s.inputError : ""}`}
                        type="email" value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        placeholder="tu@correo.com" autoComplete="email"
                    />
                    {touched.email && errors.email && <div className={s.fieldError}>{errors.email}</div>}
                </div>

                <div className={s.field}>
                    <label className={s.label}>Contraseña</label>
                    <div className={s.inputWrap}>
                        <input
                            className={`${s.input} ${touched.password && errors.password ? s.inputError : ""}`}
                            type={showPwd ? "text" : "password"} value={form.password}
                            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                            placeholder="Crea una contraseña" autoComplete="new-password"
                        />
                        <button type="button" className={s.eyeBtn} onClick={() => setShowPwd((p) => !p)} tabIndex={-1}>
                            {showPwd ? "🙈" : "👁️"}
                        </button>
                    </div>
                    {form.password && <PasswordStrength password={form.password} />}
                    {touched.password && errors.password && <div className={s.fieldError}>{errors.password}</div>}
                </div>

                <div className={s.field}>
                    <label className={s.label}>Confirmar contraseña</label>
                    <div className={s.inputWrap}>
                        <input
                            className={`${s.input} ${touched.confirmPassword && errors.confirmPassword ? s.inputError : ""}`}
                            type={showConfirm ? "text" : "password"} value={form.confirmPassword}
                            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                            placeholder="Repite la contraseña" autoComplete="new-password"
                        />
                        <button type="button" className={s.eyeBtn} onClick={() => setShowConfirm((p) => !p)} tabIndex={-1}>
                            {showConfirm ? "🙈" : "👁️"}
                        </button>
                    </div>
                    {touched.confirmPassword && errors.confirmPassword && <div className={s.fieldError}>{errors.confirmPassword}</div>}
                </div>

                <div className={s.field}>
                    <label className={s.label}>Rol</label>
                    <div className={s.rolGrid}>
                        {[
                            { value: "CLIENT", label: "Cliente", icon: "📦", desc: "Envía paquetes" },
                            { value: "DELIVERY", label: "Domiciliario", icon: "🛵", desc: "Realiza entregas" },
                        ].map((r) => (
                            <button key={r.value} type="button"
                                className={`${s.rolBtn} ${form.rol === r.value ? s.rolBtnActive : ""}`}
                                onClick={() => setForm((p) => ({ ...p, rol: r.value }))}>
                                <span className={s.rolIcon}>{r.icon}</span>
                                <span className={s.rolLabel}>{r.label}</span>
                                <span className={s.rolDesc}>{r.desc}</span>
                            </button>
                        ))}
                    </div>
                    {touched.rol && errors.rol && <div className={s.fieldError}>{errors.rol}</div>}
                </div>

                {error && <div className={s.alertError}>⛔ {error}</div>}

                <button type="submit" className={s.btnPrimary} disabled={loading}>
                    {loading ? <span className={s.spinner} /> : "Crear cuenta"}
                </button>
            </form>

            <div className={s.switchRow}>
                ¿Ya tienes cuenta?{" "}
                <button className={s.linkBtn} onClick={() => onSwitch("login")}>Inicia sesión</button>
            </div>
        </div>
    );
}

// ── Vista: Verificar código OTP ───────────────────────────────────────────────

function VerifyView({ email, onVerify, onResend, onBack }) {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resent, setResent] = useState(false);
    const [resending, setResending] = useState(false);

    function handleChange(i, val) {
        const cleaned = val.replace(/\D/g, "").slice(-1);
        const next = [...code];
        next[i] = cleaned;
        setCode(next);
        if (cleaned && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
    }

    function handleKeyDown(i, e) {
        if (e.key === "Backspace" && !code[i] && i > 0)
            document.getElementById(`otp-${i - 1}`)?.focus();
    }

    function handlePaste(e) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const next = [...code];
        pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch; });
        setCode(next);
        document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const fullCode = code.join("");
        if (fullCode.length < 6) { setError("Ingresa el código completo de 6 dígitos."); return; }
        setLoading(true); setError(null);
        try {
            await onVerify(fullCode);
        } catch (err) {
            setError(err?.message || "Código incorrecto o expirado.");
            setCode(["", "", "", "", "", ""]);
            document.getElementById("otp-0")?.focus();
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        setResending(true); setError(null); setResent(false);
        try {
            await onResend();
            setResent(true);
            setTimeout(() => setResent(false), 4000);
        } catch {
            setError("No se pudo reenviar el código.");
        } finally {
            setResending(false);
        }
    }

    return (
        <div className={s.card}>
            <div className={s.logoWrap}>
                <img src={LOGO_SRC} alt="GoFast" className={s.logo} />
            </div>
            <h1 className={s.brand}>Verifica tu correo</h1>
            <p className={s.subtitle}>
                Enviamos un código de 6 dígitos a<br />
                <b className={s.emailHighlight}>{email}</b>
            </p>

            <form className={s.form} onSubmit={handleSubmit} noValidate>
                <div className={s.otpRow} onPaste={handlePaste}>
                    {code.map((digit, i) => (
                        <input key={i} id={`otp-${i}`}
                            className={`${s.otpInput} ${error ? s.otpError : ""}`}
                            type="text" inputMode="numeric" maxLength={1} value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            autoFocus={i === 0}
                        />
                    ))}
                </div>

                {error && <div className={s.alertError}>⛔ {error}</div>}
                {resent && <div className={s.alertSuccess}>✅ Código reenviado correctamente.</div>}

                <button type="submit" className={s.btnPrimary} disabled={loading}>
                    {loading ? <span className={s.spinner} /> : "Verificar cuenta"}
                </button>

                <div className={s.resendRow}>
                    ¿No recibiste el código?{" "}
                    <button type="button" className={s.linkBtn} onClick={handleResend} disabled={resending}>
                        {resending ? "Reenviando..." : "Reenviar"}
                    </button>
                </div>
            </form>

            <div className={s.switchRow}>
                <button className={s.linkBtn} onClick={onBack}>← Volver al registro</button>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AuthPage({ onLogin }) {
    const [view, setView] = useState("login");
    const [pendingEmail, setPendingEmail] = useState("");
    const nav = useNavigate();

    function redirigir(rol) {
        if (rol === "ADMIN") nav("/admin");
        else if (rol === "DELIVERY") nav("/domiciliario");
        else if (rol === "CLIENT") nav("/cliente");
        else nav("/login");
    }

    async function handleLogin({ email, password, remember }) {
        const res = await authFetch("api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message || "Credenciales incorrectas.");
        }
        const data = await res.json();

        onLogin({
            token: data.token,
            user: data.usuario,
            rol: data.usuario.rol,
            userId: data.usuario.id,
        });

        // Si el usuario marcó "recordarme", sobreescribir con localStorage
        if (remember) {
            localStorage.setItem("token", data.token);
        }

        redirigir(data.usuario.rol);
    }

    async function handleRegister({ nombre, email, password, rol }) {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, email, password, rol }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message || "No se pudo completar el registro.");
        }
        setPendingEmail(email);
        setView("verify");
    }

    async function handleVerify(code) {
        const res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: pendingEmail, code }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message || "Código incorrecto o expirado.");
        }
        const data = await res.json();

        onLogin({
            token: data.token,
            user: data.usuario,
            rol: data.usuario.rol,
            userId: data.usuario.id,
        });

        redirigir(data.usuario.rol);
    }

    async function handleResend() {
        const res = await fetch("/api/auth/resend-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: pendingEmail }),
        });
        if (!res.ok) throw new Error("No se pudo reenviar el código.");
    }

    return (
        <div className={s.page}>
            <div className={s.bgPattern} />
            <div className={s.container}>
                {view === "login" && <LoginView onSwitch={setView} onLogin={handleLogin} />}
                {view === "register" && <RegisterView onSwitch={setView} onRegister={handleRegister} />}
                {view === "verify" && (
                    <VerifyView
                        email={pendingEmail}
                        onVerify={handleVerify}
                        onResend={handleResend}
                        onBack={() => setView("register")}
                    />
                )}
            </div>
        </div>
    );
}
