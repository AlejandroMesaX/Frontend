import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";

export function useDeliveryPedidosRealtime({ token, userId, onPedido }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!token || !userId) return;
        if (ref.current) return;

        const client = new Client({
            brokerURL: `ws://localhost:8080/ws?token=${token}`,
            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        });

        client.onConnect = () => {
            client.subscribe(`/topic/delivery/${userId}/pedidos`, (msg) => {
                try {
                    const pedido = JSON.parse(msg.body);

                    // ✅ Si llega un pedido terminado, lo “ocultamos” del panel
                    if (pedido?.estado === "ENTREGADO" || pedido?.estado === "CANCELADO") {
                        onPedido?.(null);
                        return;
                    }

                    onPedido?.(pedido);
                } catch {
                    // si llega algo raro, no rompas la UI
                }
            });
        };

        client.onStompError = (frame) => {
            console.error("[WS][DELIVERY]", frame.headers?.message, frame.body);
        };

        client.onWebSocketError = (e) => {
            console.error("[WS][DELIVERY] socket error", e);
        };

        client.activate();
        ref.current = client;

        return () => {
            ref.current?.deactivate();
            ref.current = null;
        };
    }, [token, userId, onPedido]);
}
