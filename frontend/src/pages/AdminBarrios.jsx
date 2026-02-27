import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import s from "./AdminBarrios.module.css";

function ActivoBadge({ activo }) {
    return (
        <span className={`${s.badge} ${activo ? s.badgeActivo : s.badgeInactivo}`}>
            {activo ? "🟢 Activo" : "🔴 Inactivo"}
        </span>
    );
}

function ConfirmModal({ open, mensaje, onConfirm, onCancel, loading }) {
    if (!open) return null;
    return (
        <div className={s.backdrop} style={{ zIndex: 10000 }}>
            <div className={s.confirmModal}>
                <p>{mensaje}</p>
                <div className={s.confirmFooter}>
                    <button className={s.btn} onClick={onCancel} disabled={loading}>Cancelar</button>
                    <button className={s.btnDanger} onClick={onConfirm} disabled={loading}>
                        {loading ? "Procesando..." : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminBarrios() {
    const [barrios, setBarrios] = useState([]);
    const [comunas, setComunas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingGuardar, setLoadingGuardar] = useState(false);
    const [loadingToggle, setLoadingToggle] = useState(false);
    const [toast, setToast] = useState(null);

    const [q, setQ] = useState("");
    const [estado, setEstado] = useState("");
    const [comunaFiltro, setComunaFiltro] = useState("");

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nombre: "", comunaNumero: "" });
    const [touched, setTouched] = useState({});

    const [confirm, setConfirm] = useState({ open: false, barrio: null });

    async function cargarBarrios() {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/barrios?includeInactivos=true");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setBarrios(Array.isArray(data) ? data : []);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    }

    async function cargarComunas() {
        try {
            const res = await authFetch("/api/admin/comunas");
            if (!res.ok) return;
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            setComunas(
                arr.filter((c) => c && c.numero != null)
                    .map((c) => ({ id: c.id, numero: Number(c.numero), tarifaBase: c.tarifaBase, recargoPorSalto: c.recargoPorSalto }))
                    .sort((a, b) => a.numero - b.numero)
            );
        } catch {
            setToast(errorFronted("No se pudieron cargar las comunas."));
        }
    }

    useEffect(() => { cargarBarrios(); cargarComunas(); }, []);

    const comunaLabelByNumero = useMemo(() => {
        const m = new Map();
        comunas.forEach((c) => m.set(Number(c.numero), `Comuna ${c.numero}`));
        return m;
    }, [comunas]);

    const filtrados = useMemo(() => {
        const qq = q.trim().toLowerCase();
        return barrios.filter((b) => {
            const matchQ = !qq || String(b.nombre ?? "").toLowerCase().includes(qq);
            const isActivo = b.activo !== false;
            const matchEstado = !estado || (estado === "ACTIVO" && isActivo) || (estado === "INACTIVO" && !isActivo);
            const matchComuna = !comunaFiltro || Number(b.comuna) === Number(comunaFiltro);
            return matchQ && matchEstado && matchComuna;
        });
    }, [barrios, q, estado, comunaFiltro]);

    // ✅ Sistema unificado de validación en tiempo real
    const errors = useMemo(() => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = "El nombre del barrio es obligatorio.";
        if (!form.comunaNumero) e.comunaNumero = "Debes seleccionar una comuna.";
        return e;
    }, [form]);

    const canSubmit = Object.keys(errors).length === 0;

    function abrirCrear() {
        setEditing(null);
        setForm({ nombre: "", comunaNumero: "" });
        setTouched({});
        setOpen(true);
    }

    function abrirEditar(b) {
        setEditing(b);
        setForm({ nombre: b.nombre ?? "", comunaNumero: b.comuna != null ? String(b.comuna) : "" });
        setTouched({});
        setOpen(true);
    }

    async function guardar() {
        setTouched({ nombre: true, comunaNumero: true });
        if (!canSubmit) return;

        setLoadingGuardar(true);
        setToast(null);

        try {
            const url = editing ? `/api/admin/barrios/${editing.id}` : "/api/admin/barrios";
            const method = editing ? "PUT" : "POST";

            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre: form.nombre.trim(), comunaNumero: Number(form.comunaNumero) }),
            });

            if (!res.ok) {
                const error = await parseBackendError(res);
                setToast(error);
                return;
            }

            const resultado = await res.json().catch(() => null);
            if (editing) {
                setBarrios((prev) => resultado ? prev.map((x) => x.id === resultado.id ? resultado : x) : prev);
            } else {
                if (resultado) setBarrios((prev) => [resultado, ...prev]);
                else await cargarBarrios();
            }
            setOpen(false);

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingGuardar(false);
        }
    }

    function pedirConfirmToggle(b) { setConfirm({ open: true, barrio: b }); }

    async function confirmarToggle() {
        const b = confirm.barrio;
        const isActivo = b.activo !== false;
        setLoadingToggle(true);
        try {
            const url = isActivo ? `/api/admin/barrios/${b.id}/deshabilitar` : `/api/admin/barrios/${b.id}/reactivar`;
            const res = await authFetch(url, { method: "PATCH" });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setBarrios((prev) => prev.map((x) => x.id === b.id ? { ...x, activo: !isActivo } : x));
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingToggle(false);
            setConfirm({ open: false, barrio: null });
        }
    }

    return (
        <div className={s.container}>
            <div className={s.header}>
                <h3>Barrios</h3>
                <div className={s.headerActions}>
                    <button className={s.btn} onClick={() => { cargarBarrios(); cargarComunas(); }} disabled={loading}>
                        {loading ? "Cargando..." : "Recargar"}
                    </button>
                    <button className={s.btnPrimary} onClick={abrirCrear}>+ Crear barrio</button>
                </div>
            </div>

            <div className={s.filtros}>
                <input className={`${s.input} ${s.inputSearch}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre..." />
                <select className={s.select} value={comunaFiltro} onChange={(e) => setComunaFiltro(e.target.value)}>
                    <option value="">Todas las comunas</option>
                    {comunas.map((c) => <option key={c.numero} value={c.numero}>Comuna {c.numero}</option>)}
                </select>
                <select className={s.select} value={estado} onChange={(e) => setEstado(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="INACTIVO">Inactivos</option>
                </select>
                <span className={s.contador}>Mostrando: <b>{filtrados.length}</b> / {barrios.length}</span>
            </div>

            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th className={s.th}>ID</th>
                            <th className={s.th}>Barrio</th>
                            <th className={s.th}>Comuna</th>
                            <th className={s.th}>Estado</th>
                            <th className={s.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.map((b) => {
                            const inactivo = b.activo === false;
                            const comunaNombre = comunaLabelByNumero.get(Number(b.comuna)) ?? `Comuna #${b.comuna ?? "—"}`;
                            return (
                                <tr key={b.id}>
                                    <td className={s.td}>{b.id}</td>
                                    <td className={s.td}>{b.nombre}</td>
                                    <td className={s.td}>{comunaNombre}</td>
                                    <td className={s.td}><ActivoBadge activo={!inactivo} /></td>
                                    <td className={s.td}>
                                        <div className={s.tdAcciones}>
                                            <button className={s.btn} onClick={() => abrirEditar(b)}>Editar</button>
                                            <button className={inactivo ? s.btnSuccess : s.btnDanger} onClick={() => pedirConfirmToggle(b)}>
                                                {inactivo ? "Reactivar" : "Deshabilitar"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && filtrados.length === 0 && (
                            <tr><td className={s.emptyRow} colSpan={5}>No hay barrios con ese filtro.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {open && (
                <div className={s.backdrop}>
                    <div className={s.modal}>
                        <div className={s.modalHeader}>
                            <h3>{editing ? `Editar barrio #${editing.id}` : "Crear barrio"}</h3>
                            <button className={s.btnClose} onClick={() => setOpen(false)}>✕</button>
                        </div>

                        <div className={s.modalBody}>
                            {/* Nombre */}
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${touched.nombre && errors.nombre ? s.inputError : ""}`}
                                    value={form.nombre}
                                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
                                    placeholder="Nombre del barrio"
                                />
                                {touched.nombre && errors.nombre && (
                                    <div className={s.helper}> {errors.nombre}</div>
                                )}
                            </div>

                            {/* Comuna */}
                            <div className={s.field}>
                                <select
                                    className={`${s.select} ${touched.comunaNumero && errors.comunaNumero ? s.inputError : ""}`}
                                    value={form.comunaNumero}
                                    onChange={(e) => setForm((p) => ({ ...p, comunaNumero: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, comunaNumero: true }))}
                                >
                                    <option value="">-- Selecciona comuna --</option>
                                    {comunas.map((c) => <option key={c.numero} value={c.numero}>Comuna {c.numero}</option>)}
                                </select>
                                {touched.comunaNumero && errors.comunaNumero && (
                                    <div className={s.helper}> {errors.comunaNumero}</div>
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
                            <button className={s.btn} onClick={() => setOpen(false)} disabled={loadingGuardar}>Cancelar</button>
                            <button className={s.btnPrimary} onClick={guardar} disabled={loadingGuardar}>
                                {loadingGuardar ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirm.open}
                mensaje={confirm.barrio?.activo !== false ? `¿Deshabilitar "${confirm.barrio?.nombre}"?` : `¿Reactivar "${confirm.barrio?.nombre}"?`}
                onConfirm={confirmarToggle}
                onCancel={() => setConfirm({ open: false, barrio: null })}
                loading={loadingToggle}
            />

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
