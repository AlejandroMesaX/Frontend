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

                        {/* Si ya creaste endpoints de “recogido/entregado”, aquí van 2 botones */}
                        {/* <button onClick={...}>Marcar recogido</button>
                <button onClick={...}>Marcar entregado</button> */}
                    </div>
                )}
            </div>
        </div>
    );
}

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}
