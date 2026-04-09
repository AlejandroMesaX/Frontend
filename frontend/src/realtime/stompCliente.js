import { Client } from "@stomp/stompjs";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws";

export function createStompClient({ token, onConnect, onError }) {
    const client = new Client({
        brokerURL: `${WS_URL}?token=${token}`,
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
    });

    client.onConnect = onConnect;
    client.onStompError = onError;
    client.onWebSocketError = () => { };

    return client;
}