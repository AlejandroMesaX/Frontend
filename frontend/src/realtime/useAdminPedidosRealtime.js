import { useEffect } from "react";
import { Client } from "@stomp/stompjs";

export function useAdminPedidosRealtime({ token, onPedido }) {

    useEffect(() => {
        if (!token) return;

        const client = new Client({
            brokerURL: `ws://localhost:8080/ws?token=${token}`,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 3000,
            debug: (s) => console.log("[STOMP]", s),
        });

        // 👇👇👇 AQUÍ VA 👇👇👇
        client.onConnect = () => {
            console.log("✅ CONNECTED - subscribing to /topic/admin/pedidos");

            client.subscribe("/topic/admin/pedidos", (msg) => {
                console.log("📩 RAW WS:", msg.body); // <- esto es clave

                try {
                    const data = JSON.parse(msg.body);
                    console.log("✅ PARSED WS:", data);
                    onPedido?.(data);
                } catch (e) {
                    console.error("❌ JSON.parse failed:", e);
                    // si llega texto u otra cosa, igual puedes manejarlo aquí
                }
            });
        };
        // 👆👆👆 HASTA AQUÍ 👆👆👆

        client.onStompError = (frame) => {
            console.error("❌ STOMP ERROR", frame.headers, frame.body);
        };

        client.onWebSocketError = (e) => {
            console.error("❌ WS ERROR", e);
        };

        client.activate();

        return () => {
            client.deactivate();
        };
    }, [token, onPedido]);
}

