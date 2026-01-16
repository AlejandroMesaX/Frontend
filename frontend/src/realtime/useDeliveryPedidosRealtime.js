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
                    onPedido?.(JSON.parse(msg.body));
                } catch { }
            });
        };

        client.onStompError = (frame) => {
            console.error("[WS][DELIVERY]", frame.headers?.message, frame.body);
        };

        client.activate();
        ref.current = client;

        return () => {
            ref.current?.deactivate();
            ref.current = null;
        };
    }, [token, userId, onPedido]);
}

