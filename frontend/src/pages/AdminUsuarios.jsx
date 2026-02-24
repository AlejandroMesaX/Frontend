import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";

const ROLES = ["ADMIN", "CLIENT", "DELIVERY"]; // ajusta si tus enums cambian

export default function AdminUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [estado, setEstado] = useState(""); // "" | "ACTIVO" | "INACTIVO"


    // filtros
    const [q, setQ] = useState("");
    const [rol, setRol] = useState("");

    // modal create/edit
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null); // usuario o null
    const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "CLIENTE", activo: true });

    async function cargarUsuarios() {
        setLoading(true);
        try {
            // ✅ Ajusta el endpoint si el tuyo es otro
            // Recomendado: que tu backend devuelva también inactivos
            const res = await authFetch("/api/admin/usuarios");
            if (!res.ok) {
                const msg = await safeText(res);
                alert("No se pudo cargar usuarios. " + msg);
                return;
            }
            const data = await res.json();
            setUsuarios(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const filtrados = useMemo(() => {
        const qq = q.trim().toLowerCase();

        return usuarios.filter((u) => {
            const matchQ =
                !qq ||
                String(u.nombre ?? "").toLowerCase().includes(qq) ||
                String(u.email ?? "").toLowerCase().includes(qq);

            const matchRol = !rol || String(u.rol) === rol;

            const isActivo = u.activo !== false; // por si viene null
            const matchEstado =
                !estado ||
                (estado === "ACTIVO" && isActivo) ||
                (estado === "INACTIVO" && !isActivo);

            return matchQ && matchRol && matchEstado;
        });
    }, [usuarios, q, rol, estado]);


    function abrirCrear() {
        setEditing(null);
        setForm({ nombre: "", email: "", password: "", rol: "CLIENTE", activo: true });
        setOpen(true);
    }

    function abrirEditar(u) {
        setEditing(u);
        setForm({
            nombre: u.nombre ?? "",
            email: u.email ?? "",
            password: "", // no mostramos password, si se llena lo cambia
            rol: u.rol ?? "CLIENTE",
            activo: u.activo ?? true,
        });
        setOpen(true);
    }

    async function guardar() {
        if (!form.email.trim()) return alert("Email es obligatorio");
        if (!form.rol) return alert("Rol es obligatorio");

        // crear
        if (!editing) {
            // ✅ Ajusta endpoint
            const res = await authFetch("/api/admin/usuarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: form.nombre?.trim() || null,
                    email: form.email.trim(),
                    password: form.password || null,
                    rol: form.rol,
                }),
            });

            if (!res.ok) {
                const msg = await safeText(res);
                alert("No se pudo crear usuario. " + msg);
                return;
            }

            const creado = await res.json().catch(() => null);
            if (creado) setUsuarios((prev) => [creado, ...prev]);
            else await cargarUsuarios();

            setOpen(false);
            return;
        }

        // editar
        // ✅ Ajusta endpoint: PUT o PATCH según tu backend
        const res = await authFetch(`/api/admin/usuarios/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: form.nombre?.trim() || null,
                email: form.email.trim(),
                rol: form.rol,
                activo: !!form.activo,
                ...(form.password ? { password: form.password } : {}),
            }),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert("No se pudo editar usuario. " + msg);
            return;
        }

        const actualizado = await res.json().catch(() => null);
        if (actualizado) {
            setUsuarios((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
        } else {
            await cargarUsuarios();
        }

        setOpen(false);
    }

    async function toggleActivo(u) {
        if (String(u.rol) === "ADMIN") {
            alert("No se puede deshabilitar un usuario con rol ADMIN.");
            return;
        }
        const isActivo = u.activo !== false;
        const ok = confirm(isActivo
            ? `¿Deshabilitar el usuario "${u.email}"?`
            : `¿Reactivar el usuario "${u.email}"?`
        );
        if (!ok) return;

        // ✅ Recomendado: PATCH activo (mejor que DELETE)
        const res = await authFetch(`/api/admin/usuarios/${u.id}/reactivar`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activo: !isActivo }),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert("No se pudo actualizar estado. " + msg);
            return;
        }

        const actualizado = await res.json().catch(() => null);

        if (actualizado) {
            setUsuarios((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
        } else {
            // fallback
            setUsuarios((prev) =>
                prev.map((x) => (x.id === u.id ? { ...x, activo: !isActivo } : x))
            );
        }
    }


    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Usuarios</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={cargarUsuarios} disabled={loading}>
                        {loading ? "Cargando..." : "Recargar"}
                    </button>
                    <button onClick={abrirCrear}>+ Crear usuario</button>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", minWidth: 260 }}
                />

                <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                >
                    <option value="">Todos los roles</option>
                    {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                >
                    <option value="">Todos</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="INACTIVO">Inactivos</option>
                </select>


                <span style={{ fontSize: 12, color: "#666" }}>
                    Mostrando: <b>{filtrados.length}</b> / {usuarios.length}
                </span>
            </div>

            {/* Tabla */}
            <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                            <th style={th}>ID</th>
                            <th style={th}>Nombre</th>
                            <th style={th}>Email</th>
                            <th style={th}>Rol</th>
                            <th style={th}>Estado</th>
                            <th style={th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map((u) => {
                            const esAdmin = String(u.rol) === "ADMIN";
                            const inactivo = u.activo === false;

                            return (
                                <tr key={u.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                                    <td style={td}>{u.id}</td>
                                    <td style={td}>{u.nombre ?? "—"}</td>
                                    <td style={td}>{u.email}</td>
                                    <td style={td}><RolBadge rol={u.rol} /></td>
                                    <td style={td}><ActivoBadge activo={!inactivo} /></td>

                                    <td style={td}>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <button onClick={() => abrirEditar(u)}>Editar</button>

                                            <button
                                                onClick={() => toggleActivo(u)}
                                                disabled={esAdmin}
                                                title={esAdmin ? "No se puede deshabilitar un ADMIN" : ""}
                                                style={{
                                                    background: "#fff",
                                                    border: `1px solid ${esAdmin ? "#9ca3af" : inactivo ? "#16a34a" : "#d33"}`,
                                                    color: esAdmin ? "#9ca3af" : inactivo ? "#16a34a" : "#d33",
                                                    cursor: esAdmin ? "not-allowed" : "pointer",
                                                    opacity: esAdmin ? 0.6 : 1,
                                                }}
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
                                <td style={{ padding: 12, color: "#666" }} colSpan={6}>
                                    No hay usuarios con ese filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {open && (
                <div style={styles.backdrop}>
                    <div style={styles.modal}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <h3 style={{ margin: 0 }}>{editing ? `Editar usuario #${editing.id}` : "Crear usuario"}</h3>
                            <button onClick={() => setOpen(false)}>X</button>
                        </div>

                        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                            <input
                                value={form.nombre}
                                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                placeholder="Nombre"
                                style={inp}
                            />
                            <input
                                value={form.email}
                                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                placeholder="Email"
                                style={inp}
                            />
                            <input
                                value={form.password}
                                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                                placeholder={editing ? "Nueva contraseña (opcional)" : "Contraseña"}
                                type="password"
                                style={inp}
                            />

                            <select
                                value={form.rol}
                                onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                                style={inp}
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>

                            {editing && (
                                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!form.activo}
                                        onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
                                    />
                                    Activo
                                </label>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                            <button onClick={() => setOpen(false)}>Cancelar</button>
                            <button onClick={guardar}>{editing ? "Guardar cambios" : "Crear"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActivoBadge({ activo }) {
    return (
        <span
            style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                border: "1px solid #e5e7eb",
                background: activo ? "#ecfdf5" : "#fef2f2",
                color: activo ? "#065f46" : "#991b1b",
            }}
        >
            {activo ? "🟢 Activo" : "🔴 Inactivo"}
        </span>
    );
}

function RolBadge({ rol }) {
    const cfg =
        {
            ADMIN: { bg: "#111827", color: "#fff", text: "👑 ADMIN" },
            DELIVERY: { bg: "#eff6ff", color: "#1d4ed8", text: "🚴 DELIVERY" },
            CLIENTE: { bg: "#f3f4f6", color: "#374151", text: "🧑‍💼 CLIENTE" },
        }[rol] || { bg: "#f3f4f6", color: "#374151", text: rol || "—" };

    return (
        <span style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            border: "1px solid #e5e7eb",
            background: cfg.bg,
            color: cfg.color,
        }}>
            {cfg.text}
        </span>
    );
}

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}

const th = { padding: 10, fontSize: 13, color: "#111827" };
const td = { padding: 10, fontSize: 13, color: "#111827", verticalAlign: "top" };
const inp = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" };

const styles = {
    backdrop: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
        zIndex: 9999,
    },
    modal: {
        width: "min(520px, 95vw)",
        background: "#fff",
        borderRadius: 12,
        padding: 14,
        border: "1px solid #ddd",
    },
};
