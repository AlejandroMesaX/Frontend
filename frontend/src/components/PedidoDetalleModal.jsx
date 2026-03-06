import s from "./PedidoDetalleModal.module.css";

// ── Badge reutilizable ────────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
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

// ── Fila de dato ──────────────────────────────────────────────────────────────

function Row({ label, value }) {
    if (value == null || value === "" || value === "—") return null;
    return (
        <div className={s.row}>
            <span className={s.rowLabel}>{label}</span>
            <span className={s.rowValue}>{value}</span>
        </div>
    );
}

// ── Sección con título ────────────────────────────────────────────────────────

function Section({ title, children }) {
    return (
        <div className={s.section}>
            <div className={s.sectionTitle}>{title}</div>
            {children}
        </div>
    );
}

/**
 * Modal de detalle de pedido reutilizable.
 *
 * Props:
 *   open        {boolean}
 *   pedido      {object}   — objeto del pedido
 *   onClose     {fn}
 *   showCliente {boolean}  — mostrar sección cliente (admin, delivery)
 *   showDomi    {boolean}  — mostrar sección domiciliario (admin, cliente)
 *   actions     {ReactNode} — botones de acción pasados desde el panel padre
 */
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

                {/* Header */}
                <div className={s.modalHeader}>
                    <div className={s.modalTitulo}>
                        <span className={s.modalId}>Pedido #{pedido.id}</span>
                        <EstadoBadge estado={pedido.estado} />
                    </div>
                    <button className={s.btnClose} onClick={onClose}>✕</button>
                </div>

                <div className={s.body}>

                    {/* Incidencia */}
                    {pedido.estado === "INCIDENCIA" && (
                        <div className={s.incidenciaBox}>
                            <b>🆘 Incidencia:</b> {pedido.motivoIncidencia ?? "Sin detalle"}
                        </div>
                    )}

                    {/* Recogida */}
                    <Section title="📦 Recogida">
                        <Row label="Barrio" value={pedido.barrioRecogida} />
                        <Row label="Dirección" value={pedido.direccionRecogida} />
                        <Row label="Teléfono" value={pedido.telefonoContactoRecogida} />
                    </Section>

                    {/* Entrega */}
                    <Section title="🏠 Entrega">
                        <Row label="Barrio" value={pedido.barrioEntrega} />
                        <Row label="Dirección" value={pedido.direccionEntrega} />
                        <Row label="Recibe" value={pedido.nombreQuienRecibe} />
                        <Row label="Teléfono" value={pedido.telefonoQuienRecibe} />
                    </Section>

                    {/* Costo */}
                    <Section title="💰 Servicio">
                        <Row label="Costo" value={`$${costo}`} />
                        <Row label="Fecha" value={pedido.fechaCreacion ? String(pedido.fechaCreacion).slice(0, 10) : null} />
                    </Section>

                    {/* Cliente (admin y delivery lo ven) */}
                    {showCliente && (
                        <Section title="🧑‍💼 Cliente">
                            <Row label="Nombre" value={pedido.clienteNombre ?? pedido.nombreCliente} />
                            <Row label="Teléfono" value={pedido.clienteTelefono} />
                        </Section>
                    )}

                    {/* Domiciliario (admin y cliente lo ven) */}
                    {showDomi && (
                        <Section title="🚴 Domiciliario">
                            <Row label="Nombre" value={pedido.domiciliarioNombre ?? pedido.nombreDomiciliario} />
                            <Row label="Teléfono" value={pedido.domiciliarioTelefono} />
                        </Section>
                    )}
                </div>

                {/* Acciones */}
                {actions && (
                    <div className={s.footer}>
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
