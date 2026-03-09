import { useEffect, useState } from "react";
import { authFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import AdminPedidos from "./AdminPedidos";
import AdminUsuarios from "./AdminUsuarios";
import AdminBarrios from "./AdminBarrios";
import AdminComunas from "./AdminComunas";
import AdminFinanzas from "./AdminFinanzas";
import TarifasPanel from "./TarifasPanel";
import s from "./AdminPanel.module.css";

const TABS = [
    { key: "pedidos", label: "Pedidos" },
    { key: "usuarios", label: "Usuarios" },
    { key: "barrios", label: "Barrios" },
    { key: "comunas", label: "Comunas" },
    { key: "finanzas", label: "Finanzas" },
    { key: "tarifas", label: "Tarifas" },
];

function AdminTarifas() {
    const [barrios, setBarrios] = useState([]);
    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch("/api/admin/barrios?includeInactivos=false");
                if (res.ok) setBarrios(await res.json());
            } catch { /* silencioso */ }
        })();
    }, []);
    return <TarifasPanel barrios={barrios} />;
}

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
                {tab === "tarifas" && <AdminTarifas />}
            </div>
        </div>
    );
}
