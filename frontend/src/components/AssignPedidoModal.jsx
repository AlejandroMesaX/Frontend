import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";

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
            return ta - tb; // FIFO: más antiguo primero
        });
        return arr;
    }, [disponibles]);

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
            alert(`No se pudo asignar el pedido #${pedido.id}. ${msg}`);
            return;
        }

        // Si backend devuelve JSON con el pedido actualizado:
        let actualizado = null;
        try { actualizado = await res.json(); } catch { }

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

                <select
                    value={domiciliarioId}
                    onChange={(e) => setDomiciliarioId(e.target.value)}
                    style={{ width: "100%", padding: 10, borderRadius: 8 }}
                >
                    <option value="">-- Selecciona --</option>
                    {list.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.email} — desde {d.disponibleDesde ? new Date(d.disponibleDesde).toLocaleString() : "—"}
                        </option>
                    ))}
                </select>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                    <button onClick={onClose}>Cancelar</button>
                    <button onClick={asignar} disabled={!domiciliarioId}>
                        Asignar
                    </button>
                </div>
            </div>
        </div>
    );
}

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}

const styles = {
    backdrop: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
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
