import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import { useDeliveryPedidosRealtime } from "../realtime/useDeliveryPedidosRealtime";
import PedidoDetalleModal from "../components/PedidoDetalleModal";
import Toast from "../components/Toast";
import s from "./DeliveryPanel.module.css";

function toNumberMoney(val) {
    if (val == null) return 0;
    const n = Number(String(val).replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) ? n : 0;
}

function yyyyMMddOf(fecha) {
    if (!fecha) return null;
    return String(fecha).slice(0, 10);
}

function Metric({ label, value }) {
    return (
        <div className={s.metric}>
            <div className={s.metricLabel}>{label}</div>
            <div className={s.metricValue}>${Number(value || 0).toLocaleString("es-CO")}</div>
        </div>
    );
}

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
                <div className={s.modalBody}>
                    <textarea
                        className={`${s.textarea} ${hasError ? s.inputError : ""}`}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder="Describe el problema detalladamente..."
                        rows={4}
                    />
                    {hasError && <div className={s.helper}>⚠️ El motivo es obligatorio.</div>}
                </div>
                <div className={s.modalFooter}>
                    <button className={s.btn} onClick={onCancel} disabled={loading}>Cancelar</button>
                    <button
                        className={s.btnWarning}
                        onClick={() => { setTouched(true); if (!motivo.trim()) return; onConfirm(motivo.trim()); }}
                        disabled={loading}
                    >
                        {loading ? "Enviando..." : "Reportar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const TABS = [
    { key: "inicio", label: "Inicio" },
    { key: "historial", label: "Historial" },
    { key: "finanzas", label: "Finanzas" },
];

export default function DeliveryPanel() {
    const { token, userId, logout } = useAuth();

    const [tab, setTab] = useState("inicio");
    const [disponible, setDisponible] = useState(false);
    const [pedidoActual, setPedidoActual] = useState(null);
    const [toast, setToast] = useState(null);
    const [loadingDisponible, setLoadingDisponible] = useState(false);
    const [loadingAvanzar, setLoadingAvanzar] = useState(false);
    const [loadingAyuda, setLoadingAyuda] = useState(false);
    const [openIncidencia, setOpenIncidencia] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [gananciasHoy, setGananciasHoy] = useState([]);

    const [historial, setHistorial] = useState([]);
    const [loadingHist, setLoadingHist] = useState(false);
    const [diaFiltro, setDiaFiltro] = useState("");
    const todayISO = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }, []);
    const [finDia, setFinDia] = useState("");
    const [finDesde, setFinDesde] = useState("");
    const [finHasta, setFinHasta] = useState("");

    // ── Realtime ────────────────────────────────────────────────────────────

    useDeliveryPedidosRealtime({
        token, userId,
        onPedido: (pedido) => {
            // Limpiar pedido actual si terminó
            if (!pedido || pedido.estado === "ENTREGADO" || pedido.estado === "CANCELADO") {
                setPedidoActual(null);
            } else {
                setPedidoActual(pedido);
            }
            setDetalle((d) => d?.id === pedido?.id ? (pedido ? { ...d, ...pedido } : null) : d);
            // Acumular ganancias del día cuando se entrega
            if (pedido?.estado === "ENTREGADO") {
                const d = new Date();
                const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const fechaPedido = pedido.fechaCreacion ? String(pedido.fechaCreacion).slice(0, 10) : hoy;
                if (fechaPedido === hoy) {
                    setGananciasHoy((prev) => prev.find((p) => p.id === pedido.id) ? prev : [...prev, pedido]);
                }
            }
        },
    });

    // ── Derivados ───────────────────────────────────────────────────────────

    const tienePedidoActivo = pedidoActual &&
        (pedidoActual.estado === "ASIGNADO" || pedidoActual.estado === "EN_CAMINO");

    const puedeAyuda = pedidoActual?.estado === "EN_CAMINO";

    const btnAvance = pedidoActual?.estado === "ASIGNADO"
        ? { label: "📦 Tengo el pedido", estado: "EN_CAMINO" }
        : pedidoActual?.estado === "EN_CAMINO"
            ? { label: "✅ Finalizar entrega", estado: "ENTREGADO" }
            : null;

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
                setDetalle(null);
                setDisponible(true);
                return;
            }
            setPedidoActual((prev) => prev ? (actualizado ?? { ...prev, estado: nuevoEstado }) : prev);
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

    // ── Carga estado inicial al montar ──────────────────────────────────────

    useEffect(() => {
        (async () => {
            try {
                // Cargar pedido activo (persiste tras recarga)
                const resPedido = await authFetch("/api/domiciliario/pedidos/me/activo");
                if (resPedido.ok) {
                    const pedido = await resPedido.json().catch(() => null);
                    if (pedido?.id) {
                        setPedidoActual(pedido);
                        setDisponible(true); // si tiene pedido activo, estaba disponible
                    }
                }

                // Cargar disponibilidad actual
                const resMe = await authFetch("/api/delivery/me");
                if (resMe.ok) {
                    const me = await resMe.json().catch(() => null);
                    if (me?.disponible != null) setDisponible(me.disponible);
                }
            } catch { /* silencioso */ }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch("/api/domiciliario/pedidos/me/entregados");
                if (res.ok) {
                    const data = await res.json();
                    const d = new Date();
                    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    const deHoy = (Array.isArray(data) ? data : []).filter(
                        (p) => String(p.fechaCreacion ?? "").slice(0, 10) === hoy
                    );
                    setGananciasHoy(deHoy);
                }
            } catch { /* silencioso */ }
        })();
    }, []);

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
        return historial.filter((p) => yyyyMMddOf(p.fechaCreacion) === diaFiltro);
    }, [historial, diaFiltro]);

    const finanzasFiltrado = useMemo(() => {
        const base = Array.isArray(historial) ? historial : [];
        const dia = finDia || (!finDesde && !finHasta ? todayISO : "");
        if (dia) return base.filter((p) => yyyyMMddOf(p.fechaCreacion) === dia);
        const desde = finDesde || "0000-01-01";
        const hasta = finHasta || "9999-12-31";
        return base.filter((p) => { const f = yyyyMMddOf(p.fechaCreacion); return f && f >= desde && f <= hasta; });
    }, [historial, finDia, finDesde, finHasta, todayISO]);

    const finResumen = useMemo(() => {
        const total = finanzasFiltrado.reduce((acc, p) => acc + toNumberMoney(p.costoServicio), 0);
        const comisionEmpresa = total * 0.2;
        return { total, comisionEmpresa, netoDelivery: total - comisionEmpresa, pedidos: finanzasFiltrado.length };
    }, [finanzasFiltrado]);

    // ── Resumen ganancias hoy ───────────────────────────────────────────────

    const resumenHoy = useMemo(() => {
        const bruto = gananciasHoy.reduce((acc, p) => acc + (Number(p.costoServicio) || 0), 0);
        return { bruto, neto: bruto * 0.80, comision: bruto * 0.20, pedidos: gananciasHoy.length };
    }, [gananciasHoy]);

    // ── Render ──────────────────────────────────────────────────────────────

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
                <div className={s.headerLeft}>
                    <h2>GoFast</h2>
                    <span className={s.badge} style={estadoBadgeStyle}>{estadoBadgeText}</span>
                    {pedidoActual?.estado && (
                        <span className={s.badge} style={pedidoEstadoStyle}>
                            {pedidoActual.estado === "ASIGNADO" ? "🔵 ASIGNADO" : "🟣 EN CAMINO"}
                        </span>
                    )}
                </div>
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
                    {/* Disponibilidad */}
                    <div className={s.section}>
                        <div className={s.sectionHeader}>
                            <h3>Disponibilidad</h3>
                            <button
                                className={disponible ? s.btnDisponibleActivo : s.btnDisponible}
                                onClick={toggleDisponible}
                                disabled={tienePedidoActivo || loadingDisponible}
                                title={tienePedidoActivo ? "No puedes cambiar disponibilidad con un pedido activo" : ""}
                            >
                                {loadingDisponible
                                    ? "Actualizando..."
                                    : disponible
                                        ? "✅ Disponible — click para desconectarse"
                                        : "⛔ Desconectado — click para conectarse"}
                            </button>
                        </div>
                    </div>

                    {/* Ganancias del día */}
                    <div className={s.section}>
                        <div className={s.sectionHeader}>
                            <h3>💰 Tus ganancias hoy</h3>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{resumenHoy.pedidos} pedidos entregados</span>
                        </div>
                        <div className={s.metricsGrid}>
                            <div className={s.metric}>
                                <div className={s.metricLabel}>Total facturado</div>
                                <div className={s.metricValue}>${resumenHoy.bruto.toLocaleString("es-CO")}</div>
                            </div>
                            <div className={`${s.metric} ${s.metricHighlight}`}>
                                <div className={s.metricLabel}>Tu ganancia (80%)</div>
                                <div className={s.metricValue}>${resumenHoy.neto.toLocaleString("es-CO")}</div>
                            </div>
                            <div className={s.metric}>
                                <div className={s.metricLabel}>A pagar a la empresa (20%)</div>
                                <div className={s.metricValue}>${resumenHoy.comision.toLocaleString("es-CO")}</div>
                            </div>
                        </div>
                    </div>

                    {/* Pedido actual */}
                    <div className={s.section}>
                        <div className={s.sectionHeader}>
                            <h3>Pedido actual</h3>
                        </div>

                        {!pedidoActual ? (
                            <div className={s.vacio}>Aún no tienes pedidos asignados. Mantente disponible.</div>
                        ) : (
                            <div
                                className={`${s.card} ${s.cardClickable}`}
                                onClick={(e) => { if (!e.target.closest("button")) setDetalle(pedidoActual); }}
                                title="Click para ver detalle"
                            >
                                <div className={s.cardInfo}>
                                    <div className={s.cardTitulo}>
                                        <b>#{pedidoActual.id}</b>
                                        <span className={s.badge} style={pedidoEstadoStyle}>
                                            {pedidoActual.estado === "ASIGNADO" ? "🔵 ASIGNADO" : "🟣 EN CAMINO"}
                                        </span>
                                    </div>

                                    {pedidoActual.motivoIncidencia && (
                                        <div className={s.incidenciaBox}>
                                            <b>🆘 Incidencia:</b> {pedidoActual.motivoIncidencia}
                                        </div>
                                    )}

                                    <div className={s.cardGrid}>
                                        <div>
                                            <div className={s.cardSectionLabel}>📦 Recogida</div>
                                            <div>{pedidoActual.barrioRecogida} — {pedidoActual.direccionRecogida}</div>
                                            <div className={s.cardMeta}>Tel: {pedidoActual.telefonoContactoRecogida}</div>
                                        </div>
                                        <div>
                                            <div className={s.cardSectionLabel}>🏠 Entrega</div>
                                            <div>{pedidoActual.barrioEntrega} — {pedidoActual.direccionEntrega}</div>
                                            <div className={s.cardMeta}>
                                                {pedidoActual.nombreQuienRecibe} · {pedidoActual.telefonoQuienRecibe}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={s.cardFooterRow}>
                                        {pedidoActual.clienteId && (
                                            <span><b>Cliente:</b> {pedidoActual.clienteNombre ?? `#${pedidoActual.clienteId}`}</span>
                                        )}
                                        <span><b>Costo:</b> ${toNumberMoney(pedidoActual.costoServicio).toLocaleString("es-CO")}</span>
                                    </div>
                                </div>

                                <div className={s.cardAcciones}>
                                    {btnAvance && (
                                        <button
                                            className={s.btnPrimary}
                                            onClick={() => avanzarEstado(btnAvance.estado)}
                                            disabled={loadingAvanzar}
                                        >
                                            {loadingAvanzar ? "Procesando..." : btnAvance.label}
                                        </button>
                                    )}
                                    {puedeAyuda && (
                                        <button
                                            className={s.btnWarning}
                                            onClick={() => setOpenIncidencia(true)}
                                            disabled={loadingAvanzar}
                                        >
                                            🆘 Reportar incidencia
                                        </button>
                                    )}
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
                        <input type="date" className={s.inputDate} value={diaFiltro} onChange={(e) => setDiaFiltro(e.target.value)} />
                        <button className={s.btn} onClick={() => setDiaFiltro("")} disabled={!diaFiltro}>Quitar filtro</button>
                        <span className={s.contador}>Mostrando: <b>{historialFiltrado.length}</b> / {historial.length}</span>
                    </div>

                    <div className={s.lista}>
                        {loadingHist && <div className={s.vacio}>Cargando historial…</div>}
                        {!loadingHist && historialFiltrado.length === 0 && (
                            <div className={s.vacio}>
                                {diaFiltro ? "No hay pedidos entregados para ese día." : "Aún no tienes pedidos entregados."}
                            </div>
                        )}
                        {historialFiltrado.map((p) => (
                            <div key={p.id} className={`${s.itemCard} ${s.itemCardClickable}`} onClick={() => setDetalle(p)} title="Click para ver detalle">
                                <div className={s.itemInfo}>
                                    <div className={s.cardTitulo}>
                                        <b>#{p.id}</b>
                                        <span className={s.badge} style={{ background: "#ecfdf5", color: "#065f46" }}>🟢 ENTREGADO</span>
                                    </div>
                                    <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                    <div><b>Costo:</b> ${toNumberMoney(p.costoServicio).toLocaleString("es-CO")}</div>
                                </div>
                                <div className={s.itemMeta}>{p.fechaCreacion && <div>{yyyyMMddOf(p.fechaCreacion)}</div>}</div>
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

                    <div className={s.resumenBox}>
                        <div className={s.resumenTitulo}>
                            <span>💰 Ganancias (según filtro)</span>
                            <span className={s.contador}>Pedidos: <b>{finResumen.pedidos}</b></span>
                        </div>
                        <div className={s.resumenMetrics}>
                            <Metric label="Total" value={finResumen.total} />
                            <Metric label="Comisión empresa (20%)" value={finResumen.comisionEmpresa} />
                            <Metric label="Tu neto (80%)" value={finResumen.netoDelivery} />
                        </div>
                    </div>

                    <div className={s.filtrosGroup}>
                        <div className={s.filtros}>
                            <span className={s.filtroLabel}>Por día:</span>
                            <input type="date" className={s.inputDate} value={finDia} onChange={(e) => { setFinDia(e.target.value); setFinDesde(""); setFinHasta(""); }} />
                            <button className={s.btn} onClick={() => { setFinDia(todayISO); setFinDesde(""); setFinHasta(""); }}>Hoy</button>
                            <button className={s.btn} onClick={() => { setFinDia(""); setFinDesde(""); setFinHasta(""); }}>Limpiar</button>
                        </div>
                        <div className={s.filtros}>
                            <span className={s.filtroLabel}>Rango:</span>
                            <span className={s.filtroLabelLight}>Desde</span>
                            <input type="date" className={s.inputDate} value={finDesde} onChange={(e) => { setFinDesde(e.target.value); setFinDia(""); }} />
                            <span className={s.filtroLabelLight}>Hasta</span>
                            <input type="date" className={s.inputDate} value={finHasta} onChange={(e) => { setFinHasta(e.target.value); setFinDia(""); }} />
                            <span className={s.contador}>Mostrando: <b>{finanzasFiltrado.length}</b> / {historial.length}</span>
                        </div>
                    </div>

                    <div className={s.lista}>
                        {loadingHist && <div className={s.vacio}>Cargando…</div>}
                        {!loadingHist && finanzasFiltrado.length === 0 && (
                            <div className={s.vacio}>No hay pedidos entregados para el filtro seleccionado.</div>
                        )}
                        {finanzasFiltrado.map((p) => (
                            <div key={p.id} className={`${s.itemCard} ${s.itemCardClickable}`} onClick={() => setDetalle(p)} title="Click para ver detalle">
                                <div className={s.itemInfo}>
                                    <div><b>#{p.id}</b></div>
                                    <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                    <div><b>Costo:</b> ${toNumberMoney(p.costoServicio).toLocaleString("es-CO")}</div>
                                </div>
                                <div className={s.itemMeta}>{p.fechaCreacion && <div>{yyyyMMddOf(p.fechaCreacion)}</div>}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            <PedidoDetalleModal
                open={!!detalle}
                pedido={detalle}
                onClose={() => setDetalle(null)}
                showCliente={true}
                showDomi={false}
                actions={detalle && (
                    <>
                        {detalle.estado === "ASIGNADO" && (
                            <button className={s.btnPrimary} onClick={() => { avanzarEstado("EN_CAMINO"); setDetalle(null); }} disabled={loadingAvanzar}>
                                📦 Tengo el pedido
                            </button>
                        )}
                        {detalle.estado === "EN_CAMINO" && (
                            <>
                                <button className={s.btnPrimary} onClick={() => { avanzarEstado("ENTREGADO"); setDetalle(null); }} disabled={loadingAvanzar}>
                                    ✅ Finalizar entrega
                                </button>
                                <button className={s.btnWarning} onClick={() => { setDetalle(null); setOpenIncidencia(true); }} disabled={loadingAvanzar}>
                                    🆘 Incidencia
                                </button>
                            </>
                        )}
                        <button className={s.btn} onClick={() => setDetalle(null)}>Cerrar</button>
                    </>
                )}
            />

            {/* Modal incidencia */}
            <IncidenciaModal open={openIncidencia} onConfirm={confirmarAyuda} onCancel={() => setOpenIncidencia(false)} loading={loadingAyuda} />

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
