import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";

export function useClientePedidosRealtime({ token, userId, onPedido }) {
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
            client.subscribe(`/topic/cliente/${userId}/pedidos`, (msg) => {
                try {
                    const pedido = JSON.parse(msg.body);
                    onPedido?.(pedido);
                } catch {
                }
            });
        };

        client.onStompError = (frame) => {
            console.error("[WS][CLIENTE]", frame.headers?.message, frame.body);
        };

        client.onWebSocketError = (e) => {
            console.error("[WS][CLIENTE] socket error", e);
        };

        client.activate();
        ref.current = client;

        return () => {
            ref.current?.deactivate();
            ref.current = null;
        };
    }, [token, userId, onPedido]);
}
