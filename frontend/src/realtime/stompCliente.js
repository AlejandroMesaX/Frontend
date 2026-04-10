import { Client } from "@stomp/stompjs";

const WS_URL =
    import.meta.env.VITE_WS_URL ??
    (window.location.hostname === "localhost"
        ? "ws://localhost:8080/ws"
        : "wss://backend-proyecto-0ccj.onrender.com/ws");

export function createStompClient({ token, onConnect, onError }) {
    if (!token) {
        console.error("No hay token para WebSocket");
        return null;
    }
    const client = new Client({
        brokerURL: `${WS_URL}?token=${token}`,

        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        debug: (str) => {
            console.log("[STOMP]", str);
        },
    });

    client.onConnect = onConnect;

    client.onStompError = (frame) => {
        console.error("STOMP error:", frame);
        onError?.(frame);
    };

    client.onWebSocketError = (error) => {
        console.error("WebSocket error:", error);
    };

    return client;
}