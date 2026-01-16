import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";

export function useAdminDomiciliariosRealtime({ token, onDomiciliario }) {
    const clientRef = useRef(null);

    useEffect(() => {
        if (!token) return;
        if (clientRef.current) return;

        const client = new Client({
            brokerURL: `ws://localhost:8080/ws?token=${token}`,
            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        });

        client.onConnect = () => {
            client.subscribe("/topic/admin/domiciliarios", (msg) => {
                try {
                    onDomiciliario?.(JSON.parse(msg.body));
                } catch { }
            });
        };

        client.onStompError = (frame) => {
            console.error("[WS][ADMIN DOMIS] ", frame.headers?.message, frame.body);
        };

        client.activate();
        clientRef.current = client;

        return () => {
            clientRef.current?.deactivate();
            clientRef.current = null;
        };
    }, [token, onDomiciliario]);
}
