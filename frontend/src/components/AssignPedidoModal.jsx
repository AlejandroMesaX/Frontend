import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";

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
                padding: "3px 8px",
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

export default function AssignPedidoModal({ open, onClose, pedido, disponibles, onAssigned }) {
    const [domiciliarioId, setDomiciliarioId] = useState("");

    useEffect(() => {
        if (open) setDomiciliarioId("");
    }, [open]);

    const list = useMemo(() => {
        const arr = [...(disponibles ?? [])];
        arr.sort((a, b) => {
            const ta = a.disponibleDesde ? new Date(a.disponibleDesde).getTime() : Infinity;
            const tb = b.disponibleDesde ? new Date(b.disponibleDesde).getTime() : Infinity;
            return ta - tb; // FIFO
        });
        return arr;
    }, [disponibles]);

    const seleccionado = useMemo(() => {
        return list.find((x) => String(x.id) === String(domiciliarioId)) || null;
    }, [list, domiciliarioId]);

    async function asignar() {
        const id = Number(domiciliarioId);
        if (!id) return alert("Selecciona un domiciliario.");

        const res = await authFetch(`/api/admin/pedidos/${pedido.id}/asignar`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domiciliarioId: id }),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert(`No se pudo asignar el pedido #${pedido.id}. (HTTP ${res.status}) ${msg}`);
            return;
        }

        let actualizado = null;
        try {
            actualizado = await res.json();
        } catch { }

        onAssigned?.(actualizado, id);
        onClose?.();
    }

    if (!open) return null;

    return (
        <div style={styles.backdrop}>
            <div style={styles.modal}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <h3 style={{ margin: 0 }}>Asignar pedido #{pedido?.id}</h3>
                    <button onClick={onClose}>X</button>
                </div>

                <p style={{ marginTop: 8 }}>
                    Lista FIFO: primero el que lleva más tiempo <b>DISPONIBLE</b>.
                </p>

                {/* Siguiente en FIFO */}
                {list.length > 0 && (
                    <div
                        style={{
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 10,
                            border: "1px solid #eee",
                            background: "#fafafa",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        <b>Siguiente en FIFO:</b>
                        <span style={{ fontWeight: 700 }}>{list[0].email}</span>
                        <EstadoDomiBadge estado={list[0].estadoDelivery} />
                        <span style={{ fontSize: 12, color: "#666" }}>
                            desde {list[0].disponibleDesde ? new Date(list[0].disponibleDesde).toLocaleString() : "—"}
                        </span>
                    </div>
                )}

                {/* Lista con botones */}
                <div style={{ marginTop: 12, display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
                    {list.length === 0 && <div style={{ color: "#666" }}>No hay domiciliarios disponibles.</div>}

                    {list.map((d) => {
                        const active = String(d.id) === String(domiciliarioId);
                        return (
                            <button
                                key={d.id}
                                type="button"
                                onClick={() => setDomiciliarioId(d.id)}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: 10,
                                    borderRadius: 10,
                                    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
                                    background: active ? "#f9fafb" : "#fff",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 10,
                                    cursor: "pointer",
                                }}
                                title={d.disponibleDesde ? `Disponible desde: ${new Date(d.disponibleDesde).toLocaleString()}` : ""}
                            >
                                <div style={{ display: "grid", gap: 2 }}>
                                    <span style={{ fontWeight: 800 }}>🚴 {d.email}</span>
                                    <span style={{ fontSize: 12, color: "#666" }}>
                                        desde {d.disponibleDesde ? new Date(d.disponibleDesde).toLocaleString() : "—"}
                                    </span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <EstadoDomiBadge estado={d.estadoDelivery} />
                                    <span style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>#{d.id}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Resumen selección */}
                {seleccionado && (
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b>Seleccionado:</b>
                        <span style={{ fontWeight: 800 }}>{seleccionado.email}</span>
                        <EstadoDomiBadge estado={seleccionado.estadoDelivery} />
                        <span style={{ fontSize: 12, color: "#666" }}>
                            desde{" "}
                            {seleccionado.disponibleDesde ? new Date(seleccionado.disponibleDesde).toLocaleString() : "—"}
                        </span>
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                    <button onClick={onClose}>Cancelar</button>
                    <button onClick={asignar} disabled={!domiciliarioId}>
                        {pedido?.estado === "INCIDENCIA" ? "Reasignar" : "Asignar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

async function safeText(res) {
    try {
        return await res.text();
    } catch {
        return "";
    }
}

const styles = {
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        zIndex: 9999,
    },
    modal: {
        width: "min(520px, 95vw)",
        background: "#fff",
        borderRadius: 12,
        padding: 14,
        border: "1px solid #ddd",
    },
};

