import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { useAdminPedidosRealtime } from "../realtime/useAdminPedidosRealtime";
import { useAdminDomiciliariosRealtime } from "../realtime/useAdminDomiciliariosRealtime";
import AssignPedidoModal from "../components/AssignPedidoModal";

const ESTADOS_VISIBLES = new Set(["CREADO", "ASIGNADO", "EN_CAMINO"]);

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
                <b>Domiciliarios disponibles:</b> {disponibles.length}
                <div style={{ fontSize: 13, marginTop: 6, color: "#444" }}>
                    FIFO (más tiempo disponible primero).
                </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                {pedidosVisibles.map((p) => (
                    <div key={p.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                <div><b>#{p.id}</b> — {p.estado}</div>
                                <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                <div><b>Costo:</b> {p.costoServicio}</div>
                                <div><b>Domiciliario:</b> {p.domiciliarioId ?? "—"}</div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 170 }}>
                                <button
                                    onClick={() => openAsignar(p)}
                                    disabled={p.estado !== "CREADO" || disponibles.length === 0}
                                    title={p.estado !== "CREADO" ? "Solo se asigna cuando está CREADO" : "Asignar pedido"}
                                >
                                    Asignar
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
