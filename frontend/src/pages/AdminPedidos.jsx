import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authFetch } from "../api/http";
import { useAdminPedidosRealtime } from "../realtime/useAdminPedidosRealtime";

export default function AdminPedidos() {
    const { token, logout } = useAuth();
    const [pedidos, setPedidos] = useState([]);

    // Realtime: cuando llega uno nuevo, lo metemos arriba
    useAdminPedidosRealtime({
        token,
        onPedido: (pedido) => setPedidos((prev) => [pedido, ...prev]),
    });

    // Cargar lista inicial (AJUSTA endpoint a tu backend real)
    useEffect(() => {
        (async () => {
            const res = await authFetch("/api/admin/pedidos");
            if (res.ok) {
                const data = await res.json();
                setPedidos(data);
            }
        })();
    }, []);

    return (
        <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2>Admin - Pedidos (tiempo real)</h2>
                <button onClick={logout}>Cerrar sesión</button>
            </div>

            <p>Cuando un cliente crea un pedido, aparece aquí sin recargar.</p>

            <div style={{ display: "grid", gap: 10 }}>
                {pedidos.map((p) => (
                    <div key={p.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
                        <div><b>#{p.id}</b> — {p.estado}</div>
                        <div><b>Recogida:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                        <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                        <div><b>Costo:</b> {p.costoServicio}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}