import { useEffect, useRef } from "react";
import { createStompClient } from "./stompCliente";

export function useAdminDomiciliariosRealtime({ token, onDomiciliario }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!token) return;
        if (ref.current) return;

        const client = createStompClient({
            token,
            onConnect: () => {
                client.subscribe("/topic/admin/domiciliarios", (msg) => {
                    try { onDomiciliario?.(JSON.parse(msg.body)); } catch { }
                });
            },
            onError: (frame) => console.error("[WS][ADMIN DOMIS]", frame.headers?.message, frame.body),
        });

        client.activate();
        ref.current = client;

        return () => {
            ref.current?.deactivate();
            ref.current = null;
        };

    }, [token, onDomiciliario]);

}
