import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useClientePedidosRealtime } from "../realtime/useClientePedidosRealtime";
import { useBarriosRealtime } from "../realtime/useBarriosRealtime";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import PedidoDetalleModal from "../components/PedidoDetalleModal";
import SearchableSelect from "../components/SearchableSelect";
import TarifasPanel from "./TarifasPanel";
import s from "./ClientePanel.module.css";

function toNumberMoney(val) {
    if (val == null) return 0;
    const n = Number(String(val).replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) ? n : 0;
}

function EstadoPedidoBadge({ estado }) {
    const cfg = {
        CREADO: { bg: "#2a2a2d", color: "#d1d5db", text: "⚪ CREADO" },
        ASIGNADO: { bg: "#1a1f2e", color: "#93c5fd", text: "🔵 ASIGNADO" },
        EN_CAMINO: { bg: "#1e1a2e", color: "#a5b4fc", text: "🟣 EN CAMINO" },
        ENTREGADO: { bg: "#0f2e1a", color: "#22c55e", text: "🟢 ENTREGADO" },
        CANCELADO: { bg: "#3d1a1a", color: "#ef4444", text: "🔴 CANCELADO" },
        INCIDENCIA: { bg: "#2d1f0a", color: "#fcd34d", text: "🆘 INCIDENCIA" },
    }[estado] || { bg: "#2a2a2d", color: "#d1d5db", text: estado };

    return (
        <span className={s.badge} style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.text}
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
                    <button className={s.btn} onClick={onCancel} disabled={loading}>Volver</button>
                    <button className={s.btnDanger} onClick={onConfirm} disabled={loading}>
                        {loading ? "Procesando..." : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SolicitarPedidoModal({ open, onClose, onCreated, direcciones, barriosOptions }) {
    const [direccionId, setDireccionId] = useState("");
    const [form, setForm] = useState({
        direccionRecogida: "", barrioRecogida: "", telefonoContactoRecogida: "",
        direccionEntrega: "", barrioEntrega: "", nombreQuienRecibe: "", telefonoQuienRecibe: "",
    });
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (open) {
            setDireccionId("");
            setForm({ direccionRecogida: "", barrioRecogida: "", telefonoContactoRecogida: "", direccionEntrega: "", barrioEntrega: "", nombreQuienRecibe: "", telefonoQuienRecibe: "" });
            setTouched({});
            setToast(null);
        }
    }, [open]);

    function seleccionarDireccion(dir) {
        if (String(dir.id) === String(direccionId)) {
            setDireccionId("");
            setForm((p) => ({ ...p, direccionRecogida: "", barrioRecogida: "", telefonoContactoRecogida: "" }));
        } else {
            setDireccionId(dir.id);
            const normalize = (s) => String(s ?? "").trim().toLowerCase();
            const matchBarrio = barriosOptions.find((o) => normalize(o.value) === normalize(dir.barrio));
            setForm((p) => ({
                ...p,
                direccionRecogida: dir.direccionRecogida ?? "",
                barrioRecogida: matchBarrio ? matchBarrio.value : (dir.barrio ?? ""),
                telefonoContactoRecogida: dir.telefonoContacto ?? "",
            }));
        }
    }

    const errors = useMemo(() => {
        const e = {};
        if (!form.direccionRecogida.trim()) e.direccionRecogida = "La dirección de recogida es obligatoria.";
        if (!form.barrioRecogida.trim()) e.barrioRecogida = "El barrio de recogida es obligatorio.";
        if (!form.telefonoContactoRecogida.trim()) e.telefonoContactoRecogida = "El teléfono de contacto es obligatorio.";
        if (!form.direccionEntrega.trim()) e.direccionEntrega = "La dirección de entrega es obligatoria.";
        if (!form.barrioEntrega.trim()) e.barrioEntrega = "El barrio de entrega es obligatorio.";
        if (!form.nombreQuienRecibe.trim()) e.nombreQuienRecibe = "El nombre de quien recibe es obligatorio.";
        if (!form.telefonoQuienRecibe.trim()) e.telefonoQuienRecibe = "El teléfono de quien recibe es obligatorio.";
        return e;
    }, [form]);

    async function guardar() {
        setTouched({ direccionRecogida: true, barrioRecogida: true, telefonoContactoRecogida: true, direccionEntrega: true, barrioEntrega: true, nombreQuienRecibe: true, telefonoQuienRecibe: true });
        if (Object.keys(errors).length > 0) return;
        setLoading(true); setToast(null);
        try {
            const body = direccionId ? { direccionId: Number(direccionId), ...form } : { ...form };
            const res = await authFetch("/api/cliente/pedidos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const creado = await res.json().catch(() => null);
            onCreated?.(creado);
            onClose?.();
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div className={s.backdrop}>
            <div className={s.modal}>
                <div className={s.modalHeader}>
                    <h3>🛵 Solicitar servicio</h3>
                    <button className={s.btnClose} onClick={onClose}>✕</button>
                </div>

                <div className={s.modalBody}>
                    {direcciones.length > 0 && (
                        <>
                            <div className={s.dirSelector}>
                                <div className={s.dirSelectorTitle}>Usar dirección guardada (recogida):</div>
                                {direcciones.map((d) => (
                                    <button
                                        key={d.id}
                                        type="button"
                                        className={`${s.dirSelectorBtn} ${String(d.id) === String(direccionId) ? s.dirSelectorBtnActivo : ""}`}
                                        onClick={() => seleccionarDireccion(d)}
                                    >
                                        📍 {d.direccionRecogida} — {d.barrio}
                                        {d.telefonoContacto && ` · ${d.telefonoContacto}`}
                                    </button>
                                ))}
                            </div>
                            <div className={s.divider}>o ingresa manualmente</div>
                        </>
                    )}

                    <div className={s.seccionLabel}>📦 Datos de recogida</div>

                    <div className={s.grid2}>
                        <div className={s.field}>
                            <label className={s.fieldLabel}>Dirección de recogida</label>
                            <input
                                className={`${s.input} ${touched.direccionRecogida && errors.direccionRecogida ? s.inputError : ""}`}
                                value={form.direccionRecogida}
                                onChange={(e) => setForm((p) => ({ ...p, direccionRecogida: e.target.value }))}
                                onBlur={() => setTouched((t) => ({ ...t, direccionRecogida: true }))}
                                placeholder="Ej: Calle 10 # 5-20"
                            />
                            {touched.direccionRecogida && errors.direccionRecogida && <div className={s.helper}>⚠️ {errors.direccionRecogida}</div>}
                        </div>
                        <div className={s.field}>
                            <label className={s.fieldLabel}>Barrio de recogida</label>
                            <SearchableSelect
                                options={barriosOptions} value={form.barrioRecogida}
                                onChange={(v) => setForm((p) => ({ ...p, barrioRecogida: v }))}
                                onBlur={() => setTouched((t) => ({ ...t, barrioRecogida: true }))}
                                placeholder="-- Selecciona barrio --"
                                error={!!(touched.barrioRecogida && errors.barrioRecogida)}
                            />
                            {touched.barrioRecogida && errors.barrioRecogida && <div className={s.helper}>⚠️ {errors.barrioRecogida}</div>}
                        </div>
                    </div>

                    <div className={s.field}>
                        <label className={s.fieldLabel}>Teléfono de contacto en recogida</label>
                        <input
                            className={`${s.input} ${touched.telefonoContactoRecogida && errors.telefonoContactoRecogida ? s.inputError : ""}`}
                            value={form.telefonoContactoRecogida}
                            onChange={(e) => setForm((p) => ({ ...p, telefonoContactoRecogida: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, telefonoContactoRecogida: true }))}
                            placeholder="Ej: 3001234567" inputMode="tel"
                        />
                        {touched.telefonoContactoRecogida && errors.telefonoContactoRecogida && <div className={s.helper}>⚠️ {errors.telefonoContactoRecogida}</div>}
                    </div>

                    <div className={s.seccionLabel}>🏠 Datos de entrega</div>

                    <div className={s.grid2}>
                        <div className={s.field}>
                            <label className={s.fieldLabel}>Dirección de entrega</label>
                            <input
                                className={`${s.input} ${touched.direccionEntrega && errors.direccionEntrega ? s.inputError : ""}`}
                                value={form.direccionEntrega}
                                onChange={(e) => setForm((p) => ({ ...p, direccionEntrega: e.target.value }))}
                                onBlur={() => setTouched((t) => ({ ...t, direccionEntrega: true }))}
                                placeholder="Ej: Carrera 15 # 80-10"
                            />
                            {touched.direccionEntrega && errors.direccionEntrega && <div className={s.helper}>⚠️ {errors.direccionEntrega}</div>}
                        </div>
                        <div className={s.field}>
                            <label className={s.fieldLabel}>Barrio de entrega</label>
                            <SearchableSelect
                                options={barriosOptions} value={form.barrioEntrega}
                                onChange={(v) => setForm((p) => ({ ...p, barrioEntrega: v }))}
                                onBlur={() => setTouched((t) => ({ ...t, barrioEntrega: true }))}
                                placeholder="-- Selecciona barrio --"
                                error={!!(touched.barrioEntrega && errors.barrioEntrega)}
                            />
                            {touched.barrioEntrega && errors.barrioEntrega && <div className={s.helper}>⚠️ {errors.barrioEntrega}</div>}
                        </div>
                    </div>

                    <div className={s.grid2}>
                        <div className={s.field}>
                            <label className={s.fieldLabel}>Nombre de quien recibe</label>
                            <input
                                className={`${s.input} ${touched.nombreQuienRecibe && errors.nombreQuienRecibe ? s.inputError : ""}`}
                                value={form.nombreQuienRecibe}
                                onChange={(e) => setForm((p) => ({ ...p, nombreQuienRecibe: e.target.value }))}
                                onBlur={() => setTouched((t) => ({ ...t, nombreQuienRecibe: true }))}
                                placeholder="Ej: Juan Pérez"
                            />
                            {touched.nombreQuienRecibe && errors.nombreQuienRecibe && <div className={s.helper}>⚠️ {errors.nombreQuienRecibe}</div>}
                        </div>
                        <div className={s.field}>
                            <label className={s.fieldLabel}>Teléfono de quien recibe</label>
                            <input
                                className={`${s.input} ${touched.telefonoQuienRecibe && errors.telefonoQuienRecibe ? s.inputError : ""}`}
                                value={form.telefonoQuienRecibe}
                                onChange={(e) => setForm((p) => ({ ...p, telefonoQuienRecibe: e.target.value }))}
                                onBlur={() => setTouched((t) => ({ ...t, telefonoQuienRecibe: true }))}
                                placeholder="Ej: 3109876543" inputMode="tel"
                            />
                            {touched.telefonoQuienRecibe && errors.telefonoQuienRecibe && <div className={s.helper}>⚠️ {errors.telefonoQuienRecibe}</div>}
                        </div>
                    </div>
                </div>

                {toast && <div className={s.toastError}>⛔ {toast.message}</div>}

                <div className={s.modalFooter}>
                    <button className={s.btn} onClick={onClose} disabled={loading}>Cancelar</button>
                    <button className={s.btnPrimary} onClick={guardar} disabled={loading}>
                        {loading ? "Solicitando..." : "Solicitar servicio"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DireccionModal({ open, onClose, onSaved, editing, barriosOptions }) {
    const [form, setForm] = useState({ direccionRecogida: "", barrio: "", telefonoContacto: "" });
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (open) {
            setForm({ direccionRecogida: editing?.direccionRecogida ?? "", barrio: editing?.barrio ?? "", telefonoContacto: editing?.telefonoContacto ?? "" });
            setTouched({});
            setToast(null);
        }
    }, [open, editing]);

    const errors = useMemo(() => {
        const e = {};
        if (!form.direccionRecogida.trim()) e.direccionRecogida = "La dirección es obligatoria.";
        if (!form.barrio.trim()) e.barrio = "El barrio es obligatorio.";
        if (!form.telefonoContacto.trim()) e.telefonoContacto = "El teléfono de contacto es obligatorio.";
        return e;
    }, [form]);

    async function guardar() {
        setTouched({ direccionRecogida: true, barrio: true, telefonoContacto: true });
        if (Object.keys(errors).length > 0) return;
        setLoading(true); setToast(null);
        try {
            const url = editing ? `/api/cliente/direcciones/${editing.id}` : "/api/cliente/direcciones";
            const res = await authFetch(url, {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direccionRecogida: form.direccionRecogida.trim(), barrio: form.barrio.trim(), telefonoContacto: form.telefonoContacto.trim() }),
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const resultado = await res.json().catch(() => null);
            onSaved?.(resultado, !!editing);
            onClose?.();
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div className={s.backdrop}>
            <div className={s.modal}>
                <div className={s.modalHeader}>
                    <h3>{editing ? "Editar dirección" : "Nueva dirección"}</h3>
                    <button className={s.btnClose} onClick={onClose}>✕</button>
                </div>

                <div className={s.modalBody}>
                    <div className={s.field}>
                        <label className={s.fieldLabel}>Dirección</label>
                        <input
                            className={`${s.input} ${touched.direccionRecogida && errors.direccionRecogida ? s.inputError : ""}`}
                            value={form.direccionRecogida}
                            onChange={(e) => setForm((p) => ({ ...p, direccionRecogida: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, direccionRecogida: true }))}
                            placeholder="Ej: Calle 10 # 5-20"
                        />
                        {touched.direccionRecogida && errors.direccionRecogida && <div className={s.helper}>⚠️ {errors.direccionRecogida}</div>}
                    </div>

                    <div className={s.field}>
                        <label className={s.fieldLabel}>Barrio</label>
                        <SearchableSelect
                            options={barriosOptions} value={form.barrio}
                            onChange={(v) => setForm((p) => ({ ...p, barrio: v }))}
                            onBlur={() => setTouched((t) => ({ ...t, barrio: true }))}
                            placeholder="-- Selecciona barrio --"
                            error={!!(touched.barrio && errors.barrio)}
                        />
                        {touched.barrio && errors.barrio && <div className={s.helper}>⚠️ {errors.barrio}</div>}
                    </div>

                    <div className={s.field}>
                        <label className={s.fieldLabel}>Teléfono de contacto</label>
                        <input
                            className={`${s.input} ${touched.telefonoContacto && errors.telefonoContacto ? s.inputError : ""}`}
                            value={form.telefonoContacto}
                            onChange={(e) => setForm((p) => ({ ...p, telefonoContacto: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, telefonoContacto: true }))}
                            placeholder="Ej: 3001234567" inputMode="tel"
                        />
                        {touched.telefonoContacto && errors.telefonoContacto && <div className={s.helper}>⚠️ {errors.telefonoContacto}</div>}
                    </div>
                </div>

                {toast && <div className={s.toastError}>⛔ {toast.message}</div>}

                <div className={s.modalFooter}>
                    <button className={s.btn} onClick={onClose} disabled={loading}>Cancelar</button>
                    <button className={s.btnPrimary} onClick={guardar} disabled={loading}>
                        {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear dirección"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const TABS = [
    { key: "inicio", label: "Inicio" },
    { key: "direcciones", label: "Direcciones" },
    { key: "historial", label: "Historial" },
    { key: "tarifas", label: "Tarifas" },
];

const ESTADOS_ACTIVOS = new Set(["CREADO", "ASIGNADO", "EN_CAMINO", "INCIDENCIA"]);

export default function ClientePanel() {
    const { token, userId, logout } = useAuth();
    const [tab, setTab] = useState("inicio");
    const [toast, setToast] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [diaFiltro, setDiaFiltro] = useState("");
    const [direcciones, setDirecciones] = useState([]);
    const [loadingDirecciones, setLoadingDirecciones] = useState(false);
    const [barrios, setBarrios] = useState([]);
    const barriosOptions = useMemo(() => barrios.map((b) => ({ value: b.nombre, label: b.nombre })), [barrios]);
    const [openSolicitar, setOpenSolicitar] = useState(false);
    const [openDireccion, setOpenDireccion] = useState(false);
    const [editingDireccion, setEditingDireccion] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, pedidoId: null });
    const [loadingCancelar, setLoadingCancelar] = useState(false);
    const [confirmDir, setConfirmDir] = useState({ open: false, direccionId: null });
    const [loadingEliminarDir, setLoadingEliminarDir] = useState(false);
    const [detalle, setDetalle] = useState(null);

    const onPedidoRealtime = useCallback((pedido) => {
        setPedidos((prev) => {
            const idx = prev.findIndex((p) => p.id === pedido.id);
            if (idx === -1) return [pedido, ...prev];
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...pedido };
            return copy;
        });
        setDetalle((d) => d?.id === pedido.id ? { ...d, ...pedido } : d);
    }, []);

    const onBarrioRealtime = useCallback((barrio) => {
        setBarrios((prev) => {
            if (!barrio.activo) return prev.filter((b) => b.id !== barrio.id);
            const idx = prev.findIndex((b) => b.id === barrio.id);
            if (idx === -1) return [...prev, barrio];
            const copy = [...prev];
            copy[idx] = barrio;
            return copy;
        });
    }, []);

    useClientePedidosRealtime({ token, userId, onPedido: onPedidoRealtime });
    useBarriosRealtime({ token, onBarrio: onBarrioRealtime });

    async function cargarPedidos() {
        setLoadingPedidos(true);
        try {
            const res = await authFetch("/api/cliente/pedidos");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setPedidos(Array.isArray(data) ? data.sort((a, b) => b.id - a.id) : []);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally { setLoadingPedidos(false); }
    }

    async function cargarDirecciones() {
        setLoadingDirecciones(true);
        try {
            const res = await authFetch("/api/cliente/direcciones");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setDirecciones(Array.isArray(data) ? data : []);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally { setLoadingDirecciones(false); }
    }

    async function cargarBarrios() {
        try {
            const res = await authFetch("/api/admin/barrios?includeInactivos=false");
            if (!res.ok) return;
            const data = await res.json();
            setBarrios(Array.isArray(data) ? data.filter((b) => b.activo !== false) : []);
        } catch { /**/ }
    }

    useEffect(() => { cargarPedidos(); cargarDirecciones(); cargarBarrios(); }, []);

    const pedidosActivos = useMemo(() => pedidos.filter((p) => ESTADOS_ACTIVOS.has(p.estado)), [pedidos]);
    const historialBase = useMemo(() => pedidos.filter((p) => !ESTADOS_ACTIVOS.has(p.estado)), [pedidos]);
    const historialFiltrado = useMemo(() => {
        if (!diaFiltro) return historialBase;
        return historialBase.filter((p) => String(p.fechaCreacion ?? "").slice(0, 10) === diaFiltro);
    }, [historialBase, diaFiltro]);

    async function confirmarCancelar() {
        setLoadingCancelar(true);
        try {
            const res = await authFetch(`/api/cliente/pedidos/${confirm.pedidoId}`, { method: "PATCH" });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setPedidos((prev) => prev.map((p) => p.id === confirm.pedidoId ? { ...p, estado: "CANCELADO" } : p));
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally { setLoadingCancelar(false); setConfirm({ open: false, pedidoId: null }); }
    }

    async function confirmarEliminarDir() {
        setLoadingEliminarDir(true);
        try {
            const res = await authFetch(`/api/cliente/direcciones/${confirmDir.direccionId}`, { method: "DELETE" });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setDirecciones((prev) => prev.filter((d) => d.id !== confirmDir.direccionId));
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally { setLoadingEliminarDir(false); setConfirmDir({ open: false, direccionId: null }); }
    }

    return (
        <div className={s.container}>

            <div className={s.header}>
                <h2>GoFast</h2>
                <button className={s.btnLogout} onClick={logout}>Cerrar sesión</button>
            </div>

            <nav className={s.nav}>
                {TABS.map(({ key, label }) => (
                    <button key={key} className={`${s.navBtn} ${tab === key ? s.navBtnActive : ""}`} onClick={() => setTab(key)}>
                        {label}
                    </button>
                ))}
            </nav>
            {tab === "inicio" && (
                <>
                    <button className={s.btnSolicitar} onClick={() => setOpenSolicitar(true)}>
                        + Solicitar servicio
                    </button>

                    <div className={s.section}>
                        <div className={s.sectionHeader}>
                            <h3>Pedidos activos</h3>
                            <button className={s.btn} onClick={cargarPedidos} disabled={loadingPedidos}>
                                {loadingPedidos ? "Cargando..." : "Recargar"}
                            </button>
                        </div>

                        <div className={s.lista}>
                            {pedidosActivos.length === 0 && <div className={s.vacio}>No tienes pedidos activos en este momento.</div>}

                            {pedidosActivos.map((p) => (
                                <div key={p.id} className={`${s.card} ${s.cardClickable}`}
                                    onClick={(e) => { if (!e.target.closest("button")) setDetalle(p); }}
                                    title="Click para ver detalle">
                                    <div className={s.cardInfo}>
                                        <div className={s.cardTitulo}>
                                            <b>#{p.id}</b>
                                            <EstadoPedidoBadge estado={p.estado} />
                                        </div>
                                        {p.estado === "INCIDENCIA" && p.motivoIncidencia && (
                                            <div className={s.incidenciaBox}><b>🆘 Incidencia:</b> {p.motivoIncidencia}</div>
                                        )}
                                        <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                        <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                        <div><b>Recibe:</b> {p.nombreQuienRecibe} — {p.telefonoQuienRecibe}</div>
                                        <div><b>Costo:</b> ${toNumberMoney(p.costoServicio).toLocaleString("es-CO")}</div>
                                    </div>
                                    <div className={s.cardAcciones}>
                                        {(p.estado === "CREADO" || p.estado === "ASIGNADO") && (
                                            <button className={s.btnDanger} onClick={() => setConfirm({ open: true, pedidoId: p.id })}>
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
            {tab === "direcciones" && (
                <div className={s.section}>
                    <div className={s.sectionHeader}>
                        <h3>Mis direcciones</h3>
                        <div className={s.headerActions}>
                            <button className={s.btn} onClick={cargarDirecciones} disabled={loadingDirecciones}>
                                {loadingDirecciones ? "Cargando..." : "Recargar"}
                            </button>
                            <button className={s.btnPrimary} onClick={() => { setEditingDireccion(null); setOpenDireccion(true); }}>
                                + Nueva dirección
                            </button>
                        </div>
                    </div>

                    <div className={s.direccionesList}>
                        {direcciones.length === 0 && <div className={s.vacio}>Aún no tienes direcciones guardadas.</div>}

                        {direcciones.map((d) => (
                            <div key={d.id} className={s.dirCard}>
                                <div className={s.dirInfo}>
                                    <div className={s.dirNombre}>📍 {d.direccionRecogida}</div>
                                    <div className={s.dirMeta}>{d.barrio}{d.telefonoContacto ? ` · ${d.telefonoContacto}` : ""}</div>
                                </div>
                                <div className={s.dirAcciones}>
                                    <button className={s.btn} onClick={() => { setEditingDireccion(d); setOpenDireccion(true); }}>Editar</button>
                                    <button className={s.btnDanger} onClick={() => setConfirmDir({ open: true, direccionId: d.id })}>Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === "tarifas" && <TarifasPanel barrios={barrios} />}
            {tab === "historial" && (
                <div className={s.section}>
                    <div className={s.sectionHeader}>
                        <h3>Historial de pedidos</h3>
                        <button className={s.btn} onClick={cargarPedidos} disabled={loadingPedidos}>
                            {loadingPedidos ? "Cargando..." : "Recargar"}
                        </button>
                    </div>

                    <div className={s.filtros}>
                        <span className={s.filtroLabel}>Filtrar por día:</span>
                        <input type="date" className={s.inputDate} value={diaFiltro} onChange={(e) => setDiaFiltro(e.target.value)} />
                        <button className={s.btn} onClick={() => setDiaFiltro("")} disabled={!diaFiltro}>Quitar filtro</button>
                        <span className={s.contador}>Mostrando: <b>{historialFiltrado.length}</b> / {historialBase.length}</span>
                    </div>

                    <div className={s.lista}>
                        {historialFiltrado.length === 0 && (
                            <div className={s.vacio}>{diaFiltro ? "No hay pedidos para ese día." : "Aún no tienes pedidos en el historial."}</div>
                        )}
                        {historialFiltrado.map((p) => (
                            <div key={p.id} className={`${s.itemCard} ${s.itemCardClickable}`} onClick={() => setDetalle(p)} title="Click para ver detalle">
                                <div className={s.itemInfo}>
                                    <div className={s.cardTitulo}>
                                        <b>#{p.id}</b>
                                        <EstadoPedidoBadge estado={p.estado} />
                                    </div>
                                    <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                    <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                    <div><b>Costo:</b> ${toNumberMoney(p.costoServicio).toLocaleString("es-CO")}</div>
                                </div>
                                <div className={s.itemMeta}>
                                    {p.fechaCreacion && <div>Creado: {String(p.fechaCreacion).slice(0, 10)}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <PedidoDetalleModal
                open={!!detalle} pedido={detalle} onClose={() => setDetalle(null)}
                showCliente={false} showDomi={true}
                actions={detalle && (
                    <>
                        {(detalle.estado === "CREADO" || detalle.estado === "ASIGNADO") && (
                            <button className={s.btnDanger} onClick={() => { setDetalle(null); setConfirm({ open: true, pedidoId: detalle.id }); }}>
                                Cancelar pedido
                            </button>
                        )}
                        <button className={s.btn} onClick={() => setDetalle(null)}>Cerrar</button>
                    </>
                )}
            />

            <SolicitarPedidoModal
                open={openSolicitar} onClose={() => setOpenSolicitar(false)}
                direcciones={direcciones} barriosOptions={barriosOptions}
                onCreated={(creado) => { if (creado) setPedidos((prev) => [creado, ...prev]); else cargarPedidos(); }}
            />

            <DireccionModal
                open={openDireccion} onClose={() => setOpenDireccion(false)}
                editing={editingDireccion} barriosOptions={barriosOptions}
                onSaved={(resultado, wasEditing) => {
                    if (!resultado) { cargarDirecciones(); return; }
                    if (wasEditing) setDirecciones((prev) => prev.map((d) => d.id === resultado.id ? resultado : d));
                    else setDirecciones((prev) => [resultado, ...prev]);
                }}
            />

            <ConfirmModal open={confirm.open} mensaje={`¿Cancelar el pedido #${confirm.pedidoId}? Esta acción no se puede deshacer.`}
                onConfirm={confirmarCancelar} onCancel={() => setConfirm({ open: false, pedidoId: null })} loading={loadingCancelar} />

            <ConfirmModal open={confirmDir.open} mensaje="¿Eliminar esta dirección guardada?"
                onConfirm={confirmarEliminarDir} onCancel={() => setConfirmDir({ open: false, direccionId: null })} loading={loadingEliminarDir} />

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
