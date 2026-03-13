import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useAdminUsuariosRealtime } from "../realtime/useAdminUsuariosRealtime";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import s from "./AdminUsuarios.module.css";

const ROLES = ["ADMIN", "CLIENT", "DELIVERY"];

function ActivoBadge({ activo }) {
    return (
        <span className={`${s.badge} ${activo ? s.badgeActivo : s.badgeInactivo}`}>
            {activo ? "🟢 Activo" : "🔴 Inactivo"}
        </span>
    );
}

function RolBadge({ rol }) {
    const cfg = {
        ADMIN: { bg: "#111827", color: "#fff", text: "👑 ADMIN" },
        DELIVERY: { bg: "#eff6ff", color: "#1d4ed8", text: "🚴 DELIVERY" },
        CLIENTE: { bg: "#f3f4f6", color: "#374151", text: "🧑‍💼 CLIENTE" },
    }[rol] || { bg: "#f3f4f6", color: "#374151", text: rol || "—" };

    return (
        <span className={s.badge} style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.text}
        </span>
    );
}


function PasswordStrength({ password }) {
    const checks = [
        { label: "Mínimo 6 caracteres", ok: password.length >= 6 },
        { label: "Letra mayúscula", ok: /[A-Z]/.test(password) },
        { label: "Letra minúscula", ok: /[a-z]/.test(password) },
        { label: "Número", ok: /\d/.test(password) },
        { label: "Carácter especial", ok: /[^a-zA-Z\d]/.test(password) },
    ];
    const passed = checks.filter((c) => c.ok).length;
    const color = passed <= 2 ? "#ef4444" : passed <= 3 ? "#f59e0b" : "#16a34a";

    return (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", gap: 4 }}>
                {checks.map((_, i) => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i < passed ? color : "#e5e7eb",
                        transition: "background 0.2s"
                    }} />
                ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 2 }}>
                {checks.map((c) => (
                    <span key={c.label} style={{ fontSize: 11, color: c.ok ? "#16a34a" : "#9ca3af" }}>
                        {c.ok ? "✓" : "○"} {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ConfirmModal({ open, mensaje, onConfirm, onCancel, loading }) {
    if (!open) return null;
    return (
        <div className={s.backdrop} style={{ zIndex: 10000 }}>
            <div className={s.confirmModal}>
                <p>{mensaje}</p>
                <div className={s.confirmFooter}>
                    <button className={s.btn} onClick={onCancel} disabled={loading}>
                        Cancelar
                    </button>
                    <button className={s.btnDanger} onClick={onConfirm} disabled={loading}>
                        {loading ? "Procesando..." : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminUsuarios() {
    const { token } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingGuardar, setLoadingGuardar] = useState(false);
    const [loadingToggle, setLoadingToggle] = useState(false);
    const [toast, setToast] = useState(null);
    const [q, setQ] = useState("");
    const [rol, setRol] = useState("");
    const [estado, setEstado] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "CLIENT", activo: true });
    const [touched, setTouched] = useState({});
    const [confirm, setConfirm] = useState({ open: false, usuario: null });

    async function cargarUsuarios() {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/usuarios");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { cargarUsuarios(); }, []);

    useAdminUsuariosRealtime({
        token,
        onUsuario: useCallback((usuario) => {
            setUsuarios((prev) => {
                const idx = prev.findIndex((u) => u.id === usuario.id);
                if (idx === -1) return [usuario, ...prev];
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...usuario };
                return copy;
            });
        }, []),
    });

    const filtrados = useMemo(() => {
        const qq = q.trim().toLowerCase();
        return usuarios.filter((u) => {
            const matchQ =
                !qq ||
                String(u.nombre ?? "").toLowerCase().includes(qq) ||
                String(u.email ?? "").toLowerCase().includes(qq);
            const matchRol = !rol || String(u.rol) === rol;
            const isActivo = u.activo !== false;
            const matchEstado =
                !estado ||
                (estado === "ACTIVO" && isActivo) ||
                (estado === "INACTIVO" && !isActivo);
            return matchQ && matchRol && matchEstado;
        });
    }, [usuarios, q, rol, estado]);

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{6,}$/;

    const errors = useMemo(() => {
        const e = {};

        if (!form.nombre.trim()) {
            e.nombre = "El nombre es obligatorio.";
        }

        if (!form.email.trim()) {
            e.email = "El email es obligatorio.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            e.email = "Formato de email no válido.";
        }

        if (!editing) {
            if (!form.password.trim()) {
                e.password = "La contraseña es obligatoria al crear.";
            } else if (!passwordRegex.test(form.password)) {
                e.password = "Mínimo 6 caracteres con mayúscula, minúscula, número y carácter especial.";
            }
        } else if (form.password.trim()) {
            if (!passwordRegex.test(form.password)) {
                e.password = "Mínimo 6 caracteres con mayúscula, minúscula, número y carácter especial.";
            }
        }

        if (!form.rol) e.rol = "El rol es obligatorio.";
        return e;
    }, [form, editing]);

    const canSubmit = Object.keys(errors).length === 0;

    function abrirCrear() {
        setEditing(null);
        setForm({ nombre: "", email: "", password: "", rol: "CLIENT", activo: true });
        setTouched({});
        setOpen(true);
    }

    function abrirEditar(u) {
        setEditing(u);
        setForm({
            nombre: u.nombre ?? "",
            email: u.email ?? "",
            password: "",
            rol: u.rol ?? "CLIENT",
            activo: u.activo ?? true,
        });
        setTouched({});
        setOpen(true);
    }

    async function guardar() {
        setTouched({ nombre: true, email: true, rol: true, password: true });
        if (!canSubmit) return;

        setLoadingGuardar(true);
        setToast(null);

        try {
            const url = editing ? `/api/admin/usuarios/${editing.id}` : "/api/admin/usuarios";
            const method = editing ? "PATCH" : "POST";
            const body = editing
                ? {
                    nombre: form.nombre?.trim() || null,
                    email: form.email.trim(),
                    rol: form.rol,
                    activo: !!form.activo,
                    ...(form.password ? { password: form.password } : {}),
                }
                : {
                    nombre: form.nombre?.trim() || null,
                    email: form.email.trim(),
                    password: form.password,
                    rol: form.rol,
                };

            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const error = await parseBackendError(res);
                setToast(error);
                return;
            }

            const resultado = await res.json().catch(() => null);

            if (editing) {
                setUsuarios((prev) =>
                    resultado ? prev.map((x) => x.id === resultado.id ? resultado : x) : prev
                );
            } else {
                if (resultado) setUsuarios((prev) => [resultado, ...prev]);
                else await cargarUsuarios();
            }

            setOpen(false);

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingGuardar(false);
        }
    }

    function pedirConfirmToggle(u) {
        if (String(u.rol) === "ADMIN") {
            setToast(errorFronted("No se puede deshabilitar un usuario con rol ADMIN."));
            return;
        }
        setConfirm({ open: true, usuario: u });
    }

    async function confirmarToggle() {
        const u = confirm.usuario;
        const isActivo = u.activo !== false;

        setLoadingToggle(true);
        try {
            const url = isActivo
                ? `/api/admin/usuarios/${u.id}/desactivar`
                : `/api/admin/usuarios/${u.id}/reactivar`;

            const res = await authFetch(url, { method: "PATCH" });

            if (!res.ok) { setToast(await parseBackendError(res)); return; }

            setUsuarios((prev) =>
                prev.map((x) =>
                    x.id === u.id ? { ...x, activo: !isActivo } : x
                )
            );

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingToggle(false);
            setConfirm({ open: false, usuario: null });
        }
    }

    return (
        <div className={s.container}>
            <div className={s.header}>
                <h3>Usuarios</h3>
                <div className={s.headerActions}>
                    <button className={s.btn} onClick={cargarUsuarios} disabled={loading}>
                        {loading ? "Cargando..." : "Recargar"}
                    </button>
                    <button className={s.btnPrimary} onClick={abrirCrear}>
                        + Crear usuario
                    </button>
                </div>
            </div>
            <div className={s.filtros}>
                <input
                    className={`${s.input} ${s.inputSearch}`}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                />
                <select className={s.select} value={rol} onChange={(e) => setRol(e.target.value)}>
                    <option value="">Todos los roles</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className={s.select} value={estado} onChange={(e) => setEstado(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="INACTIVO">Inactivos</option>
                </select>
                <span className={s.contador}>
                    Mostrando: <b>{filtrados.length}</b> / {usuarios.length}
                </span>
            </div>
            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th className={s.th}>ID</th>
                            <th className={s.th}>Nombre</th>
                            <th className={s.th}>Email</th>
                            <th className={s.th}>Rol</th>
                            <th className={s.th}>Estado</th>
                            <th className={s.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map((u) => {
                            const esAdmin = String(u.rol) === "ADMIN";
                            const inactivo = u.activo === false;
                            return (
                                <tr key={u.id}>
                                    <td className={s.td}>{u.id}</td>
                                    <td className={s.td}>{u.nombre ?? "—"}</td>
                                    <td className={s.td}>{u.email}</td>
                                    <td className={s.td}><RolBadge rol={u.rol} /></td>
                                    <td className={s.td}><ActivoBadge activo={!inactivo} /></td>
                                    <td className={s.td}>
                                        <div className={s.tdAcciones}>
                                            <button className={s.btn} onClick={() => abrirEditar(u)}>
                                                Editar
                                            </button>
                                            <button
                                                className={
                                                    esAdmin ? s.btnDisabled :
                                                        inactivo ? s.btnSuccess : s.btnDanger
                                                }
                                                onClick={() => pedirConfirmToggle(u)}
                                                disabled={esAdmin}
                                                title={esAdmin ? "No se puede deshabilitar un ADMIN" : ""}
                                            >
                                                {inactivo ? "Reactivar" : "Deshabilitar"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {!loading && filtrados.length === 0 && (
                            <tr>
                                <td className={s.emptyRow} colSpan={6}>
                                    No hay usuarios con ese filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {open && (
                <div className={s.backdrop}>
                    <div className={s.modal}>
                        <div className={s.modalHeader}>
                            <h3>{editing ? `Editar usuario #${editing.id}` : "Crear usuario"}</h3>
                            <button className={s.btnClose} onClick={() => setOpen(false)}>✕</button>
                        </div>

                        <div className={s.modalBody}>
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${s.inputFull} ${touched.nombre && errors.nombre ? s.inputError : ""}`}
                                    value={form.nombre}
                                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
                                    placeholder="Nombre"
                                />
                                {touched.nombre && errors.nombre && (
                                    <div className={s.helper}>⚠️ {errors.nombre}</div>
                                )}
                            </div>
                            {!editing && (
                                <div className={s.field}>
                                    <input
                                        className={`${s.input} ${s.inputFull} ${touched.email && errors.email ? s.inputError : ""}`}
                                        value={form.email}
                                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                                        placeholder="Email"
                                        type="email"
                                    />
                                    {touched.email && errors.email && (
                                        <div className={s.helper}>⚠️ {errors.email}</div>
                                    )}
                                </div>
                            )}
                            {!editing && (
                                <div className={s.field}>
                                    <input
                                        className={`${s.input} ${s.inputFull} ${touched.password && errors.password ? s.inputError : ""}`}
                                        value={form.password}
                                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                                        placeholder="Contraseña"
                                        type="password"
                                    />
                                    {form.password && (
                                        <PasswordStrength password={form.password} />
                                    )}
                                    {touched.password && errors.password && (
                                        <div className={s.helper}>⚠️ {errors.password}</div>
                                    )}
                                </div>
                            )}
                            <div className={s.field}>
                                <select
                                    className={`${s.select} ${s.inputFull} ${touched.rol && errors.rol ? s.inputError : ""}`}
                                    value={form.rol}
                                    onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, rol: true }))}
                                >
                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                {touched.rol && errors.rol && (
                                    <div className={s.helper}>⚠️ {errors.rol}</div>
                                )}
                            </div>
                            {editing && (
                                <label className={s.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={!!form.activo}
                                        onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
                                    />
                                    Activo
                                </label>
                            )}
                        </div>

                        <div className={s.modalFooter}>
                            <button className={s.btn} onClick={() => setOpen(false)} disabled={loadingGuardar}>
                                Cancelar
                            </button>
                            <button className={s.btnPrimary} onClick={guardar} disabled={loadingGuardar}>
                                {loadingGuardar ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={confirm.open}
                mensaje={
                    confirm.usuario?.activo !== false
                        ? `¿Deshabilitar el usuario "${confirm.usuario?.email}"?`
                        : `¿Reactivar el usuario "${confirm.usuario?.email}"?`
                }
                onConfirm={confirmarToggle}
                onCancel={() => setConfirm({ open: false, usuario: null })}
                loading={loadingToggle}
            />

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
