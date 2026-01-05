import { Client } from "@stomp/stompjs";
import { useEffect, useRef } from "react";

const WS_URL = import.meta.env.VITE_WS_URL;

export function useAdminPedidosRealtime({ token, onPedido }) {
    const clientRef = useRef(null);

    useEffect(() => {
        if (!token) return;

        const client = new Client({
            brokerURL: WS_URL,
            reconnectDelay: 2000,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            onConnect: () => {
                client.subscribe("/topic/admin/pedidos", (msg) => {
                    const pedido = JSON.parse(msg.body);
                    onPedido?.(pedido);
                });
            },
            onStompError: (frame) => {
                console.error("STOMP error:", frame.headers["message"], frame.body);
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            client.deactivate();
            clientRef.current = null;
        };
    }, [token, onPedido]);
}