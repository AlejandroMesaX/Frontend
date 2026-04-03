import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import { useDeliveryPedidosRealtime } from "../realtime/useDeliveryPedidosRealtime";
import PedidoDetalleModal from "../components/PedidoDetalleModal";
import Toast from "../components/Toast";
import TarifasPanel from "./TarifasPanel";
import s from "./DeliveryPanel.module.css";

function fmt(val) { return `$${Number(val || 0).toLocaleString("es-CO")}`; }

function toNumberMoney(val) {
    if (val == null) return 0;
    const n = Number(String(val).replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) ? n : 0;
}

function yyyyMMddOf(fecha) {
    if (!fecha) return null;
    return String(fecha).slice(0, 10);
}

function Metric({ label, value, highlight }) {
    return (
        <div className={`${s.metric} ${highlight ? s.metricHighlight : ""}`}>
            <div className={s.metricLabel}>{label}</div>
            <div className={s.metricValue}>${Number(value || 0).toLocaleString("es-CO")}</div>
        </div>
    );
}

function IncidenciaModal({ open, onConfirm, onCancel, loading }) {
    const [motivo, setMotivo] = useState("");
    const [touched, setTouched] = useState(false);

    useEffect(() => { if (open) { setMotivo(""); setTouched(false); } }, [open]);

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
    { key: "inicio", label: "📦 Pedidos" },
    { key: "historial", label: "🗓️ Historial" },
    { key: "finanzas", label: "💰 Finanzas" },
    { key: "tarifas", label: "🧮 Tarifas" },
];

export default function DeliveryPanel() {
    const { token, userId, logout } = useAuth();

    const [tab, setTab] = useState("inicio");
    const [disponible, setDisponible] = useState(false);
    const [pedidosActivos, setPedidosActivos] = useState([]);
    const [toast, setToast] = useState(null);
    const [loadingDisponible, setLoadingDisponible] = useState(false);
    const [loadingAvanzar, setLoadingAvanzar] = useState(false);
    const [loadingAyuda, setLoadingAyuda] = useState(false);
    const [openIncidencia, setOpenIncidencia] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [gananciasHoy, setGananciasHoy] = useState([]);
    const [barrios, setBarrios] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loadingHist, setLoadingHist] = useState(false);
    const [diaFiltro, setDiaFiltro] = useState("");
    const [finDia, setFinDia] = useState("");
    const [finDesde, setFinDesde] = useState("");
    const [finHasta, setFinHasta] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [pedidoParaIncidencia, setPedidoParaIncidencia] = useState(null);

    // Cerrar menú al cambiar tab
    function selectTab(key) {
        setTab(key);
        setMenuOpen(false);
    }

    // Cerrar menú con Escape
    useEffect(() => {
        function onKey(e) { if (e.key === "Escape") setMenuOpen(false); }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    // Bloquear scroll del body cuando el menú está abierto
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    const todayISO = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    // ── Realtime ──────────────────────────────────────────────────────────────

    useDeliveryPedidosRealtime({
        token, userId,
        onPedido: (pedido) => {
            if (!pedido || pedido.estado === "ENTREGADO" || pedido.estado === "CANCELADO") {
                setPedidosActivos((prev) => prev.filter((p) => p.id !== pedido?.id));
            } else {
                setPedidosActivos((prev) => {
                    const idx = prev.findIndex((p) => p.id === pedido.id);
                    if (idx === -1) return [...prev, pedido];
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], ...pedido };
                    return copy;
                });
            }
            setDetalle((d) => d?.id === pedido?.id ? (pedido ? { ...d, ...pedido } : null) : d);
            if (pedido?.estado === "ENTREGADO") {
                const d = new Date();
                const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const fechaPedido = pedido.fechaCreacion ? String(pedido.fechaCreacion).slice(0, 10) : hoy;
                if (fechaPedido === hoy)
                    setGananciasHoy((prev) => prev.find((p) => p.id === pedido.id) ? prev : [...prev, pedido]);
            }
        },
    });

    const tienePedidoActivo = pedidosActivos.length > 0;

    // ── Acciones ──────────────────────────────────────────────────────────────

    async function toggleDisponible() {
        if (tienePedidoActivo) { setToast(errorFronted("No puedes cambiar disponibilidad mientras tengas un pedido activo.")); return; }
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
        } catch { setToast(errorFronted("No se pudo conectar con el servidor.")); }
        finally { setLoadingDisponible(false); }
    }

    async function avanzarEstado(pedidoId, nuevoEstado) {
        setLoadingAvanzar(true);
        try {
            const res = await authFetch(`/api/domiciliario/pedidos/${pedidoId}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado }),
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            if (nuevoEstado === "ENTREGADO") {
                setPedidosActivos((prev) => prev.filter((p) => p.id !== pedidoId));
            }
        } catch { setToast(errorFronted("No se pudo conectar con el servidor.")); }
        finally { setLoadingAvanzar(false); }
    }

    async function confirmarAyuda(motivo) {
        if (!pedidoParaIncidencia) return;
        setLoadingAyuda(true);
        try {
            const res = await authFetch(`/api/domiciliario/pedidos/${pedidoParaIncidencia.id}/ayuda`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ motivo }),
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setOpenIncidencia(false);
            setPedidosActivos((prev) => prev.filter((p) => p.id !== pedidoParaIncidencia.id));
            setPedidoParaIncidencia(null);
        } catch { setToast(errorFronted("No se pudo conectar con el servidor.")); }
        finally { setLoadingAyuda(false); }
    }

    // ── Carga inicial ─────────────────────────────────────────────────────────

    useEffect(() => {
        (async () => {
            try {
                const resPedidos = await authFetch("/api/domiciliario/pedidos/me/activos");
                if (resPedidos.ok) {
                    const data = await resPedidos.json().catch(() => null);
                    if (Array.isArray(data)) setPedidosActivos(data);
                }
                const resMe = await authFetch("/api/delivery/me");
                if (resMe.ok) { const me = await resMe.json().catch(() => null); if (me?.disponible != null) setDisponible(me.disponible); }
                const resBarrios = await authFetch("/api/admin/barrios?includeInactivos=false");
                if (resBarrios.ok) setBarrios(await resBarrios.json());
            } catch { /**/ }
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
                    setGananciasHoy((Array.isArray(data) ? data : []).filter((p) => String(p.fechaCreacion ?? "").slice(0, 10) === hoy));
                }
            } catch { /**/ }
        })();
    }, []);

    async function cargarHistorial() {
        setLoadingHist(true);
        try {
            const res = await authFetch("/api/domiciliario/pedidos/me/entregados");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setHistorial(Array.isArray(data) ? data : []);
        } catch { setToast(errorFronted("No se pudo conectar con el servidor.")); }
        finally { setLoadingHist(false); }
    }

    useEffect(() => {
        if (tab === "historial") cargarHistorial();
        if (tab === "finanzas") { if (!finDia && !finDesde && !finHasta) setFinDia(todayISO); cargarHistorial(); }
    }, [tab]);

    // ── Memos ─────────────────────────────────────────────────────────────────

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
        return { total, comisionEmpresa: total * 0.2, netoDelivery: total * 0.8, pedidos: finanzasFiltrado.length };
    }, [finanzasFiltrado]);

    const resumenHoy = useMemo(() => {
        const bruto = gananciasHoy.reduce((acc, p) => acc + (Number(p.costoServicio) || 0), 0);
        return { bruto, neto: bruto * 0.80, comision: bruto * 0.20, pedidos: gananciasHoy.length };
    }, [gananciasHoy]);

    // ── Badge styles ──────────────────────────────────────────────────────────

    const estadoBadgeStyle = {
        background: tienePedidoActivo ? "#2d1f0a" : disponible ? "#0f2e1a" : "#2a2a2d",
        color: tienePedidoActivo ? "#fcd34d" : disponible ? "#22c55e" : "#9ca3af",
    };

    const estadoBadgeText = tienePedidoActivo
        ? `🟠 ${pedidosActivos.length} pedido${pedidosActivos.length > 1 ? "s" : ""} activo${pedidosActivos.length > 1 ? "s" : ""}`
        : disponible ? "🟢 Disponible" : "⚪ Desconectado";



    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={s.container}>

            {/* Header */}
            <div className={s.topBar}>
                {/* Hamburger — solo visible en móvil */}
                <button className={s.hamburger} onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
                    ☰
                </button>
                <span className={s.brand}>GoFast</span>

                {/* Nav */}
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

                <div className={s.topBarRight}>

                    <button className={s.btnLogout} onClick={logout}>Salir</button>
                </div>


            </div>

            <button
                className={disponible ? s.btnDisponibleActivo : s.btnDisponible}
                onClick={toggleDisponible}
                disabled={tienePedidoActivo || loadingDisponible}
                title={tienePedidoActivo ? "No puedes cambiar disponibilidad con un pedido activo" : ""}
            >
                {loadingDisponible
                    ? "Actualizando..."
                    : disponible
                        ? "✅ Conectado"
                        : "⛔ Desconectado"}
            </button>


            {/* ── INICIO ── */}
            {tab === "inicio" && (
                <>
                    {/* Ganancias hoy */}
                    <div className={s.section}>
                        <div className={s.sectionHeader}>
                            <h3>💰 Tus ganancias hoy</h3>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{resumenHoy.pedidos} entregados</span>
                        </div>
                        <div className={s.metricsGrid}>
                            <Metric label="Total facturado" value={resumenHoy.bruto} />
                            <Metric label="Tu ganancia (80%)" value={resumenHoy.neto} highlight />
                            <Metric label="Empresa (20%)" value={resumenHoy.comision} />
                        </div>
                    </div>

                    {/* Pedido actual */}
                    <div className={s.section}>
                        <div className={s.sectionHeader}>
                            <h3>Pedido actual</h3>
                        </div>

                        {pedidosActivos.length === 0 ? (
                            <div className={s.vacio}>Aún no tienes pedidos asignados.</div>
                        ) : (
                            pedidosActivos.map((pedido) => (
                                <div key={pedido.id} className={`${s.card} ${s.cardClickable}`}
                                    onClick={(e) => { if (!e.target.closest("button")) setDetalle(pedido); }}>
                                    <div className={s.cardInfo}>
                                        <div className={s.cardTitulo}>
                                            <b>#{pedido.id}</b>
                                            <span className={s.badge} style={
                                                pedido.estado === "ASIGNADO"
                                                    ? { background: "#1a1f2e", color: "#93c5fd" }
                                                    : { background: "#1e1a2e", color: "#a5b4fc" }
                                            }>
                                                {pedido.estado === "ASIGNADO" ? "🔵 ASIGNADO" : "🟣 EN CAMINO"}
                                            </span>
                                        </div>
                                        <div className={s.cardGrid}>
                                            <div>
                                                <div className={s.cardSectionLabel}>📦 Recogida</div>
                                                <div>{pedido.barrioRecogida} — {pedido.direccionRecogida}</div>
                                                <div className={s.cardMeta}>Tel: {pedido.telefonoContactoRecogida}</div>
                                            </div>
                                            <div>
                                                <div className={s.cardSectionLabel}>🏠 Entrega</div>
                                                <div>{pedido.barrioEntrega} — {pedido.direccionEntrega}</div>
                                                <div className={s.cardMeta}>{pedido.nombreQuienRecibe} · {pedido.telefonoQuienRecibe}</div>
                                            </div>
                                        </div>
                                        <div className={s.cardFooterRow}>
                                            <span><b>Costo:</b> ${toNumberMoney(pedido.costoServicio).toLocaleString("es-CO")}</span>
                                        </div>
                                    </div>
                                    <div className={s.cardAcciones}>
                                        {pedido.estado === "ASIGNADO" && (
                                            <button className={s.btnPrimary}
                                                onClick={() => avanzarEstado(pedido.id, "EN_CAMINO")}
                                                disabled={loadingAvanzar}>
                                                📦 Tengo el pedido
                                            </button>
                                        )}
                                        {pedido.estado === "EN_CAMINO" && (
                                            <>
                                                <button className={s.btnPrimary}
                                                    onClick={() => avanzarEstado(pedido.id, "ENTREGADO")}
                                                    disabled={loadingAvanzar}>
                                                    ✅ Finalizar entrega
                                                </button>
                                                <button className={s.btnWarning}
                                                    onClick={() => { setPedidoParaIncidencia(pedido); setOpenIncidencia(true); }}
                                                    disabled={loadingAvanzar}>
                                                    🆘 Reportar incidencia
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* ── HISTORIAL ── */}
            {tab === "historial" && (
                <div className={s.section}>
                    <div className={s.sectionHeader}>
                        <h3>Historial</h3>
                        <button className={s.btn} onClick={cargarHistorial} disabled={loadingHist}>
                            {loadingHist ? "Cargando..." : "Recargar"}
                        </button>
                    </div>
                    <div className={s.filtros}>
                        <span className={s.filtroLabel}>Por día:</span>
                        <input type="date" className={s.inputDate} value={diaFiltro} onChange={(e) => setDiaFiltro(e.target.value)} />
                        <button className={s.btn} onClick={() => setDiaFiltro("")} disabled={!diaFiltro}>Quitar</button>
                        <span className={s.contador}>Mostrando: <b>{historialFiltrado.length}</b> / {historial.length}</span>
                    </div>
                    <div className={s.lista}>
                        {loadingHist && <div className={s.vacio}>Cargando historial…</div>}
                        {!loadingHist && historialFiltrado.length === 0 && (
                            <div className={s.vacio}>{diaFiltro ? "No hay pedidos entregados para ese día." : "Aún no tienes pedidos entregados."}</div>
                        )}
                        {historialFiltrado.map((p) => (
                            <div key={p.id} className={`${s.itemCard} ${s.itemCardClickable}`} onClick={() => setDetalle(p)} title="Click para ver detalle">
                                <div className={s.itemInfo}>
                                    <div className={s.cardTitulo}>
                                        <b>#{p.id}</b>
                                        <span className={s.badge} style={{ background: "#0f2e1a", color: "#22c55e" }}>🟢 ENTREGADO</span>
                                    </div>
                                    <div><b>Barrio:</b> {p.barrioEntrega}</div>
                                    <div><b>Direccion:</b>{p.direccionEntrega}</div>
                                    <div><b>Costo:</b> ${toNumberMoney(p.costoServicio).toLocaleString("es-CO")}</div>
                                </div>
                                <div className={s.itemMeta}>{p.fechaCreacion && <div>{yyyyMMddOf(p.fechaCreacion)}</div>}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── TARIFAS ── */}
            {tab === "tarifas" && <div className={s.tabContent}><TarifasPanel barrios={barrios} /></div>}

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
                            <span>💰 Ganancias</span>
                            <span className={s.contador}>Pedidos: <b>{finResumen.pedidos}</b></span>
                        </div>
                        <div className={s.resumenMetrics}>
                            <Metric label="Total" value={finResumen.total} />
                            <Metric label="Empresa (20%)" value={finResumen.comisionEmpresa} />
                            <Metric label="Tu neto (80%)" value={finResumen.netoDelivery} highlight />
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
                        {!loadingHist && finanzasFiltrado.length === 0 && <div className={s.vacio}>No hay pedidos para el filtro seleccionado.</div>}
                        {finanzasFiltrado.map((p) => (
                            <div key={p.id} className={`${s.itemCard} ${s.itemCardClickable}`} onClick={() => setDetalle(p)} title="Click para ver detalle">
                                <div className={s.itemInfo}>
                                    <div className={s.itemTitulo}>
                                        <b>#{p.id}</b>
                                        <span className={s.badge} style={{ background: "#0f2e1a", color: "#22c55e" }}>🟢 ENTREGADO</span>
                                    </div>
                                    <div><b>Cliente:</b> {p.clienteNombre ?? `#${p.clienteId}`} — {p.telefonoContactoRecogida}</div>
                                    <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                    <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                    <div><b>Recibe:</b> {p.nombreQuienRecibe} — {p.telefonoQuienRecibe}</div>
                                </div>
                                <div className={s.itemFinanzas}>
                                    <div className={s.itemTotal}>{fmt(toNumberMoney(p.costoServicio))}</div>
                                    <div className={s.itemSub}>Empresa: {fmt(toNumberMoney(p.costoServicio) * 0.20)}</div>
                                    <div className={s.itemSub}>Tú: {fmt(toNumberMoney(p.costoServicio) * 0.80)}</div>

                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modales */}
            <PedidoDetalleModal
                open={!!detalle} pedido={detalle} onClose={() => setDetalle(null)}
                showCliente={true} showDomi={false}
                actions={detalle && (
                    <>
                        {detalle.estado === "ASIGNADO" && (
                            <button className={s.btnPrimary} onClick={() => { avanzarEstado(detalle.id, "EN_CAMINO"); setDetalle(null); }} disabled={loadingAvanzar}>
                                📦 Tengo el pedido
                            </button>
                        )}
                        {detalle.estado === "EN_CAMINO" && (
                            <>
                                <button className={s.btnPrimary} onClick={() => { avanzarEstado(detalle.id, "ENTREGADO"); setDetalle(null); }} disabled={loadingAvanzar}>
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

            <IncidenciaModal open={openIncidencia} onConfirm={confirmarAyuda} onCancel={() => setOpenIncidencia(false)} loading={loadingAyuda} />
            {toast && <Toast error={toast} onClose={() => setToast(null)} />}

            {/* ── Menú móvil ── */}
            {menuOpen && (
                <div className={s.mobileMenu}>
                    <div className={s.mobileMenuOverlay} onClick={() => setMenuOpen(false)} />
                    <div className={s.mobileMenuPanel}>
                        <div className={s.mobileMenuHeader}>
                            <span className={s.mobileMenuBrand}>GoFast</span>
                            <button className={s.mobileMenuClose} onClick={() => setMenuOpen(false)}>✕</button>
                        </div>

                        {TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                className={`${s.mobileNavBtn} ${tab === key ? s.mobileNavBtnActive : ""}`}
                                onClick={() => selectTab(key)}
                            >
                                {label}
                            </button>
                        ))}

                        <div className={s.mobileMenuFooter}>
                            <button className={s.btnLogoutMobile} onClick={logout} style={{ width: "100%" }}>
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
