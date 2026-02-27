import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import { useAdminPedidosRealtime } from "../realtime/useAdminPedidosRealtime";
import { useAdminDomiciliariosRealtime } from "../realtime/useAdminDomiciliariosRealtime";
import AssignPedidoModal from "../components/AssignPedidoModal";
import Toast from "../components/Toast";
import s from "./AdminPedidos.module.css";

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

function EstadoDomiBadge({ estado }) {
    const cfg = {
        DISPONIBLE: { bg: "#ecfdf5", color: "#065f46", text: "🟢 DISPONIBLE" },
        POR_RECOGER: { bg: "#eff6ff", color: "#1d4ed8", text: "🔵 POR RECOGER" },
        POR_ENTREGAR: { bg: "#eef2ff", color: "#4338ca", text: "🟣 POR ENTREGAR" },
    }[estado] || { bg: "#f3f4f6", color: "#374151", text: estado || "—" };

    return (
        <span className={s.badge} style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.text}
        </span>
    );
}

// ── Modal confirmación cancelar ───────────────────────────────────────────────

function ConfirmModal({ open, pedidoId, onConfirm, onCancel, loading }) {
    if (!open) return null;
    return (
        <div className={s.backdrop}>
            <div className={s.confirmModal}>
                <p>¿Cancelar el pedido <b>#{pedidoId}</b>? Esta acción no se puede deshacer.</p>
                <div className={s.confirmFooter}>
                    <button className={s.btn} onClick={onCancel} disabled={loading}>
                        Volver
                    </button>
                    <button className={s.btnDanger} onClick={onConfirm} disabled={loading}>
                        {loading ? "Cancelando..." : "Sí, cancelar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────

const ESTADOS_VISIBLES = new Set(["CREADO", "ASIGNADO", "EN_CAMINO", "INCIDENCIA"]);

export default function AdminPedidos() {
    const { token } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [disponibles, setDisponibles] = useState([]);
    const [toast, setToast] = useState(null);

    // Modal asignar
    const [openAssign, setOpenAssign] = useState(false);
    const [pedidoSel, setPedidoSel] = useState(null);

    // Modal confirmar cancelar
    const [confirm, setConfirm] = useState({ open: false, pedidoId: null });
    const [loadingCancelar, setLoadingCancelar] = useState(false);

    // ── Realtime ────────────────────────────────────────────────────────────

    useAdminPedidosRealtime({
        token,
        onPedido: (pedido) =>
            setPedidos((prev) => {
                const idx = prev.findIndex((p) => p.id === pedido.id);
                if (idx === -1) return [pedido, ...prev];
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...pedido };
                return copy;
            }),
    });

    useAdminDomiciliariosRealtime({
        token,
        onDomiciliario: (d) => {
            setDisponibles((prev) => {
                const next = prev.filter((x) => x.id !== d.id);
                if (d.estadoDelivery === "DISPONIBLE") next.push(d);
                next.sort((a, b) => {
                    const ta = a.disponibleDesde ? new Date(a.disponibleDesde).getTime() : Infinity;
                    const tb = b.disponibleDesde ? new Date(b.disponibleDesde).getTime() : Infinity;
                    return ta - tb;
                });
                return next;
            });
        },
    });

    // ── Carga inicial ───────────────────────────────────────────────────────

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
                const res = await authFetch("/api/admin/domiciliarios/disponibles");
                if (!res.ok) return;
                const data = await res.json();
                const arr = Array.isArray(data) ? data : [];
                arr.sort((a, b) => {
                    const ta = a.disponibleDesde ? new Date(a.disponibleDesde).getTime() : Infinity;
                    const tb = b.disponibleDesde ? new Date(b.disponibleDesde).getTime() : Infinity;
                    return ta - tb;
                });
                setDisponibles(arr);
            } catch {
                setToast(errorFronted("No se pudieron cargar los domiciliarios."));
            }
        })();
    }, []);

    // ── Memos ───────────────────────────────────────────────────────────────

    const pedidosVisibles = useMemo(() =>
        pedidos
            .filter((p) => ESTADOS_VISIBLES.has(p.estado))
            .sort((a, b) => b.id - a.id),
        [pedidos]
    );

    // ── Acciones ────────────────────────────────────────────────────────────

    function openAsignar(pedido) {
        setPedidoSel(pedido);
        setOpenAssign(true);
    }

    async function confirmarCancelar() {
        setLoadingCancelar(true);
        try {
            const res = await authFetch(`/api/admin/pedidos/${confirm.pedidoId}`, { method: "DELETE" });
            if (!res.ok) {
                const error = await parseBackendError(res);
                setToast(error);
                return;
            }
            setPedidos((prev) => prev.filter((p) => p.id !== confirm.pedidoId));
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingCancelar(false);
            setConfirm({ open: false, pedidoId: null });
        }
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className={s.container}>

            <p className={s.descripcion}>
                Se muestran solo: <b>CREADO</b>, <b>ASIGNADO</b>, <b>EN_CAMINO</b>, <b>INCIDENCIA</b>.
            </p>

            {/* Panel domiciliarios disponibles */}
            <div className={s.domiPanel}>
                <div className={s.domiHeader}>
                    <b>Domiciliarios disponibles: {disponibles.length}</b>
                    <EstadoDomiBadge estado="DISPONIBLE" />
                    <span>FIFO (más tiempo disponible primero).</span>
                </div>

                <div className={s.domiChips}>
                    {disponibles.length === 0 && (
                        <span className={s.domiVacio}>No hay domiciliarios disponibles.</span>
                    )}

                    {disponibles.slice(0, 10).map((d) => (
                        <span
                            key={d.id}
                            className={s.domiChip}
                            title={d.disponibleDesde ? `Disponible desde: ${d.disponibleDesde}` : ""}
                        >
                            🚴 #{d.id}
                            <EstadoDomiBadge estado={d.estadoDelivery} />
                        </span>
                    ))}

                    {disponibles.length > 10 && (
                        <span className={s.domiMas}>
                            Mostrando 10 de {disponibles.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Lista de pedidos */}
            <div className={s.lista}>
                {pedidosVisibles.length === 0 && (
                    <div className={s.vacio}>No hay pedidos activos.</div>
                )}

                {pedidosVisibles.map((p) => (
                    <div key={p.id} className={s.card}>
                        <div className={s.cardInner}>
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
                                <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                <div><b>Costo:</b> ${Number(p.costoServicio || 0).toLocaleString("es-CO")}</div>
                                <div><b>Domiciliario:</b> {p.domiciliarioId ?? "—"}</div>
                            </div>

                            <div className={s.cardAcciones}>
                                <button
                                    className={s.btnAsignar}
                                    onClick={() => openAsignar(p)}
                                    disabled={
                                        !(p.estado === "CREADO" || p.estado === "INCIDENCIA") ||
                                        disponibles.length === 0
                                    }
                                    title={
                                        !(p.estado === "CREADO" || p.estado === "INCIDENCIA")
                                            ? "Solo se asigna cuando está CREADO o INCIDENCIA"
                                            : disponibles.length === 0
                                                ? "No hay domiciliarios disponibles"
                                                : p.estado === "INCIDENCIA"
                                                    ? "Reasignar pedido (incidencia)"
                                                    : "Asignar pedido"
                                    }
                                >
                                    {p.estado === "INCIDENCIA" ? "Reasignar" : "Asignar"}
                                </button>

                                <button
                                    className={s.btnCancelar}
                                    onClick={() => setConfirm({ open: true, pedidoId: p.id })}
                                    title="Cancelar pedido"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal asignar */}
            <AssignPedidoModal
                open={openAssign}
                onClose={() => setOpenAssign(false)}
                pedido={pedidoSel}
                disponibles={disponibles}
                onAssigned={(actualizado, domiciliarioId) => {
                    if (actualizado) {
                        setPedidos((prev) =>
                            prev.map((p) => p.id === actualizado.id ? actualizado : p)
                        );
                    } else if (pedidoSel) {
                        setPedidos((prev) =>
                            prev.map((p) =>
                                p.id === pedidoSel.id
                                    ? { ...p, domiciliarioId, estado: "ASIGNADO" }
                                    : p
                            )
                        );
                    }
                    setDisponibles((prev) => prev.filter((d) => d.id !== domiciliarioId));
                }}
            />

            {/* Modal cancelar */}
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
