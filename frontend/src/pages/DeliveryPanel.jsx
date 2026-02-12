import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { useDeliveryPedidosRealtime } from "../realtime/useDeliveryPedidosRealtime";

export default function DeliveryPanel() {
    const { token, userId, logout } = useAuth();

    const [tab, setTab] = useState("inicio"); // inicio | historial | finanzas
    const [disponible, setDisponible] = useState(false);
    const [pedidoActual, setPedidoActual] = useState(null);

    // Historial
    const [historial, setHistorial] = useState([]);
    const [loadingHist, setLoadingHist] = useState(false);

    // ✅ WS pedidos
    useDeliveryPedidosRealtime({
        token,
        userId,
        onPedido: (pedido) => {
            console.log("📦 Pedido realtime:", pedido);
            setPedidoActual(pedido); // si llega null, lo quita
        },
    });

    async function toggleDisponible() {
        if (tienePedidoActivo) {
            alert("No puedes cambiar disponibilidad mientras tengas un pedido activo.");
            return;
        }
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

    // ✅ Cambiar estado (ASIGNADO->EN_CAMINO, EN_CAMINO->ENTREGADO)
    async function avanzarEstado(nuevoEstado) {
        if (!pedidoActual) return;

        // ⚠️ Ajusta esta ruta si tu backend usa otra
        const res = await authFetch(`/api/domiciliario/pedidos/${pedidoActual.id}/estado`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: nuevoEstado }),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert(`No se pudo actualizar el estado. (HTTP ${res.status}) ${msg}`);
            return;
        }

        // Si backend devuelve DTO actualizado
        let actualizado = null;
        try { actualizado = await res.json(); } catch { }

        // Si finaliza, ocultar pedido y dejar disponible (UX)
        if (nuevoEstado === "ENTREGADO") {
            setPedidoActual(null);
            setDisponible(true);
            return;
        }

        // Si no finaliza, actualizar estado en pantalla
        setPedidoActual((prev) => {
            if (!prev) return prev;
            if (actualizado) return actualizado;
            return { ...prev, estado: nuevoEstado };
        });
    }

    // ✅ Ayuda/incidencia (solo EN_CAMINO)
    async function pedirAyuda() {
        if (!pedidoActual) return;

        const motivo = prompt("Describe el problema (motivo):");
        if (!motivo || !motivo.trim()) return;

        const res = await authFetch(`/api/domiciliario/pedidos/${pedidoActual.id}/ayuda`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ motivo }),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert(`No se pudo reportar la incidencia. (HTTP ${res.status}) ${msg}`);
            return;
        }

        alert("Tu solicitud fue enviada. El administrador reasignará el pedido.");
        setPedidoActual(null);
        setDisponible(true);
    }

    async function cargarHistorial() {
        setLoadingHist(true);
        try {
            const res = await authFetch("/api/delivery/me/pedidos/entregados");
            if (!res.ok) {
                const msg = await safeText(res);
                alert("No se pudo cargar historial. " + msg);
                return;
            }
            const data = await res.json();
            setHistorial(Array.isArray(data) ? data : []);
        } finally {
            setLoadingHist(false);
        }
    }

    useEffect(() => {
        if (tab === "historial") cargarHistorial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const puedeTengoPedido = pedidoActual?.estado === "ASIGNADO";
    const puedeFinalizar = pedidoActual?.estado === "EN_CAMINO";
    const puedeAyuda = pedidoActual?.estado === "EN_CAMINO"; // 👈 como pediste
    const tienePedidoActivo =
        pedidoActual &&
        (pedidoActual.estado === "ASIGNADO" || pedidoActual.estado === "EN_CAMINO");


    return (
        <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "sans-serif" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Domiciliario</h2>
                <button onClick={logout}>Cerrar sesión</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <span
                    style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        border: "1px solid #e5e7eb",
                        background: tienePedidoActivo ? "#fff7ed" : disponible ? "#ecfdf5" : "#f3f4f6",
                        color: tienePedidoActivo ? "#9a3412" : disponible ? "#065f46" : "#374151",
                    }}
                >
                    {tienePedidoActivo ? "🟠 Pedido activo" : disponible ? "🟢 Disponible" : "⚪ Desconectado"}
                </span>

                {pedidoActual?.estado && (
                    <span
                        style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            border: "1px solid #e5e7eb",
                            background:
                                pedidoActual.estado === "ASIGNADO"
                                    ? "#eff6ff"
                                    : pedidoActual.estado === "EN_CAMINO"
                                        ? "#eef2ff"
                                        : "#f3f4f6",
                            color:
                                pedidoActual.estado === "ASIGNADO"
                                    ? "#1d4ed8"
                                    : pedidoActual.estado === "EN_CAMINO"
                                        ? "#4338ca"
                                        : "#374151",
                        }}
                    >
                        {pedidoActual.estado === "ASIGNADO"
                            ? "🔵 ASIGNADO"
                            : pedidoActual.estado === "EN_CAMINO"
                                ? "🟣 EN CAMINO"
                                : pedidoActual.estado}
                    </span>
                )}

                {pedidoActual?.motivoIncidencia && (
                    <span
                        style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            border: "1px solid #f59e0b",
                            background: "#fff7ed",
                            color: "#92400e",
                            maxWidth: 420,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                        title={pedidoActual.motivoIncidencia}
                    >
                        🆘 Incidencia: {pedidoActual.motivoIncidencia}
                    </span>
                )}
            </div>


            {/* Navbar */}
            <div
                style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 8,
                    padding: 8,
                    border: "1px solid #eee",
                    borderRadius: 12,
                    background: "#fafafa",
                }}
            >
                <NavBtn active={tab === "inicio"} onClick={() => setTab("inicio")}>Inicio</NavBtn>
                <NavBtn active={tab === "historial"} onClick={() => setTab("historial")}>Historial</NavBtn>
                <NavBtn active={tab === "finanzas"} onClick={() => setTab("finanzas")}>Finanzas (pendiente)</NavBtn>
            </div>

            {/* INICIO */}
            {tab === "inicio" && (
                <>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0" }}>
                        <button
                            onClick={toggleDisponible}
                            disabled={tienePedidoActivo}
                            title={
                                tienePedidoActivo
                                    ? "No puedes cambiar disponibilidad mientras tengas un pedido activo"
                                    : "Cambiar disponibilidad"
                            }
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: disponible ? "#e7fff0" : "#fff",
                                opacity: tienePedidoActivo ? 0.5 : 1,
                                cursor: tienePedidoActivo ? "not-allowed" : "pointer",
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
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <b>#{pedidoActual.id}</b>
                                    <span
                                        style={{
                                            padding: "2px 8px",
                                            borderRadius: 999,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            border: "1px solid #e5e7eb",
                                            background: pedidoActual.estado === "ASIGNADO" ? "#eff6ff" : "#eef2ff",
                                            color: pedidoActual.estado === "ASIGNADO" ? "#1d4ed8" : "#4338ca",
                                        }}
                                    >
                                        {pedidoActual.estado}
                                    </span>
                                </div>

                                <div><b>Recogida:</b> {pedidoActual.barrioRecogida} — {pedidoActual.direccionRecogida}</div>
                                <div><b>Entrega:</b> {pedidoActual.barrioEntrega} — {pedidoActual.direccionEntrega}</div>
                                <div><b>Contacto recogida:</b> {pedidoActual.telefonoContactoRecogida}</div>
                                <div><b>Recibe:</b> {pedidoActual.nombreQuienRecibe} — {pedidoActual.telefonoQuienRecibe}</div>
                                <div><b>Costo:</b> {pedidoActual.costoServicio}</div>

                                {/* Motivo de incidencia (si el pedido fue reasignado o trae motivo) */}
                                {pedidoActual?.motivoIncidencia && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            padding: 10,
                                            borderRadius: 10,
                                            border: "1px solid #f59e0b",
                                            background: "#fff7ed",
                                            color: "#92400e",
                                            fontSize: 13,
                                        }}
                                    >
                                        <b>🆘 Motivo de incidencia:</b> {pedidoActual.motivoIncidencia}
                                    </div>
                                )}

                                {/* Botones de acción */}
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                                    <button
                                        onClick={() => avanzarEstado("EN_CAMINO")}
                                        disabled={!puedeTengoPedido}
                                        title={!puedeTengoPedido ? "Solo cuando está ASIGNADO" : "Marcar EN_CAMINO"}
                                        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd" }}
                                    >
                                        📦 Tengo el pedido
                                    </button>

                                    <button
                                        onClick={() => avanzarEstado("ENTREGADO")}
                                        disabled={!puedeFinalizar}
                                        title={!puedeFinalizar ? "Solo cuando está EN_CAMINO" : "Finalizar ENTREGADO"}
                                        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd" }}
                                    >
                                        ✅ Finalizar entrega
                                    </button>

                                    <button
                                        onClick={pedirAyuda}
                                        disabled={!puedeAyuda}
                                        title={!puedeAyuda ? "Solo disponible cuando ya tienes el pedido (EN_CAMINO)" : "Reportar incidencia"}
                                        style={{
                                            background: "#fff",
                                            border: "1px solid #f59e0b",
                                            color: "#b45309",
                                            padding: "10px 14px",
                                            borderRadius: 10,
                                            opacity: !puedeAyuda ? 0.5 : 1,
                                            cursor: !puedeAyuda ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        🆘 Ayuda / No puedo finalizar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* HISTORIAL */}
            {tab === "historial" && (
                <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0 }}>Historial (entregados)</h3>
                        <button onClick={cargarHistorial} disabled={loadingHist}>
                            {loadingHist ? "Cargando..." : "Recargar"}
                        </button>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        {loadingHist && <div style={{ color: "#666" }}>Cargando historial…</div>}

                        {!loadingHist && historial.length === 0 && (
                            <div style={{ color: "#666" }}>Aún no tienes pedidos entregados.</div>
                        )}

                        {historial.map((p) => (
                            <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div>
                                        <div><b>#{p.id}</b> — {p.estado}</div>
                                        <div style={{ fontSize: 13, color: "#444", marginTop: 4 }}>
                                            <b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}
                                        </div>
                                        <div style={{ fontSize: 13, color: "#444" }}>
                                            <b>Costo:</b> {p.costoServicio}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: "#666", textAlign: "right" }}>
                                        {p.fechaCreacion ? <div>Creado: {p.fechaCreacion}</div> : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FINANZAS */}
            {tab === "finanzas" && (
                <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                    <h3 style={{ marginTop: 0 }}>Finanzas</h3>
                    <div style={{ color: "#666" }}>Pendiente: luego definimos qué métricas y reportes van aquí.</div>
                </div>
            )}
        </div>
    );
}

function NavBtn({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: active ? "#111827" : "#fff",
                color: active ? "#fff" : "#111827",
                cursor: "pointer",
            }}
        >
            {children}
        </button>
    );
}

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}
