import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import AdminPedidos from "./AdminPedidos";
import AdminUsuarios from "./AdminUsuarios";
import AdminBarrios from "./AdminBarrios";
import AdminComunas from "./AdminComunas";



export default function AdminPanel() {
    const { logout } = useAuth();
    const [tab, setTab] = useState("pedidos"); // default

    return (
        <div style={{ maxWidth: 1100, margin: "20px auto", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0 }}>Admin</h2>
                <button onClick={logout}>Cerrar sesión</button>
            </div>

            <div
                style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 8,
                    padding: 8,
                    border: "1px solid #eee",
                    borderRadius: 12,
                    background: "#fafafa",
                    flexWrap: "wrap",
                }}
            >
                <NavBtn active={tab === "usuarios"} onClick={() => setTab("usuarios")}>Usuarios</NavBtn>
                <NavBtn active={tab === "barrios"} onClick={() => setTab("barrios")}>Barrios</NavBtn>
                <NavBtn active={tab === "comunas"} onClick={() => setTab("comunas")}>Comunas</NavBtn>
                <NavBtn active={tab === "pedidos"} onClick={() => setTab("pedidos")}>Pedidos</NavBtn>
                <NavBtn active={tab === "finanzas"} onClick={() => setTab("finanzas")}>Finanzas</NavBtn>
            </div>

            <div style={{ marginTop: 12 }}>
                {tab === "usuarios" && <AdminUsuarios />}
                {tab === "pedidos" && <AdminPedidos />}
                {tab === "barrios" && <AdminBarrios />}
                {tab === "comunas" && <AdminComunas />}

                {tab === "finanzas" && (
                    <div style={boxStyle}>Finanzas (pendiente)</div>
                )}
            </div>
        </div>
    );
}

function NavBtn({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: active ? "#111827" : "#fff",
                color: active ? "#fff" : "#111827",
                cursor: "pointer",
            }}
        >
            {children}
        </button>
    );
}

const boxStyle = {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
};
