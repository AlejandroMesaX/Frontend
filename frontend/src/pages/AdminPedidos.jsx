import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import { useAdminPedidosRealtime } from "../realtime/useAdminPedidosRealtime";
import { useAdminDomiciliariosRealtime } from "../realtime/useAdminDomiciliariosRealtime";
import PedidoDetalleModal from "../components/PedidoDetalleModal";
import Toast from "../components/Toast";
import s from "./AdminPedidos.module.css";

function EstadoPedidoBadge({ estado }) {
    const cfg = {
        CREADO: { bg: "#f3f4f6", color: "#374151", text: "⚪ CREADO" },
        ASIGNADO: { bg: "#eff6ff", color: "#1d4ed8", text: "🔵 ASIGNADO" },
        EN_CAMINO: { bg: "#eef2ff", color: "#4338ca", text: "🟣 EN CAMINO" },
        ENTREGADO: { bg: "#ecfdf5", color: "#065f46", text: "🟢 ENTREGADO" },
        CANCELADO: { bg: "#fef2f2", color: "#991b1b", text: "🔴 CANCELADO" },
        INCIDENCIA: { bg: "#fff7ed", color: "#92400e", text: "🆘 INCIDENCIA" },
    }[estado] || { bg: "#f3f4f6", color: "#374151", text: estado };
    return <span className={s.badge} style={{ background: cfg.bg, color: cfg.color }}>{cfg.text}</span>;
}

function EstadoDomiBadge({ estado }) {
    const cfg = {
        DISPONIBLE: { bg: "#ecfdf5", color: "#065f46", text: "🟢 DISPONIBLE" },
        POR_RECOGER: { bg: "#eff6ff", color: "#1d4ed8", text: "🔵 POR RECOGER" },
        POR_ENTREGAR: { bg: "#eef2ff", color: "#4338ca", text: "🟣 POR ENTREGAR" },
    }[estado] || { bg: "#f3f4f6", color: "#374151", text: "⚪ DESCONECTADO" };
    return <span className={s.badge} style={{ background: cfg.bg, color: cfg.color }}>{cfg.text}</span>;
}


function DomiciliarioViewer({ domiciliarios }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return domiciliarios;
        return domiciliarios.filter((d) =>
            (d.nombre ?? "").toLowerCase().includes(qq)
        );
    }, [domiciliarios, q]);

    useEffect(() => {
        function handleOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false); setQ("");
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 50);
    }, [open]);

    const disponibles = domiciliarios.filter((d) => d.estadoDelivery === "DISPONIBLE").length;

    const estadoEmoji = (d) =>
        ({ DISPONIBLE: "🟢", POR_RECOGER: "🔵", POR_ENTREGAR: "🟣" }[d.estadoDelivery] ?? "⚪");

    return (
        <div ref={containerRef} className={s.domiSelectContainer}>
            <button
                type="button"
                className={`${s.domiSelectTrigger} ${open ? s.domiSelectTriggerOpen : ""}`}
                onClick={() => setOpen((p) => !p)}
            >
                <span className={s.domiSelectValue}>
                    🚴 {domiciliarios.length} domiciliarios · {disponibles} disponibles
                </span>
                <span className={`${s.domiArrow} ${open ? s.domiArrowUp : ""}`}>▾</span>
            </button>

            {open && (
                <div className={s.domiDropdown}>
                    <div className={s.domiSearchWrap}>
                        <input
                            ref={searchRef}
                            className={s.domiSearchInput}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar domiciliario..."
                            autoComplete="off"
                        />
                    </div>
                    <ul className={s.domiList}>
                        {filtered.length === 0 && (
                            <li className={s.domiListEmpty}>Sin resultados para "{q}"</li>
                        )}
                        {filtered.map((d) => {
                            const esDisponible = d.estadoDelivery === "DISPONIBLE";
                            const esOcupado = d.estadoDelivery === "POR_RECOGER" || d.estadoDelivery === "POR_ENTREGAR";
                            return (
                                <li
                                    key={d.id}
                                    className={`${s.domiListItem} ${esDisponible ? s.domiListItemDisponible : esOcupado ? s.domiListItemOcupado : s.domiListItemDesconectado}`}
                                >
                                    <span className={s.domiListItemNombre}>
                                        {estadoEmoji(d)} {d.nombre ?? `#${d.id}`}
                                    </span>
                                    {d.disponibleDesde && esDisponible && (
                                        <span className={s.domiListItemMeta}>
                                            desde {String(d.disponibleDesde).slice(11, 16)}
                                        </span>
                                    )}
                                    {!esDisponible && !esOcupado && (
                                        <span className={s.domiListItemMeta}>Desconectado</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

function DomiciliarioSelect({ domiciliarios, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    const selected = domiciliarios.find((d) => d.id === value);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return domiciliarios;
        return domiciliarios.filter((d) =>
            (d.nombre ?? "").toLowerCase().includes(qq)
        );
    }, [domiciliarios, q]);

    useEffect(() => {
        function handleOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false); setQ("");
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 50);
    }, [open]);

    function handleSelect(d) {
        onChange?.(d.id);
        setOpen(false); setQ("");
    }

    const estadoEmoji = (d) =>
        ({ DISPONIBLE: "🟢", POR_RECOGER: "🔵", POR_ENTREGAR: "🟣" }[d.estadoDelivery] ?? "⚪");

    return (
        <div ref={containerRef} className={s.domiSelectContainer}>
            <button
                type="button"
                className={`${s.domiSelectTrigger} ${open ? s.domiSelectTriggerOpen : ""}`}
                onClick={() => setOpen((p) => !p)}
            >
                <span className={selected ? s.domiSelectValue : s.domiSelectPlaceholder}>
                    {selected
                        ? <>{estadoEmoji(selected)} {selected.nombre ?? `#${selected.id}`}</>
                        : "Selecciona un domiciliario..."}
                </span>
                <span className={`${s.domiArrow} ${open ? s.domiArrowUp : ""}`}>▾</span>
            </button>

            {open && (
                <div className={s.domiDropdown}>
                    <div className={s.domiSearchWrap}>
                        <input
                            ref={searchRef}
                            className={s.domiSearchInput}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar domiciliario..."
                            autoComplete="off"
                        />
                    </div>
                    <ul className={s.domiList}>
                        {filtered.length === 0 && (
                            <li className={s.domiListEmpty}>Sin resultados para "{q}"</li>
                        )}
                        {filtered.map((d) => {
                            const esDisponible = d.estadoDelivery === "DISPONIBLE";
                            return (
                                <li
                                    key={d.id}
                                    className={`${s.domiListItem} ${d.id === value ? s.domiListItemSelected : ""} ${!esDisponible ? s.domiListItemDisabled : s.domiListItemDisponible}`}
                                    onClick={() => esDisponible && handleSelect(d)}
                                    title={!esDisponible ? "Solo disponibles pueden asignarse" : ""}
                                >
                                    <span className={s.domiListItemNombre}>
                                        {estadoEmoji(d)} {d.nombre ?? `#${d.id}`}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {d.disponibleDesde && esDisponible && (
                                            <span className={s.domiListItemMeta}>
                                                desde {String(d.disponibleDesde).slice(11, 16)}
                                            </span>
                                        )}
                                        {d.id === value && <span className={s.domiCheck}>✓</span>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

function ConfirmModal({ open, pedidoId, onConfirm, onCancel, loading }) {
    if (!open) return null;
    return (
        <div className={s.backdrop}>
            <div className={s.confirmModal}>
                <p>¿Cancelar el pedido <b>#{pedidoId}</b>? Esta acción no se puede deshacer.</p>
                <div className={s.confirmFooter}>
                    <button className={s.btn} onClick={onCancel} disabled={loading}>Volver</button>
                    <button className={s.btnDanger} onClick={onConfirm} disabled={loading}>
                        {loading ? "Cancelando..." : "Sí, cancelar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AssignModal({ open, pedido, domiciliarios, onClose, onAssigned }) {
    const [selId, setSelId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (open) { setSelId(null); setToast(null); }
    }, [open]);

    const disponibles = domiciliarios.filter((d) => d.estadoDelivery === "DISPONIBLE");

    async function confirmar() {
        if (!selId || !pedido) return;
        setLoading(true);
        setToast(null);
        try {
            const res = await authFetch(`/api/admin/pedidos/${pedido.id}/asignar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domiciliarioId: selId }),
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const actualizado = await res.json().catch(() => null);
            onAssigned?.(actualizado, selId);
            onClose?.();
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    }

    if (!open || !pedido) return null;

    return (
        <div className={s.backdrop}>
            <div className={s.assignModal}>
                <div className={s.assignHeader}>
                    <h3>
                        {pedido.estado === "INCIDENCIA" ? "🔄 Reasignar pedido" : "🚴 Asignar pedido"} #{pedido.id}
                    </h3>
                    <button className={s.btnClose} onClick={onClose}>✕</button>
                </div>

                <div className={s.assignBody}>
                    {domiciliarios.length === 0 ? (
                        <div className={s.assignVacio}>No hay domiciliarios activos.</div>
                    ) : (
                        <DomiciliarioSelect
                            domiciliarios={domiciliarios}
                            value={selId}
                            onChange={(id) => setSelId(id)}
                        />
                    )}

                    {toast && (
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: 13 }}>
                            ⛔ {toast.message}
                        </div>
                    )}
                </div>

                <div className={s.assignFooter}>
                    <button className={s.btn} onClick={onClose} disabled={loading}>Cancelar</button>
                    <button
                        className={s.btnPrimary}
                        onClick={confirmar}
                        disabled={!selId || loading}
                    >
                        {loading ? "Asignando..." : "Confirmar asignación"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const ESTADOS_VISIBLES = new Set(["CREADO", "ASIGNADO", "EN_CAMINO", "INCIDENCIA"]);
const DOMI_ORDER = { DISPONIBLE: 0, POR_RECOGER: 1, POR_ENTREGAR: 2 };

export default function AdminPedidos() {
    const { token } = useAuth();

    const [pedidos, setPedidos] = useState([]);
    const [domiciliarios, setDomiciliarios] = useState([]);
    const [toast, setToast] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [openAssign, setOpenAssign] = useState(false);
    const [pedidoSel, setPedidoSel] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, pedidoId: null });
    const [loadingCancelar, setLoadingCancelar] = useState(false);
    const [gananciasHoy, setGananciasHoy] = useState([]);

    function todayLocal() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    useAdminPedidosRealtime({
        token,
        onPedido: useCallback((pedido) => {
            setPedidos((prev) => {
                const idx = prev.findIndex((p) => p.id === pedido.id);
                if (idx === -1) return [pedido, ...prev];
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...pedido };
                return copy;
            });
            setDetalle((d) => d?.id === pedido.id ? { ...d, ...pedido } : d);
            if (pedido.estado === "ENTREGADO") {
                const fechaPedido = pedido.fechaCreacion
                    ? String(pedido.fechaCreacion).slice(0, 10)
                    : todayLocal();
                if (fechaPedido === todayLocal()) {
                    setGananciasHoy((prev) => {
                        const exists = prev.find((p) => p.id === pedido.id);
                        if (exists) return prev;
                        return [...prev, pedido];
                    });
                }
            }
        }, []),
    });

    useAdminDomiciliariosRealtime({
        token,
        onDomiciliario: useCallback((d) => {
            setDomiciliarios((prev) => {
                const idx = prev.findIndex((x) => x.id === d.id);
                if (idx === -1) return [...prev, d];
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...d };
                return copy;
            });
        }, []),
    });

    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch("/api/admin/pedidos");
                if (!res.ok) { setToast(await parseBackendError(res)); return; }
                const data = await res.json();
                setPedidos((prev) => {
                    const map = new Map(prev.map((p) => [p.id, p]));
                    data.forEach((p) => map.set(p.id, p));
                    return Array.from(map.values()).sort((a, b) => b.id - a.id);
                });
            } catch {
                setToast(errorFronted("No se pudieron cargar los pedidos."));
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch("/api/admin/pedidos?estado=ENTREGADO");
                if (res.ok) {
                    const data = await res.json();
                    const d = new Date();
                    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    const deHoy = (Array.isArray(data) ? data : []).filter(
                        (p) => String(p.fechaCreacion ?? "").slice(0, 10) === hoy
                    );
                    setGananciasHoy(deHoy);
                }
            } catch { /* */ }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [resUsuarios, resDisponibles] = await Promise.all([
                    authFetch("/api/admin/usuarios?rol=DELIVERY&activo=true"),
                    authFetch("/api/admin/domiciliarios/disponibles"),
                ]);
                const usuarios = resUsuarios.ok ? await resUsuarios.json() : [];
                const disponibles = resDisponibles.ok ? await resDisponibles.json() : [];

                const dispMap = new Map((Array.isArray(disponibles) ? disponibles : []).map((d) => [d.id, d]));
                const merged = (Array.isArray(usuarios) ? usuarios : []).map((u) => ({
                    ...u,
                    estadoDelivery: dispMap.get(u.id)?.estadoDelivery ?? null,
                    disponibleDesde: dispMap.get(u.id)?.disponibleDesde ?? null,
                }));
                setDomiciliarios(merged);
            } catch { /* */ }
        })();
    }, []);

    const pedidosVisibles = useMemo(() =>
        pedidos.filter((p) => ESTADOS_VISIBLES.has(p.estado)).sort((a, b) => b.id - a.id),
        [pedidos]
    );

    const domiciliariosOrdenados = useMemo(() => {
        return [...domiciliarios].sort((a, b) => {
            const oa = DOMI_ORDER[a.estadoDelivery] ?? 3;
            const ob = DOMI_ORDER[b.estadoDelivery] ?? 3;
            if (oa !== ob) return oa - ob;
            if (a.estadoDelivery === "DISPONIBLE" && b.estadoDelivery === "DISPONIBLE") {
                const ta = a.disponibleDesde ? new Date(a.disponibleDesde).getTime() : Infinity;
                const tb = b.disponibleDesde ? new Date(b.disponibleDesde).getTime() : Infinity;
                return ta - tb;
            }
            return 0;
        });
    }, [domiciliarios]);

    const disponiblesCount = useMemo(
        () => domiciliarios.filter((d) => d.estadoDelivery === "DISPONIBLE").length,
        [domiciliarios]
    );

    const resumenHoy = useMemo(() => {
        const totalBruto = gananciasHoy.reduce((acc, p) => acc + (Number(p.costoServicio) || 0), 0);
        const gananciaEmpresa = totalBruto * 0.20;
        const pagosDomis = totalBruto * 0.80;
        return { totalBruto, gananciaEmpresa, pagosDomis, pedidos: gananciasHoy.length };
    }, [gananciasHoy]);

    function abrirDetalle(p, e) {
        if (e.target.closest("button")) return;
        setDetalle(p);
    }

    function abrirAsignar(p, e) {
        e?.stopPropagation();
        setPedidoSel(p);
        setOpenAssign(true);
    }

    function abrirCancelar(p, e) {
        e?.stopPropagation();
        setConfirm({ open: true, pedidoId: p.id });
    }

    async function confirmarCancelar() {
        setLoadingCancelar(true);
        try {
            const res = await authFetch(`/api/admin/pedidos/${confirm.pedidoId}`, { method: "DELETE" });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setPedidos((prev) => prev.filter((p) => p.id !== confirm.pedidoId));
            setDetalle((d) => d?.id === confirm.pedidoId ? null : d);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingCancelar(false);
            setConfirm({ open: false, pedidoId: null });
        }
    }

    return (
        <div className={s.container}>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>💰 Ganancias hoy — {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</h3>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{resumenHoy.pedidos} pedidos entregados</span>
                </div>
                <div className={s.metricsGrid}>
                    <div className={s.metric}>
                        <div className={s.metricLabel}>Total facturado</div>
                        <div className={s.metricValue}>${resumenHoy.totalBruto.toLocaleString("es-CO")}</div>
                    </div>
                    <div className={`${s.metric} ${s.metricHighlight}`}>
                        <div className={s.metricLabel}>Ganancia empresa (20%)</div>
                        <div className={s.metricValue}>${resumenHoy.gananciaEmpresa.toLocaleString("es-CO")}</div>
                    </div>

                </div>
            </div>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>Domiciliarios activos</h3>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {domiciliarios.length} total · {disponiblesCount} disponibles
                    </span>
                </div>
                <DomiciliarioViewer domiciliarios={domiciliariosOrdenados} />
            </div>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>Pedidos activos — {pedidosVisibles.length}</h3>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>CREADO · ASIGNADO · EN_CAMINO · INCIDENCIA</span>
                </div>

                <div className={s.lista}>
                    {pedidosVisibles.length === 0 && (
                        <div className={s.vacio}>No hay pedidos activos en este momento.</div>
                    )}

                    {pedidosVisibles.map((p) => (
                        <div
                            key={p.id}
                            className={`${s.card} ${s.cardClickable}`}
                            onClick={(e) => abrirDetalle(p, e)}
                            title="Click para ver detalle"
                        >
                            <div className={s.cardInfo}>
                                <div className={s.cardTitulo}>
                                    <b>#{p.id}</b>
                                    <EstadoPedidoBadge estado={p.estado} />
                                </div>

                                {p.estado === "INCIDENCIA" && (
                                    <div className={s.incidenciaBox}>
                                        <b>🆘 Incidencia:</b> {p.motivoIncidencia ?? "Sin detalle"}
                                    </div>
                                )}

                                <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                {p.telefonoContactoRecogida && <div><b>Contacto recogida:</b> {p.telefonoContactoRecogida}</div>}
                                <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                {p.nombreQuienRecibe && <div><b>Recibe:</b> {p.nombreQuienRecibe} · {p.telefonoQuienRecibe}</div>}
                                <div><b>Costo:</b> ${Number(p.costoServicio || 0).toLocaleString("es-CO")}</div>
                                {p.clienteId && <div><b>Cliente:</b> {p.clienteNombre ?? `#${p.clienteId}`}</div>}
                                {p.domiciliarioId && (
                                    <div>
                                        <b>Domiciliario:</b>{" "}
                                        {domiciliarios.find((d) => d.id === p.domiciliarioId)?.nombre ?? p.domiciliarioNombre ?? `#${p.domiciliarioId}`}
                                    </div>
                                )}
                            </div>

                            <div className={s.cardAcciones}>
                                <button
                                    className={s.btnPrimary}
                                    onClick={(e) => abrirAsignar(p, e)}
                                    disabled={!(p.estado === "CREADO" || p.estado === "INCIDENCIA") || disponiblesCount === 0}
                                    title={
                                        !(p.estado === "CREADO" || p.estado === "INCIDENCIA")
                                            ? "Solo se asigna cuando está CREADO o INCIDENCIA"
                                            : disponiblesCount === 0
                                                ? "No hay domiciliarios disponibles"
                                                : p.estado === "INCIDENCIA" ? "Reasignar pedido" : "Asignar pedido"
                                    }
                                >
                                    {p.estado === "INCIDENCIA" ? "Reasignar" : "Asignar"}
                                </button>

                                <button className={s.btnDanger} onClick={(e) => abrirCancelar(p, e)}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <PedidoDetalleModal
                open={!!detalle}
                pedido={detalle}
                onClose={() => setDetalle(null)}
                showCliente={true}
                showDomi={true}
                actions={detalle && (
                    <>
                        <button
                            className={s.btnPrimary}
                            onClick={() => { setDetalle(null); setPedidoSel(detalle); setOpenAssign(true); }}
                            disabled={!(detalle.estado === "CREADO" || detalle.estado === "INCIDENCIA") || disponiblesCount === 0}
                        >
                            {detalle.estado === "INCIDENCIA" ? "Reasignar" : "Asignar"}
                        </button>
                        <button
                            className={s.btnDanger}
                            onClick={() => { setDetalle(null); setConfirm({ open: true, pedidoId: detalle.id }); }}
                        >
                            Cancelar pedido
                        </button>
                    </>
                )}
            />
            <AssignModal
                open={openAssign}
                pedido={pedidoSel}
                domiciliarios={domiciliariosOrdenados}
                onClose={() => setOpenAssign(false)}
                onAssigned={(actualizado, domiciliarioId) => {
                    if (actualizado) {
                        setPedidos((prev) => prev.map((p) => p.id === actualizado.id ? actualizado : p));
                    } else if (pedidoSel) {
                        setPedidos((prev) =>
                            prev.map((p) => p.id === pedidoSel.id ? { ...p, domiciliarioId, estado: "ASIGNADO" } : p)
                        );
                    }
                    setDomiciliarios((prev) =>
                        prev.map((d) => d.id === domiciliarioId ? { ...d, estadoDelivery: "POR_RECOGER" } : d)
                    );
                }}
            />
            <ConfirmModal
                open={confirm.open}
                pedidoId={confirm.pedidoId}
                onConfirm={confirmarCancelar}
                onCancel={() => setConfirm({ open: false, pedidoId: null })}
                loading={loadingCancelar}
            />

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
