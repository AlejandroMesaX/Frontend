import { useEffect, useRef } from "react";
import { createStompClient } from "./stompCliente";

export function useAdminPedidosRealtime({ token, onPedido }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!token) return;
        if (ref.current) return;

        const client = createStompClient({
            token,
            onConnect: () => {
                client.subscribe("/topic/admin/pedidos", (msg) => {
                    try { onPedido?.(JSON.parse(msg.body)); } catch { }
                });
            },
            onError: (frame) => console.error("[WS][ADMIN PEDIDOS] ", frame.headers?.message, frame.body),
        });

        client.activate();
        ref.current = client;

        return () => {
            ref.current?.deactivate();
            ref.current = null;
        };
    }, [token, onPedido]);
}

