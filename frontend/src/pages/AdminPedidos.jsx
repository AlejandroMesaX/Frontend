import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { useAdminPedidosRealtime } from "../realtime/useAdminPedidosRealtime";
import { useAdminDomiciliariosRealtime } from "../realtime/useAdminDomiciliariosRealtime";
import AssignPedidoModal from "../components/AssignPedidoModal";

function EstadoPedidoBadge({ estado }) {
    const cfg = {
        CREADO: { bg: "#f3f4f6", color: "#374151", text: "⚪ CREADO" },
        ASIGNADO: { bg: "#eff6ff", color: "#1d4ed8", text: "🔵 ASIGNADO" },
        EN_CAMINO: { bg: "#eef2ff", color: "#4338ca", text: "🟣 EN CAMINO" },
        ENTREGADO: { bg: "#ecfdf5", color: "#065f46", text: "🟢 ENTREGADO" },
        CANCELADO: { bg: "#fef2f2", color: "#991b1b", text: "🔴 CANCELADO" },
    }[estado] || { bg: "#f3f4f6", color: "#374151", text: estado };

    return (
        <span style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            border: "1px solid #e5e7eb",
            background: cfg.bg,
            color: cfg.color,
        }}>
            {cfg.text}
        </span>
    );
}

function EstadoDomiBadge({ estado }) {
    const cfg =
        {
            DISPONIBLE: { bg: "#ecfdf5", color: "#065f46", text: "🟢 DISPONIBLE" },
            POR_RECOGER: { bg: "#eff6ff", color: "#1d4ed8", text: "🔵 POR RECOGER" },
            POR_ENTREGAR: { bg: "#eef2ff", color: "#4338ca", text: "🟣 POR ENTREGAR" },
        }[estado] || { bg: "#f3f4f6", color: "#374151", text: estado || "—" };

    return (
        <span
            style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid #e5e7eb",
                background: cfg.bg,
                color: cfg.color,
            }}
        >
            {cfg.text}
        </span>
    );
}


function IncidenciaBadge({ motivo }) {
    if (!motivo) return null;
    return (
        <span
            title={motivo}
            style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid #f59e0b",
                background: "#fff7ed",
                color: "#92400e",
                maxWidth: 360,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}
        >
            🆘 Incidencia
        </span>
    );
}


const ESTADOS_VISIBLES = new Set(["CREADO", "ASIGNADO", "EN_CAMINO", "INCIDENCIA"]);

export default function AdminPedidos() {
    const { token, logout } = useAuth();
    const [pedidos, setPedidos] = useState([]);

    // domiciliarios disponibles (FIFO)
    const [disponibles, setDisponibles] = useState([]);

    // modal asignar
    const [openAssign, setOpenAssign] = useState(false);
    const [pedidoSel, setPedidoSel] = useState(null);

    // ✅ Realtime pedidos: actualiza o inserta
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

    // ✅ Realtime domiciliarios: mantener lista DISPONIBLE FIFO
    useAdminDomiciliariosRealtime({
        token,
        onDomiciliario: (d) => {
            setDisponibles((prev) => {
                // Solo guardamos DISPONIBLES
                const next = prev.filter((x) => x.id !== d.id);

                if (d.estadoDelivery === "DISPONIBLE") {
                    next.push(d);
                }

                // FIFO: disponibleDesde asc
                next.sort((a, b) => {
                    const ta = a.disponibleDesde ? new Date(a.disponibleDesde).getTime() : Infinity;
                    const tb = b.disponibleDesde ? new Date(b.disponibleDesde).getTime() : Infinity;
                    return ta - tb;
                });

                return next;
            });
        },
    });

    // ✅ Cargar lista inicial pedidos
    useEffect(() => {
        (async () => {
            const res = await authFetch("/api/admin/pedidos");
            if (res.ok) {
                const data = await res.json();
                setPedidos((prev) => {
                    const map = new Map(prev.map((p) => [p.id, p]));
                    data.forEach((p) => map.set(p.id, p));
                    return Array.from(map.values()).sort((a, b) => b.id - a.id);
                });
            }
        })();
    }, []);

    // ✅ Cargar lista inicial domiciliarios disponibles
    useEffect(() => {
        (async () => {
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
        })();
    }, []);

    const pedidosVisibles = useMemo(() => {
        return pedidos
            .filter((p) => ESTADOS_VISIBLES.has(p.estado))
            .sort((a, b) => b.id - a.id);
    }, [pedidos]);

    function openAsignar(pedido) {
        setPedidoSel(pedido);
        setOpenAssign(true);
    }

    async function handleCancelar(pedidoId) {
        const ok = confirm(`¿Cancelar el pedido #${pedidoId}?`);
        if (!ok) return;

        const res = await authFetch(`/api/admin/pedidos/${pedidoId}`, { method: "DELETE" });

        if (!res.ok) {
            const msg = await safeText(res);
            alert(`No se pudo cancelar el pedido #${pedidoId}. ${msg}`);
            return;
        }

        // Quitarlo del panel (no queremos cancelados/terminados)
        setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
    }

    return (
        <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2>Admin - Pedidos (tiempo real)</h2>
                <button onClick={logout}>Cerrar sesión</button>
            </div>

            <p>
                Se muestran solo: <b>CREADO</b>, <b>ASIGNADO</b>, <b>EN_CAMINO</b>.
            </p>

            <div style={{ marginBottom: 12, padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                        <b>Domiciliarios disponibles:</b> {disponibles.length}
                    </div>
                    <EstadoDomiBadge estado="DISPONIBLE" />
                    <div style={{ fontSize: 13, color: "#444" }}>FIFO (más tiempo disponible primero).</div>
                </div>

                {/* Chips FIFO */}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {disponibles.slice(0, 10).map((d) => (
                        <span
                            key={d.id}
                            title={d.disponibleDesde ? `Disponible desde: ${d.disponibleDesde}` : ""}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "1px solid #e5e7eb",
                                background: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#111827",
                            }}
                        >
                            🚴 #{d.id}
                            <EstadoDomiBadge estado={d.estadoDelivery} />
                        </span>
                    ))}

                    {disponibles.length === 0 && (
                        <div style={{ color: "#666", fontSize: 13 }}>No hay domiciliarios disponibles.</div>
                    )}

                    {disponibles.length > 10 && (
                        <div style={{ color: "#666", fontSize: 12 }}>
                            Mostrando 10 de {disponibles.length}
                        </div>
                    )}
                </div>
            </div>


            <div style={{ display: "grid", gap: 10 }}>
                {pedidosVisibles.map((p) => (
                    <div key={p.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <b>#{p.id}</b>
                                    <EstadoPedidoBadge estado={p.estado} />
                                    <IncidenciaBadge motivo={p.motivoIncidencia} />
                                </div>

                                {p.estado === "INCIDENCIA" && (
                                    <div style={{
                                        marginTop: 6,
                                        padding: 8,
                                        borderRadius: 8,
                                        background: "#fff7ed",
                                        border: "1px solid #f59e0b",
                                        color: "#92400e",
                                        fontSize: 13
                                    }}>
                                        <b>🆘 Incidencia:</b> {p.motivoIncidencia ?? "Sin detalle"}
                                    </div>
                                )}
                                <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                {p.motivoIncidencia && (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            padding: 8,
                                            borderRadius: 10,
                                            border: "1px solid #f59e0b",
                                            background: "#fff7ed",
                                            color: "#92400e",
                                            fontSize: 13,
                                        }}
                                    >
                                        <b>Motivo:</b> {p.motivoIncidencia}
                                    </div>
                                )}

                                <div><b>Costo:</b> {p.costoServicio}</div>
                                <div><b>Domiciliario:</b> {p.domiciliarioId ?? "—"}</div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 170 }}>
                                <button
                                    onClick={() => openAsignar(p)}
                                    disabled={!(p.estado === "CREADO" || p.estado === "INCIDENCIA") || disponibles.length === 0}
                                    title={
                                        !(p.estado === "CREADO" || p.estado === "INCIDENCIA")
                                            ? "Solo se asigna cuando está CREADO o INCIDENCIA"
                                            : p.estado === "INCIDENCIA"
                                                ? "Reasignar pedido (incidencia)"
                                                : "Asignar pedido"
                                    }
                                >
                                    {p.estado === "INCIDENCIA" ? "Reasignar" : "Asignar"}
                                </button>


                                <button
                                    onClick={() => handleCancelar(p.id)}
                                    title="Cancelar pedido"
                                    style={{ background: "#fff", border: "1px solid #d33", color: "#d33" }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {pedidosVisibles.length === 0 && (
                    <div style={{ padding: 12, border: "1px dashed #ccc", borderRadius: 10 }}>
                        No hay pedidos activos.
                    </div>
                )}
            </div>

            <AssignPedidoModal
                open={openAssign}
                onClose={() => setOpenAssign(false)}
                pedido={pedidoSel}
                disponibles={disponibles}
                onAssigned={(actualizado, domiciliarioId) => {
                    // Actualiza pedido local si backend lo devuelve
                    if (actualizado) {
                        setPedidos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
                    } else if (pedidoSel) {
                        setPedidos((prev) =>
                            prev.map((p) =>
                                p.id === pedidoSel.id ? { ...p, domiciliarioId, estado: "ASIGNADO" } : p
                            )
                        );
                    }

                    // Nota: la lista de disponibles se corregirá sola por WS cuando el backend emita deliveryActualizado(POR_RECOGER)
                    // Pero por UX, lo removemos optimistamente ya:
                    setDisponibles((prev) => prev.filter((d) => d.id !== domiciliarioId));
                }}
            />
        </div>
    );
}

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}
