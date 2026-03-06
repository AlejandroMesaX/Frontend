import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import AdminPedidos from "./AdminPedidos";
import AdminUsuarios from "./AdminUsuarios";
import AdminBarrios from "./AdminBarrios";
import AdminComunas from "./AdminComunas";
import AdminFinanzas from "./AdminFinanzas";
import s from "./AdminPanel.module.css";

const TABS = [
    { key: "pedidos", label: "Pedidos" },
    { key: "usuarios", label: "Usuarios" },
    { key: "barrios", label: "Barrios" },
    { key: "comunas", label: "Comunas" },
    { key: "finanzas", label: "Finanzas" },
];

export default function AdminPanel() {
    const { logout } = useAuth();
    const [tab, setTab] = useState("pedidos");

    return (
        <div className={s.container}>

            <div className={s.header}>
                <h2>GoFast — Admin</h2>
                <button className={s.btnLogout} onClick={logout}>Cerrar sesión</button>
            </div>

            <nav className={s.nav}>
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`${s.navBtn} ${tab === key ? s.navBtnActive : ""}`}
                        onClick={() => setTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            <div className={s.content}>
                {tab === "pedidos" && <AdminPedidos />}
                {tab === "usuarios" && <AdminUsuarios />}
                {tab === "barrios" && <AdminBarrios />}
                {tab === "comunas" && <AdminComunas />}
                {tab === "finanzas" && <AdminFinanzas />}
            </div>
        </div>
    );
}
