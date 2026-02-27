import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import s from "./ClientePanel.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNumberMoney(val) {
    if (val == null) return 0;
    const n = Number(String(val).replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) ? n : 0;
}

// ── Badges ───────────────────────────────────────────────────────────────────

function EstadoPedidoBadge({ estado }) {
    const cfg = {
        CREADO: { bg: "#f3f4f6", color: "#374151", text: "⚪ CREADO" },
        ASIGNADO: { bg: "#eff6ff", color: "#1d4ed8", text: "🔵 ASIGNADO" },
        EN_CAMINO: { bg: "#eef2ff", color: "#4338ca", text: "🟣 EN CAMINO" },
        ENTREGADO: { bg: "#ecfdf5", color: "#065f46", text: "🟢 ENTREGADO" },
        CANCELADO: { bg: "#fef2f2", color: "#991b1b", text: "🔴 CANCELADO" },
        INCIDENCIA: { bg: "#fff7ed", color: "#92400e", text: "🆘 INCIDENCIA" },
    }[estado] || { bg: "#f3f4f6", color: "#374151", text: estado };

    return (
        <span className={s.badge} style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.text}
        </span>
    );
}

// ── Modal confirmación genérico ───────────────────────────────────────────────

function ConfirmModal({ open, mensaje, onConfirm, onCancel, loading }) {
    if (!open) return null;
    return (
        <div className={s.backdrop} style={{ zIndex: 10000 }}>
            <div className={s.confirmModal}>
                <p>{mensaje}</p>
                <div className={s.confirmFooter}>
                    <button className={s.btn} onClick={onCancel} disabled={loading}>
                        Volver
                    </button>
                    <button className={s.btnDanger} onClick={onConfirm} disabled={loading}>
                        {loading ? "Procesando..." : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Modal solicitar pedido ────────────────────────────────────────────────────

function SolicitarPedidoModal({ open, onClose, onCreated, direcciones, barrios }) {
    const [direccionId, setDireccionId] = useState("");
    const [form, setForm] = useState({
        direccionRecogida: "",
        barrioRecogida: "",
        telefonoContactoRecogida: "",
        direccionEntrega: "",
        barrioEntrega: "",
        nombreQuienRecibe: "",
        telefonoQuienRecibe: "",
    });
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (open) {
            setDireccionId("");
            setForm({
                direccionRecogida: "",
                barrioRecogida: "",
                telefonoContactoRecogida: "",
                direccionEntrega: "",
                barrioEntrega: "",
                nombreQuienRecibe: "",
                telefonoQuienRecibe: "",
            });
            setTouched({});
            setToast(null);
        }
    }, [open]);

    // Al seleccionar dirección guardada, autocompletar campos de recogida
    function seleccionarDireccion(dir) {
        if (String(dir.id) === String(direccionId)) {
            // deseleccionar
            setDireccionId("");
            setForm((p) => ({ ...p, direccionRecogida: "", barrioRecogida: "", telefonoContactoRecogida: "" }));
        } else {
            setDireccionId(dir.id);
            setForm((p) => ({
                ...p,
                direccionRecogida: dir.direccionRecogida ?? "",
                barrioRecogida: dir.barrio ?? "",
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

    const canSubmit = Object.keys(errors).length === 0;

    async function guardar() {
        setTouched({
            direccionRecogida: true, barrioRecogida: true, telefonoContactoRecogida: true,
            direccionEntrega: true, barrioEntrega: true, nombreQuienRecibe: true, telefonoQuienRecibe: true,
        });
        if (!canSubmit) return;

        setLoading(true);
        setToast(null);

        try {
            const body = direccionId
                ? { direccionId: Number(direccionId), ...form }
                : { ...form };

            const res = await authFetch("/api/cliente/pedidos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const error = await parseBackendError(res);
                setToast(error);
                return;
            }

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

                    {/* Selector dirección guardada */}
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

                    {/* Recogida */}
                    <div className={s.fieldLabel} style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>
                        📦 Datos de recogida
                    </div>

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
                            {touched.direccionRecogida && errors.direccionRecogida && (
                                <div className={s.helper}>⚠️ {errors.direccionRecogida}</div>
                            )}
                        </div>

                        <div className={s.field}>
                            <label className={s.fieldLabel}>Barrio de recogida</label>
                            {barrios.length > 0 ? (
                                <select
                                    className={`${s.select} ${touched.barrioRecogida && errors.barrioRecogida ? s.inputError : ""}`}
                                    value={form.barrioRecogida}
                                    onChange={(e) => setForm((p) => ({ ...p, barrioRecogida: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, barrioRecogida: true }))}
                                >
                                    <option value="">-- Selecciona barrio --</option>
                                    {barrios.map((b) => (
                                        <option key={b.id} value={b.nombre}>{b.nombre}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className={`${s.input} ${touched.barrioRecogida && errors.barrioRecogida ? s.inputError : ""}`}
                                    value={form.barrioRecogida}
                                    onChange={(e) => setForm((p) => ({ ...p, barrioRecogida: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, barrioRecogida: true }))}
                                    placeholder="Ej: El Centro"
                                />
                            )}
                            {touched.barrioRecogida && errors.barrioRecogida && (
                                <div className={s.helper}>⚠️ {errors.barrioRecogida}</div>
                            )}
                        </div>
                    </div>

                    <div className={s.field}>
                        <label className={s.fieldLabel}>Teléfono de contacto en recogida</label>
                        <input
                            className={`${s.input} ${touched.telefonoContactoRecogida && errors.telefonoContactoRecogida ? s.inputError : ""}`}
                            value={form.telefonoContactoRecogida}
                            onChange={(e) => setForm((p) => ({ ...p, telefonoContactoRecogida: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, telefonoContactoRecogida: true }))}
                            placeholder="Ej: 3001234567"
                            inputMode="tel"
                        />
                        {touched.telefonoContactoRecogida && errors.telefonoContactoRecogida && (
                            <div className={s.helper}>⚠️ {errors.telefonoContactoRecogida}</div>
                        )}
                    </div>

                    {/* Entrega */}
                    <div className={s.fieldLabel} style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginTop: 4 }}>
                        🏠 Datos de entrega
                    </div>

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
                            {touched.direccionEntrega && errors.direccionEntrega && (
                                <div className={s.helper}>⚠️ {errors.direccionEntrega}</div>
                            )}
                        </div>

                        <div className={s.field}>
                            <label className={s.fieldLabel}>Barrio de entrega</label>
                            {barrios.length > 0 ? (
                                <select
                                    className={`${s.select} ${touched.barrioEntrega && errors.barrioEntrega ? s.inputError : ""}`}
                                    value={form.barrioEntrega}
                                    onChange={(e) => setForm((p) => ({ ...p, barrioEntrega: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, barrioEntrega: true }))}
                                >
                                    <option value="">-- Selecciona barrio --</option>
                                    {barrios.map((b) => (
                                        <option key={b.id} value={b.nombre}>{b.nombre}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className={`${s.input} ${touched.barrioEntrega && errors.barrioEntrega ? s.inputError : ""}`}
                                    value={form.barrioEntrega}
                                    onChange={(e) => setForm((p) => ({ ...p, barrioEntrega: e.target.value }))}
                                    onBlur={() => setTouched((t) => ({ ...t, barrioEntrega: true }))}
                                    placeholder="Ej: La Esmeralda"
                                />
                            )}
                            {touched.barrioEntrega && errors.barrioEntrega && (
                                <div className={s.helper}>⚠️ {errors.barrioEntrega}</div>
                            )}
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
                            {touched.nombreQuienRecibe && errors.nombreQuienRecibe && (
                                <div className={s.helper}>⚠️ {errors.nombreQuienRecibe}</div>
                            )}
                        </div>

                        <div className={s.field}>
                            <label className={s.fieldLabel}>Teléfono de quien recibe</label>
                            <input
                                className={`${s.input} ${touched.telefonoQuienRecibe && errors.telefonoQuienRecibe ? s.inputError : ""}`}
                                value={form.telefonoQuienRecibe}
                                onChange={(e) => setForm((p) => ({ ...p, telefonoQuienRecibe: e.target.value }))}
                                onBlur={() => setTouched((t) => ({ ...t, telefonoQuienRecibe: true }))}
                                placeholder="Ej: 3109876543"
                                inputMode="tel"
                            />
                            {touched.telefonoQuienRecibe && errors.telefonoQuienRecibe && (
                                <div className={s.helper}>⚠️ {errors.telefonoQuienRecibe}</div>
                            )}
                        </div>
                    </div>
                </div>

                {toast && (
                    <div style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#fef2f2",
                        border: "1px solid #fca5a5",
                        color: "#991b1b",
                        fontSize: 13,
                    }}>
                        ⛔ {toast.message}
                    </div>
                )}

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

// ── Modal dirección ───────────────────────────────────────────────────────────

function DireccionModal({ open, onClose, onSaved, editing, barrios }) {
    const [form, setForm] = useState({ direccionRecogida: "", barrio: "", telefonoContacto: "" });
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (open) {
            setForm({
                direccionRecogida: editing?.direccionRecogida ?? "",
                barrio: editing?.barrio ?? "",
                telefonoContacto: editing?.telefonoContacto ?? "",
            });
            setTouched({});
            setToast(null);
        }
    }, [open, editing]);

    const errors = useMemo(() => {
        const e = {};
        if (!form.direccionRecogida.trim()) e.direccionRecogida = "La dirección es obligatoria.";
        if (!form.barrio.trim()) e.barrio = "El barrio es obligatorio.";
        return e;
    }, [form]);

    const canSubmit = Object.keys(errors).length === 0;

    async function guardar() {
        setTouched({ direccionRecogida: true, barrio: true });
        if (!canSubmit) return;

        setLoading(true);
        setToast(null);

        try {
            const url = editing
                ? `/api/cliente/direcciones/${editing.id}`
                : "/api/cliente/direcciones";
            const method = editing ? "PUT" : "POST";

            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    direccionRecogida: form.direccionRecogida.trim(),
                    barrio: form.barrio.trim(),
                    telefonoContacto: form.telefonoContacto.trim() || null,
                }),
            });

            if (!res.ok) {
                const error = await parseBackendError(res);
                setToast(error);
                return;
            }

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
                        {touched.direccionRecogida && errors.direccionRecogida && (
                            <div className={s.helper}>⚠️ {errors.direccionRecogida}</div>
                        )}
                    </div>

                    <div className={s.field}>
                        <label className={s.fieldLabel}>Barrio</label>
                        {barrios.length > 0 ? (
                            <select
                                className={`${s.select} ${touched.barrio && errors.barrio ? s.inputError : ""}`}
                                value={form.barrio}
                                onChange={(e) => setForm((p) => ({ ...p, barrio: e.target.value }))}
                                onBlur={() => setTouched((t) => ({ ...t, barrio: true }))}
                            >
                                <option value="">-- Selecciona barrio --</option>
                                {barrios.map((b) => (
                                    <option key={b.id} value={b.nombre}>{b.nombre}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                className={`${s.input} ${touched.barrio && errors.barrio ? s.inputError : ""}`}
                                value={form.barrio}
                                onChange={(e) => setForm((p) => ({ ...p, barrio: e.target.value }))}
                                onBlur={() => setTouched((t) => ({ ...t, barrio: true }))}
                                placeholder="Ej: El Centro"
                            />
                        )}
                        {touched.barrio && errors.barrio && (
                            <div className={s.helper}>⚠️ {errors.barrio}</div>
                        )}
                    </div>

                    <div className={s.field}>
                        <label className={s.fieldLabel}>Teléfono de contacto (opcional)</label>
                        <input
                            className={s.input}
                            value={form.telefonoContacto}
                            onChange={(e) => setForm((p) => ({ ...p, telefonoContacto: e.target.value }))}
                            placeholder="Ej: 3001234567"
                            inputMode="tel"
                        />
                    </div>
                </div>

                {toast && (
                    <div style={{
                        padding: "10px 12px", borderRadius: 10,
                        background: "#fef2f2", border: "1px solid #fca5a5",
                        color: "#991b1b", fontSize: 13,
                    }}>
                        ⛔ {toast.message}
                    </div>
                )}

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

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
    { key: "inicio", label: "Inicio" },
    { key: "direcciones", label: "Direcciones" },
    { key: "historial", label: "Historial" },
];

const ESTADOS_ACTIVOS = new Set(["CREADO", "ASIGNADO", "EN_CAMINO", "INCIDENCIA"]);

// ── Componente principal ──────────────────────────────────────────────────────

export default function ClientePanel() {
    const { logout } = useAuth();
    const [tab, setTab] = useState("inicio");
    const [toast, setToast] = useState(null);

    // Pedidos
    const [pedidos, setPedidos] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(false);

    // Historial filtros
    const [diaFiltro, setDiaFiltro] = useState("");

    // Direcciones
    const [direcciones, setDirecciones] = useState([]);
    const [loadingDirecciones, setLoadingDirecciones] = useState(false);

    // Barrios (para selectores)
    const [barrios, setBarrios] = useState([]);

    // Modal solicitar
    const [openSolicitar, setOpenSolicitar] = useState(false);

    // Modal dirección
    const [openDireccion, setOpenDireccion] = useState(false);
    const [editingDireccion, setEditingDireccion] = useState(null);

    // Modal confirmar cancelar
    const [confirm, setConfirm] = useState({ open: false, pedidoId: null });
    const [loadingCancelar, setLoadingCancelar] = useState(false);

    // Modal confirmar eliminar dirección
    const [confirmDir, setConfirmDir] = useState({ open: false, direccionId: null });
    const [loadingEliminarDir, setLoadingEliminarDir] = useState(false);

    // ── Carga ───────────────────────────────────────────────────────────────

    async function cargarPedidos() {
        setLoadingPedidos(true);
        try {
            const res = await authFetch("/api/cliente/pedidos");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setPedidos(Array.isArray(data) ? data.sort((a, b) => b.id - a.id) : []);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingPedidos(false);
        }
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
        } finally {
            setLoadingDirecciones(false);
        }
    }

    async function cargarBarrios() {
        try {
            const res = await authFetch("/api/barrios");
            if (!res.ok) return;
            const data = await res.json();
            setBarrios(Array.isArray(data) ? data.filter((b) => b.activo !== false) : []);
        } catch { /* silencioso — los campos serán texto libre */ }
    }

    useEffect(() => {
        cargarPedidos();
        cargarDirecciones();
        cargarBarrios();
    }, []);

    // ── Memos ───────────────────────────────────────────────────────────────

    const pedidosActivos = useMemo(
        () => pedidos.filter((p) => ESTADOS_ACTIVOS.has(p.estado)),
        [pedidos]
    );

    const historialFiltrado = useMemo(() => {
        const base = pedidos.filter((p) => !ESTADOS_ACTIVOS.has(p.estado));
        if (!diaFiltro) return base;
        return base.filter((p) => String(p.fechaCreacion ?? "").slice(0, 10) === diaFiltro);
    }, [pedidos, diaFiltro]);

    const historialBase = useMemo(
        () => pedidos.filter((p) => !ESTADOS_ACTIVOS.has(p.estado)),
        [pedidos]
    );

    // ── Cancelar pedido ─────────────────────────────────────────────────────

    async function confirmarCancelar() {
        setLoadingCancelar(true);
        try {
            const res = await authFetch(`/api/cliente/pedidos/${confirm.pedidoId}/cancelar`, {
                method: "PATCH",
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setPedidos((prev) =>
                prev.map((p) => p.id === confirm.pedidoId ? { ...p, estado: "CANCELADO" } : p)
            );
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingCancelar(false);
            setConfirm({ open: false, pedidoId: null });
        }
    }

    // ── Eliminar dirección ──────────────────────────────────────────────────

    async function confirmarEliminarDir() {
        setLoadingEliminarDir(true);
        try {
            const res = await authFetch(`/api/cliente/direcciones/${confirmDir.direccionId}`, {
                method: "DELETE",
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setDirecciones((prev) => prev.filter((d) => d.id !== confirmDir.direccionId));
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingEliminarDir(false);
            setConfirmDir({ open: false, direccionId: null });
        }
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className={s.container}>

            {/* Header */}
            <div className={s.header}>
                <h2>GoFast</h2>
                <button className={s.btnLogout} onClick={logout}>Cerrar sesión</button>
            </div>

            {/* Navbar */}
            <nav className={s.nav}>
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`${s.navBtn} ${tab === key ? s.navBtnActive : ""}`}
                        onClick={() => setTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {/* ── INICIO ── */}
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
                            {pedidosActivos.length === 0 && (
                                <div className={s.vacio}>No tienes pedidos activos en este momento.</div>
                            )}

                            {pedidosActivos.map((p) => (
                                <div key={p.id} className={s.card}>
                                    <div className={s.cardInfo}>
                                        <div className={s.cardTitulo}>
                                            <b>#{p.id}</b>
                                            <EstadoPedidoBadge estado={p.estado} />
                                        </div>

                                        {p.estado === "INCIDENCIA" && p.motivoIncidencia && (
                                            <div style={{
                                                padding: 8, borderRadius: 8,
                                                background: "#fff7ed", border: "1px solid #f59e0b",
                                                color: "#92400e", fontSize: 13,
                                            }}>
                                                <b>🆘 Incidencia:</b> {p.motivoIncidencia}
                                            </div>
                                        )}

                                        <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                        <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                        <div><b>Recibe:</b> {p.nombreQuienRecibe} — {p.telefonoQuienRecibe}</div>
                                        <div><b>Costo:</b> ${toNumberMoney(p.costoServicio).toLocaleString("es-CO")}</div>
                                    </div>

                                    <div className={s.cardAcciones}>
                                        {(p.estado === "CREADO" || p.estado === "ASIGNADO") && (
                                            <button
                                                className={s.btnDanger}
                                                onClick={() => setConfirm({ open: true, pedidoId: p.id })}
                                            >
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

            {/* ── DIRECCIONES ── */}
            {tab === "direcciones" && (
                <div className={s.section}>
                    <div className={s.sectionHeader}>
                        <h3>Mis direcciones</h3>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className={s.btn} onClick={cargarDirecciones} disabled={loadingDirecciones}>
                                {loadingDirecciones ? "Cargando..." : "Recargar"}
                            </button>
                            <button className={s.btnPrimary} onClick={() => { setEditingDireccion(null); setOpenDireccion(true); }}>
                                + Nueva dirección
                            </button>
                        </div>
                    </div>

                    <div className={s.direccionesList}>
                        {direcciones.length === 0 && (
                            <div className={s.vacio}>Aún no tienes direcciones guardadas.</div>
                        )}

                        {direcciones.map((d) => (
                            <div key={d.id} className={s.dirCard}>
                                <div className={s.dirInfo}>
                                    <div><b>📍 {d.direccionRecogida}</b></div>
                                    <div style={{ color: "#6b7280" }}>{d.barrio}{d.telefonoContacto ? ` · ${d.telefonoContacto}` : ""}</div>
                                </div>
                                <div className={s.dirAcciones}>
                                    <button
                                        className={s.btn}
                                        onClick={() => { setEditingDireccion(d); setOpenDireccion(true); }}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className={s.btnDanger}
                                        onClick={() => setConfirmDir({ open: true, direccionId: d.id })}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── HISTORIAL ── */}
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
                        <input
                            type="date"
                            className={s.inputDate}
                            value={diaFiltro}
                            onChange={(e) => setDiaFiltro(e.target.value)}
                        />
                        <button className={s.btn} onClick={() => setDiaFiltro("")} disabled={!diaFiltro}>
                            Quitar filtro
                        </button>
                        <span className={s.contador}>
                            Mostrando: <b>{historialFiltrado.length}</b> / {historialBase.length}
                        </span>
                    </div>

                    <div className={s.lista}>
                        {historialFiltrado.length === 0 && (
                            <div className={s.vacio}>
                                {diaFiltro ? "No hay pedidos para ese día." : "Aún no tienes pedidos en el historial."}
                            </div>
                        )}

                        {historialFiltrado.map((p) => (
                            <div key={p.id} className={s.itemCard}>
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
                                    {p.fechaCreacion && (
                                        <div>Creado: {String(p.fechaCreacion).slice(0, 10)}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal solicitar pedido */}
            <SolicitarPedidoModal
                open={openSolicitar}
                onClose={() => setOpenSolicitar(false)}
                direcciones={direcciones}
                barrios={barrios}
                onCreated={(creado) => {
                    if (creado) setPedidos((prev) => [creado, ...prev]);
                    else cargarPedidos();
                }}
            />

            {/* Modal dirección */}
            <DireccionModal
                open={openDireccion}
                onClose={() => setOpenDireccion(false)}
                editing={editingDireccion}
                barrios={barrios}
                onSaved={(resultado, wasEditing) => {
                    if (!resultado) { cargarDirecciones(); return; }
                    if (wasEditing) {
                        setDirecciones((prev) => prev.map((d) => d.id === resultado.id ? resultado : d));
                    } else {
                        setDirecciones((prev) => [resultado, ...prev]);
                    }
                }}
            />

            {/* Modal cancelar pedido */}
            <ConfirmModal
                open={confirm.open}
                mensaje={`¿Cancelar el pedido #${confirm.pedidoId}? Esta acción no se puede deshacer.`}
                onConfirm={confirmarCancelar}
                onCancel={() => setConfirm({ open: false, pedidoId: null })}
                loading={loadingCancelar}
            />

            {/* Modal eliminar dirección */}
            <ConfirmModal
                open={confirmDir.open}
                mensaje="¿Eliminar esta dirección guardada?"
                onConfirm={confirmarEliminarDir}
                onCancel={() => setConfirmDir({ open: false, direccionId: null })}
                loading={loadingEliminarDir}
            />

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
