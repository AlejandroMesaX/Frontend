import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import { useDeliveryPedidosRealtime } from "../realtime/useDeliveryPedidosRealtime";
import Toast from "../components/Toast";
import s from "./DeliveryPanel.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNumberMoney(val) {
    if (val == null) return 0;
    const n = Number(String(val).replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) ? n : 0;
}

function yyyyMMddOf(fechaCreacion) {
    if (!fechaCreacion) return null;
    return String(fechaCreacion).slice(0, 10);
}

// ── Componentes pequeños ──────────────────────────────────────────────────────

function Metric({ label, value }) {
    return (
        <div className={s.metric}>
            <div className={s.metricLabel}>{label}</div>
            <div className={s.metricValue}>
                ${Number(value || 0).toLocaleString("es-CO")}
            </div>
        </div>
    );
}

// ── Modal incidencia (reemplaza prompt()) ─────────────────────────────────────

function IncidenciaModal({ open, onConfirm, onCancel, loading }) {
    const [motivo, setMotivo] = useState("");
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (open) { setMotivo(""); setTouched(false); }
    }, [open]);

    if (!open) return null;

    const hasError = touched && !motivo.trim();

    return (
        <div className={s.backdrop}>
            <div className={s.modal}>
                <div className={s.modalHeader}>
                    <h3>🆘 Reportar incidencia</h3>
                    <button className={s.btnClose} onClick={onCancel}>✕</button>
                </div>

                <div>
                    <textarea
                        className={`${s.textarea} ${hasError ? s.textareaError : ""}`}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder="Describe el problema detalladamente..."
                    />
                    {hasError && (
                        <div className={s.helper}>⚠️ El motivo es obligatorio.</div>
                    )}
                </div>

                <div className={s.modalFooter}>
                    <button className={s.btn} onClick={onCancel} disabled={loading}>
                        Cancelar
                    </button>
                    <button
                        className={s.btnWarning}
                        onClick={() => {
                            setTouched(true);
                            if (!motivo.trim()) return;
                            onConfirm(motivo.trim());
                        }}
                        disabled={loading}
                    >
                        {loading ? "Enviando..." : "Reportar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
    { key: "inicio", label: "Inicio" },
    { key: "historial", label: "Historial" },
    { key: "finanzas", label: "Finanzas" },
];

// ── Componente principal ──────────────────────────────────────────────────────

export default function DeliveryPanel() {
    const { token, userId, logout } = useAuth();

    const [tab, setTab] = useState("inicio");
    const [disponible, setDisponible] = useState(false);
    const [pedidoActual, setPedidoActual] = useState(null);
    const [toast, setToast] = useState(null);
    const [loadingDisponible, setLoadingDisponible] = useState(false);
    const [loadingAvanzar, setLoadingAvanzar] = useState(false);
    const [loadingAyuda, setLoadingAyuda] = useState(false);

    // Historial
    const [historial, setHistorial] = useState([]);
    const [loadingHist, setLoadingHist] = useState(false);
    const [diaFiltro, setDiaFiltro] = useState("");

    // Finanzas
    const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [finDia, setFinDia] = useState("");
    const [finDesde, setFinDesde] = useState("");
    const [finHasta, setFinHasta] = useState("");

    // Modal incidencia
    const [openIncidencia, setOpenIncidencia] = useState(false);

    // ── Realtime ────────────────────────────────────────────────────────────

    useDeliveryPedidosRealtime({
        token,
        userId,
        onPedido: (pedido) => setPedidoActual(pedido),
    });

    // ── Estados derivados ───────────────────────────────────────────────────

    const tienePedidoActivo =
        pedidoActual &&
        (pedidoActual.estado === "ASIGNADO" || pedidoActual.estado === "EN_CAMINO");

    const puedeTengoPedido = pedidoActual?.estado === "ASIGNADO";
    const puedeFinalizar = pedidoActual?.estado === "EN_CAMINO";
    const puedeAyuda = pedidoActual?.estado === "EN_CAMINO";

    // ── Acciones ────────────────────────────────────────────────────────────

    async function toggleDisponible() {
        if (tienePedidoActivo) {
            setToast(errorFronted("No puedes cambiar disponibilidad mientras tengas un pedido activo."));
            return;
        }

        setLoadingDisponible(true);
        try {
            const next = !disponible;
            const res = await authFetch("/api/delivery/me/disponibilidad", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ disponible: next }),
            });

            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setDisponible(next);

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingDisponible(false);
        }
    }

    async function avanzarEstado(nuevoEstado) {
        if (!pedidoActual) return;

        setLoadingAvanzar(true);
        try {
            const res = await authFetch(`/api/domiciliario/pedidos/${pedidoActual.id}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado }),
            });

            if (!res.ok) { setToast(await parseBackendError(res)); return; }

            let actualizado = null;
            try { actualizado = await res.json(); } catch { }

            if (nuevoEstado === "ENTREGADO") {
                setPedidoActual(null);
                setDisponible(true);
                return;
            }

            setPedidoActual((prev) => {
                if (!prev) return prev;
                return actualizado ?? { ...prev, estado: nuevoEstado };
            });

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingAvanzar(false);
        }
    }

    async function confirmarAyuda(motivo) {
        if (!pedidoActual) return;

        setLoadingAyuda(true);
        try {
            const res = await authFetch(`/api/domiciliario/pedidos/${pedidoActual.id}/ayuda`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ motivo }),
            });

            if (!res.ok) { setToast(await parseBackendError(res)); return; }

            setOpenIncidencia(false);
            setPedidoActual(null);
            setDisponible(true);

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingAyuda(false);
        }
    }

    // ── Historial ───────────────────────────────────────────────────────────

    async function cargarHistorial() {
        setLoadingHist(true);
        try {
            const res = await authFetch("/api/domiciliario/pedidos/me/entregados");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setHistorial(Array.isArray(data) ? data : []);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingHist(false);
        }
    }

    useEffect(() => {
        if (tab === "historial") cargarHistorial();
        if (tab === "finanzas") {
            if (!finDia && !finDesde && !finHasta) setFinDia(todayISO);
            cargarHistorial();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    // ── Memos ───────────────────────────────────────────────────────────────

    const historialFiltrado = useMemo(() => {
        if (!diaFiltro) return historial;
        return historial.filter((p) => String(p.fechaCreacion ?? "").slice(0, 10) === diaFiltro);
    }, [historial, diaFiltro]);

    const finanzasFiltrado = useMemo(() => {
        const base = Array.isArray(historial) ? historial : [];
        const dia = finDia || (!finDesde && !finHasta ? todayISO : "");

        if (dia) return base.filter((p) => yyyyMMddOf(p.fechaCreacion) === dia);

        const desde = finDesde || "0000-01-01";
        const hasta = finHasta || "9999-12-31";
        return base.filter((p) => {
            const f = yyyyMMddOf(p.fechaCreacion);
            return f && f >= desde && f <= hasta;
        });
    }, [historial, finDia, finDesde, finHasta, todayISO]);

    const finResumen = useMemo(() => {
        const total = finanzasFiltrado.reduce((acc, p) => acc + toNumberMoney(p.costoServicio), 0);
        const comisionEmpresa = total * 0.2;
        return { total, comisionEmpresa, netoDelivery: total - comisionEmpresa, pedidos: finanzasFiltrado.length };
    }, [finanzasFiltrado]);

    // ── Render ──────────────────────────────────────────────────────────────

    // Badge de estado del header
    const estadoBadgeStyle = {
        background: tienePedidoActivo ? "#fff7ed" : disponible ? "#ecfdf5" : "#f3f4f6",
        color: tienePedidoActivo ? "#9a3412" : disponible ? "#065f46" : "#374151",
    };
    const estadoBadgeText = tienePedidoActivo ? "🟠 Pedido activo" : disponible ? "🟢 Disponible" : "⚪ Desconectado";

    const pedidoEstadoStyle = {
        background: pedidoActual?.estado === "ASIGNADO" ? "#eff6ff" : "#eef2ff",
        color: pedidoActual?.estado === "ASIGNADO" ? "#1d4ed8" : "#4338ca",
    };

    return (
        <div className={s.container}>

            {/* Header */}
            <div className={s.header}>
                <h2>Domiciliario</h2>
                <button className={s.btnLogout} onClick={logout}>Cerrar sesión</button>
            </div>

            {/* Badges estado */}
            <div className={s.badges}>
                <span className={s.badge} style={estadoBadgeStyle}>{estadoBadgeText}</span>

                {pedidoActual?.estado && (
                    <span className={s.badge} style={pedidoEstadoStyle}>
                        {pedidoActual.estado === "ASIGNADO" ? "🔵 ASIGNADO" : "🟣 EN CAMINO"}
                    </span>
                )}

                {pedidoActual?.motivoIncidencia && (
                    <span
                        className={s.badge}
                        style={{ border: "1px solid #f59e0b", background: "#fff7ed", color: "#92400e", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={pedidoActual.motivoIncidencia}
                    >
                        🆘 Incidencia: {pedidoActual.motivoIncidencia}
                    </span>
                )}
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
                    <div className={s.disponibilidadRow}>
                        <button
                            className={`${s.btnDisponible} ${disponible ? s.btnDisponibleActivo : ""}`}
                            onClick={toggleDisponible}
                            disabled={tienePedidoActivo || loadingDisponible}
                            title={tienePedidoActivo ? "No puedes cambiar disponibilidad con un pedido activo" : ""}
                        >
                            {loadingDisponible ? "Actualizando..." : disponible ? "✅ Disponible" : "⛔ Desconectado"}
                        </button>
                        <span className={s.wsInfo}>
                            WS Topic: <code>/topic/delivery/{userId}/pedidos</code>
                        </span>
                    </div>

                    <div className={s.section}>
                        <h3 style={{ margin: 0 }}>Pedido actual</h3>

                        {!pedidoActual && (
                            <div className={s.vacio}>
                                Aún no tienes pedidos asignados. Mantente disponible.
                            </div>
                        )}

                        {pedidoActual && (
                            <div className={s.pedidoCard}>
                                <div className={s.pedidoTitulo}>
                                    <b>#{pedidoActual.id}</b>
                                    <span className={s.badge} style={pedidoEstadoStyle}>
                                        {pedidoActual.estado}
                                    </span>
                                </div>

                                {pedidoActual.motivoIncidencia && (
                                    <div className={s.incidenciaBox}>
                                        <b>🆘 Motivo de incidencia:</b> {pedidoActual.motivoIncidencia}
                                    </div>
                                )}

                                <div><b>Recogida:</b> {pedidoActual.barrioRecogida} — {pedidoActual.direccionRecogida}</div>
                                <div><b>Entrega:</b> {pedidoActual.barrioEntrega} — {pedidoActual.direccionEntrega}</div>
                                <div><b>Contacto recogida:</b> {pedidoActual.telefonoContactoRecogida}</div>
                                <div><b>Recibe:</b> {pedidoActual.nombreQuienRecibe} — {pedidoActual.telefonoQuienRecibe}</div>
                                <div><b>Costo:</b> ${toNumberMoney(pedidoActual.costoServicio).toLocaleString("es-CO")}</div>

                                <div className={s.pedidoAcciones}>
                                    <button
                                        className={s.btnAccion}
                                        onClick={() => avanzarEstado("EN_CAMINO")}
                                        disabled={!puedeTengoPedido || loadingAvanzar}
                                        title={!puedeTengoPedido ? "Solo cuando está ASIGNADO" : ""}
                                    >
                                        📦 Tengo el pedido
                                    </button>

                                    <button
                                        className={s.btnAccion}
                                        onClick={() => avanzarEstado("ENTREGADO")}
                                        disabled={!puedeFinalizar || loadingAvanzar}
                                        title={!puedeFinalizar ? "Solo cuando está EN_CAMINO" : ""}
                                    >
                                        ✅ Finalizar entrega
                                    </button>

                                    <button
                                        className={s.btnAyuda}
                                        onClick={() => setOpenIncidencia(true)}
                                        disabled={!puedeAyuda || loadingAvanzar}
                                        title={!puedeAyuda ? "Solo disponible cuando tienes el pedido (EN_CAMINO)" : ""}
                                    >
                                        🆘 Ayuda / No puedo finalizar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── HISTORIAL ── */}
            {tab === "historial" && (
                <div className={s.section}>
                    <div className={s.sectionHeader}>
                        <h3>Historial (entregados)</h3>
                        <button className={s.btn} onClick={cargarHistorial} disabled={loadingHist}>
                            {loadingHist ? "Cargando..." : "Recargar"}
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
                        <button
                            className={s.btn}
                            onClick={() => setDiaFiltro("")}
                            disabled={!diaFiltro}
                        >
                            Quitar filtro
                        </button>
                        <span className={s.contador}>
                            Mostrando: <b>{historialFiltrado.length}</b> / {historial.length}
                        </span>
                    </div>

                    <div className={s.lista}>
                        {loadingHist && <div className={s.vacio}>Cargando historial…</div>}

                        {!loadingHist && historialFiltrado.length === 0 && (
                            <div className={s.vacio}>
                                {diaFiltro ? "No hay pedidos entregados para ese día." : "Aún no tienes pedidos entregados."}
                            </div>
                        )}

                        {historialFiltrado.map((p) => (
                            <div key={p.id} className={s.itemCard}>
                                <div className={s.itemInfo}>
                                    <div><b>#{p.id}</b> — {p.estado}</div>
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

            {/* ── FINANZAS ── */}
            {tab === "finanzas" && (
                <div className={s.section}>
                    <div className={s.sectionHeader}>
                        <h3>Finanzas</h3>
                        <button className={s.btn} onClick={cargarHistorial} disabled={loadingHist}>
                            {loadingHist ? "Cargando..." : "Recargar"}
                        </button>
                    </div>

                    {/* Resumen */}
                    <div className={s.resumenBox}>
                        <div className={s.resumenTitulo}>
                            <span style={{ fontWeight: 800, fontSize: 16 }}>💰 Ganancias (según filtro)</span>
                            <span className={s.contador}>Pedidos: <b>{finResumen.pedidos}</b></span>
                        </div>
                        <div className={s.resumenMetrics}>
                            <Metric label="Total" value={finResumen.total} />
                            <Metric label="Comisión empresa (20%)" value={finResumen.comisionEmpresa} />
                            <Metric label="Tu neto (80%)" value={finResumen.netoDelivery} />
                        </div>
                    </div>

                    {/* Filtros */}
                    <div style={{ display: "grid", gap: 10 }}>
                        <div className={s.filtros}>
                            <span className={s.filtroLabel}>Filtrar por día:</span>
                            <input
                                type="date"
                                className={s.inputDate}
                                value={finDia}
                                onChange={(e) => { setFinDia(e.target.value); setFinDesde(""); setFinHasta(""); }}
                            />
                            <button className={s.btn} onClick={() => { setFinDia(todayISO); setFinDesde(""); setFinHasta(""); }}>
                                Hoy
                            </button>
                            <button className={s.btn} onClick={() => { setFinDia(todayISO); setFinDesde(""); setFinHasta(""); }}>
                                Limpiar
                            </button>
                        </div>

                        <div className={s.filtros}>
                            <span className={s.filtroLabel}>Rango:</span>
                            <span className={s.filtroLabelLight}>Desde</span>
                            <input
                                type="date"
                                className={s.inputDate}
                                value={finDesde}
                                onChange={(e) => { setFinDesde(e.target.value); setFinDia(""); }}
                            />
                            <span className={s.filtroLabelLight}>Hasta</span>
                            <input
                                type="date"
                                className={s.inputDate}
                                value={finHasta}
                                onChange={(e) => { setFinHasta(e.target.value); setFinDia(""); }}
                            />
                            <span className={s.contador}>
                                Mostrando: <b>{finanzasFiltrado.length}</b> / {historial.length}
                            </span>
                        </div>
                    </div>

                    {/* Lista */}
                    <div className={s.lista}>
                        {loadingHist && <div className={s.vacio}>Cargando…</div>}

                        {!loadingHist && finanzasFiltrado.length === 0 && (
                            <div className={s.vacio}>No hay pedidos entregados para el filtro seleccionado.</div>
                        )}

                        {finanzasFiltrado.map((p) => (
                            <div key={p.id} className={s.itemCard}>
                                <div className={s.itemInfo}>
                                    <div><b>#{p.id}</b> — {p.estado}</div>
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

            {/* Modal incidencia */}
            <IncidenciaModal
                open={openIncidencia}
                onConfirm={confirmarAyuda}
                onCancel={() => setOpenIncidencia(false)}
                loading={loadingAyuda}
            />

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
