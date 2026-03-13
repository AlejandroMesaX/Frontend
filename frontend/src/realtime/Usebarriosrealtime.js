import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";

export function useBarriosRealtime({ token, onBarrio }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!token) return;
        if (ref.current) return;

        const client = new Client({
            brokerURL: `ws://localhost:8080/ws?token=${token}`,
            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        });

        client.onConnect = () => {
            client.subscribe("/topic/barrios", (msg) => {
                try {
                    const barrio = JSON.parse(msg.body);
                    onBarrio?.(barrio);
                } catch {
                }
            });
        };

        client.onStompError = (frame) => {
            console.error("[WS][BARRIOS]", frame.headers?.message, frame.body);
        };

        client.onWebSocketError = (e) => {
            console.error("[WS][BARRIOS] socket error", e);
        };

        client.activate();
        ref.current = client;

        return () => {
            ref.current?.deactivate();
            ref.current = null;
        };
    }, [token, onBarrio]);
}