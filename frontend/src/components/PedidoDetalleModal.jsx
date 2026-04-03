import s from "./PedidoDetalleModal.module.css";

function EstadoBadge({ estado }) {
    const cfg = {
        CREADO: { bg: "#2a2a2d", color: "#d1d5db", text: "⚪ CREADO" },
        ASIGNADO: { bg: "#1a1f2e", color: "#93c5fd", text: "🔵 ASIGNADO" },
        EN_CAMINO: { bg: "#1e1a2e", color: "#a5b4fc", text: "🟣 EN CAMINO" },
        ENTREGADO: { bg: "#0f2e1a", color: "#22c55e", text: "🟢 ENTREGADO" },
        CANCELADO: { bg: "#3d1a1a", color: "#ef4444", text: "🔴 CANCELADO" },
        INCIDENCIA: { bg: "#2d1f0a", color: "#fcd34d", text: "🆘 INCIDENCIA" },
    }[estado] || { bg: "#2a2a2d", color: "#d1d5db", text: estado };

    return (
        <span className={s.badge} style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.text}
        </span>
    );
}

function Row({ label, value }) {
    if (value == null || value === "" || value === "—") return null;
    return (
        <div className={s.row}>
            <span className={s.rowLabel}>{label}</span>
            <span className={s.rowValue}>{value}</span>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className={s.section}>
            <div className={s.sectionTitle}>{title}</div>
            {children}
        </div>
    );
}

export default function PedidoDetalleModal({
    open,
    pedido,
    onClose,
    showCliente = false,
    showDomi = false,
    actions = null,
}) {
    if (!open || !pedido) return null;

    const costo = Number(pedido.costoServicio || 0).toLocaleString("es-CO");

    return (
        <div className={s.backdrop}>
            <div className={s.modal}>
                <div className={s.modalHeader}>
                    <div className={s.modalTitulo}>
                        <span className={s.modalId}>Pedido #{pedido.id}</span>
                        <EstadoBadge estado={pedido.estado} />
                    </div>
                    <button className={s.btnClose} onClick={onClose}>✕</button>
                </div>

                <div className={s.body}>
                    {pedido.estado === "INCIDENCIA" && (
                        <div className={s.incidenciaBox}>
                            <b>🆘 Incidencia:</b> {pedido.motivoIncidencia ?? "Sin detalle"}
                        </div>
                    )}

                    <Section title="📦 Recogida">
                        <Row label="Barrio" value={pedido.barrioRecogida} />
                        <Row label="Dirección" value={pedido.direccionRecogida} />
                        <Row label="Teléfono" value={pedido.telefonoContactoRecogida} />
                    </Section>

                    <Section title="🏠 Entrega">
                        <Row label="Barrio" value={pedido.barrioEntrega} />
                        <Row label="Dirección" value={pedido.direccionEntrega} />
                        <Row label="Recibe" value={pedido.nombreQuienRecibe} />
                        <Row label="Teléfono" value={pedido.telefonoQuienRecibe} />
                    </Section>

                    <Section title="💰 Servicio">
                        <Row label="Costo" value={`$${costo}`} />
                        <Row label="Fecha" value={pedido.fechaCreacion ? String(pedido.fechaCreacion).slice(0, 10) : null} />
                    </Section>

                    {showCliente && (
                        <Section title="🧑‍💼 Cliente">
                            <Row label="Nombre" value={pedido.clienteNombre ?? pedido.nombreCliente} />
                            <Row label="Teléfono" value={pedido.clienteTelefono} />
                        </Section>
                    )}

                    {showDomi && (
                        <Section title="🚴 Domiciliario">
                            <Row label="Nombre" value={pedido.domiciliarioNombre ?? pedido.nombreDomiciliario} />
                            <Row label="Teléfono" value={pedido.domiciliarioTelefono} />
                        </Section>
                    )}
                </div>


            </div>
        </div>
    );
}
