import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { useDeliveryPedidosRealtime } from "../realtime/useDeliveryPedidosRealtime";

export default function DeliveryPanel() {
    const { token, userId, logout } = useAuth();

    const [disponible, setDisponible] = useState(false);
    const [pedidoActual, setPedidoActual] = useState(null);

    // ✅ WS: cuando admin asigna pedido, llega aquí
    useDeliveryPedidosRealtime({
        token,
        userId,
        onPedido: (pedido) => {
            console.log("📦 Pedido realtime:", pedido);
            setPedidoActual(pedido);
        },
    });

    // (Opcional) cargar estado inicial del delivery desde backend si tienes endpoint
    // Si NO lo tienes, lo quitamos y trabajas solo con el botón.
    // useEffect(() => { ... }, []);

    async function toggleDisponible() {
        const next = !disponible;

        const res = await authFetch("/api/delivery/me/disponibilidad", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disponible: next }),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert("No se pudo actualizar disponibilidad. " + msg);
            return;
        }

        setDisponible(next);
    }

    async function avanzarEstadoPedido() {
        if (!pedidoActual) return;

        let nuevoEstado = null;

        if (pedidoActual.estado === "ASIGNADO") nuevoEstado = "EN_CAMINO";
        else if (pedidoActual.estado === "EN_CAMINO") nuevoEstado = "ENTREGADO";
        else return; // CREADO / ENTREGADO / CANCELADO => no se avanza

        const res = await authFetch(`/api/domiciliario/pedidos/${pedidoActual.id}/estado`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: nuevoEstado }),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert(`No se pudo actualizar el pedido #${pedidoActual.id}. (HTTP ${res.status}) ${msg}`);
            return;
        }

        // backend puede devolver el pedido actualizado
        let actualizado = null;
        try { actualizado = await res.json(); } catch { }

        // actualiza UI (si no vino JSON, actualiza estado local)
        setPedidoActual(prev => {
            if (!prev) return prev;
            if (actualizado) return actualizado;
            return { ...prev, estado: nuevoEstado };
        });

        if (nuevoEstado === "ENTREGADO" || nuevoEstado === "CANCELADO") {
            setPedidoActual(null);
            setDisponible(true);
        }
    }

    return (
        <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2>Domiciliario</h2>
                <button onClick={logout}>Cerrar sesión</button>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <button
                    onClick={toggleDisponible}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: disponible ? "#e7fff0" : "#fff",
                    }}
                >
                    {disponible ? "✅ Disponible" : "⛔ Desconectado"}
                </button>

                <div style={{ color: "#444" }}>
                    WS Topic: <code>/topic/delivery/{userId}/pedidos</code>
                </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Pedido actual</h3>

                {!pedidoActual && (
                    <div style={{ color: "#666" }}>
                        Aún no tienes pedidos asignados. Mantente disponible.
                    </div>
                )}

                {pedidoActual && (
                    <div style={{ display: "grid", gap: 6 }}>
                        <div><b>#{pedidoActual.id}</b> — {pedidoActual.estado}</div>
                        <div><b>Recogida:</b> {pedidoActual.barrioRecogida} — {pedidoActual.direccionRecogida}</div>
                        <div><b>Entrega:</b> {pedidoActual.barrioEntrega} — {pedidoActual.direccionEntrega}</div>
                        <div><b>Contacto recogida:</b> {pedidoActual.telefonoContactoRecogida}</div>
                        <div><b>Recibe:</b> {pedidoActual.nombreQuienRecibe} — {pedidoActual.telefonoQuienRecibe}</div>
                        <div><b>Costo:</b> {pedidoActual.costoServicio}</div>

                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            {pedidoActual.estado === "ASIGNADO" && (
                                <button
                                    onClick={avanzarEstadoPedido}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #ddd",
                                        background: "#fff7e6",
                                        cursor: "pointer",
                                    }}
                                >
                                    📦 Tengo el pedido
                                </button>
                            )}

                            {pedidoActual.estado === "EN_CAMINO" && (
                                <button
                                    onClick={avanzarEstadoPedido}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid #ddd",
                                        background: "#e7fff0",
                                        cursor: "pointer",
                                    }}
                                >
                                    ✅ Finalizar entrega
                                </button>
                            )}

                            {(pedidoActual.estado === "ENTREGADO" || pedidoActual.estado === "CANCELADO") && (
                                <div style={{ color: "#666", marginTop: 8 }}>
                                    Este pedido ya está <b>{pedidoActual.estado}</b>.
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}
