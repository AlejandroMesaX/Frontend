import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import s from "./AssignPedidoModal.module.css";

function EstadoDomiBadge({ estado }) {
    const cfg = {
        DISPONIBLE: { bg: "#ecfdf5", color: "#065f46", text: "🟢 DISPONIBLE" },
        POR_RECOGER: { bg: "#eff6ff", color: "#1d4ed8", text: "🔵 POR RECOGER" },
        POR_ENTREGAR: { bg: "#eef2ff", color: "#4338ca", text: "🟣 POR ENTREGAR" },
    }[estado] || { bg: "#f3f4f6", color: "#374151", text: estado || "—" };

    return (
        <span
            className={s.badge}
            style={{ background: cfg.bg, color: cfg.color }}
        >
            {cfg.text}
        </span>
    );
}

export default function AssignPedidoModal({ open, onClose, pedido, disponibles, onAssigned }) {
    const [domiciliarioId, setDomiciliarioId] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (open) {
            setDomiciliarioId("");
            setToast(null);
        }
    }, [open]);

    const list = useMemo(() => {
        const arr = [...(disponibles ?? [])];
        arr.sort((a, b) => {
            const ta = a.disponibleDesde ? new Date(a.disponibleDesde).getTime() : Infinity;
            const tb = b.disponibleDesde ? new Date(b.disponibleDesde).getTime() : Infinity;
            return ta - tb;
        });
        return arr;
    }, [disponibles]);

    const seleccionado = useMemo(() => {
        return list.find((x) => String(x.id) === String(domiciliarioId)) || null;
    }, [list, domiciliarioId]);

    async function asignar() {
        if (!domiciliarioId) {
            setToast(errorFronted("Selecciona un domiciliario antes de continuar", "domiciliarioId"));
            return;
        }

        setLoading(true);
        setToast(null);

        try {
            const res = await authFetch(`/api/admin/pedidos/${pedido.id}/asignar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domiciliarioId: Number(domiciliarioId) }),
            });

            if (!res.ok) {
                const error = await parseBackendError(res);
                setToast(error);
                return;
            }

            let actualizado = null;
            try { actualizado = await res.json(); } catch { }

            onAssigned?.(actualizado, Number(domiciliarioId));
            onClose?.();

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor. Verifica tu conexión."));
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div className={s.backdrop}>
            <div className={s.modal}>

                <div className={s.header}>
                    <h3>Asignar pedido #{pedido?.id}</h3>
                    <button className={s.btnClose} onClick={onClose}>✕</button>
                </div>

                <p style={{ marginTop: 8 }}>
                    Lista FIFO: primero el que lleva más tiempo <b>DISPONIBLE</b>.
                </p>

                {list.length > 0 && (
                    <div className={s.fifoInfo}>
                        <b>Siguiente en FIFO:</b>
                        <span style={{ fontWeight: 700 }}>{list[0].email}</span>
                        <EstadoDomiBadge estado={list[0].estadoDelivery} />
                        <span className={s.fifoLabel}>
                            desde {list[0].disponibleDesde
                                ? new Date(list[0].disponibleDesde).toLocaleString()
                                : "—"}
                        </span>
                    </div>
                )}

                <div className={s.lista}>
                    {list.length === 0 && (
                        <div className={s.listaVacia}>No hay domiciliarios disponibles.</div>
                    )}

                    {list.map((d) => {
                        const active = String(d.id) === String(domiciliarioId);
                        return (
                            <button
                                key={d.id}
                                type="button"
                                onClick={() => setDomiciliarioId(d.id)}
                                className={`${s.itemBtn} ${active ? s.itemBtnActivo : ""}`}
                                title={d.disponibleDesde
                                    ? `Disponible desde: ${new Date(d.disponibleDesde).toLocaleString()}`
                                    : ""}
                            >
                                <div className={s.itemInfo}>
                                    <span className={s.itemEmail}>🚴 {d.email}</span>
                                    <span className={s.itemDesde}>
                                        desde {d.disponibleDesde
                                            ? new Date(d.disponibleDesde).toLocaleString()
                                            : "—"}
                                    </span>
                                </div>
                                <div className={s.itemRight}>
                                    <EstadoDomiBadge estado={d.estadoDelivery} />
                                    <span className={s.itemId}>#{d.id}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {seleccionado && (
                    <div className={s.seleccionado}>
                        <b>Seleccionado:</b>
                        <span className={s.seleccionadoEmail}>{seleccionado.email}</span>
                        <EstadoDomiBadge estado={seleccionado.estadoDelivery} />
                        <span className={s.seleccionadoDesde}>
                            desde {seleccionado.disponibleDesde
                                ? new Date(seleccionado.disponibleDesde).toLocaleString()
                                : "—"}
                        </span>
                    </div>
                )}

                {toast?.field === "domiciliarioId" && (
                    <p className={s.errorInline}>⚠️ {toast.message}</p>
                )}

                <div className={s.footer}>
                    <button
                        className={s.btnCancelar}
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        className={s.btnAsignar}
                        onClick={asignar}
                        disabled={!domiciliarioId || loading}
                    >
                        {loading ? "Asignando..." : pedido?.estado === "INCIDENCIA" ? "Reasignar" : "Asignar"}
                    </button>
                </div>
            </div>

            {toast && !toast.field && (
                <Toast error={toast} onClose={() => setToast(null)} />
            )}
        </div>
    );
}

