import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";

export default function AdminBarrios() {
    const [barrios, setBarrios] = useState([]);
    const [comunas, setComunas] = useState([]);
    const [loading, setLoading] = useState(false);

    // filtros
    const [q, setQ] = useState("");
    const [estado, setEstado] = useState(""); // "" | "ACTIVO" | "INACTIVO"
    const [comunaFiltro, setComunaFiltro] = useState(""); // "" | "1" | "2" ...

    // modal
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    // 👇 IMPORTANTE: el backend usa "comuna" (id numérico), así que el form también
    const [form, setForm] = useState({ nombre: "", comunaNumero: "" });


    async function cargarBarrios() {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/barrios?includeInactivos=true");
            if (!res.ok) {
                const msg = await safeText(res);
                alert("No se pudo cargar barrios. " + msg);
                return;
            }
            const data = await res.json();
            setBarrios(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }

    async function cargarComunas() {
        const res = await authFetch("/api/admin/comunas");
        if (!res.ok) return;

        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];

        // Normalizamos: usamos "numero" como value (clave para Barrio.comuna)
        const normalizadas = arr
            .filter((c) => c && c.numero != null)
            .map((c) => ({
                id: c.id, // lo dejamos por si quieres mostrarlo
                numero: Number(c.numero),
                tarifaBase: c.tarifaBase,
                recargoPorSalto: c.recargoPorSalto,
            }))
            .sort((a, b) => a.numero - b.numero);

        setComunas(normalizadas);
    }


    useEffect(() => {
        cargarBarrios();
        cargarComunas();
    }, []);

    // Map para mostrar nombre: comunaId -> comunaNombre
    const comunaLabelByNumero = useMemo(() => {
        const m = new Map();
        comunas.forEach((c) => {
            m.set(Number(c.numero), `Comuna ${c.numero}`);
        });
        return m;
    }, [comunas]);


    const filtrados = useMemo(() => {
        const qq = q.trim().toLowerCase();

        return barrios.filter((b) => {
            const nombre = String(b.nombre ?? "").toLowerCase();
            const matchQ = !qq || nombre.includes(qq);

            const isActivo = b.activo !== false;
            const matchEstado =
                !estado ||
                (estado === "ACTIVO" && isActivo) ||
                (estado === "INACTIVO" && !isActivo);

            const matchComuna =
                !comunaFiltro || Number(b.comuna) === Number(comunaFiltro);

            return matchQ && matchEstado && matchComuna;
        });
    }, [barrios, q, estado, comunaFiltro]);

    function abrirCrear() {
        setEditing(null);
        setForm({ nombre: "", comunaNumero: "" });
        setOpen(true);
    }

    function abrirEditar(b) {
        setEditing(b);
        setForm({
            nombre: b.nombre ?? "",
            comunaNumero: b.comuna != null ? String(b.comuna) : "", // tu GET trae "comuna"
        });

        setOpen(true);
    }

    async function guardar() {
        const nombre = form.nombre.trim();
        const comunaNumero = Number(form.comunaNumero);

        if (!nombre) return alert("Nombre de barrio es obligatorio.");
        if (!comunaNumero) return alert("Debes seleccionar una comuna.");


        // crear
        if (!editing) {
            const res = await authFetch("/api/admin/barrios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, comunaNumero }),
            });


            if (!res.ok) {
                const msg = await safeText(res);
                alert("No se pudo crear barrio. " + msg);
                return;
            }

            const creado = await res.json().catch(() => null);
            if (creado) setBarrios((prev) => [creado, ...prev]);
            else await cargarBarrios();

            setOpen(false);
            return;
        }

        // editar (PATCH)
        const res = await authFetch(`/api/admin/barrios/${editing.id}`, {
            method: "PUT", // o PUT si así lo tienes
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, comunaNumero }),
        });


        if (!res.ok) {
            const msg = await safeText(res);
            alert("No se pudo editar barrio. " + msg);
            return;
        }

        const actualizado = await res.json().catch(() => null);
        if (actualizado) {
            setBarrios((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
        } else {
            await cargarBarrios();
        }

        setOpen(false);
    }

    async function toggleActivo(b) {
        const isActivo = b.activo !== false;

        const ok = confirm(
            isActivo ? `¿Deshabilitar "${b.nombre}"?` : `¿Reactivar "${b.nombre}"?`
        );
        if (!ok) return;

        const url = isActivo
            ? `/api/admin/barrios/${b.id}/deshabilitar`
            : `/api/admin/barrios/${b.id}/reactivar`;

        const res = await authFetch(url, { method: "PATCH" });

        if (!res.ok) {
            const msg = await safeText(res);
            alert("No se pudo actualizar estado. " + msg);
            return;
        }

        // Como tu backend devuelve 204, actualizamos localmente:
        setBarrios((prev) =>
            prev.map((x) => (x.id === b.id ? { ...x, activo: !isActivo } : x))
        );
    }



    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Barrios</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => { cargarBarrios(); cargarComunas(); }} disabled={loading}>
                        {loading ? "Cargando..." : "Recargar"}
                    </button>
                    <button onClick={abrirCrear}>+ Crear barrio</button>
                </div>
            </div>

            {/* filtros */}
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nombre..."
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", minWidth: 260 }}
                />

                <select
                    value={comunaFiltro}
                    onChange={(e) => setComunaFiltro(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                >
                    <option value="">Todas las comunas</option>
                    {comunas.map((c) => (
                        <option key={c.numero} value={c.numero}>
                            Comuna {c.numero}
                        </option>
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
                    Mostrando: <b>{filtrados.length}</b> / {barrios.length}
                </span>
            </div>

            {/* tabla */}
            <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                            <th style={th}>ID</th>
                            <th style={th}>Barrio</th>
                            <th style={th}>Comuna</th>
                            <th style={th}>Estado</th>
                            <th style={th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map((b) => {
                            const inactivo = b.activo === false;
                            const comunaNombre = comunaLabelByNumero.get(Number(b.comuna)) ?? `Comuna #${b.comuna ?? "—"}`;

                            return (
                                <tr key={b.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                                    <td style={td}>{b.id}</td>
                                    <td style={td}>{b.nombre}</td>
                                    <td style={td}>{comunaNombre}</td>
                                    <td style={td}><ActivoBadge activo={!inactivo} /></td>
                                    <td style={td}>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <button onClick={() => abrirEditar(b)}>Editar</button>

                                            <button
                                                onClick={() => toggleActivo(b)}
                                                style={{
                                                    background: "#fff",
                                                    border: `1px solid ${inactivo ? "#16a34a" : "#d33"}`,
                                                    color: inactivo ? "#16a34a" : "#d33",
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
                                <td style={{ padding: 12, color: "#666" }} colSpan={5}>
                                    No hay barrios con ese filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* modal */}
            {open && (
                <div style={styles.backdrop}>
                    <div style={styles.modal}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <h3 style={{ margin: 0 }}>
                                {editing ? `Editar barrio #${editing.id}` : "Crear barrio"}
                            </h3>
                            <button onClick={() => setOpen(false)}>X</button>
                        </div>

                        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                            <input
                                value={form.nombre}
                                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                placeholder="Nombre del barrio"
                                style={inp}
                            />

                            <select
                                value={form.comunaNumero}
                                onChange={(e) => setForm((p) => ({ ...p, comunaNumero: e.target.value }))}
                                style={inp}
                            >
                                <option value="">-- Selecciona comuna --</option>
                                {comunas.map((c) => (
                                    <option key={c.numero} value={c.numero}>
                                        Comuna {c.numero}
                                    </option>
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

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}

const th = { padding: 10, fontSize: 13, color: "#111827" };
const td = { padding: 10, fontSize: 13, color: "#111827", verticalAlign: "top" };
const inp = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" };

const styles = {
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
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
