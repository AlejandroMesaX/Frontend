import { useCallback, useState } from "react";

let nextId = 1;

export function useNotificaciones() {
    const [notificaciones, setNotificaciones] = useState([]);

    const agregar = useCallback((mensaje, tipo = "info") => {
        const id = nextId++;
        setNotificaciones((prev) => [...prev, { id, mensaje, tipo }]);
        setTimeout(() => {
            setNotificaciones((prev) => prev.filter((n) => n.id !== id));
        }, 5000);
    }, []);

    const cerrar = useCallback((id) => {
        setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return { notificaciones, agregar, cerrar };
}

// ── Mensajes por rol y estado ─────────────────────────────────────────────────

export function mensajeAdmin(pedido) {
    switch (pedido.estado) {
        case "CREADO":
            return { msg: `Nuevo pedido #${pedido.id} creado por ${pedido.clienteNombre ?? "un cliente"}`, tipo: "info" };
        case "EN_CAMINO":
            return { msg: `Pedido #${pedido.id} — el domiciliario ya recogió el paquete`, tipo: "info" };
        case "ENTREGADO":
            return { msg: `Pedido #${pedido.id} entregado exitosamente`, tipo: "success" };
        case "INCIDENCIA":
            return { msg: `Pedido #${pedido.id} en incidencia: ${pedido.motivoIncidencia ?? "sin detalle"}`, tipo: "warning" };
        case "CANCELADO":
            return { msg: `Pedido #${pedido.id} fue cancelado`, tipo: "danger" };
        default:
            return null;
    }
}

export function mensajeDelivery(pedido) {
    switch (pedido.estado) {
        case "ASIGNADO":
            return { msg: `Te asignaron el pedido #${pedido.id} — recoge en ${pedido.barrioRecogida}`, tipo: "info" };
        case "ENTREGADO":
            return { msg: `Pedido #${pedido.id} marcado como entregado`, tipo: "success" };
        case "CANCELADO":
            return { msg: `El pedido #${pedido.id} fue cancelado`, tipo: "danger" };
        default:
            return null;
    }
}

export function mensajeCliente(pedido) {
    switch (pedido.estado) {
        case "ASIGNADO":
            return { msg: `Tu pedido #${pedido.id} fue asignado a un domiciliario`, tipo: "info" };
        case "EN_CAMINO":
            return { msg: `Tu pedido #${pedido.id} ya fue recogido y está en camino`, tipo: "info" };
        case "ENTREGADO":
            return { msg: `Tu pedido #${pedido.id} fue entregado`, tipo: "success" };
        case "INCIDENCIA":
            return { msg: `Tu pedido #${pedido.id} tiene una incidencia: ${pedido.motivoIncidencia ?? "sin detalle"}`, tipo: "warning" };
        case "CANCELADO":
            return { msg: `Tu pedido #${pedido.id} fue cancelado`, tipo: "danger" };
        default:
            return null;
    }
}