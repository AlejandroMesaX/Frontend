import { Client } from "@stomp/stompjs";

export function createStompClient({ token, onConnect, onError }) {
    const client = new Client({
        brokerURL: `ws://localhost:8080/ws?token=${token}`,
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
    });

    client.onConnect = onConnect;
    client.onStompError = onError;
    client.onWebSocketError = (e) => console.error("[WS] socket error", e);

    return client;
}
